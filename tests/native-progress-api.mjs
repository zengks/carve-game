import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createNativeProgressHandler} from '../server/native-progress.mjs';
import {createNativeFetchHandler} from '../server/native-vercel.mjs';
import {digest} from '../server/oidc.mjs';
const fixture=JSON.parse(await readFile(new URL('../shared/fixtures/native-first-ascent-v1.json',import.meta.url),'utf8'));
const token='s'.repeat(43),binding='b'.repeat(43),scope='c'.repeat(64),key=digest(token);let clock=1000000,calls=0;
const actor={key,player_id:'578f816a-11dc-42ee-9d9c-ef4baafc5f75',scope,issuer:'https://accounts.google.com',subject:'synthetic',until:clock+300000,auth_at:clock};
const state={current:key,sessions:{[key]:actor},flows:{}};
const empty=testing=>({course_id:'native.first-ascent-v1',rules_version:'native-fa-rules-1',tutorial_version:1,testing,revision:0,completed:false,tutorial_mask:0,bests:[],recent_events:[],validation:'client_reported'});
let late=false;
const database={async atomic(client,hash,fn){if(client!=='fixture-ios'||hash!==digest(binding))throw Object.assign(Error('handoff_rejected'),{status:401});return fn(state,{nativeProgress:{owner:async()=>{},read:async(a,t)=>{calls++;if(late)clock+=300001;return empty(t);},write:async(a,e)=>{calls++;return {...empty(e.payload.testing),revision:1,completed:true,tutorial_mask:e.payload.tutorial_mask,recent_events:[e],accepted_event:e};}}});}};
const env={CARVE_APP_ORIGIN:'https://broker.example.test',CARVE_SHARED_DATABASE_URL:'postgres://not-used',CARVE_SESSION_SECRET:'a'.repeat(64),CARVE_NATIVE_CLIENTS:JSON.stringify({'fixture-ios':{redirect_uri:'https://app.example.test/ios',broker_url:'https://broker.example.test/native/authorize'},'fixture-android':{redirect_uri:'https://app.example.test/android',broker_url:'https://broker.example.test/native/authorize'}}),CARVE_NATIVE_PROGRESS_CLIENTS:JSON.stringify({'fixture-ios':'ios','fixture-android':'android'})};
const handler=createNativeFetchHandler(createNativeProgressHandler({env,database,now:()=>clock}));
let checks=0;const check=(condition,label)=>{assert(condition,label);checks++;};
const common={contract_version:1,action:'read',client_id:'fixture-ios',account_scope:scope,testing:true};
async function request(change={},options={}){
 const headers={'Content-Type':'application/json','X-Carve-Native-Binding':binding,Authorization:'Bearer '+token,...options.headers};
 const r=await handler(new Request('https://broker.example.test/api/native-progress/v1'+(options.query??''),{method:options.method??'POST',headers,...(options.method==='GET'?{}:{body:options.raw??JSON.stringify({...common,...change})})}));
 check(r.headers.get('cache-control')==='no-store'&&!r.headers.has('set-cookie')&&!r.headers.has('access-control-allow-origin'),'native progress responses stay private and cookie-free');
 return {status:r.status,...await r.json()};
}
check((await request()).result==='snapshot','empty snapshot');
const accepted=await request({action:'write',event:fixture});check(accepted.result==='accepted'&&JSON.stringify(accepted.accepted_event)===JSON.stringify(fixture),'full immutable acknowledgment');
for(const headers of [{Cookie:''},{Origin:''}])check((await request({}, {headers})).status===403,'browser rejection');
for(const patch of [{player_id:actor.player_id},{account_scope:'short'},{testing:1},{action:'delete'}])check((await request(patch)).status===400,'exact request schema');
check((await request({account_scope:'d'.repeat(64)})).error==='account_changed','cross-account guard');
check((await request({}, {headers:{Authorization:'Bearer '+'x'.repeat(43)}})).status===401,'native bearer required');
check((await request({}, {headers:{'X-Carve-Native-Binding':'x'.repeat(43)}})).status===401,'binding required');
check((await request({client_id:'unknown'})).status===403,'registered client only');
check((await request({contract_version:2})).error==='unsupported_contract','wire version');
check((await request({}, {method:'GET'})).status===405,'POST only');
check((await request({}, {headers:{'Content-Type':'text/plain'}})).status===415,'JSON only');
check((await request({}, {query:'?owner=other'})).status===400,'query cannot select owner');
for(const raw of ['{"contract_version":1,"event":{"run_id":1,"run_id":2}}','{"contract_version":1,"event":{"payload":{"x":1,"\\u0078":2}}}',' '.repeat(8193)])check((await request({}, {raw})).status===(raw.length>8192?413:400),'raw validation');
const wrong=structuredClone(fixture);wrong.source_platform='android';check((await request({action:'write',event:wrong})).error==='platform_mismatch','platform registry');
check((await request({action:'write',event:fixture,testing:false})).error==='invalid_event','testing bucket guard');
const noFinish=structuredClone(fixture);noFinish.payload.tutorial_mask=15;check((await request({action:'write',event:noFinish})).error==='invalid_event','completed results only');
check(calls===2,'rejected requests never reach progress read/write');
late=true;check((await request()).status===401,'expiry rechecked after transaction work');
for(const badEnv of [{},{...env,VERCEL_ENV:'production'},{...env,CARVE_NATIVE_PROGRESS_CLIENTS:'{}'},{...env,CARVE_NATIVE_PROGRESS_CLIENTS:'{"unknown":"ios"}'},{...env,CARVE_NATIVE_PROGRESS_CLIENTS:'{"fixture-ios":"web"}'}]){
 const disabled=createNativeFetchHandler(createNativeProgressHandler({env:badEnv}));const r=await disabled(new Request('https://broker.example.test/api/native-progress/v1'));check(r.status===503&&(await r.json()).error==='not_configured','independent disabled gate');
}
console.log(`PASS native progress API: ${checks} auth/scope/registry/strict-body/expiry/readiness assertions (synthetic transaction double)`);
