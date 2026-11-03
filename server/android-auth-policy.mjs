import {isIP} from 'node:net';
import {createHmac} from 'node:crypto';
import {parseNativeJSON,readNativeBody} from './native-broker.mjs';
import {authRoutes} from './android-auth-routes.mjs';
export {authRoutes} from './android-auth-routes.mjs';

export const androidClient='carve-staging-android-v1';
const opaque=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{43}$/.test(s);
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const exact=(o,keys)=>Object.keys(o).sort().join(',')===[...keys].sort().join(',');
const fields={begin:['provider','intent','redirect_uri','state','code_challenge','code_challenge_method'],exchange:['provider','intent','code','state','verifier'],session:[],cancel:['flow_id'],signout:[]};
// Reviewed source pins, not request headers or freely configurable host envs.
// Provider client pin stays empty until the owner's actual staging Web client
// is reviewed. Pinning a protected host/project never enables authentication.
export function androidAuthConfiguration(env,pins){
 try{
  if(env.VERCEL!=='1'||env.VERCEL_ENV!=='preview'||env.CARVE_ANDROID_AUTH_ENABLED!=='true')return null;
  if(!/^prj_[A-Za-z0-9]+$/.test(pins.project_id)||env.VERCEL_PROJECT_ID!==pins.project_id)return null;
  const origin=new URL(pins.origin);
  if(origin.origin!==pins.origin||origin.protocol!=='https:'||origin.port||origin.username||origin.password)return null;
  if(pins.database_ref!=='ffxcsgtissldpkuxgxvo'||env.CARVE_EXPECTED_PROJECT_REF!==pins.database_ref)return null;
  if(!/^[a-f\d]{64}$/i.test(env.CARVE_SESSION_SECRET??'')||!env.CARVE_GOOGLE_CLIENT_SECRET)return null;
  if(!/^\d{6,32}-[A-Za-z0-9_-]{10,128}\.apps\.googleusercontent\.com$/.test(pins.google_web_client_id??'')||env.CARVE_GOOGLE_CLIENT_ID!==pins.google_web_client_id)return null;
  if(env.CARVE_NATIVE_PROGRESS_CLIENTS||env.CARVE_NATIVE_CLIENTS||env.CARVE_APPLE_PRIVATE_KEY||env.CARVE_APPLE_SERVICE_ID||env.CARVE_EMAIL_SIGN_IN_ENABLED==='true')return null;
  if(!/^com\.carve\.preview\.staging$/.test(pins.android_package)||!/^([A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(pins.android_certificate_sha256))return null;
  const db=new URL(env.CARVE_SHARED_DATABASE_URL);
  if(!/^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(db.hostname)||db.port!=='6543'||db.username!==`carve_android_auth.${pins.database_ref}`||!db.password||db.pathname!=='/postgres')return null;
  const registry={[androidClient]:{broker_url:pins.origin+'/native/authorize',redirect_uri:pins.origin+'/native/return/android'}};
  return {origin:pins.origin,registry,env:{...env,CARVE_APP_ORIGIN:pins.origin,CARVE_NATIVE_CLIENTS:JSON.stringify(registry)}};
 }catch{return null;}
}
export function classifyAuthRequest(req,origin){
 const raw=req.url;
 if(typeof raw!=='string'||raw.length>4096||raw.includes('#')||/[\x00-\x20\x7f\\]/.test(raw))fail('not_found',404);
 const relative=raw.startsWith(origin+'/')?raw.slice(origin.length):raw;
 if(!relative.startsWith('/')||relative.startsWith('//'))fail('not_found',404);
 const path=relative.split('?')[0],route=authRoutes.find(r=>r.path===path);
 if(!route)fail('not_found',404);
 if(req.headers.host!==new URL(origin).host)fail('not_found',404);
 if(req.method!==route.method)fail('method_not_allowed',405);
 const url=new URL(relative,origin),params=url.searchParams;
 for(const key of params.keys())if(params.getAll(key).length!==1)fail('invalid_request');
 const keys=[...params.keys()].sort().join(',');
 if(['api','association'].includes(route.kind)&&relative.includes('?'))fail('invalid_request');
 if(route.kind==='authorize'&&(keys!=='flow_id'||!opaque(params.get('flow_id'))))fail('invalid_request');
 if(route.kind==='return'&&(keys!=='code,state'||!opaque(params.get('code'))||!opaque(params.get('state'))))fail('invalid_request');
 if(route.kind==='callback'){
  if(params.get('provider')!=='google'||![...params.keys()].every(k=>['provider','code','state','error','error_description','error_uri'].includes(k)))fail('invalid_request');
  if(!opaque(params.get('state')))fail('invalid_request');
  if(params.has('error')){if(params.has('code')||!params.get('error')||params.get('error').length>128||[...params.values()].some(v=>v.length>2048))fail('invalid_request');fail('handoff_rejected',401);}
  if(keys!=='code,provider,state'||!params.get('code')||params.get('code').length>2048)fail('invalid_request');
 }
 return route.kind;
}
export async function androidAuthBody(req,origin){
 if(Object.hasOwn(req.headers,'origin')||Object.hasOwn(req.headers,'cookie'))fail('client_rejected',403);
 if((req.headers['content-type']??'').split(';')[0].trim().toLowerCase()!=='application/json')fail('json_required',415);
 if(!opaque(req.headers['x-carve-native-binding']))fail('client_rejected',403);
 const raw=await readNativeBody(req),b=parseNativeJSON(raw);
 if(!Object.hasOwn(fields,b.action)||!exact(b,['contract_version','action','client_id',...fields[b.action]])||b.contract_version!==1||b.client_id!==androidClient)fail('client_rejected',403);
 if(['begin','exchange'].includes(b.action)&&(b.provider!=='google'||b.intent!=='signin'))fail('client_rejected',403);
 if(b.action==='begin'&&(b.redirect_uri!==origin+'/native/return/android'||!opaque(b.state)||!opaque(b.code_challenge)||b.code_challenge_method!=='S256'))fail('invalid_request');
 if(b.action==='exchange'&&(!opaque(b.code)||!opaque(b.state)||typeof b.verifier!=='string'||!/^[A-Za-z0-9._~-]{43,128}$/.test(b.verifier)))fail('handoff_rejected',401);
 if(b.action==='cancel'&&!opaque(b.flow_id))fail('invalid_request');
 if(req.headers.authorization!==undefined&&!/^Bearer [A-Za-z0-9_-]{43}$/.test(req.headers.authorization))fail('sign_in_required',401);
 req.body=raw;return b;
}
export function quotaIdentity(req,secret){
 // Only called behind the pinned Vercel Preview function, never a local/public
 // origin. Vercel supplies this header; do not fall back to client proxy lists.
 const ip=req.headers['x-vercel-forwarded-for'];
 if(typeof ip!=='string'||!isIP(ip))fail('client_rejected',403);
 const canonicalIP=isIP(ip)===6?new URL('http://['+ip+']/').hostname.slice(1,-1):ip;
 const hash=s=>createHmac('sha256',Buffer.from(secret,'hex')).update(s).digest('hex');
 return {ip:hash('ip:'+canonicalIP),binding:req.headers['x-carve-native-binding']?hash('binding:'+req.headers['x-carve-native-binding']):null};
}
