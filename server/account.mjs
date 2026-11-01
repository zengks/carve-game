import {createClient} from '@supabase/supabase-js';
import {cookieCodec} from './session.mjs';
import {createDatabase} from './database.mjs';
import {validateEvent} from '../shared/contract.mjs';
import {createOidc,randomSecret,digest,equal} from './oidc.mjs';

function configuration(env) {
  try {
    const origin=new URL(env.CARVE_APP_ORIGIN),backend=new URL(env.CARVE_SUPABASE_URL);
    const local=u=>['127.0.0.1','localhost'].includes(u.hostname);
    if(env.VERCEL_ENV==='production'||origin.origin!==env.CARVE_APP_ORIGIN||backend.pathname!=='/'||
      ![origin,backend].every(u=>!u.username&&!u.password&&(u.protocol==='https:'||(u.protocol==='http:'&&local(u))))||
      !env.CARVE_SUPABASE_PUBLISHABLE_KEY||!/^[a-f\d]{64}$/i.test(env.CARVE_SESSION_SECRET??'')||!env.CARVE_SHARED_DATABASE_URL)return null;
    return {origin:origin.origin,backend:backend.origin,secure:origin.protocol==='https:'};
  }catch{return null;}
}
const error=(code,status=400)=>Object.assign(new Error(code),{status});
async function rawBody(req) {
  if(req.body!==undefined){
    const raw=typeof req.body==='string'?req.body:Buffer.isBuffer(req.body)?req.body.toString():JSON.stringify(req.body);
    if(Buffer.byteLength(raw)>8192)throw error('request_too_large',413);return raw;
  }
  let size=0,parts=[];
  for await(const p of req){size+=Buffer.byteLength(p);if(size>8192)throw error('request_too_large',413);parts.push(Buffer.from(p));}
  return Buffer.concat(parts).toString();
}
async function body(req) {
  if(!(req.headers['content-type']??'').startsWith('application/json'))throw error('json_required',415);
  try{return JSON.parse(await rawBody(req));}catch(e){if(e.status)throw e;throw error('invalid_request');}
}
async function applePost(req) {
  if(!(req.headers['content-type']??'').startsWith('application/x-www-form-urlencoded'))throw error('invalid_callback');
  const raw=await rawBody(req);let params;
  if(req.body&&typeof req.body==='object'&&!Buffer.isBuffer(req.body)) {
    params=new URLSearchParams();for(const [key,value]of Object.entries(req.body)){
      if(typeof value!=='string')throw error('invalid_callback');params.append(key,value);
    }
  }else params=new URLSearchParams(raw);
  return callbackValues(params);
}
function callbackValues(params) {
  for(const key of ['code','state','error'])if(params.getAll(key).length>1)throw error('invalid_callback');
  const state=params.get('state'),code=params.get('code'),cancelled=params.has('error');
  if(!/^[A-Za-z0-9_-]{43}$/.test(state??'')||(cancelled&&code)||(!cancelled&&(!code||code.length>2048)))throw error('invalid_callback');
  return {state,code:code??'',cancelled};
}
function json(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));}
const subjectValid=id=>typeof id==='string'&&/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id);
const emailValid=email=>typeof email==='string'&&email.length<=254&&/^\S+@\S+\.\S+$/.test(email);
const fresh=user=>!!user?.binding&&Number.isFinite(user.fresh_at)&&user.fresh_at>Date.now()-300000&&user.fresh_at<=Date.now()+30000;

