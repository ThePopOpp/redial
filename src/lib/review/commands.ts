import { z } from 'zod';
import type { ReviewState } from './model';
import { makeReviewState } from './seed';

const id = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
const text = (max: number) => z.string().trim().min(1).max(max);
// Only fictional North American 555-01xx numbers may enter the local fixture store.
const phone = z.string().regex(/^\+1[2-9]\d{2}55501\d{2}$/, 'Use a fictional +1 area-code 555-01xx number, e.g. +16025550149.');
const email = z.email().max(150).refine(value => value.endsWith('@example.test'), 'Use an @example.test address for this local review.');
const timezone = z.string().max(80).refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } }, 'Choose a valid IANA timezone.');
const grants = z.enum(['read_summary', 'read_transcript', 'manage_rules', 'monitor_live', 'takeover_live', 'direct_agent', 'transfer_call']);

export const commandSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('call.read'), id, unread: z.boolean() }),
  z.strictObject({ type: z.literal('call.label'), id, outcome: z.enum(['message', 'blocked', 'connected', 'missed']) }),
  z.strictObject({ type: z.literal('call.delete'), id }),
  z.strictObject({ type: z.literal('callback.create'), name: text(100), phone, scheduledAt: z.iso.datetime(), timezone, note: z.string().trim().max(500) }),
  z.strictObject({ type: z.literal('callback.toggle'), id }),
  z.strictObject({ type: z.literal('callback.delete'), id }),
  z.strictObject({ type: z.literal('contact.save'), id: id.optional(), name: text(100), phone, policy: z.enum(['standard', 'vip', 'blocked']) }),
  z.strictObject({ type: z.literal('contact.delete'), id }),
  z.strictObject({ type: z.literal('directory.save'), id: id.optional(), name: text(100), phone, kind: z.enum(['phone', 'extension', 'internal']), extension: z.string().regex(/^\d{0,8}$/) }),
  z.strictObject({ type: z.literal('directory.toggle'), id }),
  z.strictObject({ type: z.literal('directory.delete'), id }),
  z.strictObject({ type: z.literal('screening.save'), mode: z.enum(['spam_only', 'unknown', 'all']), vip: z.boolean(), paused: z.boolean(), maxSeconds: z.number().int().min(30).max(120) }),
  z.strictObject({ type: z.literal('agent.save'), name: text(80), voice: z.enum(['Calm', 'Warm', 'Direct']), greeting: text(400), instructions: text(1800) }),
  z.strictObject({ type: z.literal('people.invite'), name: text(100), email, role: z.enum(['billing', 'member']) }),
  z.strictObject({ type: z.literal('people.grants'), id, grants: z.array(grants).max(7) }),
  z.strictObject({ type: z.literal('preferences.save'), name: text(100), timezone, transcript: z.boolean(), recording: z.literal(false), retentionDays: z.union([z.literal(7), z.literal(30), z.literal(90)]), email: z.boolean(), push: z.boolean(), marketing: z.boolean() }),
  z.strictObject({ type: z.literal('ticket.create'), subject: text(120), body: text(1500), priority: z.enum(['normal', 'urgent']) }),
  z.strictObject({ type: z.literal('ticket.update'), id, status: z.enum(['open', 'in_progress', 'resolved']), reply: z.string().trim().max(1500) }),
  z.strictObject({ type: z.literal('billing.change'), plan: z.enum(['Doorstep BYO', 'Concierge BYO', 'Estate BYO', 'Concierge Managed', 'Estate Managed']), cadence: z.enum(['monthly', 'annual']) }),
  z.strictObject({ type: z.literal('billing.cancel') }),
  z.strictObject({ type: z.literal('billing.refund'), id }),
  z.strictObject({ type: z.literal('setup.save'), connection: z.enum(['dedicated', 'conditional']), step: z.number().int().min(1).max(4), acknowledged: z.boolean() }),
  z.strictObject({ type: z.literal('live.insider'), listening: z.boolean() }),
  z.strictObject({ type: z.literal('live.gavel') }),
  z.strictObject({ type: z.literal('live.advance') }),
  z.strictObject({ type: z.literal('live.fail') }),
  z.strictObject({ type: z.literal('live.guidance'), text: text(1000), agentSessionId: id }),
  z.strictObject({ type: z.literal('live.guidance_ack'), id }),
  z.strictObject({ type: z.literal('live.guidance_cancel'), id }),
  z.strictObject({ type: z.literal('live.transfer'), destinationId: id }),
  z.strictObject({ type: z.literal('live.end') }),
  z.strictObject({ type: z.literal('live.restart') }),
  z.strictObject({ type: z.literal('lead.save'), id: id.optional(), name: text(100), company: text(100), email, stage: z.enum(['new', 'qualified', 'pilot', 'customer']), marketingConsent: z.boolean() }),
  z.strictObject({ type: z.literal('campaign.save'), id: id.optional(), title: text(120), body: text(3000) }),
  z.strictObject({ type: z.literal('campaign.review'), id }),
  z.strictObject({ type: z.literal('approval.decide'), id, decision: z.enum(['approved', 'rejected']) }),
  z.strictObject({ type: z.literal('content.save'), id: id.optional(), title: text(120), slug: z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), body: text(5000), status: z.enum(['draft', 'in_review']) }),
  z.strictObject({ type: z.literal('task.create'), title: text(150), owner: text(80) }),
  z.strictObject({ type: z.literal('task.toggle'), id }),
  z.strictObject({ type: z.literal('review.reset') }),
]);
export type ReviewCommand = z.infer<typeof commandSchema>;
export const requestSchema = z.strictObject({ version: z.number().int().positive(), command: commandSchema });

