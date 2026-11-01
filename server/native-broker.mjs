import {createNativeDatabase} from './native-database.mjs';
import {createOidc,randomSecret,digest,equal} from './oidc.mjs';
import {cookieCodec} from './session.mjs';

const fail=(code,status=400)=>{throw Object.assign(Error(code),{status});};
const opaque=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{43}$/.test(s);
const exact=(o,keys)=>Object.keys(o).sort().join(',')===[...keys].sort().join(',');
const own=(o,k)=>Object.hasOwn(o,k);
export function parseNativeJSON(raw){
 let o;try{o=JSON.parse(raw);}catch{fail('invalid_request');}
 if(!o||typeof o!=='object'||Array.isArray(o)||Object.values(o).some(v=>v!==null&&typeof v==='object'))fail('invalid_request');
 // JSON.parse alone loses duplicate keys, including escaped duplicate spellings.
 let i=0;const ws=()=>{while(i<raw.length&&/\s/.test(raw[i]))i++;};
 const str=()=>{const start=i++;while(i<raw.length){if(raw[i]==='\\'){i+=2;continue;}if(raw[i++]==='"')return JSON.parse(raw.slice(start,i));}fail('invalid_request');};
 ws();i++;const keys=new Set();ws();
 while(raw[i]!=='}'){
  const key=str();if(keys.has(key))fail('invalid_request');keys.add(key);ws();i++;ws();
  if(raw[i]==='"')str();else while(i<raw.length&&!['}',','].includes(raw[i]))i++;
  ws();if(raw[i]===','){i++;ws();}else break;
 }
 return o;
}
async function rawBody(req){
 let bytes;
 if(req.body!==undefined){if(typeof req.body!=='string'&&!Buffer.isBuffer(req.body))fail('invalid_request');bytes=Buffer.from(req.body);}
 else{const parts=[];let size=0;for await(const p of req){size+=p.length;if(size>8192)fail('request_too_large',413);parts.push(Buffer.from(p));}bytes=Buffer.concat(parts);}
 if(bytes.length>8192)fail('request_too_large',413);
 try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('invalid_request');}
}
function configFor(env){
 try{
  if(env.VERCEL_ENV==='production'||!env.CARVE_SHARED_DATABASE_URL||!/^[a-f\d]{64}$/i.test(env.CARVE_SESSION_SECRET??''))return null;
  const origin=new URL(env.CARVE_APP_ORIGIN);if(origin.origin!==env.CARVE_APP_ORIGIN||origin.username||origin.password||!(origin.protocol==='https:'||(origin.protocol==='http:'&&['127.0.0.1','localhost'].includes(origin.hostname))))return null;
  const registry=JSON.parse(env.CARVE_NATIVE_CLIENTS??'null');if(!registry||Array.isArray(registry)||typeof registry!=='object'||Object.keys(registry).length>16)return null;
  for(const [alias,c]of Object.entries(registry)){
   if(!/^[a-z][a-z0-9-]{0,63}$/.test(alias)||!c||!exact(c,['redirect_uri','broker_url']))return null;
   for(const key of ['redirect_uri','broker_url']){const u=new URL(c[key]);if(u.href!==c[key]||u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port)return null;}
   if(c.broker_url!==origin.origin+'/native/authorize')return null;
  }
  return {origin:origin.origin,secure:origin.protocol==='https:',registry};
 }catch{return null;}
}
function actor(state,req,now,optional=false){
 const header=req.headers.authorization;
 if(header===undefined){if(optional)return null;fail('sign_in_required',401);}
 const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(header??'')?.[1];
 const s=token?state.sessions[digest(token)]:null;
 if(!s||s.revoked||s.until<=now||state.current!==s.key)fail('sign_in_required',401);return s;
}
function fresh(s,now){if(!s||!Number.isFinite(s.auth_at)||s.auth_at>now||now-s.auth_at>300000)fail('sign_in_required',401);}
function revoke(state,key){if(state.sessions[key])state.sessions[key].revoked=true;if(state.current===key)state.current=null;}
function cancelFlow(state,f,preserve){
 if(!f)return;f.cancelled=true;
 if(f.result&&!f.acknowledged&&f.result!==preserve)revoke(state,f.result);
 for(const o of Object.values(state.offers))if(o.flow_id===f.id&&!o.confirmed)o.cancelled=true;
 if(state.active===f.id)state.active=null;
}
function acknowledge(state,s){if(!s)return;for(const f of Object.values(state.flows))if(f.result===s.key)f.acknowledged=true;}
function currentFlow(state,f,now,phase){
 if(!f||f.cancelled||f.generation!==state.generation)fail('account_changed',409);
 if((phase==='provider'?f.provider_until:f.code_until)<=now)fail('flow_expired',410);
 const s=f.actor?state.sessions[f.actor]:null;
 if(f.actor&&(!s||s.revoked||s.until<=now||state.current!==f.actor))fail('account_changed',409);
 if(!f.actor&&state.current)fail('account_changed',409);
 if(f.intent==='link')fresh(s,now);return s;
}
function hint(proof){const s=proof.label;return typeof s==='string'&&s.trim()===s&&[...s].length>0&&[...s].length<=96&&Buffer.byteLength(s)<=192&&!/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/.test(s)?s:null;}
const account=s=>({player_id:s.player_id,account_scope:s.scope});

