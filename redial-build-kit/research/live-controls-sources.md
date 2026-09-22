# Live Call Controls · source register

Reviewed September 18, 2026 (America/Phoenix). These primary-provider sources support technical design choices. They do not certify a working Redial integration, lawful monitoring in every jurisdiction or provider prices. Earlier W-series sources are retained in `sources.md`; only the LC sources were revisited for this update.

## LC01 · Twilio — Conferences Participants subresource

https://www.twilio.com/docs/voice/api/conference-participant-resource

Participant mute/hold/update and phone/SIP/client/app endpoints; does not prove Redial implementation.

## LC02 · Twilio — TwiML Conference

https://www.twilio.com/docs/voice/twiml/conference

Muted participant semantics, lifecycle flags and conference callbacks.

## LC03 · Twilio — Media Streams overview

https://www.twilio.com/docs/voice/media-streams

Bidirectional inbound-track and single-stream limits; outbound DTMF not supported on bidirectional stream.

## LC04 · Twilio — Media Streams WebSocket messages

https://www.twilio.com/docs/voice/media-streams/websocket-messages

Media playback buffering, mark and clear controls. Not a guarantee of zero residual network audio.

## LC05 · Twilio — AI agent through a TwiML Application conference participant

https://www.twilio.com/en-us/blog/developers/tutorials/product/connect-twiml-app-twilio-conference

Conference-first AI application participant architecture; reviewed with official help article on Connect Stream.

## LC06 · Twilio — TwiML Number

https://www.twilio.com/docs/voice/twiml/number

sendDigits extensions, pre-bridge instructions and call progression semantics.

## LC07 · Twilio — Make outbound phone calls

https://www.twilio.com/docs/voice/tutorials/how-to-make-outbound-phone-calls

Outgoing Call SendDigits and timing; verify final SDK/schema and IVR interaction before use.

## LC08 · xAI — Speech to Speech

https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech

Session instructions, text conversation input, tool result flow. This review did not verify every cancel/truncate event.

## LC09 · Twilio — Recordings resource, legal considerations

https://www.twilio.com/docs/voice/api/recording

Recording consent and legal-review caution; not a complete analysis of silent live monitoring law.

## LC10 · Twilio — TwiML Stream

https://www.twilio.com/docs/voice/twiml/stream

Blocking stream behavior and nested custom parameters; Stream URL does not support query parameters.

## LC11 · Twilio — TwiML SIP

https://www.twilio.com/docs/voice/twiml/sip

SIP routing and connector-specific configuration; not proof of arbitrary PBX compatibility.

## LC12 · Twilio — Bidirectional conference streams through a TwiML app

https://help.twilio.com/articles/45314613523867

Official help text describes Conference Participant app endpoint with Connect Stream; full page rendering requires JavaScript.

## LC13 · Twilio — TwiML app conference support announcement

https://www.twilio.com/en-us/changelog/added-support-of-adding-a-twiml-app-directly-to-a-conference

October 6, 2025 announcement of app:<APP_SID> participant support; does not confer product readiness.

## Unverified items

No real live call, mute/unmute, audio cancellation, xAI guidance delivery, extension routing, mobile build or provider bill was tested. The exact xAI cancellation mapping remains an adapter verification task. No current price research was performed for this update; the existing catalog is unchanged and conference costs require a new pilot reconciliation.
