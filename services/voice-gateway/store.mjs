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

    // One round trip for everything the assistant turn needs: the line's two
    // switches and the tier from the workspace's plan. Resolved in the database
    // because a caller is on the line while this runs, and because the tier
    // lives behind a join the gateway has no business reassembling.
    //
    // A failure here is not a call failure. The assistant is an enhancement on
    // top of the rule-based plan, so an unreadable profile means no assistant,
    // not a dropped call.
    async assistantProfile({ workspaceId, lineId }) {
      const { data, error } = await client.rpc('line_assistant_profile', { w: workspaceId, l: lineId });
      if (error) return null;
      return data ?? null;
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

    // The consent the capture is happening under, read at the moment the
    // artefact arrives rather than assumed from the line's switch. The switch
    // cannot be on without consent, but it can have been turned on and the
    // consent withdrawn while this call was in progress.
    async activeConsent({ workspaceId, lineId, purpose }) {
      const { data, error } = await client.from('consent_events')
        .select('id, granted')
        .eq('workspace_id', workspaceId).eq('line_id', lineId).eq('purpose', purpose)
        .order('created_at', { ascending: false }).order('id', { ascending: false })
        .limit(1).maybeSingle();
      if (error) throw new Error(`Could not read capture consent: ${error.message}`);
      return data?.granted ? data.id : null;
    },

    // The member's own retention choice, which shortens the default but never
    // extends it. Absent means they have saved no preference, not that they
    // want the maximum.
    async retentionDays({ workspaceId, lineId }) {
      const { data, error } = await client.from('workspace_records')
        .select('body')
        .eq('workspace_id', workspaceId).eq('line_id', lineId).eq('kind', 'preferences')
        .limit(1).maybeSingle();
      if (error) return null;
      const days = Number(data?.body?.retentionDays);
      return Number.isFinite(days) ? days : null;
    },

    // The call this provider call id belongs to in the member-facing log. The
    // worker projects it after the call ends, so during a call it may not exist
    // yet; the caller of this decides what to do about that.
    async projectedCallId({ workspaceId, callSid }) {
      const { data, error } = await client.from('calls')
        .select('id').eq('workspace_id', workspaceId).eq('provider_call_sid', callSid).maybeSingle();
      if (error) throw new Error(`Could not resolve the logged call: ${error.message}`);
      return data?.id ?? null;
    },

    // Idempotent on (workspace, provider, recording sid), so a Twilio retry of
    // the status callback does not store the same audio twice.
    async saveRecording(row) {
      const { error } = await client.from('recordings')
        .upsert(row, { onConflict: 'workspace_id,provider,provider_recording_sid', ignoreDuplicates: true });
      if (error) throw new Error(`Could not record the recording reference: ${error.message}`);
    },

    async saveTranscriptSegments(rows) {
      if (!rows.length) return 0;
      // The unique (call_id, sequence) makes a redelivered segment a no-op.
      const { error } = await client.from('transcript_segments')
        .upsert(rows, { onConflict: 'call_id,sequence', ignoreDuplicates: true });
      if (error) throw new Error(`Could not store transcript segments: ${error.message}`);
      return rows.length;
    },

    // Asked again at download, never inferred from the request. A grant revoked
    // after the page rendered has to stop the transfer, and the predicate lives
    // in SQL so it cannot drift from the policy that governs the row.
    async mayReadRecording({ userId, recordingId }) {
      const { data, error } = await client.rpc('may_read_recording', { u: userId, r: recordingId });
      if (error) throw new Error(`Could not check recording access: ${error.message}`);
      return data === true;
    },

    async recordingReference(recordingId) {
      const { data, error } = await client.from('recordings')
        .select('provider, provider_recording_sid').eq('id', recordingId).maybeSingle();
      if (error) throw new Error(`Could not read the recording reference: ${error.message}`);
      return data ?? null;
    },

    // Logged whether or not the audio was served. A refusal is the entry an
    // audit most wants to see.
    async logRecordingAccess({ userId, recordingId, outcome }) {
      const { error } = await client.rpc('log_recording_access', { u: userId, r: recordingId, result: outcome });
      if (error) throw new Error(`Could not log recording access: ${error.message}`);
    },
  };
}
