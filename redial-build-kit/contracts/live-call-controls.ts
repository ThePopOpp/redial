/** v1.1 design contracts only: not provider SDK types or runtime validation.
 * Identity, grants, capabilities, consent and costs are resolved on the server.
 */
import type { Id, ISODateTime, LinePermission, Money, Readiness } from './domain';
export type LiveFeature = 'insider' | 'gavel' | 'audible' | 'directory';
export type LiveHandling = 'ai_active' | 'handoff_pending' | 'human_active' |
  'transfer_pending' | 'transferred_out' | 'fallback' | 'ended';
export type LivePhase = 'idle' | 'preparing_endpoint' | 'silencing_ai' |
  'connecting_human' | 'dialing_target' | 'consulting' | 'bridging' | 'reconciling';
export type ParticipantRole = 'caller' | 'ai' | 'monitor' | 'operator' | 'target';
export type GuidanceStatus = 'queued' | 'submitted' | 'acknowledged' |
  'action_confirmed' | 'rejected' | 'expired' | 'canceled' | 'superseded' |
  'delivery_unknown' | 'failed';
export type TransferMethod = 'announced' | 'brief_and_accept' | 'blind' | 'live_consult';
export type ControlCapability = 'conference_ai_participant' | 'listen_only_participant' |
  'hard_ai_detach' | 'human_endpoint' | 'text_guidance' | 'interrupt_guidance' |
  'saved_phone_transfer' | 'custom_phone_transfer' | 'extension_transfer' |
  'warm_brief_and_accept' | 'warm_live_consultation' | 'sip_or_queue_transfer';
export interface FeatureAvailability {
  feature: LiveFeature;
  available: boolean;
  reason: 'available' | 'missing_grant' | 'missing_entitlement' | 'unsupported_provider' |
    'unsupported_topology' | 'consent_required' | 'device_not_ready' | 'spend_limit' |
    'call_ended' | 'agent_disconnected' | 'transition_busy' | 'not_controller';
}
export interface CapabilityEvidence {
  providerConnectionId: Id;
  topologyVersion: number;
  capability: ControlCapability;
  readiness: Readiness;
  testedAt: ISODateTime | null;
  evidenceId: Id | null;
}
export interface LiveCallSession {
  id: Id;
  callId: Id;
  workspaceId: Id;
  lineId: Id;
  topology: 'twilio_conference_ai_application' | 'basic_direct_stream' | 'adapter_specific';
  topologyVersion: number;
  handling: LiveHandling;
  phase: LivePhase;
  stateVersion: number;
  fencingEpoch: number;
  controllerUserId: Id | null;
  currentAgentSessionId: Id | null;
  agentState: 'starting' | 'connected' | 'stopping' | 'disconnected';
  aiInputEnabled: boolean;
  aiOutputEnabled: boolean;
  activeTransitionId: Id | null;
  endedAt: ISODateTime | null;
}
export interface LiveParticipant {
  id: Id;
  sessionId: Id;
  workspaceId: Id;
  lineId: Id;
  role: ParticipantRole;
  userId: Id | null;
  directoryDestinationId: Id | null;
  providerAccountRef: string;
  providerCallRef: string;
  providerParticipantRef: string | null;
  state: 'pending' | 'ringing' | 'connected' | 'disconnected' | 'failed';
  desiredMuted: boolean;
  observedMuted: boolean | null;
  observedHeld: boolean | null;
  grantId: Id | null;
  joinedAt: ISODateTime | null;
  leftAt: ISODateTime | null;
}
export interface LiveGrant {
  id: Id;
  subjectId: Id;
  lineId: Id;
  callId: Id | null;
  actions: readonly LinePermission[];
  expiresAt: ISODateTime;
  revokedAt: ISODateTime | null;
  supportApprovalId: Id | null;
}
export interface CommandMetadata {
  expectedVersion: number;
  idempotencyKey: string;
  expiresAt: ISODateTime;
}
export interface GavelRequest extends CommandMetadata {
  // Existing authenticated endpoint reference; never an arbitrary conference ID.
  endpointId: Id;
  existingMonitorId?: Id;
}
export interface AudibleRequest extends CommandMetadata {
  agentSessionId: Id;
  text: string;
  timing: 'next_turn' | 'interrupt_agent';
  scope: 'next_turn' | 'agent_session';
}
export interface AgentGuidance {
  id: Id;
  sessionId: Id;
  agentSessionId: Id;
  authorUserId: Id;
  sequence: number;
  source: 'operator_guidance';
  contentRef: Id; // Protected private content, not a public transcript/event body.
  timing: AudibleRequest['timing'];
  scope: AudibleRequest['scope'];
  status: GuidanceStatus;
  expiresAt: ISODateTime;
  submittedAt: ISODateTime | null;
  acknowledgedAt: ISODateTime | null;
  acknowledgementRef: string | null;
  observedActionEvidenceId: Id | null;
}
export type DirectoryEndpoint =
  | { kind: 'phone'; e164: string; country: string }
  | { kind: 'phone_extension'; baseE164: string; extension: string; approvedDialSequence: string }
  | { kind: 'internal_user'; userId: Id; endpointGroupId: Id }
  | { kind: 'sip'; connectorId: Id; approvedAddressRef: Id }
  | { kind: 'group'; groupId: Id; strategy: 'sequential' | 'simultaneous' }
  | { kind: 'message_route'; messageRouteId: Id }
  | { kind: 'external_queue'; connectorId: Id; queueRef: Id };
