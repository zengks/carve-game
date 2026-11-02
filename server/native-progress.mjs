import {createNativeDatabase} from './native-database.mjs';
import {nativeConfiguration,nativeActor,acknowledgeNativeActor,readNativeBody} from './native-broker.mjs';
import {parseStrictJSON} from './strict-json.mjs';
import {validateNativeEvent,exactKeys} from '../shared/native-progress.mjs';
import {digest,equal} from './oidc.mjs';
const fail=(code,status=400)=>{throw Object.assign(Error(code),{status});};
function configured(env){
 const config=nativeConfiguration(env);if(!config)return null;
 try{
  const platforms=JSON.parse(env.CARVE_NATIVE_PROGRESS_CLIENTS??'null');
  if(!platforms||typeof platforms!=='object'||Array.isArray(platforms)||!Object.keys(platforms).length||Object.keys(platforms).length>16)return null;
  if(Object.entries(platforms).some(([id,p])=>!Object.hasOwn(config.registry,id)||!['ios','android'].includes(p)))return null;
  return {...config,platforms};
 }catch{return null;}
}
export function createNativeProgressHandler({env=process.env,database,now=()=>Date.now()}={}){
 const config=configured(env);let db=database;
 return async(req,res)=>{
  for(const [k,v]of Object.entries({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}))res.setHeader(k,v);
  const json=(status,data)=>{const raw=JSON.stringify(data);if(Buffer.byteLength(raw)>16384)throw Error('response_too_large');res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(raw);};
  try{
   if(!config)fail('not_configured',503);
   const url=new URL(req.url,config.origin);if(url.pathname!=='/api/native-progress/v1'||url.search)fail('invalid_request');
   if(req.method!=='POST'){res.setHeader('Allow','POST');fail('method_not_allowed',405);}
   if(Object.hasOwn(req.headers,'cookie')||Object.hasOwn(req.headers,'origin'))fail('client_rejected',403);
   if((req.headers['content-type']??'').split(';')[0].trim().toLowerCase()!=='application/json')fail('json_required',415);
   const b=parseStrictJSON(await readNativeBody(req));
   if(!b||typeof b!=='object'||Array.isArray(b))fail('invalid_request');
   if(b.contract_version!==1)fail('unsupported_contract');
   if(!['read','write'].includes(b.action)||!exactKeys(b,['contract_version','action','client_id','account_scope','testing',...(b.action==='write'?['event']:[])])||typeof b.account_scope!=='string'||!/^[a-f\d]{64}$/.test(b.account_scope)||typeof b.testing!=='boolean')fail('invalid_request');
   const client=b.client_id,binding=req.headers['x-carve-native-binding'];
   if(typeof client!=='string'||!Object.hasOwn(config.platforms,client)||typeof binding!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(binding))fail('client_rejected',403);
   if(b.action==='write'){
    validateNativeEvent(b.event);if(b.event.payload.testing!==b.testing)fail('invalid_event');
    if(b.event.source_platform!==config.platforms[client])fail('platform_mismatch');
   }
   db??=createNativeDatabase(env.CARVE_SHARED_DATABASE_URL);
   const reply=await db.atomic(client,digest(binding),async(state,tx)=>{
    const actor=nativeActor(state,req,now());if(!equal(actor.scope,b.account_scope))fail('account_changed',409);
    await tx.nativeProgress.owner(actor);
    acknowledgeNativeActor(state,actor);
    const snapshot=b.action==='write'?await tx.nativeProgress.write(actor,b.event):await tx.nativeProgress.read(actor,b.testing);
    // Recheck the unchanged original expiry after waiting on any SQL lock.
    nativeActor(state,req,now());
    return {contract_version:1,client_id:client,result:b.action==='write'?'accepted':'snapshot',player_id:actor.player_id,account_scope:actor.scope,...snapshot};
   });json(200,reply);
  }catch(e){
   const validation=['invalid_event','unsupported_course'].includes(e.message),missing=e.message==='handoff_rejected';
   json(missing?401:e.status??(validation?400:503),{contract_version:1,error:missing?'sign_in_required':e.status||validation?e.message:'unavailable'});
  }
 };
}
