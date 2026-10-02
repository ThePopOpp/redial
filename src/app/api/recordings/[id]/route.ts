import { serverSupabase } from '@/lib/supabase/server';
import { runtime } from '@/lib/runtime';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refuse(status: number, detail: string) {
  return new Response(JSON.stringify({ error: detail }), {
    status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

// Recording audio, streamed to the member who is allowed to hear it.
//
// Three separate checks, deliberately not collapsed into one:
//
//   1. A verified session, so an unauthenticated request never reaches further.
//   2. A select on `recordings` as that member. The policy requires the
//      read_recording grant, a retention deadline in the future and a deletion
//      state of 'retained', so a row coming back *is* the authorization. This
//      route never consults a capability itself; doing so would be a second
//      implementation of the rule that could drift from the policy.
//   3. The gateway asks the database again before it moves a byte, because a
//      grant revoked between this check and the transfer must still stop it.
//
// The audio is not held here. It streams through, and nothing is cached.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return refuse(400, 'Not a recording identifier.');

  const db = await serverSupabase();
  if (!db) return refuse(503, 'Recording playback is unavailable.');
  const { data: auth } = await db.auth.getUser();
  if (!auth.user || !auth.user.email_confirmed_at) return refuse(401, 'Sign in to play this recording.');

  // Row-level security is the authorization. A row here means this member may
  // hear it; no row means they may not, or it has expired, or it is deleted,
  // and all three are a 404 so the response reveals nothing about which.
  const { data: recording, error } = await db.from('recordings')
    .select('id, duration_seconds').eq('id', id).maybeSingle();
  if (error) return refuse(503, 'The recording could not be checked. Try again.');
  if (!recording) return refuse(404, 'That recording is not available to you.');

  const { voice } = runtime();
  if (!voice.gatewayUrl || !voice.mediaAccessSecret) {
    // Configuration, not permission. Saying so plainly saves an operator from
    // looking for a missing grant.
    return refuse(503, 'Recording playback is not configured for this deployment.');
  }

  let media: Response;
  try {
    media = await fetch(new URL('/media/recording', voice.gatewayUrl), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${voice.mediaAccessSecret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ recordingId: id, userId: auth.user.id }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return refuse(504, 'The voice gateway did not respond. Try again.');
  }
  if (!media.ok || !media.body) return refuse(502, 'The recording could not be retrieved.');

  return new Response(media.body, {
    status: 200,
    headers: {
      'content-type': 'audio/mpeg',
      // Private and uncacheable. A shared cache holding call audio would
      // outlive both the retention deadline and the grant that permitted it.
      'cache-control': 'no-store, private',
      'content-disposition': 'inline',
      ...(media.headers.get('content-length') ? { 'content-length': media.headers.get('content-length')! } : {}),
    },
  });
}
