/** Pure v1.1 policy/state reference. No network effects or production auth.
 * Callers must supply trusted, server-derived context. This is NOT an API handler,
 * provider adapter, transaction/lease manager, RLS policy or media implementation.
 */
const FEATURES = Object.freeze({insider:'monitor_live',gavel:'takeover_live',audible:'direct_agent',directory:'transfer_call'});
const deny = code => ({ok:false,code});
const allow = () => ({ok:true});
const finite = v => Number.isFinite(v);
const currentTime = now => { if(!finite(now)) throw new TypeError('A finite clock value is required'); };

/** Deliberately deny missing state: a UI checkbox is not trusted context. */
export function authorizeFeature(context, call, feature, now) {
  currentTime(now);
  if (!Object.hasOwn(FEATURES,feature)) return deny('UNKNOWN_FEATURE');
  if (!context?.userId || !call?.id) return deny('UNAUTHENTICATED');
  if (context.workspaceId !== call.workspaceId || !context.lineIds?.includes(call.lineId)) return deny('FORBIDDEN');
  if (context.revoked === true || !finite(context.grantExpiresAt) || context.grantExpiresAt <= now) return deny('GRANT_EXPIRED');
  if (!context.permissions?.includes(FEATURES[feature])) return deny('MISSING_GRANT');
  if (call.handling === 'ended' || call.endedAt != null) return deny('CALL_ENDED');
  if (!['ai_active','handoff_pending','human_active','transfer_pending','fallback','transferred_out'].includes(call.handling)) return deny('INVALID_STATE');
  if (call.topology !== 'twilio_conference_ai_application') return deny('UNSUPPORTED_TOPOLOGY');
  if (context.entitlements?.[feature] !== true) return deny('MISSING_ENTITLEMENT');
  if (context.capabilities?.[feature] !== true) return deny('UNSUPPORTED_CAPABILITY');
  if (context.consent?.[feature] !== true) return deny('CONSENT_REQUIRED');
  if (context.budgetApproved !== true) return deny('SPEND_LIMIT');
  if (['fallback','transferred_out'].includes(call.handling)) return deny('INVALID_STATE');
  if (['gavel','directory'].includes(feature) && call.transition != null) return deny('TRANSITION_BUSY');
  if (['insider','gavel','audible'].includes(feature) && call.handling !== 'ai_active') return deny('AGENT_NOT_ACTIVE');
  if (feature === 'audible' && !call.agentSessionId) return deny('AGENT_NOT_ACTIVE');
  if (['audible','directory'].includes(feature) && call.controllerId && call.controllerId !== context.userId) return deny('NOT_CONTROLLER');
  return allow();
}

