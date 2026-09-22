import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeFeature,initialCall,beginTakeover,operatorReady,acknowledgeAiDetached,commitTakeover,
  failTakeover,endCall,canEmitAiEffect,canPlayAiAudio,validateGuidance,authorizeDestination,transferComplete} from './live-controls.mjs';
const NOW=1000;
function context(){return {userId:'user-a',workspaceId:'workspace-a',lineIds:['line-a'],grantExpiresAt:2000,
  permissions:['monitor_live','takeover_live','direct_agent','transfer_call','dial_custom_destination'],
  entitlements:{insider:true,gavel:true,audible:true,directory:true},
  capabilities:{insider:true,gavel:true,audible:true,directory:true},consent:{insider:true,gavel:true,audible:true,directory:true},budgetApproved:true};}
function pending(){return beginTakeover(initialCall(),'user-a',1).state;}
function silencing(){const s=pending();return operatorReady(s,s.epoch).state;}
function detached(){const s=silencing();return acknowledgeAiDetached(s,s.epoch,{participantRemoved:true,inputStopped:true,playbackCleared:true}).state;}
function guidance(){return {agentSessionId:'agent-a',text:'Ask which project.',expiresAt:1800,timing:'next_turn',scope:'next_turn',status:'queued'};}
function target(){return {workspaceId:'workspace-a',lineIds:['line-a'],kind:'phone',enabled:true,dialable:true,withinHours:true,routeAllowed:true,loopSafe:true,costReserved:true};}

