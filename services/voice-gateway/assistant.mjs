// The assistant turn: what to do once the caller has said something.
//
// This runs inside a Twilio webhook while a caller is on the line, which sets
// every constraint here. Twilio abandons a webhook that takes too long and the
// caller hears silence, so the model call is hard-bounded and every failure
// path lands on the rule-based plan the gateway already had. The free tier and
// the failure path are therefore the same code, which is the cheapest way to
// keep the failure path exercised rather than theoretical.
//
// The model is asked to choose from a closed set and to write one sentence. It
// is never asked for a phone number, a destination or anything else that moves
// a call: the endpoint comes from `chooseDestination`, which is pure, already
// tested, and enforces the loop and ownership guards. A model that returns
// nonsense can make the call less useful; it cannot make it go somewhere it
// should not.

import { normalizeSpeech } from './routing.mjs';

export const ACTIONS = ['connect', 'message', 'ask_again', 'decline'];

// Deliberately small. Every field is bounded and nothing here is interpolated
// into TwiML without escaping downstream.
export function parseDecision(raw, { turnsLeft }) {
  if (!raw || typeof raw !== 'object') return null;
  const action = typeof raw.action === 'string' ? raw.action.trim().toLowerCase() : '';
  if (!ACTIONS.includes(action)) return null;
  // Asking again when there are no turns left is a loop, so it is not an option
  // the model gets to pick regardless of what it returned.
  if (action === 'ask_again' && turnsLeft <= 0) return null;
  const say = normalizeSpeech(typeof raw.say === 'string' ? raw.say : '', 200);
  const reason = normalizeSpeech(typeof raw.reason === 'string' ? raw.reason : '', 120);
  // A turn that says nothing is not usable: every branch speaks to the caller.
  if (!say) return null;
  return { action, say, reason };
}

// The instruction. Kept in one place so it can be read, reviewed and version
// controlled rather than assembled from fragments at call time.
export function buildPrompt({ greeting, said, confidence, turnsLeft, canConnect }) {
  const lines = [
    'You screen phone calls for the person who owns this line. You are not that person and you must never claim to be.',
    'Decide what happens next and write one short sentence to say to the caller.',
    '',
    `Actions available: connect${canConnect ? '' : ' (UNAVAILABLE on this call)'}, message, ask_again${turnsLeft > 0 ? '' : ' (UNAVAILABLE, no turns left)'}, decline.`,
    'connect: the call seems legitimate and expected. message: send them to voicemail. ask_again: you need one more detail. decline: it is a sales or spam call.',
    '',
    `The line owner's greeting is: ${greeting || '(none set)'}`,
    `The caller said: ${said || '(nothing)'}`,
    confidence === null ? '' : `Speech recognition confidence: ${confidence}.`,
    '',
    'Reply with JSON only: {"action":"...","say":"...","reason":"..."}',
    'say: one sentence, under 200 characters, spoken aloud to the caller.',
    'reason: a few words for the line owner, not spoken.',
    'If the caller said nothing, do not decline them. People hesitate.',
  ];
  return lines.filter(Boolean).join('\n');
}

// One call, one bounded wait. No retry: a retry inside a live webhook spends
// the caller's patience twice and the fallback is already good.
export async function askModel({ apiKey, model, prompt, timeoutMs = 4000, fetchImpl = fetch }) {
  const response = await fetchImpl('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Assistant provider returned ${response.status}`);
  const body = await response.json();
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Assistant provider returned no content');
  return JSON.parse(content);
}

// The whole turn, including the decision not to ask at all.
//
// `fallback` is the rule-based plan the gateway computed before getting here.
// Every path that is not a clean, parseable, permitted decision returns it, so
// the caller's experience degrades to the current behaviour rather than to an
// error.
export async function decideTurn({ profile, said, confidence, destination, fallback, turnsUsed = 0, config, deps = {} }) {
  const reasonFor = why => ({ ...fallback, assistant: { used: false, why } });

  if (config.assistant !== 'enabled') return reasonFor('switched_off');
  if (!profile?.screening_enabled) return reasonFor('line_disabled');
  if (profile.model !== 'xai') return reasonFor('plan_tier');
  if (!config.xaiApiKey) return reasonFor('no_credential');

  const turnsLeft = Math.max(0, (profile.turns ?? 1) - turnsUsed - 1);
  const prompt = buildPrompt({
    greeting: profile.greeting, said, confidence, turnsLeft,
    canConnect: Boolean(destination?.ok),
  });

  let decision = null;
  try {
    decision = parseDecision(await askModel({
      apiKey: config.xaiApiKey, model: config.xaiModel, prompt,
      timeoutMs: config.assistantTimeoutMs, fetchImpl: deps.fetchImpl,
    }), { turnsLeft });
  } catch (error) {
    return { ...fallback, assistant: { used: false, why: 'provider_error', detail: String(error?.message ?? error).slice(0, 200) } };
  }
  if (!decision) return reasonFor('unusable_reply');

  // The model chose connect but the routing guards say there is nowhere safe to
  // send the call. The guards win: they are what stop a loop or a call to the
  // caller's own number.
  if (decision.action === 'connect' && !destination?.ok) {
    return { ...fallback, assistant: { used: true, why: 'connect_refused', say: decision.say, reason: decision.reason } };
  }

  if (decision.action === 'connect') {
    return { action: 'offer', endpoint: destination.endpoint, said: normalizeSpeech(said),
      uncertain: typeof confidence === 'number' && confidence < 0.5,
      assistant: { used: true, say: decision.say, reason: decision.reason } };
  }
  if (decision.action === 'ask_again') {
    return { action: 'ask_again', say: decision.say,
      assistant: { used: true, say: decision.say, reason: decision.reason } };
  }
  // decline and message both end in voicemail. A declined caller is still
  // offered a way to leave a message: the assistant's judgement is not a
  // verdict, and it is wrong often enough that a hard hangup would lose real
  // callers.
  return { action: 'message', reason: decision.action,
    assistant: { used: true, say: decision.say, reason: decision.reason } };
}
