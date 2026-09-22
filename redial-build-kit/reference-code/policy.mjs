/** @typedef {'spam_only'|'unknown_callers'|'every_call'} ScreeningMode */
/**
 * All booleans are server-established facts, NOT values accepted from a caller,
 * browser, extension, model response or unchecked webhook body.
 * @typedef {Object} PolicyContext
 * @property {boolean} transportVerified
 * @property {boolean} ownershipVerified
 * @property {boolean} routeVerified
 * @property {boolean} routeHasCycle
 * @property {number} redirectDepth
 * @property {boolean} explicitlyBlocked
 * @property {boolean} paused
 * @property {boolean} contactMatched
 * @property {boolean} explicitVipOverride
 * @property {boolean} memberReachable
 * @property {boolean} destinationSafe
 * @property {boolean} spamSignalAvailable
 * @property {boolean} spamFlagged
 * @property {boolean} processingAllowed
 * @property {boolean} aiAvailable
 * @property {boolean} aiBudgetAvailable
 * @property {ScreeningMode} mode
 * @property {boolean} [callerClaimsUrgency]
 */

const BOOL_KEYS = Object.freeze([
  'transportVerified', 'ownershipVerified', 'routeVerified', 'routeHasCycle',
  'explicitlyBlocked', 'paused', 'contactMatched', 'explicitVipOverride',
  'memberReachable', 'destinationSafe', 'spamSignalAvailable', 'spamFlagged',
  'processingAllowed', 'aiAvailable', 'aiBudgetAvailable',
]);
const MODES = new Set(['spam_only', 'unknown_callers', 'every_call']);
export const MAX_REDIRECT_DEPTH = 3; // Proposed example policy, not a provider limit.

/** @param {unknown} context @returns {asserts context is PolicyContext} */
function validate(context) {
  if (context === null || typeof context !== 'object' || Array.isArray(context)) {
    throw new TypeError('Policy context must be an object.');
  }
  for (const key of BOOL_KEYS) {
    if (typeof context[key] !== 'boolean') throw new TypeError(`${key} must be boolean.`);
  }
  if (!MODES.has(context.mode)) throw new TypeError('Unsupported screening mode.');
  if (!Number.isInteger(context.redirectDepth) || context.redirectDepth < 0) {
    throw new TypeError('redirectDepth must be a nonnegative integer.');
  }
  if ('callerClaimsUrgency' in context && typeof context.callerClaimsUrgency !== 'boolean') {
    throw new TypeError('callerClaimsUrgency must be boolean when supplied.');
  }
  if (context.spamFlagged && !context.spamSignalAvailable) {
    throw new TypeError('A spam verdict requires an available signal.');
  }
}

/** @param {string} action @param {string} reason */
function result(action, reason) {
  return Object.freeze({ action, reason });
}

/** @param {PolicyContext} c @param {string} reason */
function ringOrFallback(c, reason) {
  return c.memberReachable && c.destinationSafe
    ? result('ring_member', reason)
    : result('fallback', 'MEMBER_DESTINATION_UNAVAILABLE');
}

/**
 * Determine a proposed routing action without network or storage side effects.
 * @param {PolicyContext} context
 * @returns {Readonly<{action:string, reason:string}>}
 */
export function decideCall(context) {
  validate(context);
  const c = context;
  if (!c.transportVerified) return result('reject', 'UNVERIFIED_TRANSPORT');
  if (!c.ownershipVerified) return result('reject', 'UNVERIFIED_OWNERSHIP');
  if (!c.routeVerified) return result('fallback', 'ROUTE_UNVERIFIED');
  if (c.routeHasCycle || c.redirectDepth >= MAX_REDIRECT_DEPTH) {
    return result('fallback', 'ROUTING_LOOP_GUARD');
  }
  if (c.explicitlyBlocked) return result('end', 'EXPLICIT_BLOCK');
  if (c.paused) return ringOrFallback(c, 'SCREENING_PAUSED');
  if (c.explicitVipOverride && c.contactMatched) return ringOrFallback(c, 'VIP_OVERRIDE');

  // Caller-claimed urgency is deliberately not used to bypass a policy.
  let shouldScreen;
  if (c.mode === 'every_call') shouldScreen = true;
  else if (c.mode === 'unknown_callers') shouldScreen = !c.contactMatched;
  else if (!c.spamSignalAvailable) return ringOrFallback(c, 'SPAM_SIGNAL_UNAVAILABLE');
  else shouldScreen = c.spamFlagged;

  if (!shouldScreen) return ringOrFallback(c, 'MODE_BYPASS');
  if (!c.processingAllowed) return result('fallback', 'PROCESSING_NOT_ALLOWED');
  if (!c.aiAvailable) return result('fallback', 'AI_UNAVAILABLE');
  if (!c.aiBudgetAvailable) return result('fallback', 'AI_BUDGET_EXHAUSTED');
  return result('screen', 'SCREENING_PERMITTED');
}
