// TwiML is built here as text rather than with the Twilio SDK, so the gateway
// keeps no provider dependency and every attribute that affects a caller's
// experience is visible in one place.
//
// Everything interpolated is escaped. A caller's spoken words reach <Say> in the
// whisper below, and an unescaped apostrophe would produce invalid XML while an
// unescaped angle bracket would let a caller inject TwiML.

export function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

const VOICE = 'Polly.Joanna-Neural';

function document(inner) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>${inner}</Response>`;
}

// Nothing matched the call. Deliberately says nothing about what exists: an
// unknown number learns no tenant mapping from the response.
export function unroutable() {
  return document(`<Say voice="${VOICE}">This number is not in service.</Say><Hangup/>`);
}

export function failed(message = 'Sorry, something went wrong. Please try again later.') {
  return document(`<Say voice="${VOICE}">${escapeXml(message)}</Say><Hangup/>`);
}

// Ask who is calling and why, then post the speech result back. `speechTimeout`
// auto ends the turn on a natural pause rather than after a fixed wait.
export function screen({ actionUrl, greeting, seconds }) {
  const prompt = greeting || 'You have reached a screened line. Please say your name and what you are calling about.';
  return document(
    `<Gather input="speech" method="POST" action="${escapeXml(actionUrl)}"` +
    ` speechTimeout="auto" timeout="${Number(seconds) || 10}" language="en-US" profanityFilter="false">` +
    `<Say voice="${VOICE}">${escapeXml(prompt)}</Say>` +
    `</Gather>` +
    // Reached when the caller said nothing at all.
    `<Redirect method="POST">${escapeXml(actionUrl)}?silent=1</Redirect>`,
  );
}

// Offer the call to the member. The whisper plays only to the member, so the
// caller does not hear their own words read back, and the call connects only on
// a keypress: without it an answering machine at the destination would swallow
// the call and report it as connected.
export function offer({ to, callerId, whisperUrl, actionUrl, ringSeconds, recording }) {
  const record = recording ? ' record="record-from-answer-dual"' : '';
  return document(
    `<Dial timeout="${Number(ringSeconds) || 20}" callerId="${escapeXml(callerId)}" answerOnBridge="true"` +
    ` action="${escapeXml(actionUrl)}" method="POST"${record}>` +
    `<Number url="${escapeXml(whisperUrl)}" method="POST">${escapeXml(to)}</Number>` +
    `</Dial>`,
  );
}

// Played to the member only, before the two legs are bridged.
export function whisper({ caller, said, acceptDigit = '1' }) {
  const who = said ? `${caller}. They said: ${said}` : `${caller}. They did not say why.`;
  return document(
    `<Gather numDigits="1" timeout="8">` +
    `<Say voice="${VOICE}">Screened call from ${escapeXml(who)}. Press ${escapeXml(acceptDigit)} to accept.</Say>` +
    `</Gather>` +
    // No keypress is a decline, not an accept. Falling through to the caller
    // here is what would let voicemail answer on the member's behalf.
    `<Hangup/>`,
  );
}

export function takeMessage({ actionUrl, maxSeconds = 120, prompt }) {
  const text = prompt || 'They are not available. Please leave a message after the tone, then hang up.';
  return document(
    `<Say voice="${VOICE}">${escapeXml(text)}</Say>` +
    `<Record maxLength="${Number(maxSeconds) || 120}" playBeep="true" trim="trim-silence"` +
    ` action="${escapeXml(actionUrl)}" method="POST" recordingStatusCallback="${escapeXml(actionUrl)}"/>` +
    `<Say voice="${VOICE}">Thank you. Goodbye.</Say><Hangup/>`,
  );
}

// Hand the caller to the configured assistant over SIP. The provider negotiates
// media directly with the assistant, so no audio passes through this process.
export function connectAssistant({ sipUri, actionUrl, recording }) {
  const record = recording ? ' record="record-from-answer-dual"' : '';
  return document(
    `<Dial answerOnBridge="true" action="${escapeXml(actionUrl)}" method="POST"${record}>` +
    `<Sip>${escapeXml(sipUri)}</Sip>` +
    `</Dial>`,
  );
}

export function goodbye(message = 'Thank you. Goodbye.') {
  return document(`<Say voice="${VOICE}">${escapeXml(message)}</Say><Hangup/>`);
}
