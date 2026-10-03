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
    purpose: 'ai_screening' as const,
    title: 'AI screening',
    what: 'What a caller says is sent to a model provider so the assistant can decide what to do with the call. Without this, screening follows fixed rules and nothing a caller says leaves Redial.',
    legal: 'This is a disclosure of call content to a third party. Agreeing to a recording is not agreeing to this, so it is consented to separately and can be withdrawn on its own.',
    enabledField: 'ai_screening_enabled' as const,
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
    {/* Arizona is a one-party-consent state: a party to the call may record it.
        That is worth saying plainly, because the default reading of the controls
        below is that every recording needs the other person's agreement. It is
        deliberately not phrased as "no consent needed": the rule turns on where
        the other party is, and the consent record stays required because it is
        what evidences the basis you relied on. */}
    <div className="carrier-note">
      <strong>Where you are matters</strong>
      <p>
        Arizona is a <strong>one-party consent</strong> state. If you are a party to the call,
        Arizona law and federal law both let you record it without the other person agreeing.
      </p>
      <p>
        That does not settle an interstate call. Several states &mdash; California, Washington,
        Florida, Illinois and others &mdash; require every party to agree, and the stricter
        state&rsquo;s law generally governs when a call crosses a line. If you take calls from
        outside Arizona, an announcement is the thing that makes a two-party state workable.
      </p>
      <p>
        Redial still asks you to record the decision below, and still refuses to capture
        anything without one. The record is not the law&rsquo;s requirement; it is your evidence
        of what you relied on, with the wording and the date attached. This is how the product
        behaves, not legal advice.
      </p>
    </div>
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
          <Badge tone={consented ? '' : 'muted'}>{!consented ? 'No basis recorded' : current!.legal_basis === 'one_party_recording' ? `One-party basis (${current!.jurisdiction}) ${date(current!.created_at)}` : `Consent recorded ${date(current!.created_at)}`}</Badge>
        </div>
        <p>{item.what}</p>
        <p><strong>{item.legal}</strong></p>

        {item.purpose === 'ai_screening' && <div className="carrier-note">
          <strong>Telling the caller an AI is answering</strong>
          <p>{capture?.ai_notice_enabled === false
            ? 'Callers are not told. Your greeting is read as written.'
            : 'The greeting tells the caller an AI assistant is answering.'}</p>
          {/* The owner may switch this off, by decision, against the
              recommendation recorded with it. The warning is the whole point of
              the control: the database does not refuse this, so the page is
              where someone finds out what they are choosing. */}
          <p><strong>Turning this off does not change what the law requires.</strong> An
            all-party state needs the announcement, and the stricter state&rsquo;s law
            generally governs a call that crosses a line. If you take calls from outside
            a one-party jurisdiction, leave this on.</p>
          {isLineOwner && <form action={dashboardAction}>
            <Scope workspace={workspace} line={line} view={view} />
            <input type="hidden" name="enabled" value={capture?.ai_notice_enabled === false ? 'true' : 'false'} />
            <Button name="action" value="notice" variant="outline">
              {capture?.ai_notice_enabled === false ? 'Tell callers again' : 'Stop telling callers'}
            </Button>
          </form>}
        </div>}

        {isLineOwner && <>
          {!consented
            ? <>
              <form action={dashboardAction} className="review-form">
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
              <form action={dashboardAction} className="review-form">
                <Scope workspace={workspace} line={line} view={view} />
                <input type="hidden" name="purpose" value={item.purpose} />
                {/* The other route: not the other party's agreement, but a
                    jurisdiction whose law lets a party to the call record it.
                    A separate form and a separate database function, because
                    they are different assertions and the weaker one should
                    never be the default. */}
                <p><strong>Or rely on a one-party jurisdiction.</strong> If you are a party to
                  these calls and your jurisdiction allows a party to record without the
                  other person agreeing, record that instead. No disclosure is claimed, and
                  the jurisdiction is stored with it.</p>
                <div className="field">
                  <label htmlFor={`${item.purpose}-place`}>Jurisdiction</label>
                  <Input id={`${item.purpose}-place`} name="place" required maxLength={6}
                    pattern="[A-Z]{2}(-[A-Z0-9]{1,3})?" placeholder="US-AZ" defaultValue="US-AZ" />
                </div>
                <div className="field">
                  <label htmlFor={`${item.purpose}-basis-context`}>Why this applies to this line</label>
                  <Input id={`${item.purpose}-basis-context`} name="context" required maxLength={200}
                    placeholder="I am a party to every call on this line and I am in Arizona" />
                </div>
                <Button name="action" value="basis" variant="outline">Record one-party basis</Button>
              </form>
              </>
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
                  <Button name="action" value="consent" variant="outline">Withdraw and stop capture</Button>
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
