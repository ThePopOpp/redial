import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The agreement between you and Qallus for the Redial call-screening service, including messaging terms, billing, and service limitations.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/legal/terms' },
};

const effectiveDate = '26 September 2026';

export default function Terms() {
  return <article className="legal">
    <header className="page-heading">
      <p className="eyebrow">Legal</p>
      <h1>Terms of Service</h1>
      <p className="legal-meta">Effective {effectiveDate} · Last updated {effectiveDate}</p>
    </header>

    <section>
      <p>These terms are an agreement between you and <strong>Qallus</strong> (“Qallus”, “we”, “us”), which operates the Redial call-screening service (“Redial”, the “Service”). By creating an account or using the Service you accept them. If you do not accept them, do not use the Service.</p>
      <p>Please read <strong>section 4</strong> carefully. It explains that Redial is not a telephone company and cannot be used to call emergency services.</p>
    </section>

    <section>
      <h2>1. What Redial does</h2>
      <p>Redial answers telephone calls on your behalf. When a call reaches a line you have connected, an AI assistant answers, tells the caller it is an automated assistant, asks who is calling and why, takes a message, and can request to connect you. You then see a summary of the call, and a transcript where you have transcripts enabled.</p>
      <p>Redial does not block every unwanted call and does not promise to identify every unwanted caller. Which calls reach Redial depends on your carrier, your device, your plan and the way you have configured forwarding. We describe what each supported connection method can and cannot do; you are responsible for choosing one that suits you.</p>
      <p>Features are released as they are completed and tested. We may add, change or withdraw features. If we withdraw something you are paying for, section 7 explains your options.</p>
    </section>

    <section>
      <h2>2. Eligibility and your account</h2>
      <ul>
        <li>You must be at least 18 and able to enter a contract.</li>
        <li>You must give accurate account details and keep them current.</li>
        <li>You are responsible for your password and for what happens under your account. Tell us promptly at <a href="mailto:hello@redial.si">hello@redial.si</a> if you think someone else has access.</li>
        <li>You may invite other people into a workspace. The person who owns a line controls who can read that line’s call content. Paying for a workspace does not by itself grant access to other people’s calls.</li>
      </ul>
    </section>

    <section>
      <h2>3. Connecting a telephone line</h2>
      <p>You may only connect a telephone number that you own or that you are authorised to configure. You are responsible for any change you make to your carrier settings, including call forwarding, and for reversing it if you stop using Redial. We give instructions, but we do not control your carrier, and forwarding may affect voicemail, caller ID and how your phone rings.</p>
      <p>You are responsible for using Redial lawfully. Laws on recording, monitoring and automated answering differ by state and country, and some require the consent of every party to a call. Where you enable recording, you are responsible for obtaining any consent the law requires. Redial announces to callers that an automated assistant is answering.</p>
      <p>You must not use Redial for unattended outbound dialling, telemarketing, robocalling, debt collection campaigns, or any use that breaches telecommunications or anti-spam law.</p>
    </section>

    <section>
      <h2>4. Redial is not a telephone service, and not an emergency service</h2>
      <p className="legal-callout"><strong>Redial does not provide telephone service and does not support calls to emergency numbers such as 911. Redial cannot be used to contact emergency services. Your existing telephone service and its emergency calling remain with your original provider — do not cancel it or rely on Redial in an emergency.</strong></p>
      <p>If a caller tells the assistant about an emergency, the assistant will say that Redial is not an emergency service and that they should contact their local emergency number. Redial does not summon help and does not notify any authority.</p>
      <p>Redial depends on your carrier, your internet connection and third-party providers. Calls may be delayed, missed or unscreened. Do not use Redial as the only route for calls you cannot afford to miss.</p>
    </section>

    <section id="messaging">
      <h2>5. Messaging Terms (SMS)</h2>
      <p>These terms apply if you give us a mobile number and agree to receive text messages from Redial.</p>
      <ul>
        <li><strong>Program.</strong> Redial, operated by Qallus.</li>
        <li><strong>What we send.</strong> Account and security notices such as verification codes and sign-in alerts; notifications about your calls such as a new screened message, a route failure or an approaching usage limit; and billing notices such as a failed payment, an expiring card or an upcoming renewal. <strong>We do not send marketing text messages.</strong></li>
        <li><strong>How you opt in.</strong> By entering your mobile number and ticking the box to receive text messages. Consent is not a condition of purchase, and you can use Redial without it.</li>
        <li><strong>Message frequency.</strong> Message frequency varies and depends on how you use the Service.</li>
        <li><strong>Cost.</strong> <strong>Message and data rates may apply.</strong> Redial does not charge you for these messages; your mobile carrier may.</li>
        <li><strong>Opting out.</strong> Reply <strong>STOP</strong> to any message to stop all further text messages. You will receive one confirmation. You can opt back in by turning messages on again in your settings.</li>
        <li><strong>Help.</strong> Reply <strong>HELP</strong>, or email <a href="mailto:hello@redial.si">hello@redial.si</a>.</li>
        <li><strong>Carriers.</strong> Carriers are not liable for delayed or undelivered messages. Delivery is not guaranteed.</li>
        <li><strong>Privacy.</strong> We do not sell or share your mobile number or your consent with third parties for their marketing. See our <Link href="/legal/privacy">Privacy Policy</Link>.</li>
      </ul>
      <p>Stopping text messages does not close your account. We may still contact you by email about your account, your security and your payments.</p>
    </section>

    <section>
      <h2>6. Plans, payment and taxes</h2>
      <ul>
        <li><strong>Subscriptions.</strong> Paid plans are sold as a monthly or annual subscription and renew automatically until cancelled. The price, the billing period and what is included are shown before you buy.</li>
        <li><strong>Annual plans</strong> are charged as a single payment for the year. Included monthly usage is provided in monthly windows and does not roll over.</li>
        <li><strong>Set-up fees.</strong> Some plans include a one-time activation fee, shown separately at checkout before you pay.</li>
        <li><strong>Bring-your-own plans.</strong> On these plans you pay your own telephony and AI providers directly. Those charges are between you and that provider, and we do not control or refund them.</li>
        <li><strong>Usage limits.</strong> Plans include a stated allowance. We warn you as you approach it. <strong>We do not automatically charge you for going over.</strong> At the limit, screening falls back to the behaviour you configured.</li>
        <li><strong>Payments</strong> are processed by Square. You authorise us to charge your payment method for each renewal until you cancel.</li>
        <li><strong>Taxes</strong> are your responsibility where they apply and may be added to the price.</li>
        <li><strong>Failed payments.</strong> If a payment fails we will tell you and retry. Access may be limited after a short grace period, and stopped if the balance stays unpaid.</li>
        <li><strong>Price changes</strong> apply from your next billing period, and we will tell you before they take effect.</li>
      </ul>
    </section>

    <section>
      <h2>7. Cancellation and refunds</h2>
      <p>You can cancel at any time from your billing settings. Cancelling stops the next renewal; you keep access until the end of the period you have paid for. We do not automatically refund a partly used period.</p>
      <p>If we withdraw a feature you are paying for, or we end your subscription for a reason that is not your fault, we will refund the unused part of what you have paid.</p>
      <p>Statutory rights to cancel or to a refund, where they apply to you, are unaffected by this section. To ask about a refund, write to <a href="mailto:hello@redial.si">hello@redial.si</a>.</p>
      <p>When your subscription ends, remember to reverse any call forwarding at your carrier. Redial cannot change your carrier settings for you.</p>
    </section>

    <section>
      <h2>8. Acceptable use</h2>
      <p>You must not:</p>
      <ul>
        <li>connect a number you do not own or control;</li>
        <li>use Redial to harass, deceive or impersonate anyone, or to record people unlawfully;</li>
        <li>use Redial for automated outbound calling or messaging campaigns;</li>
        <li>attempt to bypass usage limits, spending controls or access controls;</li>
        <li>probe, scan or interfere with the Service, or attempt to access another customer’s data;</li>
        <li>resell the Service without our written agreement.</li>
      </ul>
      <p>We may suspend or close an account that breaks these rules, that creates a risk of fraud or runaway cost, or where the law requires it. Where we can, we will tell you first and route your calls safely.</p>
    </section>

    <section>
      <h2>9. Your content and ours</h2>
      <p>You keep ownership of your settings, your contacts and the content of your calls. You grant us the permission we need to host, process and transmit that content in order to operate the Service, including sending call audio to our voice provider so that it can be screened.</p>
      <p>We own the Service itself, including its software, design and branding. These terms grant you no rights in them beyond using the Service.</p>
    </section>

    <section>
      <h2>10. Third-party providers</h2>
      <p>Redial depends on third parties including Twilio, xAI, Supabase and Square, listed in the <Link href="/legal/privacy">Privacy Policy</Link>. Their failures may interrupt the Service. Where you supply your own provider account, you are responsible for its terms, its availability and its charges.</p>
    </section>

    <section>
      <h2>11. Availability</h2>
      <p>We do not promise that the Service will be uninterrupted or error-free, and we do not currently offer a service-level agreement. We may take the Service down for maintenance, and will give notice where we reasonably can.</p>
    </section>

    <section>
      <h2>12. Disclaimers</h2>
      <p>To the fullest extent the law allows, the Service is provided “as is” and “as available”, without warranties of any kind, whether express or implied, including any implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that Redial will identify, screen or block any particular call, that any message will be captured or delivered, or that any transcript or summary is accurate.</p>
      <p>Transcripts and summaries are produced by automated systems and can be wrong. Do not rely on them as a verbatim record.</p>
    </section>

    <section>
      <h2>13. Limitation of liability</h2>
      <p>To the fullest extent the law allows, neither party is liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, lost revenue, lost business or lost data, even if advised of the possibility.</p>
      <p>To the fullest extent the law allows, our total liability arising out of or relating to the Service is limited to the amount you paid us for the Service in the twelve months before the event giving rise to the claim, or one hundred US dollars if you have paid us nothing.</p>
      <p>Nothing in these terms excludes liability that cannot lawfully be excluded, including for death or personal injury caused by negligence, or for fraud.</p>
    </section>

    <section>
      <h2>14. Indemnity</h2>
      <p>You will indemnify us against claims, losses and reasonable costs arising from your use of the Service in breach of these terms or of the law, including claims by a caller about recording or monitoring you enabled.</p>
    </section>

    <section>
      <h2>15. Changes to these terms</h2>
      <p>We may change these terms. If a change materially affects you, we will tell you by email or in the application before it takes effect, and it will apply from your next billing period. Continuing to use the Service after that means you accept the change. If you do not accept it, you may cancel.</p>
    </section>

    <section>
      <h2>16. Ending the agreement</h2>
      <p>You may stop using the Service and close your account at any time. We may end this agreement if you materially breach it, or if we stop offering the Service, in which case we will give you reasonable notice and refund any unused prepaid amount. Sections 9, 12, 13, 14 and 17 survive.</p>
    </section>

    <section>
      <h2>17. Governing law and disputes</h2>
      <p>These terms are governed by the laws of the State of Arizona, United States, without regard to its conflict-of-laws rules. The state and federal courts located in Maricopa County, Arizona have exclusive jurisdiction, and each party consents to that jurisdiction. If you are a consumer, this does not deprive you of the protection of the mandatory law of the country where you live.</p>
      <p>Before starting proceedings, please contact <a href="mailto:hello@redial.si">hello@redial.si</a> so we can try to resolve the matter.</p>
    </section>

    <section>
      <h2>18. General</h2>
      <p>These terms, with the Privacy Policy, are the entire agreement between us about the Service. If a provision is unenforceable, the rest continues. Our not enforcing a term is not a waiver of it. You may not transfer this agreement without our consent; we may transfer it to a successor of our business.</p>
    </section>

    <section>
      <h2>19. Contact</h2>
      <p>Qallus<br />Customer care and privacy enquiries: <a href="mailto:hello@redial.si">hello@redial.si</a></p>
    </section>

    <nav className="legal-footer-nav" aria-label="Legal documents"><Link href="/legal/privacy">Privacy Policy</Link><Link href="/">Back to Redial</Link></nav>
  </article>;
}
