import { createClient } from '@supabase/supabase-js';

// Service-role access to the routing tables. Members read these through row
// level security; the gateway needs to read across tenants to answer a call for
// any line, and to write call state no browser may write.
export function createStore(config) {
  const client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    // The dialled number is the only thing a provider gives us to identify a
    // tenant. It resolves to exactly one active claim, or the call is refused:
    // a number matching two lines must not route by whichever row came back
    // first.
    async resolveLine(dialled) {
      const { data, error } = await client
        .from('phone_numbers')
        .select('workspace_id, line_id, e164, status')
        .eq('e164', dialled)
        .eq('provider', 'twilio')
        .neq('status', 'released');
      if (error) throw new Error(`Could not resolve the dialled number: ${error.message}`);
      if (!data || data.length !== 1) return null;
      const number = data[0];
      if (number.status !== 'active') return null;

      const [{ data: routing }, { data: endpoints }] = await Promise.all([
        client.from('line_routing').select('*').eq('line_id', number.line_id).maybeSingle(),
        client.from('endpoints').select('*').eq('line_id', number.line_id).is('revoked_at', null),
      ]);
      return { number, routing: routing ?? null, endpoints: endpoints ?? [] };
    },

    // Recorded before the caller hears anything, so a crash mid-call still
    // leaves evidence that the call happened. The unique CallSid makes a Twilio
    // retry an update rather than a duplicate.
    async startScreening({ workspaceId, lineId, callSid, from, to, mode }) {
      const { data, error } = await client.from('call_screenings').upsert({
        workspace_id: workspaceId, line_id: lineId, provider_call_sid: callSid,
        from_e164: from, to_e164: to, mode, outcome: 'screening',
      }, { onConflict: 'provider_call_sid' }).select('id, transfer_attempts').maybeSingle();
      if (error) throw new Error(`Could not record the call: ${error.message}`);
      return data;
    },

    async recordSpeech({ callSid, said, confidence }) {
      const { error } = await client.from('call_screenings')
        .update({ caller_said: said || null, speech_confidence: confidence ?? null })
        .eq('provider_call_sid', callSid);
      if (error) throw new Error(`Could not record what the caller said: ${error.message}`);
    },

    async settle({ callSid, outcome, incrementTransfer }) {
      const patch = { outcome, ended_at: ['connected', 'declined', 'no_answer', 'message', 'failed', 'blocked'].includes(outcome) ? new Date().toISOString() : null };
      if (incrementTransfer) {
        const { data } = await client.from('call_screenings').select('transfer_attempts').eq('provider_call_sid', callSid).maybeSingle();
        patch.transfer_attempts = Math.min((data?.transfer_attempts ?? 0) + 1, 5);
      }
      const { error } = await client.from('call_screenings').update(patch).eq('provider_call_sid', callSid);
      if (error) throw new Error(`Could not settle the call: ${error.message}`);
    },

    async screening(callSid) {
      const { data, error } = await client.from('call_screenings')
        .select('*').eq('provider_call_sid', callSid).maybeSingle();
      if (error) throw new Error(`Could not read the call: ${error.message}`);
      return data ?? null;
    },
  };
}