export function createAccountHandler({env=process.env,authFactory=createClient,database,oidc=createOidc(env)}={}) {
  const config=configuration(env),codec=config?cookieCodec(env.CARVE_SESSION_SECRET,{secure:config.secure}):null;
  let db=database;const databaseFor=()=>db??=createDatabase(env.CARVE_SHARED_DATABASE_URL);
  const checkScope=(req,user)=>{if(req.headers['x-carve-account']!==user.scope)throw error('account_changed',409);};
  function auth(){return authFactory(config.backend,env.CARVE_SUPABASE_PUBLISHABLE_KEY,{auth:{
    persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,
  },global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(8000)})}}).auth;}
  const emailProof=user=>{
    if(!subjectValid(user?.id)||user.is_anonymous===true||!emailValid(user.email)||!Number.isFinite(Date.parse(user.email_confirmed_at)))throw error('sign_in_required',401);
    const email=typeof user.email==='string'?user.email:'',at=email.lastIndexOf('@');
    return {issuer:config.backend,subject:user.id,provider:'email',label:at>0?email.slice(0,Math.min(2,at))+'…'+email.slice(at):'CARVE player '+user.id.slice(0,8)};
  };
  async function identity(req,res) {
    let session=codec.read(req,'session');if(!session)return null;
    if(session.kind==='broker'){
      if(session.issuer!==config.origin)return null;
      const user=await databaseFor().session(session.id);
      if(!user)codec.write(res,'session',null);return user;
    }
    // Read the previous preview's email cookie without changing its owner/scope.
    // New sign-ins use revocable app sessions, not provider tokens in the cookie.
    if(session.issuer!==config.backend)return null;
    const client=auth();
    if(!Number.isFinite(session.expires_at)||session.expires_at*1000<Date.now()+60000){
      const reply=await client.refreshSession({refresh_token:session.refresh_token});
      if(reply.error&&![400,401,403].includes(reply.error.status))throw error('service_unavailable',503);
      if(reply.error||!reply.data.session){codec.write(res,'session',null);return null;}
      session={...session,access_token:reply.data.session.access_token,refresh_token:reply.data.session.refresh_token,expires_at:reply.data.session.expires_at};codec.write(res,'session',session);
    }
    const reply=await client.getUser(session.access_token);
    if(reply.error&&![400,401,403].includes(reply.error.status))throw error('service_unavailable',503);
    if(reply.error){codec.write(res,'session',null);return null;}
    const proof=emailProof(reply.data.user);
    return {...proof,...await databaseFor().resolve(proof),fresh_at:0,binding:'legacy:'+digest(session.refresh_token)};
  }
  async function signIn(res,proof){
    const id=await databaseFor().createSession(proof);
    codec.write(res,'session',{kind:'broker',id,issuer:config.origin});
    for(const purpose of ['oauth','callback','link'])codec.write(res,purpose,null);
  }
  async function actor(req,res){const user=await identity(req,res);if(!user)throw error('sign_in_required',401);checkScope(req,user);if(!fresh(user))throw error('reauth_required',401);return user;}
  async function verifyEmail(value){
    if(!emailValid(value.email))throw error('invalid_email');
    if(typeof value.code!=='string'||!/^\d{6,10}$/.test(value.code))throw error('invalid_code');
    const client=auth(),reply=await client.verifyOtp({email:value.email,token:value.code,type:'email'});
    if(reply.error||!reply.data.session?.access_token)throw error('invalid_code',401);
    const verified=await client.getUser(reply.data.session.access_token);
    if(verified.error)throw error('invalid_code',401);const proof=emailProof(verified.data.user);
    // The temporary Auth proof is no longer our application session.
    await client.admin.signOut(reply.data.session.access_token,'local').catch(()=>{});return proof;
  }
  const redirect=(res,outcome)=>{res.statusCode=303;res.setHeader('Location','/?flow=1&account='+outcome);res.end();};
  async function providerReturn(req,res,provider,value){
    try{
      const pending=codec.read(req,'oauth');
      if(!pending||pending.id!==value?.state||pending.provider!==provider||!oidc.ready(provider))throw error('flow_rejected',401);
      const flow=await databaseFor().consumeFlow(pending.id,pending.browser);
      if(flow.provider!==provider||flow.redirect!==config.origin+'/api/account?provider_return='+provider||value.cancelled)throw error('flow_rejected',401);
      const current=await identity(req,res);
      if((current?.scope??'guest')!==flow.initiator_scope||!equal(digest(current?.binding??'guest'),flow.initiator_binding))throw error('account_changed',409);
      let user;
      if(flow.intent==='link'){
        user=current;
        if(!fresh(user)||user.scope!==flow.target.scope||!equal(digest(user.binding),flow.target.binding_hash))throw error('account_changed',409);
      }else if(flow.intent!=='signin')throw error('flow_rejected',401);
      const proof=await oidc.exchange(flow,value.code);
      if(flow.intent==='link'){
        const id=await databaseFor().createOffer(user,proof);codec.write(res,'link',{id},300000);
      }else await signIn(res,proof);
      redirect(res,flow.intent==='link'?'confirm-link':'return');
    }catch{redirect(res,'provider-error');}
  }
  return async function account(req,res){
    res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Cookie');
    res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
    const url=new URL(req.url,'http://local'),progress=url.pathname==='/api/shared-progress';
    try{
      if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');throw error('method_not_allowed',405);}
      if(!config){if(progress||req.method==='POST')throw error('not_configured',503);return json(res,200,{configured:false,account:null,providers:{email:false,apple:false,google:false},link_offer:null});}
      // Apple cross-site POST only stages a bounded untrusted response. It cannot
      // verify/sign in/link without original browser cookies on the same-origin GET.
      if(!progress&&req.method==='POST'&&url.searchParams.get('provider_return')==='apple'){
        const value=await applePost(req);codec.write(res,'callback',value,120000);
        res.statusCode=303;res.setHeader('Location','/api/account?provider_finalize=apple');return res.end();
      }
      if(!progress&&req.method==='GET'&&(url.searchParams.has('provider_return')||url.searchParams.has('provider_finalize'))){
        const provider=url.searchParams.get('provider_finalize')==='apple'?'apple':url.searchParams.get('provider_return');
        if(!['apple','google'].includes(provider))throw error('invalid_callback');
        // Capture first, then expire both one-use cookies before any response end.
        const staged=provider==='apple'?codec.read(req,'callback'):callbackValues(url.searchParams);
        codec.write(res,'oauth',null);codec.write(res,'callback',null);
        return await providerReturn(req,res,provider,staged);
      }
      if(req.method==='POST'&&(req.headers.origin!==config.origin||req.headers['sec-fetch-site']==='cross-site'))throw error('origin_rejected',403);
      if(req.method==='GET'){
        const user=await identity(req,res);
        if(progress){if(!user)throw error('sign_in_required',401);checkScope(req,user);return json(res,200,{...await databaseFor().read(user),account_scope:user.scope});}
        const offer=codec.read(req,'link');
        const link_offer=user&&fresh(user)&&offer?await databaseFor().offer(offer.id,user):null;
        return json(res,200,{configured:true,account:user?{scope:user.scope,label:user.label,linked:await databaseFor().providers(user),fresh:fresh(user)}:null,
          providers:{email:true,apple:oidc.ready('apple'),google:oidc.ready('google')},link_offer});
      }
      const value=await body(req);
      if(progress){const user=await identity(req,res);if(!user)throw error('sign_in_required',401);checkScope(req,user);validateEvent(value);return json(res,200,{...await databaseFor().write(user,value),account_scope:user.scope});}
      if(!value||typeof value!=='object'||Array.isArray(value))throw error('invalid_request');
      if(value.action==='signout'){
        const session=codec.read(req,'session');
        if(session?.kind==='broker'&&session.issuer===config.origin)await databaseFor().revokeSession(session.id);
        else if(session?.issuer===config.backend)await auth().admin.signOut(session.access_token,'local').catch(()=>{});
        for(const purpose of ['session','oauth','callback','link'])codec.write(res,purpose,null);return json(res,200,{ok:true});
      }
      if(['email','verify','link-email-send','link-email-verify'].includes(value.action)){
        const linking=value.action.startsWith('link-'),user=linking?await actor(req,res):null;
        if(!emailValid(value.email))throw error('invalid_email');
        if(['email','link-email-send'].includes(value.action)){
          const reply=await auth().signInWithOtp({email:value.email,options:{shouldCreateUser:true}});
          if(reply.error)throw error('code_unavailable',reply.error.status===429?429:503);return json(res,200,{ok:true});
        }
        const proof=await verifyEmail(value);
        if(linking){const id=await databaseFor().createOffer(user,proof);codec.write(res,'link',{id},300000);}
        else await signIn(res,proof);
        return json(res,200,{ok:true});
      }
      if(value.action==='oauth'||value.action==='link-provider'){
        if(!['apple','google'].includes(value.provider)||!oidc.ready(value.provider))throw error('provider_not_ready',503);
        const user=value.action==='link-provider'?await actor(req,res):await identity(req,res);
        const started=oidc.begin(value.provider,config.origin),browser=randomSecret();
        const linking=value.action==='link-provider';
        const flow={...started.flow,intent:linking?'link':'signin',initiator_scope:user?.scope??'guest',initiator_binding:digest(user?.binding??'guest'),
          ...(linking?{target:{scope:user.scope,binding_hash:digest(user.binding)}}:{})};
        await databaseFor().startFlow(flow,browser);
        codec.write(res,'oauth',{id:flow.id,provider:flow.provider,browser},600000);return json(res,200,{url:started.url});
      }
      if(value.action==='confirm-link'){
        const user=await actor(req,res),offer=codec.read(req,'link');if(!offer)throw error('link_offer_expired',409);
        await databaseFor().confirmLink(offer.id,user);codec.write(res,'link',null);return json(res,200,{ok:true});
      }
      if(value.action==='cancel-link'){
        const user=await identity(req,res),offer=codec.read(req,'link');
        if(user&&offer){checkScope(req,user);await databaseFor().cancelOffer(offer.id,user);}
        codec.write(res,'link',null);return json(res,200,{ok:true});
      }
      throw error('invalid_request');
    }catch(e){
      const known={invalid_event:400,unsupported_course:400,event_conflict:409,identity_already_owned:409,
        flow_rejected:401,link_offer_expired:409,provider_proof_rejected:401};
      const code=e.status?e.message:Object.hasOwn(known,e.message)?e.message:'service_unavailable';
      return json(res,e.status??known[code]??503,{error:code});
    }
  };
}
