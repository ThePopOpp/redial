import { test, expect } from '@playwright/test';
import { applyReviewCommand, commandSchema, simulatePolicy } from '../src/lib/review/commands';
import { makeReviewState } from '../src/lib/review/seed';
const now = '2026-09-19T12:00:00.000Z';

test('Gavel serializes routing and only grants the human after AI detach', () => {
  const seed = makeReviewState(now);
  const listening = applyReviewCommand(seed, { type: 'live.insider', listening: true }, now);
  const pending = applyReviewCommand(listening, { type: 'live.gavel' }, now);
  expect(pending.live.agentAttached).toBe(true);
  expect(() => applyReviewCommand(pending, { type: 'live.transfer', destinationId: 'office' }, now)).toThrow(/already pending/);
  expect(() => applyReviewCommand(pending, { type: 'live.gavel' }, now)).toThrow(/owns this call/);
  const accepted = applyReviewCommand(pending, { type: 'live.advance' }, now);
  expect(accepted.live.mode).toBe('handoff_pending');
  expect(accepted.live.agentAttached).toBe(true);
  const detached = applyReviewCommand(accepted, { type: 'live.advance' }, now);
  expect(detached.live).toMatchObject({ mode: 'human_active', agentAttached: false, listening: false });
  expect(() => applyReviewCommand(detached, { type: 'live.guidance', text: 'No longer deliverable', agentSessionId: detached.live.agentSessionId }, now)).toThrow(/unavailable/);
  expect(seed.live.mode).toBe('ai_active');
});
test('Insider leaving does not end the caller or detach the AI', () => {
  const state = applyReviewCommand(applyReviewCommand(makeReviewState(now), { type: 'live.insider', listening: true }, now), { type: 'live.insider', listening: false }, now);
  expect(state.live).toMatchObject({ mode: 'ai_active', agentAttached: true, listening: false });
});
test('Audible is session bound, expires, and remains outside caller data and audit content', () => {
  const seed = makeReviewState(now);
  expect(() => applyReviewCommand(seed, { type: 'live.guidance', text: 'Hello', agentSessionId: 'old-session' }, now)).toThrow(/old AI session/);
  const queued = applyReviewCommand(seed, { type: 'live.guidance', text: 'Private review instruction', agentSessionId: seed.live.agentSessionId }, now);
  expect(JSON.stringify(queued.calls)).not.toContain('Private review instruction');
  expect(JSON.stringify(queued.audit)).not.toContain('Private review instruction');
  expect(JSON.stringify(queued.live.events)).not.toContain('Private review instruction');
  expect(() => applyReviewCommand(queued, { type: 'live.guidance_ack', id: queued.live.guidance[0].id }, '2026-09-19T12:01:01.000Z')).toThrow(/no longer deliverable/);
  const ended = applyReviewCommand(queued, { type: 'live.end' }, now);
  expect(ended.live.guidance[0].state).toBe('canceled');
  expect(commandSchema.safeParse({ type: 'live.guidance', text: 'x'.repeat(1001), agentSessionId: seed.live.agentSessionId }).success).toBe(false);
});
test('Directory locks pending targets, rejects loops, and requires acceptance', () => {
  const seed = makeReviewState(now);
  expect(() => applyReviewCommand(seed, { type: 'live.transfer', destinationId: 'accounts' }, now)).toThrow(/Enable/);
  expect(() => applyReviewCommand(seed, { type: 'directory.save', name: 'Loop', kind: 'phone', phone: '+16025550100', extension: '' }, now)).toThrow(/inbound/);
  const pending = applyReviewCommand(seed, { type: 'live.transfer', destinationId: 'office' }, now);
  expect(pending.live).toMatchObject({ mode: 'transfer_pending', agentAttached: true });
  expect(() => applyReviewCommand(pending, { type: 'directory.toggle', id: 'office' }, now)).toThrow(/pending transfer/);
  expect(() => applyReviewCommand(pending, { type: 'directory.delete', id: 'office' }, now)).toThrow(/pending transfer/);
  const failed = applyReviewCommand(pending, { type: 'live.fail' }, now);
  expect(failed.live.mode).toBe('ai_active');
  const accepted = applyReviewCommand(pending, { type: 'live.advance' }, now);
  expect(accepted.live).toMatchObject({ mode: 'transferred_out', agentAttached: false, listening: false });
});
test('human ownership survives a failed onward Directory transfer', () => {
  let state = makeReviewState(now);
  for (const type of ['live.gavel', 'live.advance', 'live.advance'] as const) state = applyReviewCommand(state, { type }, now);
  state = applyReviewCommand(state, { type: 'live.transfer', destinationId: 'office' }, now);
  state = applyReviewCommand(state, { type: 'live.fail' }, now);
  expect(state.live).toMatchObject({ mode: 'human_active', agentAttached: false });
});
test('billing invite has no implied line rights and production data is rejected', () => {
  const state = applyReviewCommand(makeReviewState(now), { type: 'people.invite', name: 'Example', email: 'example@example.test', role: 'billing' }, now);
  expect(state.people.at(-1)?.grants).toEqual([]);
  expect(commandSchema.safeParse({ type: 'contact.save', name: 'Real', phone: '+16021234567', policy: 'standard' }).success).toBe(false);
  expect(commandSchema.safeParse({ type: 'people.invite', name: 'Real', email: 'real@gmail.com', role: 'billing' }).success).toBe(false);
  expect(commandSchema.safeParse({ type: 'call.read', id: 'delivery-example', unread: false, role: 'admin' }).success).toBe(false);
});
test('campaign changes invalidate approvals and stale decisions cannot be applied', () => {
  const submitted = applyReviewCommand(makeReviewState(now), { type: 'campaign.review', id: 'campaign-1' }, now);
  const approval = submitted.approvals[0];
  const edited = applyReviewCommand(submitted, { type: 'campaign.save', id: 'campaign-1', title: 'Updated', body: 'Changed content.' }, now);
  expect(edited.campaigns[0].status).toBe('draft');
  expect(edited.approvals[0].status).toBe('rejected');
  expect(() => applyReviewCommand(edited, { type: 'approval.decide', id: approval.id, decision: 'approved' }, now)).toThrow(/already decided/);
});
test('example prices match v1.1 and refunded records cannot be refunded again', () => {
  for (const [plan, monthly] of [['Doorstep BYO', 0], ['Concierge BYO', 12], ['Estate BYO', 29], ['Concierge Managed', 29], ['Estate Managed', 69]] as const) {
    const state = applyReviewCommand(makeReviewState(now), { type: 'billing.change', plan, cadence: 'annual' }, now);
    if (monthly) { expect(state.billing.payments[0].amount).toBe(monthly * 1000); const refunded = applyReviewCommand(state, { type: 'billing.refund', id: state.billing.payments[0].id }, now); expect(() => applyReviewCommand(refunded, { type: 'billing.refund', id: state.billing.payments[0].id }, now)).toThrow(/already been refunded/); }
    else expect(state.billing.payments).toHaveLength(0);
  }
});
test('policy preserves explicit block precedence and unavailable reputation/fallback states', () => {
  const input = { known: true, blocked: true, vip: true, spam: false, spamSignal: false, fallbackReady: false };
  const policy = makeReviewState(now).screening;
  expect(simulatePolicy(policy, input).outcome).toBe('End call');
  expect(simulatePolicy(policy, { ...input, blocked: false }).outcome).toBe('Unavailable');
  expect(simulatePolicy({ ...policy, mode: 'all', vip: false }, { ...input, blocked: false, fallbackReady: true }).outcome).toBe('Screen call');
  expect(simulatePolicy({ ...policy, mode: 'spam_only', vip: false }, { ...input, blocked: false, fallbackReady: true }).outcome).toBe('Unavailable');
});
