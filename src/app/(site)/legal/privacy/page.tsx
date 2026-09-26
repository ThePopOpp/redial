import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Redial collects, uses, shares and retains personal information, including call content and mobile messaging data.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/legal/privacy' },
};

const effectiveDate = '26 September 2026';

export default function Privacy() {
  return <article className="legal">
    <header className="page-heading">
      <p className="eyebrow">Legal</p>
      <h1>Privacy Policy</h1>
      <p className="legal-meta">Effective {effectiveDate} · Last updated {effectiveDate}</p>
    </header>

    <section>
      <p>Redial is operated by <strong>Qallus</strong> (“Qallus”, “we”, “us”). This policy explains what personal information the Redial call-screening service collects, why we collect it, who we share it with, how long we keep it, and the choices you have.</p>
      <p>It covers the Redial website, the member application, and the telephone screening service. Questions go to <a href="mailto:hello@redial.si">hello@redial.si</a>.</p>
    </section>

    <section>
      <h2>1. A summary of the important points</h2>
      <ul>
        <li>We <strong>do not sell your personal information</strong>, and we do not share your mobile phone number or SMS consent with anyone for their own marketing.</li>
        <li>Screening a call means an AI assistant answers it. The caller is told that before the conversation continues.</li>
        <li>Call recording is <strong>off by default</strong>. Transcripts and summaries are kept for a limited time and you control how long.</li>
        <li>Paying for a household or business account does <strong>not</strong> give the payer access to other people’s call content.</li>
        <li>Redial is not a phone company and <strong>is not an emergency service</strong>. See our <Link href="/legal/terms">Terms of Service</Link>.</li>
      </ul>
    </section>

    <section>
      <h2>2. Information we collect</h2>

      <h3>Information you give us</h3>
      <ul>
        <li><strong>Account information</strong> — your name, email address, and password. Passwords are stored only as salted hashes by our authentication provider; we never see them.</li>
        <li><strong>Your telephone number</strong> and the carrier, device and connection details you enter when setting up call screening.</li>
        <li><strong>Screening settings</strong> — your rules, your assistant’s greeting and instructions, and the destinations you approve.</li>
        <li><strong>Contacts you choose to import.</strong> We store the name and the telephone number in international format. We ignore photographs, email addresses, postal addresses and notes contained in the file or contact record.</li>
        <li><strong>Support messages</strong> you send us.</li>
        <li><strong>Billing details.</strong> Payments are processed by Square. Card numbers and security codes go directly to Square and are never stored on Redial systems. We keep the payment result, the amount, the last four digits, and the card brand.</li>
      </ul>

      <h3>Information created when the service handles a call</h3>
      <ul>
        <li><strong>Call metadata</strong> — the calling number, the time, the duration, and the outcome.</li>
        <li><strong>Conversation content</strong> — what the caller says to the assistant, as a transcript, and a written summary. This is generated for every screened call unless you disable transcripts.</li>
        <li><strong>Audio recordings</strong> only when you explicitly enable recording for a line. Recording is off unless you turn it on.</li>
      </ul>

      <h3>Information we collect automatically</h3>
      <ul>
        <li>Security and diagnostic logs, including IP address, browser type, timestamps and error codes. We redact telephone numbers from these logs by default and never write call content into them.</li>
      </ul>
    </section>

    <section>
      <h2>3. Information about people who call you</h2>
      <p>When someone calls a line you have connected to Redial, we process that caller’s telephone number and what they say to the assistant, so that we can take a message for you and tell you who called.</p>
      <p>The assistant identifies itself as an AI assistant at the start of the call. Where a caller declines to be processed by an automated assistant, the line falls back to a configured alternative rather than continuing.</p>
      <p>We process this information to provide the service you asked for and to deliver the caller’s message. We do not use the contents of callers’ conversations to build advertising profiles, to train third-party models, or for any purpose unrelated to delivering your messages.</p>
      <p>Recording and monitoring laws differ by state and country, and some require every party to consent. You are responsible for using Redial lawfully on the lines you connect. See the Terms of Service.</p>
    </section>

    <section>
      <h2>4. Mobile messaging and your telephone number</h2>
      <p className="legal-callout"><strong>We do not sell, rent, or share mobile telephone numbers, SMS opt-in information, or consent records with third parties or affiliates for their own marketing purposes.</strong> Consent to receive text messages from Redial is never shared with anyone else, and it is not transferred if our business changes hands except as part of providing the same service to you.</p>
      <p>If you provide a mobile number and agree to receive text messages, we use it only to send you the categories of message described in the <Link href="/legal/terms#messaging">Messaging Terms</Link>: account and security notices, notifications about your calls, and billing or payment reminders.</p>
      <p>We share your number with our messaging carrier, Twilio, purely to transmit those messages to you. Carriers are not liable for delayed or undelivered messages.</p>
      <p>You can stop messages at any time by replying <strong>STOP</strong>, or get help by replying <strong>HELP</strong>. Opting out of text messages does not close your account, and we may still contact you by email about your account, your security, or your payments.</p>
    </section>

    <section>
      <h2>5. Why we use your information</h2>
      <ul>
        <li><strong>To provide the service</strong> — screening calls, taking messages, producing summaries, and routing calls you have approved.</li>
        <li><strong>To operate your account</strong> — authentication, workspace membership, permissions, and support.</li>
        <li><strong>To take payment</strong> and to keep the financial records the law requires us to keep.</li>
        <li><strong>To keep the service safe</strong> — preventing fraud, abuse, toll fraud, and runaway spending.</li>
        <li><strong>To improve the service</strong> — using aggregated and de-identified measurements. We do not read your call content to develop features.</li>
        <li><strong>To meet legal obligations</strong>, and to establish or defend legal claims.</li>
      </ul>
    </section>

    <section>
      <h2>6. Who we share information with</h2>
      <p>We share personal information only with service providers who process it on our instructions, and only as far as they need it:</p>
      <table className="legal-table">
        <thead><tr><th>Provider</th><th>Purpose</th><th>What they receive</th></tr></thead>
        <tbody>
          <tr><td>Supabase</td><td>Database, authentication, file storage</td><td>Account details, settings, call metadata and content</td></tr>
          <tr><td>Twilio</td><td>Telephone numbers, call routing, text messages</td><td>Telephone numbers, call events, message content</td></tr>
          <tr><td>xAI</td><td>Real-time voice assistant</td><td>Call audio and the conversation during screening</td></tr>
          <tr><td>Square</td><td>Payment processing and subscriptions</td><td>Name, email, payment details you enter</td></tr>
          <tr><td>Resend and Hostinger</td><td>Email delivery</td><td>Email address and message content</td></tr>
          <tr><td>Hostinger</td><td>Server hosting</td><td>Data stored and processed by the application</td></tr>
        </tbody>
      </table>
      <p>We also disclose information when the law requires it, to protect rights and safety, and to a successor if our business is transferred — in which case this policy continues to apply to the information transferred.</p>
      <p><strong>We do not sell personal information, and we do not share it for cross-context behavioural advertising.</strong></p>
    </section>

    <section>
      <h2>7. Who can see your calls</h2>
      <p>Access to call content is controlled per line, not per account:</p>
      <ul>
        <li>The owner of a line can see that line’s calls, transcripts and summaries.</li>
        <li>Other people see a line’s content only where the line owner has granted that specific permission, and the owner can withdraw it.</li>
        <li><strong>Paying for a household or business workspace does not grant access to other members’ call content.</strong> Billing permission and content permission are separate.</li>
        <li>Our support staff cannot read your transcripts or listen to audio as a matter of routine. Staff access is limited, requires multi-factor authentication, and is recorded.</li>
      </ul>
    </section>

    <section>
      <h2>8. How long we keep information</h2>
      <table className="legal-table">
        <thead><tr><th>Information</th><th>Retention</th></tr></thead>
        <tbody>
          <tr><td>Call history on a free plan</td><td>7 days</td></tr>
          <tr><td>Transcripts and summaries on a paid plan</td><td>90 days, or a shorter period you choose</td></tr>
          <tr><td>Operational call metadata</td><td>Up to 365 days</td></tr>
          <tr><td>Audio recordings, where you enable them</td><td>30 days</td></tr>
          <tr><td>Account records</td><td>While your account is open</td></tr>
          <tr><td>Billing and tax records</td><td>As long as financial and tax law requires</td></tr>
        </tbody>
      </table>
      <p>When a retention period ends, we delete the content and anything derived from it. Backups are deleted on their own schedule. We may keep information longer where the law requires it or where it is needed for a legal claim.</p>
    </section>

    <section>
      <h2>9. Your choices and rights</h2>
      <p>You can, at any time:</p>
      <ul>
        <li>See and correct your account details and settings in your dashboard.</li>
        <li>Shorten how long transcripts are kept, or turn transcripts off.</li>
        <li>Delete individual calls, contacts and messages.</li>
        <li>Withdraw a permission you gave someone else to read a line.</li>
        <li>Stop text messages by replying STOP, and stop optional email by using the unsubscribe link.</li>
        <li>Close your account and ask us to delete your information.</li>
      </ul>
      <p>Depending on where you live, you may also have the right to a copy of your information, to object to or restrict processing, and to complain to a regulator. Write to <a href="mailto:hello@redial.si">hello@redial.si</a> and we will respond. We will ask you to verify your identity, but we will not ask for more documents than we need.</p>
    </section>

    <section>
      <h2>10. Security</h2>
      <p>We encrypt data in transit, restrict access to production systems, store provider credentials encrypted and separately from the application, require multi-factor authentication for staff, and record access to customer records. Database access rules are enforced by the database itself rather than only by application code.</p>
      <p>No service can promise perfect security. If a breach affects your personal information, we will notify you and the relevant authorities where the law requires it.</p>
    </section>

    <section>
      <h2>11. Children</h2>
      <p>Redial is not intended for anyone under 18, and we do not knowingly collect information from children. If you believe a child has given us information, write to <a href="mailto:hello@redial.si">hello@redial.si</a> and we will delete it.</p>
    </section>

    <section>
      <h2>12. International transfers</h2>
      <p>We and our providers process information in the United States and other countries. Where information is transferred out of your country, we rely on appropriate safeguards such as standard contractual clauses with our providers.</p>
    </section>

    <section>
      <h2>13. Changes to this policy</h2>
      <p>If we change this policy in a way that materially affects you, we will tell you by email or in the application before the change takes effect. The date at the top shows the current version.</p>
    </section>

    <section>
      <h2>14. Contact</h2>
      <p>Qallus<br />Privacy enquiries and customer care: <a href="mailto:hello@redial.si">hello@redial.si</a></p>
    </section>

    <nav className="legal-footer-nav" aria-label="Legal documents"><Link href="/legal/terms">Terms of Service</Link><Link href="/">Back to Redial</Link></nav>
  </article>;
}