export class ReviewError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
function find<T extends { id: string }>(items: T[], itemId: string): T {
  const item = items.find(value => value.id === itemId);
  if (!item) throw new ReviewError(404, 'NOT_FOUND', 'That local record was not found.');
  return item;
}
function requireState(condition: boolean, message: string) {
  if (!condition) throw new ReviewError(409, 'INVALID_STATE', message);
}

// A deterministic LOCAL simulator. This reducer must never execute a provider write.
export function applyReviewCommand(previous: ReviewState, command: ReviewCommand, now = new Date().toISOString(), uuid = () => crypto.randomUUID()): ReviewState {
  const state = structuredClone(previous);
  const event = (message: string) => state.live.events.unshift({ id: uuid(), at: now, message });
  const expireGuidance = () => { for (const item of state.live.guidance) if (item.state === 'queued' && Date.parse(now) - Date.parse(item.createdAt) >= 60_000) item.state = 'expired'; };
  expireGuidance();
  switch (command.type) {
    case 'call.read': find(state.calls, command.id).unread = command.unread; break;
    case 'call.label': find(state.calls, command.id).outcome = command.outcome; break;
    case 'call.delete': find(state.calls, command.id); state.calls = state.calls.filter(call => call.id !== command.id); break;
    case 'callback.create':
      requireState(Date.parse(command.scheduledAt) > Date.parse(now), 'Choose a future date and time.');
      state.callbacks.unshift({ ...command, id: uuid(), done: false }); break;
    case 'callback.toggle': { const item = find(state.callbacks, command.id); item.done = !item.done; break; }
    case 'callback.delete': find(state.callbacks, command.id); state.callbacks = state.callbacks.filter(item => item.id !== command.id); break;
    case 'contact.save': {
      requireState(!state.contacts.some(item => item.phone === command.phone && item.id !== command.id), 'That number already exists in Contacts.');
      if (command.id) Object.assign(find(state.contacts, command.id), { name: command.name, phone: command.phone, policy: command.policy });
      else state.contacts.unshift({ ...command, id: uuid() }); break;
    }
    case 'contact.delete': find(state.contacts, command.id); state.contacts = state.contacts.filter(item => item.id !== command.id); break;
    case 'directory.save': {
      requireState(state.live.mode !== 'transfer_pending' || state.live.targetId !== command.id, 'Cancel the pending transfer before editing its destination.');
      requireState(command.phone !== '+16025550100', 'A destination cannot be the illustrative inbound/forwarding number.');
      requireState(command.kind !== 'extension' || command.extension.length > 0, 'An extension route requires a separate extension.');
      if (command.id) { const item = find(state.directory, command.id); Object.assign(item, command, { enabled: false, version: item.version + 1 }); }
      else state.directory.unshift({ ...command, id: uuid(), enabled: false, version: 1 }); break;
    }
    case 'directory.toggle': { requireState(state.live.mode !== 'transfer_pending' || state.live.targetId !== command.id, 'Cancel the pending transfer before changing its approval.'); const item = find(state.directory, command.id); item.enabled = !item.enabled; item.version++; break; }
    case 'directory.delete':
      requireState(state.live.targetId !== command.id || !['transfer_pending'].includes(state.live.mode), 'Cancel the pending transfer before deleting its destination.');
      find(state.directory, command.id); state.directory = state.directory.filter(item => item.id !== command.id); break;
    case 'screening.save': state.screening = { mode: command.mode, vip: command.vip, paused: command.paused, maxSeconds: command.maxSeconds, version: state.screening.version + 1 }; break;
    case 'agent.save': state.agent = { name: command.name, voice: command.voice, greeting: command.greeting, instructions: command.instructions, version: state.agent.version + 1 }; break;
    case 'people.invite': requireState(!state.people.some(item => item.email === command.email), 'This example address already belongs to the workspace.'); state.people.push({ ...command, id: uuid(), status: 'invited', grants: [] }); break;
    case 'people.grants': { const person = find(state.people, command.id); requireState(person.role !== 'owner', 'The owner’s own-line permissions are fixed in this review.'); person.grants = [...new Set(command.grants)]; break; }
    case 'preferences.save': state.profile = { name: command.name, timezone: command.timezone }; state.preferences = { transcript: command.transcript, recording: false, retentionDays: command.retentionDays, email: command.email, push: command.push, marketing: command.marketing }; break;
    case 'ticket.create': state.tickets.unshift({ ...command, id: uuid(), status: 'open', replies: [] }); break;
    case 'ticket.update': { const ticket = find(state.tickets, command.id); ticket.status = command.status; if (command.reply) ticket.replies.push({ text: command.reply, at: now }); break; }
    case 'billing.change': {
      const prices = { 'Doorstep BYO': 0, 'Concierge BYO': 12, 'Estate BYO': 29, 'Concierge Managed': 29, 'Estate Managed': 69 };
      state.billing.plan = command.plan; state.billing.cadence = command.cadence; state.billing.status = prices[command.plan] ? 'simulated_active' : 'free';
      state.billing.periodEnd = new Date(Date.parse(now) + (command.cadence === 'annual' ? 365 : 30) * 86400_000).toISOString();
      if (prices[command.plan]) state.billing.payments.unshift({ id: uuid(), plan: command.plan, at: now, amount: prices[command.plan] * (command.cadence === 'annual' ? 10 : 1) * 100, status: 'simulated_paid' }); break;
    }
    case 'billing.cancel': requireState(state.billing.status === 'simulated_active', 'There is no active illustrative paid membership to cancel.'); state.billing.status = 'cancel_scheduled'; break;
    case 'billing.refund': { const item = find(state.billing.payments, command.id); requireState(item.status !== 'simulated_refunded', 'This illustrative payment has already been refunded.'); item.status = 'simulated_refunded'; break; }
    case 'setup.save': state.setup = { connection: command.connection, step: command.step, acknowledged: command.acknowledged }; break;
    case 'live.insider': requireState(state.live.mode === 'ai_active', 'Insider is available only during the simulated AI phase.'); state.live.listening = command.listening; event(command.listening ? 'Simulated Insider listener joined provider-muted. No audio is playing.' : 'Simulated listener left; caller and AI remain.'); break;
    case 'live.gavel': requireState(state.live.mode === 'ai_active', 'Another operation or handler owns this call.'); state.live.mode = 'handoff_pending'; state.live.phase = 'preparing_endpoint'; event('Gavel simulation: preparing a muted human endpoint.'); break;
    case 'live.advance':
      if (state.live.mode === 'handoff_pending') {
        if (state.live.phase === 'preparing_endpoint') { state.live.phase = 'silencing_ai'; event('Simulated human endpoint accepted. Awaiting the AI detach barrier.'); }
        else { state.live.agentAttached = false; state.live.listening = false; state.live.mode = 'human_active'; state.live.phase = 'idle'; for (const item of state.live.guidance) if (item.state === 'queued') item.state = 'canceled'; event('Simulated AI input/output/tools stopped and buffers cleared; AI removed; one human owns the call.'); }
      } else if (state.live.mode === 'transfer_pending') {
        state.live.mode = 'transferred_out'; state.live.phase = 'idle'; state.live.agentAttached = false; state.live.listening = false;
        for (const item of state.live.guidance) if (item.state === 'queued') item.state = 'canceled';
        event('Simulated destination accepted and bridged. Redial controls are closed; no real transfer occurred.');
      } else throw new ReviewError(409, 'NO_OPERATION', 'There is no pending transition.');
      break;
    case 'live.fail': requireState(['handoff_pending', 'transfer_pending'].includes(state.live.mode), 'There is no pending operation to cancel.'); state.live.mode = state.live.agentAttached ? 'ai_active' : 'human_active'; state.live.phase = 'idle'; state.live.targetId = null; event('Simulated pending operation failed or was canceled; the prior handler retains the caller.'); break;
    case 'live.guidance':
      requireState(state.live.mode === 'ai_active' && state.live.agentAttached, 'Audible is unavailable once a handoff starts or the AI leaves.');
      requireState(command.agentSessionId === state.live.agentSessionId, 'This guidance targets an old AI session.');
      state.live.guidance.unshift({ id: uuid(), text: command.text, state: 'queued', createdAt: now, sessionId: command.agentSessionId }); event('Private simulated guidance queued. Content excluded from this event log.'); break;
    case 'live.guidance_ack': { const item = find(state.live.guidance, command.id); requireState(item.state === 'queued' && state.live.mode === 'ai_active' && item.sessionId === state.live.agentSessionId, 'This instruction is no longer deliverable.'); item.state = 'simulated_acknowledged'; event('Simulated adapter acknowledged delivery, not obedience.'); break; }
    case 'live.guidance_cancel': { const item = find(state.live.guidance, command.id); requireState(item.state === 'queued', 'Only queued guidance can be canceled.'); item.state = 'canceled'; break; }
    case 'live.transfer': {
      requireState(['ai_active', 'human_active'].includes(state.live.mode), 'A takeover or transfer is already pending, or this call has ended.');
      const target = find(state.directory, command.destinationId); requireState(target.enabled, 'Enable this destination for simulation first.');
      requireState(target.kind !== 'extension', 'Extension/IVR transfers need separate provider testing; this simulator covers saved phones and users.');
      state.live.mode = 'transfer_pending'; state.live.phase = 'dialing_target'; state.live.targetId = target.id; event('Directory simulation: target ringing. Answer is not acceptance.'); break;
    }
    case 'live.end': state.live.mode = 'ended'; state.live.phase = 'idle'; state.live.listening = false; state.live.agentAttached = false; for (const item of state.live.guidance) if (item.state === 'queued') item.state = 'canceled'; event('Simulated caller ended; all participants cleaned up.'); break;
    case 'live.restart': state.live = makeReviewState(now).live; state.live.agentSessionId = uuid(); break;
    case 'lead.save': if (command.id) Object.assign(find(state.leads, command.id), command); else state.leads.unshift({ ...command, id: uuid() }); break;
    case 'campaign.save': {
      if (command.id) { const item = find(state.campaigns, command.id); Object.assign(item, { title: command.title, body: command.body, status: 'draft', version: item.version + 1 }); for (const approval of state.approvals) if (approval.resourceId === command.id && approval.kind === 'campaign') approval.status = 'rejected'; }
      else state.campaigns.unshift({ id: uuid(), title: command.title, body: command.body, status: 'draft', version: 1 }); break;
    }
    case 'campaign.review': { const item = find(state.campaigns, command.id); requireState(item.status === 'draft', 'This draft is already in review or approved.'); item.status = 'in_review'; state.approvals.unshift({ id: uuid(), title: item.title, kind: 'campaign', resourceId: item.id, status: 'pending', version: item.version }); break; }
    case 'approval.decide': { const item = find(state.approvals, command.id); requireState(item.status === 'pending', 'This approval was already decided.'); if (item.kind === 'campaign') { const campaign = find(state.campaigns, item.resourceId); requireState(item.version === campaign.version, 'The draft changed; request a new review.'); campaign.status = command.decision === 'approved' ? 'approved' : 'draft'; } item.status = command.decision; break; }
    case 'content.save': requireState(!state.content.some(item => item.slug === command.slug && item.id !== command.id), 'This slug is already used.'); if (command.id) Object.assign(find(state.content, command.id), command); else state.content.unshift({ ...command, id: uuid() }); break;
    case 'task.create': state.tasks.unshift({ ...command, id: uuid(), done: false }); break;
    case 'task.toggle': { const item = find(state.tasks, command.id); item.done = !item.done; break; }
    case 'review.reset': { const reset = makeReviewState(now); reset.version = previous.version + 1; return reset; }
  }
  state.version++; state.updatedAt = now;
  state.audit.unshift({ id: uuid(), action: command.type, at: now, detail: 'Local simulation change only; no external effect.' });
  state.audit = state.audit.slice(0, 250); state.live.events = state.live.events.slice(0, 100);
  for (const collection of [state.contacts, state.directory, state.callbacks, state.people, state.tickets, state.leads, state.campaigns, state.content, state.tasks, state.approvals, state.billing.payments, state.live.guidance]) requireState(collection.length <= 100, 'This local review has reached its 100-record limit. Reset the review to continue.');
  return state;
}

