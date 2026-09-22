# 06 · Telephony, carriers and provider adapters

## The central engineering constraint
Redial can process a call only when the telephony path delivers it to a controllable endpoint. Installing a web app, mobile app or Chrome extension does not by itself place Redial between an arbitrary cellular number and the handset. Carrier forwarding, a hosted number, SIP routing and on-device caller identification are different mechanisms with different capabilities.

## Supported connection models
| Model | What Redial receives | Appropriate promise | Required safeguards |
|---|---|---|---|
| New Redial-front-door number | Calls placed to the provisioned programmable number | Screen received calls before ringing a configured destination | Ownership, valid destination, failover, quotas |
| Existing programmable number | Calls routed by its authorized provider webhook/SIP configuration | Screening on that connected line | Credential scope, webhook ownership, rollback and testing |
| Conditional mobile forwarding | Calls that the carrier forwards under supported conditions such as no answer/busy/unreachable | Assistance for calls your mobile forwards | Do not promise unknown-only interception or that the handset never rang |
| Unconditional mobile forwarding | All calls forwarded by that configured carrier path | Screening before the permitted alternate destination rings | Never ring back to the same forwarding number; voicemail implications and reversal steps |
| Ported number | Calls after a completed, authorized port | Future full-number management subject to provider and regulatory support | Defer pilot; examine mobile service, SMS, 2FA and port-out consequences |
| SIP/PBX connection | Calls delivered by a configured interoperable SIP route | Supported PBX integration only | Codec/security/auth/REFER/transfer and failure testing |

A number may be owned by a customer, controlled through their provider, allocated by Redial or forwarded from a mobile. Persist these as distinct attributes. Never imply that a forwarded number has been ported or that a Redial-administered number belongs to a carrier mobile subscription.

## Carrier onboarding matrix — verification required per configuration
| Carrier | Official documentation supports | Proposed Redial integration | Do not claim |
|---|---|---|---|
| T-Mobile | All-call forwarding and some conditional forwarding circumstances; device instructions and network limitations | Guided setup plus inbound/reversal test | Native Redial account integration or guaranteed spam-only forwarding |
| Verizon | All-call and unanswered forwarding; voice forwarding does not forward texts | Guided setup, destination validation and caller-ID tests | SMS access through voice forwarding |
| AT&T | Wireless-phone-controlled forwarding, voicemail override and billing/destination caveats | Device-specific setup with validation | Universal online/OAuth control of consumer forwarding |
| Other carriers/MVNOs | Not verified in this review | Add rows after documented account/device tests | Inherit parent-network support without testing the actual plan |

Sources: [W01–W03]. No partner agreement with these carriers was established by this research. Do not display them as authorized business partners or “live integrations.” Store carrier, country, device model, OS, plan class, route type, test date, caller-ID behavior, voicemail behavior, cancellation procedure and known failures in a compatibility registry.

Avoid one universal carrier code. Display instructions only for a verified matching configuration, with confirmation that the user is altering their own line. Redial should never obtain or retain mobile-carrier passwords.

## First live stack
Twilio handles the number, call events and programmable routing. A separate Node voice gateway authenticates ingress, validates account/number mapping, loads the policy and opens the voice session. xAI receives only the permitted audio/context. The gateway, not the model, enforces budgets, transfer destinations and tools. Use a model identifier configured from verified documentation; pin a version where available after evaluation. [W04–W06]

Twilio bidirectional Media Streams supports one stream per call and requires secure WebSocket access plus `X-Twilio-Signature` validation. xAI documents a realtime WebSocket API and G.711 μ-law at 8 kHz. These facts support a bridge design, but do not prove this application's packet mapping, barge-in or transfer behavior. Implement contract tests with the actual SDK/API versions. [W04, W05]

### Media-session requirements
Persist logical call ID, provider account/CallSid, stream ID, tenant/line, policy version and consent mode. Bound input size and rate; handle start/media/mark/clear/stop and reconnect/disconnect behavior where the transport supports them. For each provider format, map encoding, sample rate, framing and event sequencing explicitly. Never send raw telephony μ-law as PCM without conversion or declaring the correct format.

