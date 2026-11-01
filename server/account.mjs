import {createClient} from '@supabase/supabase-js';
import {createHash} from 'node:crypto';
import {cookieCodec} from './session.mjs';
import {createDatabase} from './database.mjs';
import {validateEvent} from '../shared/contract.mjs';

function configuration(env) {
  try {
    const origin=new URL(env.CARVE_APP_ORIGIN), backend=new URL(env.CARVE_SUPABASE_URL);
    const local=u=>['127.0.0.1','localhost'].includes(u.hostname);
    if (env.VERCEL_ENV==='production' || origin.origin!==env.CARVE_APP_ORIGIN ||
        ![origin,backend].every(u=>u.protocol==='https:' || (u.protocol==='http:'&&local(u))) ||
        !env.CARVE_SUPABASE_PUBLISHABLE_KEY || !/^[a-f\d]{64}$/i.test(env.CARVE_SESSION_SECRET??'') ||
        !env.CARVE_SHARED_DATABASE_URL) return null;
    return {origin:origin.origin,backend:backend.origin,secure:origin.protocol==='https:',
      // Deliberately code-gated: an environment flag cannot fix Auth's implicit
      // identity linking. Enable only with the reviewed broker/auth strategy.
      oauth:false};
  } catch {return null;}
}
const error=(code,status=400)=>Object.assign(new Error(code),{status});
async function body(req) {
  if (!(req.headers['content-type']??'').startsWith('application/json')) throw error('json_required',415);
  // Vercel's Node request may already have a parsed body; the local HTTP server
  // supplies a stream. Apply the same size limit and validation to both paths.
  if(req.body!==undefined) {
    const raw=typeof req.body==='string'?req.body:Buffer.isBuffer(req.body)?req.body.toString():JSON.stringify(req.body);
    if(Buffer.byteLength(raw)>8192)throw error('request_too_large',413);
    try{return JSON.parse(raw);}catch{throw error('invalid_request');}
  }
  let size=0,parts=[];
  for await(const p of req){size+=Buffer.byteLength(p);if(size>8192)throw error('request_too_large',413);parts.push(p);}
  try{return JSON.parse(Buffer.concat(parts.map(p=>Buffer.from(p))).toString());}catch{throw error('invalid_request');}
}
function json(res,status,data) {res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));}
const subjectValid=id=>typeof id==='string'&&/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id);