export function simulatePolicy(policy: ReviewState['screening'], input: { known: boolean; blocked: boolean; vip: boolean; spam: boolean; spamSignal: boolean; fallbackReady: boolean }) {
  if (input.blocked) return { outcome: 'End call', reason: 'An explicit block rule takes precedence.' };
  if (!input.fallbackReady) return { outcome: 'Unavailable', reason: 'A safe tested fallback is required before activation.' };
  if (policy.paused) return { outcome: 'Use fallback', reason: 'AI screening is paused. Carrier forwarding is unchanged.' };
  if (policy.vip && input.vip) return { outcome: 'Request connection', reason: 'The member explicitly enabled this VIP exception; number matching does not verify identity.' };
  if (policy.mode === 'unknown' && input.known) return { outcome: 'Request connection', reason: 'A known contact bypasses Unknown mode, subject to route availability.' };
  if (policy.mode === 'spam_only' && !input.spamSignal) return { outcome: 'Unavailable', reason: 'Spam-only mode requires a supported reputation signal.' };
  if (policy.mode === 'spam_only' && !input.spam) return { outcome: 'Request connection', reason: 'No supported spam flag is present.' };
  return { outcome: 'Screen call', reason: policy.mode === 'all' ? 'Every call includes saved contacts unless an explicit VIP exception applies.' : 'Ask for context and take a message under the configured policy.' };
}