export interface DirectoryDestination {
  id: Id;
  workspaceId: Id;
  ownerUserId: Id;
  visibility: 'personal' | 'workspace';
  label: string;
  endpoint: DirectoryEndpoint;
  version: number;
  permittedLineIds: readonly Id[];
  timezone: string;
  scheduleId: Id | null;
  fallbackRouteId: Id | null;
  methods: readonly TransferMethod[];
  ringTimeoutSeconds: number;
  requiresAcceptance: boolean;
  readiness: Readiness;
}
export type TransferTarget =
  | { kind: 'saved'; destinationId: Id; destinationVersion: number }
  | { kind: 'custom_phone'; phone: string; country: string; approvalId: Id };
export interface TransferRequest extends CommandMetadata {
  target: TransferTarget;
  method: TransferMethod;
}
export interface CallControlOperation {
  id: Id;
  sessionId: Id;
  actorId: Id;
  action: 'monitor_join' | 'takeover' | 'guidance' | 'transfer' | 'return_to_agent';
  payloadHash: string;
  fencingEpoch: number;
  status: 'pending' | 'running' | 'reconciling' | 'completed' | 'failed' | 'canceled';
  expiresAt: ISODateTime;
  providerEffectRefs: readonly string[];
  errorCode: string | null;
}
export interface TransferAttempt {
  id: Id;
  operationId: Id;
  destinationVersion: number;
  method: TransferMethod;
  state: 'requested' | 'ringing' | 'answered' | 'awaiting_acceptance' |
    'accepted' | 'bridging' | 'bridged' | 'transferred_out' | 'failed' | 'canceled';
  maxCost: Money;
  targetLegId: Id | null;
  callerPresent: boolean;
  destinationAcceptedAt: ISODateTime | null;
  bridgeConfirmedAt: ISODateTime | null;
}
export interface ProviderCostSegment {
  logicalCallId: Id;
  physicalLegId: Id;
  providerAccountRef: string;
  // Cost observation is not automatically a customer-billable meter.
  chargeKind: string;
  quantity: number;
  unit: 'seconds' | 'minutes' | 'request' | 'bytes';
  startedAt: ISODateTime;
  endedAt: ISODateTime | null;
  providerUsageRef: string | null;
}