test('all four named capabilities can pass trusted policy gates',()=>{for(const f of ['insider','gavel','audible','directory'])assert.equal(authorizeFeature(context(),initialCall(),f,NOW).ok,true);});
test('legacy join_call is not live monitor permission',()=>{const c=context();c.permissions=['join_call'];assert.equal(authorizeFeature(c,initialCall(),'insider',NOW).code,'MISSING_GRANT');});
test('wrong tenant denied',()=>{const c=context();c.workspaceId='other';assert.equal(authorizeFeature(c,initialCall(),'gavel',NOW).code,'FORBIDDEN');});
test('wrong line denied',()=>{const c=context();c.lineIds=[];assert.equal(authorizeFeature(c,initialCall(),'insider',NOW).code,'FORBIDDEN');});
test('expired or revoked grant denied',()=>{for(const change of [{grantExpiresAt:NOW},{revoked:true}])assert.equal(authorizeFeature({...context(),...change},initialCall(),'insider',NOW).code,'GRANT_EXPIRED');});
test('missing capability does not become true',()=>{const c=context();delete c.capabilities.insider;assert.equal(authorizeFeature(c,initialCall(),'insider',NOW).code,'UNSUPPORTED_CAPABILITY');});
test('missing consent denied',()=>{const c=context();c.consent.insider=false;assert.equal(authorizeFeature(c,initialCall(),'insider',NOW).code,'CONSENT_REQUIRED');});
test('budget and entitlement gate optional use',()=>{let c=context();c.budgetApproved=false;assert.equal(authorizeFeature(c,initialCall(),'gavel',NOW).code,'SPEND_LIMIT');c=context();c.entitlements.audible=false;assert.equal(authorizeFeature(c,initialCall(),'audible',NOW).code,'MISSING_ENTITLEMENT');});
test('direct stream does not claim full control topology',()=>assert.equal(authorizeFeature(context(),{...initialCall(),topology:'basic_direct_stream'},'insider',NOW).code,'UNSUPPORTED_TOPOLOGY'));
test('unknown feature rejected without object prototype lookup',()=>assert.equal(authorizeFeature(context(),initialCall(),'toString',NOW).code,'UNKNOWN_FEATURE'));
test('only current controller can direct agent',()=>assert.equal(authorizeFeature({...context(),userId:'other'},{...initialCall(),controllerId:'user-a'},'audible',NOW).code,'NOT_CONTROLLER'));
test('Gavel starts pending without premature human speech',()=>{const s=pending();assert.equal(s.handling,'handoff_pending');assert.equal(s.humanUnmuted,false);assert.equal(s.aiOutput,true);});
test('stale version cannot begin takeover',()=>assert.equal(beginTakeover(initialCall(),'user-a',0).code,'STALE_VERSION'));
test('second takeover cannot race the first',()=>{const s=pending();assert.equal(beginTakeover(s,'other',s.version).code,'TRANSITION_BUSY');});
test('transfer conflict blocks takeover',()=>{const s={...initialCall(),transition:{kind:'directory'}};assert.equal(beginTakeover(s,'user-a',s.version).code,'TRANSITION_BUSY');});
test('ready operator closes AI input and output fences',()=>{const s=silencing();assert.equal(s.aiInput,false);assert.equal(s.aiOutput,false);assert.equal(s.humanUnmuted,false);});
test('stale epoch cannot change media state',()=>assert.equal(operatorReady(pending(),999).code,'STALE_EPOCH'));
test('partial AI detach evidence rejected',()=>{const s=silencing();assert.equal(acknowledgeAiDetached(s,s.epoch,{participantRemoved:true}).code,'AI_NOT_DETACHED');});
test('commit before AI detach rejected',()=>{const s=silencing();assert.equal(commitTakeover(s,s.epoch,{}).ok,false);});
test('human success requires provider confirmation',()=>{const s=detached();assert.equal(commitTakeover(s,s.epoch,{humanConnected:true}).code,'PROVIDER_UNCONFIRMED');});
test('completed takeover has human only and no agent session',()=>{const s=detached();const r=commitTakeover(s,s.epoch,{humanConnected:true,humanUnmuted:true,callerPresent:true});assert.equal(r.ok,true);assert.equal(r.state.handling,'human_active');assert.equal(r.state.agentSessionId,null);assert.equal(r.state.aiInput,false);assert.equal(r.state.controllerId,'user-a');});
test('failure before endpoint ready preserves AI flow',()=>{const s=pending();const r=failTakeover(s,s.epoch).state;assert.equal(r.handling,'ai_active');assert.equal(r.aiInput,true);});
test('failure after fences chooses fallback, not silent AI return',()=>{const s=silencing();const r=failTakeover(s,s.epoch).state;assert.equal(r.handling,'fallback');assert.equal(r.aiInput,false);assert.equal(r.aiOutput,false);});
test('ended call ignores late operator event',()=>{const s=endCall(pending(),NOW);assert.equal(operatorReady(s,s.epoch).ok,false);assert.equal(endCall(s,NOW+5),s);});
test('old AI epoch cannot emit effects',()=>{const s=initialCall();assert.equal(canEmitAiEffect(s,s.epoch),true);assert.equal(canEmitAiEffect(pending(),s.epoch),false);assert.equal(canEmitAiEffect(endCall(s,NOW),s.epoch),false);});
test('valid guidance stays session scoped',()=>assert.equal(validateGuidance(initialCall(),guidance(),NOW).ok,true));
test('guidance old agent is rejected',()=>assert.equal(validateGuidance(initialCall(),{...guidance(),agentSessionId:'old'},NOW).code,'WRONG_AGENT_SESSION'));
test('expired and blank/oversized guidance is rejected',()=>{assert.equal(validateGuidance(initialCall(),{...guidance(),expiresAt:NOW},NOW).code,'EXPIRED');for(const text of ['',' '.repeat(4),'x'.repeat(1001)])assert.equal(validateGuidance(initialCall(),{...guidance(),text},NOW).code,'INVALID_TEXT');});
test('submitted or canceled guidance is not replayed',()=>{for(const status of ['submitted','canceled','acknowledged'])assert.equal(validateGuidance(initialCall(),{...guidance(),status},NOW).code,'NOT_QUEUED');});
test('handoff forbids guidance to disappearing AI',()=>assert.equal(validateGuidance(pending(),guidance(),NOW).code,'AGENT_NOT_ACTIVE'));
test('invalid guidance timing and scope rejected',()=>{assert.equal(validateGuidance(initialCall(),{...guidance(),timing:'invented'},NOW).code,'INVALID_TIMING');assert.equal(validateGuidance(initialCall(),{...guidance(),scope:'all_future_calls'},NOW).code,'INVALID_SCOPE');});
test('known approved target accepted',()=>assert.equal(authorizeDestination(context(),initialCall(),target(),NOW).ok,true));
test('cross-tenant directory target rejected',()=>assert.equal(authorizeDestination(context(),initialCall(),{...target(),workspaceId:'other'},NOW).code,'DESTINATION_FORBIDDEN'));
test('loop and disallowed route rejected',()=>{for(const key of ['routeAllowed','loopSafe'])assert.equal(authorizeDestination(context(),initialCall(),{...target(),[key]:false},NOW).code,'ROUTE_BLOCKED');});
test('extension requires actual route test flag',()=>assert.equal(authorizeDestination(context(),initialCall(),{...target(),kind:'phone_extension'},NOW).code,'UNTESTED_EXTENSION'));
test('custom destination needs action-bound approval',()=>assert.equal(authorizeDestination(context(),initialCall(),{...target(),kind:'custom_phone'},NOW).code,'CUSTOM_APPROVAL_REQUIRED'));
test('custom destination requires independent dial permission',()=>{const c=context();c.permissions=c.permissions.filter(x=>x!=='dial_custom_destination');assert.equal(authorizeDestination(c,initialCall(),{...target(),kind:'custom_phone',actionBoundApprovalValid:true},NOW).code,'CUSTOM_DIAL_FORBIDDEN');});
test('hours and reserve checks block dialing',()=>{assert.equal(authorizeDestination(context(),initialCall(),{...target(),withinHours:false},NOW).code,'OUTSIDE_HOURS');assert.equal(authorizeDestination(context(),initialCall(),{...target(),costReserved:false},NOW).code,'SPEND_LIMIT');});
test('a target answering does not establish warm acceptance',()=>assert.equal(transferComplete({status:'bridging',callerPresent:true,targetConnected:true,bridgeConfirmed:true,requiresAcceptance:true,targetAccepted:false}),false));
test('accepted target plus confirmed bridge completes warm transfer',()=>assert.equal(transferComplete({status:'bridging',callerPresent:true,targetConnected:true,bridgeConfirmed:true,requiresAcceptance:true,targetAccepted:true}),true));
test('caller hangup or missing bridge prevents transfer completion',()=>{assert.equal(transferComplete({status:'bridging',callerPresent:false,targetConnected:true,bridgeConfirmed:true,requiresAcceptance:false}),false);assert.equal(transferComplete({status:'bridging',callerPresent:true,targetConnected:true,requiresAcceptance:false}),false);});
test('invalid clock input rejected rather than implicitly allowed',()=>assert.throws(()=>authorizeFeature(context(),initialCall(),'insider',NaN),TypeError));

test('AI audio can continue at current epoch while endpoint is prepared',()=>{const s=pending();assert.equal(canPlayAiAudio(s,s.epoch),true);assert.equal(canEmitAiEffect(s,s.epoch),false);});
test('AI audio stops when readiness closes fences',()=>{const s=silencing();assert.equal(canPlayAiAudio(s,s.epoch),false);});