export function createAccountHandler({env=process.env,authFactory=createClient,database}={}) {
  const config=configuration(env);
  const codec=config?cookieCodec(env.CARVE_SESSION_SECRET,{secure:config.secure}):null;
  let db=database;
  const databaseFor=()=>db??=createDatabase(env.CARVE_SHARED_DATABASE_URL);
  function auth(storage={}) {
    return authFactory(config.backend,env.CARVE_SUPABASE_PUBLISHABLE_KEY,{auth:{
      persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,flowType:'pkce',
      storage:{getItem:k=>storage[k]??null,setItem:(k,v)=>{storage[k]=v;},removeItem:k=>{delete storage[k];}},
    },global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(8000)})}}).auth;
  }
  const tokens=session=>({access_token:session.access_token,refresh_token:session.refresh_token,
    expires_at:session.expires_at,issuer:config.backend});
  const accountScope=user=>createHash('sha256').update(user.issuer+':'+user.subject).digest('hex');
  const checkScope=(req,user)=>{if(req.headers['x-carve-account']!==accountScope(user))throw error('account_changed',409);};
  async function identity(req,res) {
    let session=codec.read(req,'session');
    if (!session || session.issuer!==config.backend) return null;
    const client=auth();
    if (!Number.isFinite(session.expires_at) || session.expires_at*1000<Date.now()+60000) {
      const {data,error:failure}=await client.refreshSession({refresh_token:session.refresh_token});
      if(failure && ![400,401,403].includes(failure.status))throw error('service_unavailable',503);
      if(failure||!data.session){codec.write(res,'session',null);return null;}
      session=tokens(data.session);codec.write(res,'session',session);
    }
    const {data,error:failure}=await client.getUser(session.access_token);
    if(failure && ![400,401,403].includes(failure.status))throw error('service_unavailable',503);
    if(failure||!subjectValid(data.user?.id)||data.user.is_anonymous===true){codec.write(res,'session',null);return null;}
    // Until the linking gate is resolved, only verified email OTP is enabled.
    // Never use editable user_metadata, an email string, or a request owner ID.
    const email=typeof data.user.email==='string'?data.user.email:'';
    const at=email.lastIndexOf('@');
    const label=at>0?email.slice(0,Math.min(2,at))+'…'+email.slice(at):'CARVE player '+data.user.id.slice(0,8);
    return {issuer:config.backend,subject:data.user.id,label};
  }
  function storeSession(res,session) {
    if(!session?.access_token||!session.refresh_token)throw error('sign_in_failed',401);
    codec.write(res,'session',tokens(session));
  }
  return async function account(req,res) {
    res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Cookie');
    res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
    const url=new URL(req.url,'http://local'),progress=url.pathname==='/api/shared-progress';
    try {
      if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');throw error('method_not_allowed',405);}
      if(req.method==='POST' && (!config || req.headers.origin!==config.origin || req.headers['sec-fetch-site']==='cross-site'))throw error(config?'origin_rejected':'not_configured',config?403:503);
      if(!config){if(progress)throw error('not_configured',503);return json(res,200,{configured:false,account:null,providers:{email:false,apple:false,google:false}});}
      if(req.method==='GET'&&url.searchParams.has('callback')) {
        const pending=codec.read(req,'oauth');codec.write(res,'oauth',null);
        const code=url.searchParams.get('code');
        if(!config.oauth||!pending||pending.issuer!==config.backend||!code||code.length>2048)throw error('sign_in_failed',401);
        const flowId=url.searchParams.get('sb_flow_id');
        const reply=await auth(pending.storage).exchangeCodeForSession(code,flowId?{flowId}:undefined);
        if(reply.error)throw error('sign_in_failed',401);
        storeSession(res,reply.data.session);res.statusCode=303;res.setHeader('Location','/?account=return');return res.end();
      }
      if(req.method==='GET') {
        const user=await identity(req,res);
        if(progress){if(!user)throw error('sign_in_required',401);checkScope(req,user);return json(res,200,{...await databaseFor().read(user),account_scope:accountScope(user)});}
        const scope=user?accountScope(user):null;
        return json(res,200,{configured:true,account:scope?{scope,label:user.label}:null,providers:{email:true,apple:config.oauth,google:config.oauth}});
      }
      const value=await body(req);
      if(progress) {
        const user=await identity(req,res);if(!user)throw error('sign_in_required',401);
        checkScope(req,user);validateEvent(value);return json(res,200,{...await databaseFor().write(user,value),account_scope:accountScope(user)});
      }
      if(!value||typeof value!=='object'||Array.isArray(value))throw error('invalid_request');
      if(value.action==='signout') {
        const session=codec.read(req,'session');codec.write(res,'session',null);codec.write(res,'oauth',null);
        if(session?.issuer===config.backend)await auth().admin.signOut(session.access_token,'local').catch(()=>{});
        return json(res,200,{ok:true});
      }
      if(value.action==='email' || value.action==='verify') {
        if(typeof value.email!=='string'||value.email.length>254||!/^\S+@\S+\.\S+$/.test(value.email))throw error('invalid_email');
        const client=auth();
        if(value.action==='email') {
          const reply=await client.signInWithOtp({email:value.email,options:{shouldCreateUser:true}});
          if(reply.error)throw error('code_unavailable',reply.error.status===429?429:503);
          return json(res,200,{ok:true});
        }
        if(typeof value.code!=='string'||!/^\d{6,10}$/.test(value.code))throw error('invalid_code');
        const reply=await client.verifyOtp({email:value.email,token:value.code,type:'email'});
        if(reply.error)throw error('invalid_code',401);
        storeSession(res,reply.data.session);return json(res,200,{ok:true});
      }
      if(value.action==='oauth') {
        if(!['apple','google'].includes(value.provider))throw error('invalid_provider');
        if(!config.oauth)throw error('provider_not_ready',503);
        const storage={};const reply=await auth(storage).signInWithOAuth({provider:value.provider,
          options:{redirectTo:config.origin+'/api/account?callback=1',skipBrowserRedirect:true}});
        if(reply.error||!reply.data.url)throw error('provider_unavailable',503);
        const redirect=new URL(reply.data.url);
        if(redirect.origin!==config.backend)throw error('provider_unavailable',503);
        codec.write(res,'oauth',{storage,issuer:config.backend},600000);return json(res,200,{url:redirect.href});
      }
      throw error('invalid_request');
    } catch(e) {
      const known=['invalid_event','unsupported_course','event_conflict'];
      const code=e.status?e.message:known.includes(e.message)?e.message:'service_unavailable';
      return json(res,e.status??(code==='event_conflict'?409:known.includes(code)?400:503),{error:code});
    }
  };
}
