import { dashboardAction } from '@/lib/dashboard/actions';
import { Scope } from '@/components/dashboard/form';
import type { ConsentEvent, LineCapture, Recording } from '@/lib/dashboard/model';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, Badge, date } from '@/components/review/ui';

// Recording and transcription, and the consent each one needs.
//
// Two switches, never one. A member may want a written record of their calls
// and not a recording of the voices on them, and the law treats those
// differently, so the page does not offer a single "keep a record" control that
// quietly turns on both.

const PURPOSES = [
  {
    purpose: 'call_recording' as const,
    title: 'Call recording',
    what: 'Audio of the whole call, both sides, held by the telephony provider and reachable only by someone you have granted the recording permission.',
    legal: 'Recording laws differ by state and country, and some require the consent of every party to a call. Where you enable this, you are responsible for obtaining the consent the law requires.',
    enabledField: 'recording_enabled' as const,
  },
  {
    purpose: 'call_transcription' as const,
    title: 'Call transcription',
    what: 'A written record of what was said, kept for as long as your retention preference allows and then deleted.',
    legal: 'A transcript is a record of what both parties said. It is its own disclosure, not a lesser form of recording, and it is consented to separately.',
    enabledField: 'transcription_enabled' as const,
  },
];

export function CaptureControls({ workspace, line, view, capture, consent, isLineOwner }: {
  workspace: string; line: string; view: string;
  capture: LineCapture | null;
  consent: ConsentEvent[];
  isLineOwner: boolean;
}) {
  return <Card title="Recording and transcription" subtitle="Both are off until you record consent and then turn them on">
    {!isLineOwner && <p>Only the line owner can change these. Enabling recording is a legal decision about this line&rsquo;s calls, so it is not something a workspace administrator can do on the owner&rsquo;s behalf.</p>}
    {PURPOSES.map(item => {
      // The newest event for this purpose is the current state. Withdrawal is a
      // new record rather than an edit, so the history stays evidence.
      const current = consent.find(event => event.purpose === item.purpose);
      const consented = Boolean(current?.granted);
      const enabled = Boolean(capture?.[item.enabledField]);
      return <section className="workspace-card" key={item.purpose}>
        <h3>{item.title}</h3>
        <div className="actions">
          <Badge tone={enabled ? '' : 'muted'}>{enabled ? 'On' : 'Off'}</Badge>
          <Badge tone={consented ? '' : 'muted'}>{consented ? `Consent recorded ${date(current!.created_at)}` : 'No consent recorded'}</Badge>
        </div>
        <p>{item.what}</p>
        <p><strong>{item.legal}</strong></p>

        {isLineOwner && <>
          {!consented
            ? <form action={dashboardAction} className="review-form">
                <Scope workspace={workspace} line={line} view={view} />
                <input type="hidden" name="purpose" value={item.purpose} />
                <input type="hidden" name="granted" value="true" />
                <div className="field">
                  <label htmlFor={`${item.purpose}-context`}>How consent is obtained on this line</label>
                  {/* Stored as evidence of what was actually done, so it is a
                      written answer rather than a checkbox. A tick box would
                      record that someone clicked, not what they arranged. */}
                  <Input id={`${item.purpose}-context`} name="context" required maxLength={200}
                    placeholder="Callers hear an announcement before the call connects" />
                </div>
                <Button name="action" value="consent">Record consent</Button>
              </form>
            : <div className="actions">
                {!enabled
                  ? <form action={dashboardAction}>
                      <Scope workspace={workspace} line={line} view={view} />
                      <input type="hidden" name="purpose" value={item.purpose} />
                      <input type="hidden" name="enabled" value="true" />
                      <Button name="action" value="capture">Turn on</Button>
                    </form>
                  : <form action={dashboardAction}>
                      <Scope workspace={workspace} line={line} view={view} />
                      <input type="hidden" name="purpose" value={item.purpose} />
                      <input type="hidden" name="enabled" value="false" />
                      <Button name="action" value="capture" variant="outline">Turn off</Button>
                    </form>}
                <form action={dashboardAction}>
                  <Scope workspace={workspace} line={line} view={view} />
                  <input type="hidden" name="purpose" value={item.purpose} />
                  <input type="hidden" name="granted" value="false" />
                  <input type="hidden" name="context" value="Withdrawn by the line owner" />
                  {/* Withdrawing stops the capture as well as recording the
                      decision; a database trigger clears the switch, so this is
                      not relying on the page to do it. */}
                  <Button name="action" value="consent" variant="outline">Withdraw consent</Button>
                </form>
              </div>}
        </>}

        {consent.filter(event => event.purpose === item.purpose).length > 1 && <details>
          <summary>Consent history</summary>
          {consent.filter(event => event.purpose === item.purpose).map(event =>
            <p key={event.id}>
              <Badge tone={event.granted ? '' : 'muted'}>{event.granted ? 'Granted' : 'Withdrawn'}</Badge>{' '}
              {date(event.created_at)} &middot; disclosure {event.disclosure_version} &middot; {event.collection_context}
            </p>)}
        </details>}
      </section>;
    })}
    <p>Enabling either of these does not activate it on a call by itself: the line still needs a verified voice connection. Turning recording off, or withdrawing consent, takes effect on the next call.</p>
  </Card>;
}

// Audio for one call. Rendered only when the member holds the recording
// permission, because the row itself does not come back otherwise.
export function CallRecordings({ recordings }: { recordings: Recording[] }) {
  if (!recordings.length) return null;
  return <section>
    <h2>Recording</h2>
    {recordings.map(recording => <div key={recording.id}>
      {/* Streamed through the application, which re-checks permission, and
          then through the voice gateway, which checks again before any audio
          moves. preload="none" so opening a call does not pull the audio for
          someone who never presses play. */}
      <audio controls preload="none" src={`/api/recordings/${recording.id}`}>
        <a href={`/api/recordings/${recording.id}`}>Download this recording</a>
      </audio>
      <p>
        {Math.floor(recording.duration_seconds / 60)}m {recording.duration_seconds % 60}s
        {recording.channels === 2 ? ' · both sides recorded separately' : ''}
        {' · '}deleted after {date(recording.retention_deadline)}
      </p>
    </div>)}
  </section>;
}
