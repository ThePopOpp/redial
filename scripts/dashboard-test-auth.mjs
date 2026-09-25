// HTTP contract double for browser tests ONLY. Never imported by application code.
// SQL permissions are tested separately against actual PostgreSQL.
import { createServer } from 'node:http';
import { createHmac,randomUUID } from 'node:crypto';
const uid='00000000-0000-4000-8000-000000000001';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'review@example.test',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{}};
const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const payload=Buffer.from(JSON.stringify({sub:uid,aud:'authenticated',role:'authenticated',aal:'aal1',iss:'http://127.0.0.1:3213/auth/v1',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
const token=`${header}.${payload}.${createHmac('sha256','isolated-browser-contract-test-only').update(`${header}.${payload}`).digest('base64url')}`;
let tables={},revoked=false,offline=false;
const reset=()=>{tables={line_setup_drafts:[],workspaces:[],memberships:[],lines:[],workspace_records:[],platform_staff:[],support_messages:[],subscriptions:[],provider_connections:[],calls:[],transcript_segments:[],audit_events:[]};revoked=false;offline=false;};reset();
createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1:3213');
  let raw='';for await(const c of req)raw+=c;
  const body=raw?JSON.parse(raw):{};
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Content-Range':'0-0/0'});res.end(JSON.stringify(data));};
  if(url.pathname==='/health')return send(200,{ok:true});
  if(url.pathname==='/__test/reset'){reset();return send(200,{ok:true});}
  if(url.pathname==='/__test/revoke'){revoked=true;return send(200,{ok:true});}
  if(url.pathname==='/__test/offline'){offline=true;return send(200,{ok:true});}
  if(url.pathname==='/auth/v1/token')return body.email===user.email && body.password==='A-long-test-password!'?send(200,{access_token:token,refresh_token:'test-refresh-token',token_type:'bearer',expires_in:3600,user}):send(400,{error:'invalid_grant',error_description:'Invalid credentials'});
  if(url.pathname==='/auth/v1/user')return !revoked && req.headers.authorization===`Bearer ${token}`?send(200,user):send(401,{msg:'Invalid session'});
  if(url.pathname==='/auth/v1/logout')return send(204,null);
  if(!url.pathname.startsWith('/rest/v1/'))return send(404,{});
  if(req.headers.authorization!==`Bearer ${token}` || revoked)return send(401,{message:'Unauthorized'});
  if(offline)return send(503,{message:'Unavailable'});
  if(url.pathname==='/rest/v1/rpc/create_workspace'){
    const id=randomUUID();tables.workspaces.push({id,name:body.workspace_name,type:body.workspace_type,created_at:new Date().toISOString()});tables.memberships.push({workspace_id:id,user_id:uid,role:'owner',status:'active'});tables.lines.push({id:randomUUID(),workspace_id:id,owner_id:uid,name:'My line',status:'unconfigured'});return send(200,id);
  }
  if(url.pathname==='/rest/v1/rpc/can_manage_line_setup')return send(200,tables.lines.some(l=>l.id===body.l && l.workspace_id===body.w && l.owner_id===uid));
  if(url.pathname==='/rest/v1/rpc/save_line_setup'){
    if(!tables.lines.some(l=>l.id===body.l && l.workspace_id===body.w && l.owner_id===uid))return send(403,{message:'Denied'});
    const old=tables.line_setup_drafts.find(d=>d.line_id===body.l);
    if((old?.version || 0)!==body.expected_version)return send(409,{message:'Conflict'});
    const next={workspace_id:body.w,line_id:body.l,body:body.draft,version:body.expected_version+1,updated_at:new Date().toISOString()};
    if(old)Object.assign(old,next);else tables.line_setup_drafts.push(next);
    return send(200,next.version);
  }
  if(url.pathname==='/rest/v1/rpc/import_contacts'){
    if(!tables.lines.some(l=>l.id===body.l && l.workspace_id===body.w && l.owner_id===uid))return send(403,{message:'Denied'});
    let added=0,skipped=0;
    for(const contact of body.contacts){
      if(tables.workspace_records.some(r=>r.workspace_id===body.w && r.line_id===body.l && r.kind==='contact' && r.body.phone===contact.phone)){skipped++;continue;}
      tables.workspace_records.push({id:randomUUID(),workspace_id:body.w,line_id:body.l,owner_id:uid,kind:'contact',body:{...contact,policy:'standard'},version:1,created_at:new Date().toISOString()});added++;
    }
    return send(200,{added,skipped});
  }
  const table=url.pathname.split('/').at(-1);if(!tables[table])return send(404,{});
  const match=row=>[...url.searchParams].every(([key,value])=>!value.startsWith('eq.') || String(row[key])===value.slice(3));
  if(req.method==='POST'){const rows=(Array.isArray(body)?body:[body]).map(row=>({...row,id:row.id || randomUUID(),version:1,created_at:new Date().toISOString()}));tables[table].push(...rows);return send(201,rows);}
  if(req.method==='PATCH'){const rows=tables[table].filter(match);rows.forEach(row=>Object.assign(row,body,{version:row.version+1}));return send(200,rows);}
  if(req.method==='DELETE'){const rows=tables[table].filter(match);tables[table]=tables[table].filter(row=>!match(row));return send(200,rows);}
  const rows=tables[table].filter(match);
  return send(200,req.headers.accept?.includes('vnd.pgrst.object')?(rows[0] || null):rows);
}).listen(3213,'127.0.0.1');