export function createNativeBrokerHandler({env=process.env,database,oidc=createOidc(env),now=()=>Date.now(),beforeGrant=async()=>{}}={}){
 const config=configFor(env);let db=database;
 const store=()=>db??=createNativeDatabase(env.CARVE_SHARED_DATABASE_URL);
 const codec=config?cookieCodec(env.CARVE_SESSION_SECRET,{secure:config.secure,now}):null;
 const cookieName=p=>(config.secure?'__Host-':'')+'carve-native-'+p;
 const readCookie=(req,p)=>{
  const values=(req.headers.cookie??'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(cookieName(p)+'='));
  return values.length===1?codec.open(values[0].slice(cookieName(p).length+1),'native-'+p):null;
 };
 const writeCookie=(res,p,value,ttl)=>{
  const valueStr=value?codec.seal(value,'native-'+p,ttl):'';if(valueStr.length>3700)fail('invalid_request');
  const cookies=res.getHeader('Set-Cookie')??[];
  res.setHeader('Set-Cookie',[...cookies,`${cookieName(p)}=${valueStr}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${value?Math.floor(ttl/1000):0}${config.secure?'; Secure':''}`]);
 };
 const success=(client,result,fields={})=>({contract_version:1,client_id:client,result,...fields});
 const json=(res,status,data)=>{const body=JSON.stringify(data);if(Buffer.byteLength(body)>16384)throw Error('response_too_large');res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(body);};
 const callbackPath=p=>config.origin+'/api/native-broker/callback?provider='+p;
 async function launch(req,res,url){
  if(req.method!=='GET'||url.searchParams.size!==1||!opaque(url.searchParams.get('flow_id')))fail('invalid_request');
  const id=url.searchParams.get('flow_id'),location=await store().locate(id);if(!location)fail('handoff_rejected',401);
  const browser=randomSecret();
  const started=await store().atomic(location.client_id,location.binding_hash,async state=>{
   const f=state.flows[id];currentFlow(state,f,now(),'provider');if(f.oauth||f.proof)fail('handoff_used',409);
   if(!oidc.ready(f.provider))fail('not_configured',503);
   const started=oidc.begin(f.provider,config.origin,{redirect:callbackPath(f.provider)});
   f.oauth=started.flow;f.browser_hash=digest(browser);return started;
  });
  writeCookie(res,'oauth',{id,browser,provider:started.flow.provider},600000);
  res.writeHead(303,{Location:started.url});res.end();
 }
 function callbackValues(params){
  if([...params.keys()].some(k=>!['code','state','error','error_description','user'].includes(k)))fail('handoff_rejected',401);
  for(const k of params.keys())if(params.getAll(k).length!==1)fail('handoff_rejected',401);
  const code=params.get('code'),state=params.get('state');
  if(params.has('error')||!opaque(state)||typeof code!=='string'||!code.length||code.length>2048)fail('handoff_rejected',401);
  return {code,state};
 }
 async function callback(req,res,url){
  const provider=url.searchParams.get('provider');if(!['apple','google'].includes(provider)||url.searchParams.getAll('provider').length!==1)fail('handoff_rejected',401);
  let value;
  if(provider==='apple'&&req.method==='POST'){
   if(url.searchParams.size!==1||(req.headers['content-type']??'').split(';')[0]!=='application/x-www-form-urlencoded')fail('handoff_rejected',401);
   value=callbackValues(new URLSearchParams(await rawBody(req)));writeCookie(res,'callback',value,120000);
   res.writeHead(303,{Location:'/api/native-broker/callback?provider=apple&finalize=1'});return res.end();
  }
  if(req.method!=='GET')fail('method_not_allowed',405);
  if(provider==='apple'){
   if(url.searchParams.size!==2||url.searchParams.get('finalize')!=='1')fail('handoff_rejected',401);
   value=readCookie(req,'callback');if(!value)fail('handoff_rejected',401);writeCookie(res,'callback',null,0);
  }else{
   const params=new URLSearchParams(url.searchParams);params.delete('provider');value=callbackValues(params);
  }
  const cookie=readCookie(req,'oauth');if(!cookie||cookie.provider!==provider)fail('handoff_rejected',401);
  const location=await store().locate(cookie.id);if(!location)fail('handoff_rejected',401);
  const flow=await store().atomic(location.client_id,location.binding_hash,state=>{
   const f=state.flows[cookie.id];currentFlow(state,f,now(),'provider');
   if(!f.oauth||f.provider!==provider||f.callback_claimed||!equal(f.browser_hash,digest(cookie.browser))||!equal(f.oauth.id,value.state))fail('handoff_rejected',401);
   f.callback_claimed=true;return structuredClone(f.oauth);
  });
  const proof=await oidc.exchange(flow,value.code);
  if(!Number.isFinite(proof.authenticated_at)||proof.authenticated_at>now())fail('handoff_rejected',401);
  const code=randomSecret();
  const redirect=await store().atomic(location.client_id,location.binding_hash,state=>{
   const f=state.flows[cookie.id];currentFlow(state,f,now(),'provider');
   // This only returns a one-use handoff code. Native exchange must recheck
   // proof freshness before staging an offer; no identity/session is granted here.
   f.proof=proof;f.code_hash=digest(code);f.code_until=now()+120000;
   return config.registry[location.client_id].redirect_uri+'?'+new URLSearchParams({code,state:f.state});
  });
  writeCookie(res,'oauth',null,0);res.writeHead(303,{Location:redirect});res.end();
 }
 return async(req,res)=>{
  for(const [key,value]of Object.entries({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}))res.setHeader(key,value);
  try{
   if(!config)fail('not_configured',503);
   const url=new URL(req.url,config.origin);
   if(['/native/authorize','/api/native-broker/authorize'].includes(url.pathname))return await launch(req,res,url);
   if(url.pathname==='/api/native-broker/callback')return await callback(req,res,url);
   if(url.pathname!=='/api/native-broker/v1'||url.search)fail('invalid_request');
   if(req.method!=='POST')fail('method_not_allowed',405);
   if(own(req.headers,'origin')||own(req.headers,'cookie'))fail('client_rejected',403);
   if((req.headers['content-type']??'').split(';')[0].trim().toLowerCase()!=='application/json')fail('json_required',415);
   const b=parseNativeJSON(await rawBody(req));if(b.contract_version!==1)fail('unsupported_contract');
   const client=b.client_id;if(typeof client!=='string'||!own(config.registry,client)||!opaque(req.headers['x-carve-native-binding']))fail('client_rejected',403);
   const fields={begin:['provider','intent','redirect_uri','state','code_challenge','code_challenge_method'],exchange:['provider','intent','code','state','verifier'],session:[],'confirm-link':['offer_id'],'cancel-link':['offer_id'],cancel:['flow_id'],signout:[]};
   if(!own(fields,b.action)||!exact(b,['contract_version','action','client_id',...fields[b.action]]))fail('invalid_request');
   const binding=digest(req.headers['x-carve-native-binding']);
   // Pre-consume under lock, then allow cancellation while a response is held.
   if(b.action==='exchange'){
    if(!opaque(b.code)||!opaque(b.state)||!['apple','google'].includes(b.provider)||!['signin','link'].includes(b.intent)||typeof b.verifier!=='string'||!/^[A-Za-z0-9._~-]{43,128}$/.test(b.verifier))fail('handoff_rejected',401);
    const id=await store().atomic(client,binding,state=>{
     const f=Object.values(state.flows).find(f=>equal(f.code_hash,digest(b.code)));
     if(!f||f.provider!==b.provider||f.intent!==b.intent||!equal(f.state,b.state)||!equal(f.challenge,Buffer.from(digest(b.verifier),'hex').toString('base64url')))fail('handoff_rejected',401);
     if(f.used)fail('handoff_used',409);currentFlow(state,f,now(),'code');
     const s=actor(state,req,now(),true);if((s?.key??null)!==f.actor)fail('account_changed',409);
     f.used=true;return f.id;
    });
    await beforeGrant({client_id:client,flow_id:id});
    const reply=await store().atomic(client,binding,async(state,tx)=>{
     const f=state.flows[id],s=currentFlow(state,f,now(),'code');
     if(f.intent==='link'){
      if(f.proof.authenticated_at>now()||now()-f.proof.authenticated_at>300000)fail('handoff_rejected',401);
      const offer=randomSecret();state.offers[offer]={id:offer,flow_id:id,actor:f.actor,proof:f.proof,until:now()+120000,confirmed:false,cancelled:false};
      return success(client,'link_offer',{provider:f.provider,intent:f.intent,...account(s),offer_id:offer,connection_hint:hint(f.proof),expires_in:120});
     }
     const p=await tx.principal(f.proof),token=randomSecret(),key=digest(token);if(s)revoke(state,s.key);
     state.sessions[key]={key,...p,issuer:f.proof.issuer,subject:f.proof.subject,auth_at:f.proof.authenticated_at,until:now()+300000,revoked:false};state.current=key;f.result=key;
     return success(client,'signed_in',{provider:f.provider,intent:f.intent,...account(state.sessions[key]),session_token:token,expires_in:300});
    });return json(res,200,reply);
   }
   const reply=await store().atomic(client,binding,async(state,tx)=>{
    if(b.action==='begin'){
     if(!['apple','google'].includes(b.provider)||!['signin','link'].includes(b.intent)||b.redirect_uri!==config.registry[client].redirect_uri||!opaque(b.state)||!opaque(b.code_challenge)||b.code_challenge_method!=='S256')fail('invalid_request');
     if(!oidc.ready(b.provider))fail('not_configured',503);
     const s=actor(state,req,now(),b.intent==='signin');if(!s&&state.current)fail('account_changed',409);if(b.intent==='link')fresh(s,now());
     if(Object.keys(state.flows).length>=64)fail('rate_limited',429);
     acknowledge(state,s);cancelFlow(state,state.flows[state.active],s?.key);state.generation++;
     const id=randomSecret();state.flows[id]={id,provider:b.provider,intent:b.intent,state:b.state,challenge:b.code_challenge,actor:s?.key??null,generation:state.generation,provider_until:now()+600000};state.active=id;await tx.index(id);
     return success(client,'pending',{provider:b.provider,intent:b.intent,state:b.state,flow_id:id,authorize_url:config.registry[client].broker_url+'?flow_id='+id,expires_in:600});
    }
    if(b.action==='signout'){
     if(req.headers.authorization!==undefined)actor(state,req,now());
     cancelFlow(state,state.flows[state.active]);revoke(state,state.current);state.generation++;
     for(const o of Object.values(state.offers))if(!o.confirmed)o.cancelled=true;
     return success(client,'signed_out');
    }
    if(b.action==='cancel'){
     if(!opaque(b.flow_id)||!state.flows[b.flow_id])fail('handoff_rejected',401);
     if(req.headers.authorization!==undefined)actor(state,req,now());
     cancelFlow(state,state.flows[b.flow_id]);return success(client,'cancelled',{flow_id:b.flow_id});
    }
    const s=actor(state,req,now());acknowledge(state,s);
    if(b.action==='session')return success(client,'session',{...account(s),expires_in:Math.ceil((s.until-now())/1000)});
    if(!opaque(b.offer_id))fail('offer_expired',409);
    const o=state.offers[b.offer_id];if(!o||o.actor!==s.key||o.cancelled||state.flows[o.flow_id]?.cancelled||o.until<=now())fail('offer_expired',409);
    if(b.action==='cancel-link'){if(o.confirmed)fail('offer_expired',409);o.cancelled=true;return success(client,'link_cancelled',account(s));}
    fresh(s,now());if(o.proof.authenticated_at>now()||now()-o.proof.authenticated_at>300000)fail('handoff_rejected',401);
    await tx.link(s,o.proof);o.confirmed=true;return success(client,'linked',{provider:o.proof.provider,...account(s)});
   },{create:b.action==='begin'||b.action==='signout'});
   return json(res,200,reply);
  }catch(e){return json(res,e.status??503,{contract_version:1,error:e.status?e.message:'unavailable'});}
 };
}
