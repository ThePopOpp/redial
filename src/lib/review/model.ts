export type CallOutcome = 'message' | 'blocked' | 'connected' | 'missed';
export type LineGrant = 'read_summary' | 'read_transcript' | 'manage_rules' | 'monitor_live' | 'takeover_live' | 'direct_agent' | 'transfer_call';
export type ReviewCall = { id: string; caller: string; phone: string; category: string; outcome: CallOutcome; at: string; duration: number; summary: string; unread: boolean; transcript: { speaker: string; text: string }[] };
export type Destination = { id: string; name: string; phone: string; kind: 'phone' | 'extension' | 'internal'; extension: string; enabled: boolean; version: number };
export type LiveState = { id: string; agentSessionId: string; mode: 'ai_active' | 'handoff_pending' | 'human_active' | 'transfer_pending' | 'transferred_out' | 'ended'; phase: string; listening: boolean; agentAttached: boolean; targetId: string | null; guidance: { id: string; text: string; state: 'queued' | 'simulated_acknowledged' | 'canceled' | 'expired'; sessionId: string; createdAt: string }[]; events: { id: string; message: string; at: string }[] };
export type ReviewState = {
  schemaVersion: 1; version: number; mode: 'local_simulation'; createdAt: string; updatedAt: string;
  profile: { name: string; timezone: string };
  calls: ReviewCall[];
  callbacks: { id: string; name: string; phone: string; scheduledAt: string; timezone: string; note: string; done: boolean }[];
  contacts: { id: string; name: string; phone: string; policy: 'standard' | 'vip' | 'blocked' }[];
  directory: Destination[];
  screening: { mode: 'spam_only' | 'unknown' | 'all'; vip: boolean; paused: boolean; maxSeconds: number; version: number };
  agent: { name: string; voice: string; greeting: string; instructions: string; version: number };
  people: { id: string; name: string; email: string; role: 'owner' | 'billing' | 'member'; status: 'active' | 'invited'; grants: LineGrant[] }[];
  preferences: { transcript: boolean; recording: boolean; retentionDays: number; email: boolean; push: boolean; marketing: boolean };
  tickets: { id: string; subject: string; body: string; status: 'open' | 'in_progress' | 'resolved'; priority: 'normal' | 'urgent'; replies: { text: string; at: string }[] }[];
  billing: { plan: string; cadence: 'monthly' | 'annual'; status: 'free' | 'simulated_active' | 'cancel_scheduled'; periodEnd: string; payments: { id: string; amount: number; at: string; status: 'simulated_paid' | 'simulated_refunded'; plan: string }[] };
  setup: { connection: 'dedicated' | 'conditional'; step: number; acknowledged: boolean };
  live: LiveState;
  leads: { id: string; name: string; company: string; email: string; stage: 'new' | 'qualified' | 'pilot' | 'customer'; marketingConsent: boolean }[];
  campaigns: { id: string; title: string; body: string; status: 'draft' | 'in_review' | 'approved'; version: number }[];
  content: { id: string; title: string; slug: string; body: string; status: 'draft' | 'in_review' }[];
  tasks: { id: string; title: string; owner: string; done: boolean }[];
  approvals: { id: string; title: string; kind: 'campaign' | 'agent'; resourceId: string; status: 'pending' | 'approved' | 'rejected'; version: number }[];
  audit: { id: string; action: string; at: string; detail: string }[];
};

export type ReviewView = 'overview' | 'calls' | 'screening' | 'agent' | 'numbers' | 'connections' | 'directory' | 'contacts' | 'callbacks' | 'people' | 'billing' | 'settings' | 'help' | 'onboarding' | 'live' | 'mobile' | 'extension' | 'ops' | 'ops/customers' | 'ops/revenue' | 'ops/support' | 'ops/voice' | 'ops/features' | 'ops/crm' | 'ops/campaigns' | 'ops/content' | 'ops/agents' | 'ops/approvals' | 'ops/tasks' | 'ops/audit' | 'ops/settings';