Caller interruption must stop pending assistant playback and truncate/clear stale buffered speech using the provider's supported controls. Mark transcript text as partial/final. Do not treat partially streamed text as confirmed caller intent for an external write.

### Transfer design
A transfer is a controlled state transition, not simply “call another number.” Freeze the AI speaking path, hold or conference the caller using tested transport primitives, ring the approved endpoint, distinguish accepted/declined/no-answer/voicemail, and resume message capture or fallback as appropriate. Test whether the current bidirectional stream must be ended and the active call redirected before the next TwiML instruction can run. Do not assume a blocked `<Connect><Stream>` automatically falls through while active.

**Insider**, **Gavel**, **Audible** and **Directory** are the named v1.1 Live Call Controls. Implement the conference-first caller/AI/human topology in `docs/21-live-call-topology.md`, including an independent AI TwiML Application participant. Keep each capability disabled until its media, authorization, notice/consent, cost and cleanup tests pass. A direct-stream caller leg must not simultaneously run a conference. [LC01–LC05]

## Loop prevention
Maintain the route graph, not just one destination string. Reject any destination that equals the forwarding source, inbound Redial number, a known route alias, or a node that creates a cycle. Use a bounded redirect depth and a per-call transfer count. Recheck at execution because routing may change after setup. A provider callback confirming delivery is not evidence that the member answered.

## Policy precedence
Transport validation → ownership/configuration → loop/spend/duration guard → explicit block → availability/fallback → VIP override → selected screening mode → conversation → permitted requested action. Contact matches and carrier flags are useful but spoofable signals. They must never unlock confidential details or high-risk account actions.

“Spam only” requires a real supported spam/reputation signal. Missing evidence is not a spam verdict. “Unknown callers” requires an authorized contact/list match. “Every call” screens all received calls except explicit VIP overrides. A rule simulator must show the actual capabilities of the selected route.

## Deadlines and abuse prevention — proposed tunable defaults
Apply a maximum AI screening conversation of 120 seconds, a shorter no-speech timeout, a bounded member-ring interval and a separately approved longer message policy. Do not present these as legal or provider limits. Warn before terminating a legitimate long message and offer a fallback. Enforce concurrency and daily cost ceilings per tenant and provider account. Block premium/international outbound destinations in the US pilot except approved tested ranges. Prevent number provisioning abuse and callback pumping.

## Failure matrix
| Failure | Required behavior |
|---|---|
| Invalid signature / unknown account | Reject; do not disclose account mapping |
| Missing policy or private DB unavailable | Use prevalidated minimal fallback config with finite cache age, or provider-level voicemail; no guessed permissions |
| AI connection fails or stalls | Short deterministic notice and configured voicemail/member destination |
| Quota reached | Explain in member UI; stop new paid AI work; route to bounded fallback rather than unbounded calls |
| No app device reachable | Tested fallback, not repeated pushing forever |
| Member declines / does not answer | Return to message flow if supported or deterministic voicemail |
| Entire VPS unavailable | Independent provider-hosted fallback; synthetic incident alert |
| Twilio number infrastructure unavailable | Do not promise switching the same DID instantly to another unrelated carrier; continuity depends on supported upstream arrangements |
| Consent declined | Use the configured no-AI/no-retained-transcript alternative; raw content must not leak into logs |

## Provider expansion backlog
Twilio: implement first. Telnyx, Vonage and Plivo: separate transport adapter spikes with provisioning, inbound signature validation, calling, status, usage, transfer and cancellation tests. SIP: explicit PBX compatibility tests. OpenAI Realtime, ElevenLabs, Vapi, Retell and Bland: source-requested alternatives, **not capability-verified in this delivery**; review current docs/commercial terms before adding active connectors. A hosted voice platform is not necessarily self-hostable.

Adapter readiness: `planned → documented → sandbox_verified → pilot_verified → production_enabled`, with a reason and evidence for every transition. Rollback can return any adapter to disabled/degraded without losing rule history.
