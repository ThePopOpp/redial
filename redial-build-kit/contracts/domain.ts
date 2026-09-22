/** Proposed shared domain contracts; not provider SDK types or runtime validators.
 * Validate external data at the boundary and resolve security context server-side.
 */
export type Id = string;
export type ISODateTime = string;
export type Currency = 'USD';
export type PurchaseSource = 'free' | 'square' | 'apple' | 'google';
export type ConnectionMode = 'hosted_number' | 'byo_programmable' |
  'conditional_forwarding' | 'unconditional_forwarding' | 'sip' | 'ported';
export type ScreeningMode = 'spam_only' | 'unknown' | 'all';
export type Readiness = 'planned' | 'documented' | 'needs_setup' | 'verifying' |
  'sandbox_verified' | 'pilot_verified' | 'production_enabled' | 'degraded' | 'disabled';
export type LinePermission = 'read_summary' | 'read_transcript' | 'read_recording' |
  'manage_rules' | 'manage_route' | 'join_call' | 'export_content' |
  'read_live_metadata' | 'monitor_live' | 'takeover_live' | 'direct_agent' |
  'transfer_call' | 'manage_directory' | 'dial_custom_destination';
export interface Money { amountMinor: number; currency: Currency }
export interface Principal {
  userId: Id;
  workspaceId: Id;
  // Construct from verified identity + current membership, never request JSON.
  permissions: ReadonlySet<LinePermission>;
  lineIds: ReadonlySet<Id>;
}
export interface ProviderCapabilities {
  readiness: Readiness;
  bidirectionalAudio: boolean;
  codecFormats: readonly string[];
  transcripts: boolean;
  bargeIn: boolean;
  controlledTransfer: boolean;
  conferenceMonitoring: boolean;
  spamSignal: boolean;
  numberProvisioning: boolean;
  lastVerifiedAt: ISODateTime | null;
  evidenceId: Id | null;
}
export interface Line {
  id: Id;
  workspaceId: Id;
  ownerUserId: Id;
  connectionMode: ConnectionMode;
  routeVersion: number;
  policyVersion: number;
  providerConnectionId: Id;
  status: 'needs_setup' | 'testing' | 'active' | 'paused' | 'degraded' | 'retained' | 'released';
}
export interface ScreeningPolicy {
  lineId: Id;
  version: number;
  mode: ScreeningMode;
  explicitVipOverride: boolean;
  timezone: string;
  maxScreeningSeconds: number;
  maxTransferAttempts: number;
  fallbackId: Id;
  consentPolicyId: Id;
  status: 'draft' | 'published' | 'retired';
}
export type CallState = 'received' | 'policy_resolved' | 'awaiting_consent' |
  'screening' | 'taking_message' | 'awaiting_member' | 'connecting_member' |
  'connected' | 'fallback' | 'ended' | 'failed';
export interface LogicalCall {
  id: Id;
  workspaceId: Id;
  lineId: Id;
  providerConnectionId: Id;
  providerAccountRef: string;
  providerCallRef: string;
  state: CallState;
  stateVersion: number;
  policyVersion: number;
  consentPolicyId: Id;
  classification: 'unknown' | 'suspected_spam' | 'message' | 'connected' | 'blocked';
  startedAt: ISODateTime;
  endedAt: ISODateTime | null;
}
export interface EventEnvelope<T extends object> {
  id: Id;
  schema_version: 1;
  type: string;
  occurred_at: ISODateTime;
  workspace_id: Id;
  line_id?: Id;
  resource_id: Id;
  correlation_id: Id;
  causation_id: Id | null;
  deduplication_key: string;
  actor: { kind: 'user' | 'staff' | 'provider' | 'agent' | 'system'; id: Id };
  data: T; // Prefer resource references, not private transcript text.
}
export type EntitlementState = 'free' | 'pending' | 'trial' | 'active' | 'grace' |
  'past_due' | 'cancel_scheduled' | 'ended' | 'disputed';
export type Meter = 'screened_calls' | 'ai_session_seconds' | 'member_app_seconds' |
  'pstn_forward_seconds' | 'outbound_seconds' | 'sms_segments' | 'storage_bytes';
export interface SubscriptionProjection {
  id: Id;
  workspaceId: Id;
  purchaseSource: PurchaseSource;
  providerSubscriptionRef: string | null;
  planVersionId: Id;
  providerStatus: string | null;
  entitlementState: EntitlementState;
  validFrom: ISODateTime;
  validUntil: ISODateTime | null;
  cancelEffectiveAt: ISODateTime | null;
  latestSettledInvoiceRef: string | null;
}
export interface UsageWindow {
  id: Id;
  workspaceId: Id;
  meter: Meter;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  allowance: number;
  consumed: number;
  reserved: number;
  version: number;
}
export interface ProposedAction {
  id: Id;
  workspaceId: Id;
  requestedBy: Id;
  tool: string;
  resourceId: Id;
  argumentsHash: string;
  maxCost: Money;
  expiresAt: ISODateTime;
  approvalId: Id | null;
  idempotencyKey: string;
}
export interface SafeApiError {
  code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_INPUT' |
    'UNSUPPORTED_CAPABILITY' | 'QUOTA_EXHAUSTED' | 'STALE_VERSION' |
    'IDEMPOTENCY_CONFLICT' | 'PROVIDER_UNAVAILABLE';
  message: string;
  request_id: string;
  field_errors?: Record<string, string>;
}