export function initialCall() {
  return {id:'call-a', workspaceId:'workspace-a', lineId:'line-a', topology:'twilio_conference_ai_application',
    handling:'ai_active', version:1, epoch:0, callerPresent:true, endedAt:null,
    agentSessionId:'agent-a', aiInput:true, aiOutput:true, aiDetached:false,
    humanReady:false, humanUnmuted:false, controllerId:null, transition:null};
}
export function beginTakeover(call, userId, expectedVersion) {
  if (!userId) return deny('INVALID_ACTOR');
  if (call.endedAt != null || !call.callerPresent || call.handling === 'ended') return deny('CALL_ENDED');
  if (call.version !== expectedVersion) return deny('STALE_VERSION');
  if (call.transition != null) return deny('TRANSITION_BUSY');
  if (call.handling !== 'ai_active') return deny('INVALID_STATE');
  return {ok:true,state:{...call, handling:'handoff_pending', version:call.version+1, epoch:call.epoch+1,
    transition:{kind:'gavel',phase:'preparing_endpoint',userId}, humanReady:false,humanUnmuted:false}};
}
export function operatorReady(call, epoch) {
  if (call.handling !== 'handoff_pending' || call.transition?.phase !== 'preparing_endpoint') return deny('INVALID_STATE');
  if (call.epoch !== epoch) return deny('STALE_EPOCH');
  if (!call.callerPresent) return deny('CALL_ENDED');
  // These are desired fences. Provider/media effects must be performed externally.
  return {ok:true,state:{...call, version:call.version+1, humanReady:true,aiInput:false,aiOutput:false,
    transition:{...call.transition,phase:'silencing_ai'}}};
}
export function acknowledgeAiDetached(call, epoch, evidence) {
  if (call.epoch !== epoch) return deny('STALE_EPOCH');
  if (call.handling !== 'handoff_pending' || call.transition?.phase !== 'silencing_ai') return deny('INVALID_STATE');
  if (!call.callerPresent) return deny('CALL_ENDED');
  if (evidence?.participantRemoved !== true || evidence?.inputStopped !== true || evidence?.playbackCleared !== true) return deny('AI_NOT_DETACHED');
  return {ok:true,state:{...call,version:call.version+1,aiDetached:true,agentSessionId:null,
    transition:{...call.transition,phase:'connecting_human'}}};
}
export function commitTakeover(call, epoch, evidence) {
  if (call.epoch !== epoch) return deny('STALE_EPOCH');
  if (call.handling !== 'handoff_pending' || call.transition?.phase !== 'connecting_human') return deny('INVALID_STATE');
  if (!call.callerPresent || !call.humanReady) return deny('ENDPOINT_NOT_READY');
  if (!call.aiDetached || call.aiInput || call.aiOutput) return deny('AI_NOT_DETACHED');
  if(evidence?.humanConnected !== true || evidence?.humanUnmuted !== true || evidence?.callerPresent !== true) return deny('PROVIDER_UNCONFIRMED');
  return {ok:true,state:{...call,version:call.version+1,handling:'human_active',humanUnmuted:true,
    controllerId:call.transition.userId,transition:null}};
}
export function failTakeover(call, epoch) {
  if (call.epoch !== epoch) return deny('STALE_EPOCH');
  if(call.handling !== 'handoff_pending' || call.transition?.kind !== 'gavel') return deny('INVALID_STATE');
  const beforeFences = call.transition.phase === 'preparing_endpoint';
  return {ok:true,state:{...call,version:call.version+1,handling:beforeFences?'ai_active':'fallback',
    transition:null,humanReady:false,humanUnmuted:false}};
}
export function endCall(call, now) {
  currentTime(now);
  if (call.handling === 'ended') return call;
  return {...call,handling:'ended',version:call.version+1,epoch:call.epoch+1,callerPresent:false,endedAt:now,
    transition:null,aiInput:false,aiOutput:false,humanUnmuted:false,agentSessionId:null};
}
/** External AI tool effects are blocked throughout any handoff transition. */
export function canEmitAiEffect(call, epoch) {
  return call.handling === 'ai_active' && call.endedAt == null && call.callerPresent === true &&
    call.aiOutput === true && call.aiInput === true && call.epoch === epoch && Boolean(call.agentSessionId);
}
export function validateGuidance(call, guidance, now) {
  currentTime(now);
  if(call.handling !== 'ai_active' || !call.agentSessionId || call.endedAt != null) return deny('AGENT_NOT_ACTIVE');
  if(guidance?.agentSessionId !== call.agentSessionId) return deny('WRONG_AGENT_SESSION');
  if(typeof guidance.text !== 'string' || guidance.text.trim().length === 0 || guidance.text.length > 1000) return deny('INVALID_TEXT');
  if(!finite(guidance.expiresAt) || guidance.expiresAt <= now) return deny('EXPIRED');
  if(!['next_turn','interrupt_agent'].includes(guidance.timing)) return deny('INVALID_TIMING');
  if(!['next_turn','agent_session'].includes(guidance.scope)) return deny('INVALID_SCOPE');
  if(guidance.status !== 'queued') return deny('NOT_QUEUED');
  // This does not inspect or authorize semantic actions in the text.
  return allow();
}
/** Accept a server-resolved saved destination or validated human custom approval.
 * No phone parsing, SIP resolution, ownership proof or network dialing occurs here.
 */
export function authorizeDestination(context, call, destination, now) {
  const access = authorizeFeature(context,call,'directory',now);
  if(!access.ok) return access;
  if(!destination || destination.workspaceId !== call.workspaceId || !destination.lineIds?.includes(call.lineId)) return deny('DESTINATION_FORBIDDEN');
  if(destination.dialable !== true || destination.enabled !== true) return deny('NOT_DIALABLE');
  if(destination.withinHours !== true) return deny('OUTSIDE_HOURS');
  if(destination.routeAllowed !== true || destination.loopSafe !== true) return deny('ROUTE_BLOCKED');
  if(destination.costReserved !== true) return deny('SPEND_LIMIT');
  if(destination.kind === 'phone_extension' && destination.extensionTestPassed !== true) return deny('UNTESTED_EXTENSION');
  if(destination.kind === 'custom_phone') {
    if(!context.permissions.includes('dial_custom_destination')) return deny('CUSTOM_DIAL_FORBIDDEN');
    // Approval validity is established upstream from immutable bound arguments.
    if(destination.actionBoundApprovalValid !== true) return deny('CUSTOM_APPROVAL_REQUIRED');
  }
  if(!['phone','phone_extension','custom_phone','internal_user','sip','group','message_route','external_queue'].includes(destination.kind)) return deny('UNKNOWN_DESTINATION');
  return allow();
}
export function transferComplete(attempt) {
  if(!attempt || attempt.status !== 'bridging' || attempt.callerPresent !== true || attempt.targetConnected !== true || attempt.bridgeConfirmed !== true) return false;
  return attempt.requiresAcceptance === false || (attempt.requiresAcceptance === true && attempt.targetAccepted === true);
}

/** Audio may continue while the human is prepared, but only at the current epoch. */
export function canPlayAiAudio(call, epoch) {
  const permittedPhase = call.handling === 'ai_active' ||
    (call.handling === 'handoff_pending' && call.transition?.phase === 'preparing_endpoint');
  return permittedPhase && call.endedAt == null && call.callerPresent === true &&
    call.aiInput === true && call.aiOutput === true && call.epoch === epoch && Boolean(call.agentSessionId);
}
