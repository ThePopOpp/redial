# Redial · Live Call Controls content

**Draft copy for v1.1.** Publish capabilities as available only after their provider/device and privacy gates pass. These are proposed product descriptions, not evidence of a launched feature. Keep existing pricing unchanged pending a commercial decision.

## Shared website section

**Eyebrow:** LIVE CALL CONTROLS

**Headline:** Your agent answers. You stay in control.

**Subheading:** Listen to the conversation, step in yourself, guide your agent privately, or connect the caller with the right person—all from one Redial call workspace.

**Availability note:** Available on supported Redial call connections. Feature access, device support and provider usage vary by plan and configuration.

**Primary CTA:** Explore live call controls

## Insider · /features/insider

**Eyebrow:** INSIDER · LIVE LISTENING

**Headline:** Hear the conversation. Without interrupting it.

**Description:** Listen to your agent and caller in real time while your microphone stays out of the conversation. Stay informed, send a direction with Audible, or use Gavel when you are ready to speak.

**Card copy:** Listen live while your agent handles the conversation.

**Button:** Insider · Listen live

**Active state:** Listening live · Your microphone is not sent.

**Exit:** Stop listening

**Note:** Authorized access and the applicable monitoring notice/consent policy apply. Listening does not automatically save a recording.

## Gavel · /features/gavel

**Eyebrow:** GAVEL · CALL TAKEOVER

**Headline:** When it is your call to take, take it.

**Description:** Move from AI assistance to a direct conversation with your caller. Redial prepares your connection, stops the agent and hands the call to you without asking the caller to dial again.

**Card copy:** Stop the agent and take over the conversation.

**Button:** Gavel · Take over

**Pending states:** Preparing your connection… / Silencing agent… / Connecting you…

**Success:** You are speaking · Agent disconnected.

**Failure before handoff:** We could not connect your device. Your agent is still handling the call.

**Failure after AI detachment:** Your connection was interrupted. The caller is in the configured fallback.

**Note:** Handoff depends on a ready, supported calling endpoint. Do not publish “instant,” “zero latency” or “never drops a call” claims.

## Audible · /features/audible

**Eyebrow:** AUDIBLE · PRIVATE AGENT GUIDANCE

**Headline:** Guide the call without joining the conversation.

**Description:** Send your agent a private direction while the call is happening. Ask for a detail, suggest a callback time or point the conversation toward the right next step.

**Card copy:** Message your agent with real-time call direction.

**Button:** Audible · Guide agent

**Composer label:** Private direction to your agent

**Placeholder:** Ask which project they are calling about…

**Helper text:** This goes to your agent, not directly to the caller. The agent may use it in its response. Do not include secrets.

**Default timing:** Next turn

**Send label:** Send direction

**Acknowledged label:** Agent connection acknowledged receipt—not confirmation of action.

**Unavailable:** The agent is no longer on this call.

## Directory · /features/directory

**Eyebrow:** DIRECTORY · SMART CALL TRANSFERS

**Headline:** Get callers to the right person.

**Description:** Give your agent a clear path to the people who can help. Transfer to saved phone numbers, approved custom numbers, internal users and supported extensions or phone systems, with hours, confirmation and fallback rules you control.

**Card copy:** Connect callers to approved numbers, people and destinations.

**Button:** Directory · Transfer

**Search:** Search people, teams, numbers or extensions…

**Custom-number action:** Enter a one-time number

**Confirmation:** Transfer this caller to {destination_label} at {formatted_number} using {transfer_method}?

**Warm option:** Brief the recipient and ask them to accept before connecting.

**No answer:** No one accepted. Choose another approved destination or take a message.

**Unsupported extension:** This extension has not passed its routing test yet.

## App onboarding

**Title:** Meet your live call controls

**Body:** Use Insider to listen, Gavel to take over, Audible to guide your agent, and Directory to connect the caller. Available controls depend on this line's permissions and tested connection.

**CTA:** Open the demo console

Demo label must remain visible; no real calls or messages are placed by starting the demo.

## FAQs

**Will the caller hear me while I use Insider?**
Your microphone is excluded from the conversation while you listen. Monitoring still follows the line's access and notice/consent settings.

**What happens to the AI when I use Gavel?**
Once your connection is ready and the handoff completes, Redial disconnects the agent from the conversation. The agent does not keep listening by default.

**Is Audible a text message to the caller?**
No. It is a private direction to the active agent. The agent may use your direction in what it says or does, so do not send sensitive secrets.

**Can Directory call a custom number?**
An authorized member can request a one-time destination after confirmation and routing checks. The caller and AI cannot independently bypass the approved destination policy.

**Can I transfer to an extension?**
Supported extension routing uses a main phone number or compatible phone system. Each route needs a working dial sequence and test before it is offered as available.

**Does this work with any mobile call?**
The call must reach a supported Redial connection. Installing the app does not let Redial control every ordinary carrier call.

## Release announcement draft

**Subject:** Meet Insider, Gavel, Audible and Directory

**Preheader:** Four ways to stay in control while Redial handles the call.

**Body:** Your agent can handle the conversation without taking you out of the loop. With Redial Live Call Controls, use Insider to listen live, Gavel to step in, Audible to send a private direction, and Directory to connect the caller with the right person. Open an eligible active call to see the controls available on your connection.

**CTA:** Explore your call controls

Send only after release to an appropriate audience with required email consent/preferences. Do not announce a capability as launched merely because this draft exists.
