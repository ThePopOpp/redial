import test from 'node:test';
import assert from 'node:assert/strict';
import { decideCall, MAX_REDIRECT_DEPTH } from './policy.mjs';

const BASE = Object.freeze({
  transportVerified: true, ownershipVerified: true, routeVerified: true,
  routeHasCycle: false, redirectDepth: 0, explicitlyBlocked: false,
  paused: false, contactMatched: false, explicitVipOverride: false,
  memberReachable: true, destinationSafe: true, spamSignalAvailable: true,
  spamFlagged: false, processingAllowed: true, aiAvailable: true,
  aiBudgetAvailable: true, mode: 'unknown_callers', callerClaimsUrgency: false,
});

const cases = [
  ['unknown caller is screened', {}, 'screen', 'SCREENING_PERMITTED'],
  ['unverified transport is rejected', { transportVerified: false }, 'reject', 'UNVERIFIED_TRANSPORT'],
  ['unverified ownership is rejected', { ownershipVerified: false }, 'reject', 'UNVERIFIED_OWNERSHIP'],
  ['missing route uses fallback', { routeVerified: false }, 'fallback', 'ROUTE_UNVERIFIED'],
  ['route cycle cannot ring', { routeHasCycle: true, paused: true }, 'fallback', 'ROUTING_LOOP_GUARD'],
  ['redirect depth guard', { redirectDepth: MAX_REDIRECT_DEPTH }, 'fallback', 'ROUTING_LOOP_GUARD'],
  ['explicit block wins over VIP', { explicitlyBlocked: true, contactMatched: true, explicitVipOverride: true }, 'end', 'EXPLICIT_BLOCK'],
  ['paused screening rings approved destination', { paused: true }, 'ring_member', 'SCREENING_PAUSED'],
  ['paused mode cannot ring unsafe destination', { paused: true, destinationSafe: false }, 'fallback', 'MEMBER_DESTINATION_UNAVAILABLE'],
  ['known caller bypasses unknown mode', { contactMatched: true }, 'ring_member', 'MODE_BYPASS'],
  ['every-call mode includes saved contacts', { mode: 'every_call', contactMatched: true }, 'screen', 'SCREENING_PERMITTED'],
  ['explicit VIP can bypass every-call mode', { mode: 'every_call', contactMatched: true, explicitVipOverride: true }, 'ring_member', 'VIP_OVERRIDE'],
  ['unmatched number cannot claim VIP', { mode: 'every_call', explicitVipOverride: true }, 'screen', 'SCREENING_PERMITTED'],
  ['flagged caller in spam-only mode is screened', { mode: 'spam_only', spamFlagged: true }, 'screen', 'SCREENING_PERMITTED'],
  ['unflagged caller in spam-only mode bypasses', { mode: 'spam_only' }, 'ring_member', 'MODE_BYPASS'],
  ['missing spam evidence is not a spam verdict', { mode: 'spam_only', spamSignalAvailable: false }, 'ring_member', 'SPAM_SIGNAL_UNAVAILABLE'],
  ['declined processing never opens AI', { processingAllowed: false }, 'fallback', 'PROCESSING_NOT_ALLOWED'],
  ['provider failure falls back', { aiAvailable: false }, 'fallback', 'AI_UNAVAILABLE'],
  ['quota exhaustion falls back', { aiBudgetAvailable: false }, 'fallback', 'AI_BUDGET_EXHAUSTED'],
  ['urgent claim cannot override quota', { callerClaimsUrgency: true, aiBudgetAvailable: false }, 'fallback', 'AI_BUDGET_EXHAUSTED'],
  ['urgent claim does not connect an unknown caller', { callerClaimsUrgency: true }, 'screen', 'SCREENING_PERMITTED'],
  ['VIP unreachable destination falls back', { contactMatched: true, explicitVipOverride: true, memberReachable: false }, 'fallback', 'MEMBER_DESTINATION_UNAVAILABLE'],
];
for (const [name, patch, action, reason] of cases) {
  test(name, () => assert.deepEqual(decideCall({ ...BASE, ...patch }), { action, reason }));
}

test('policy returns an immutable decision', () => assert.ok(Object.isFrozen(decideCall({ ...BASE }))));
test('does not mutate input', () => { const c = { ...BASE }; decideCall(c); assert.deepEqual(c, BASE); });
test('rejects null context', () => assert.throws(() => decideCall(null), TypeError));
test('rejects unknown mode', () => assert.throws(() => decideCall({ ...BASE, mode: 'anything' }), TypeError));
test('rejects a negative redirect count', () => assert.throws(() => decideCall({ ...BASE, redirectDepth: -1 }), TypeError));
test('rejects a fractional redirect count', () => assert.throws(() => decideCall({ ...BASE, redirectDepth: 0.5 }), TypeError));
test('rejects truthy strings as trusted booleans', () => assert.throws(() => decideCall({ ...BASE, ownershipVerified: 'true' }), TypeError));
test('rejects a spam verdict without a signal', () => assert.throws(() => decideCall({ ...BASE, spamSignalAvailable: false, spamFlagged: true }), TypeError));
test('rejects nonboolean urgency input', () => assert.throws(() => decideCall({ ...BASE, callerClaimsUrgency: 'urgent' }), TypeError));
