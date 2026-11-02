import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import pg from 'pg';
import {createNativeDatabase} from '../server/native-database.mjs';
import {createNativeIntegrationFixture} from './lib/native-integration-fixture.mjs';
const token=()=>randomBytes(32).toString('base64url');
const s256=s=>createHash('sha256').update(s).digest('base64url');
let admin=process.env.CARVE_NATIVE_TEST_ADMIN_URL;
if(!admin){const u=new URL(process.env.CARVE_TEST_DATABASE_URL??'http://invalid');if(u.hostname!=='127.0.0.1'||!u.pathname.startsWith('/carve_shared_test_'))throw Error('Isolated loopback test database required');u.pathname='/postgres';admin=u.href;}
const f=await createNativeIntegrationFixture({adminConnectionString:admin});let checks=0;
const ok=(condition,message)=>{assert(condition,message);checks++;};
const client=(id='fixture-ios')=>({id,binding:token(),session:null});
async function call(c,action,values={},headers={}){
 const r=await fetch(f.origin+'/api/native-broker/v1',{method:'POST',headers:{'Content-Type':'application/json','X-Carve-Native-Binding':c.binding,...(c.session?{Authorization:'Bearer '+c.session}:{}),...headers},body:JSON.stringify({contract_version:1,client_id:c.id,action,...values})});
 ok(r.headers.get('cache-control')==='no-store'&&!r.headers.has('set-cookie'),'native replies have no cookies and cannot cache');return {status:r.status,...await r.json()};
}
async function qa(action,values={}){const r=await fetch(f.qa_origin+'/_fixture',{method:'POST',headers:{'Content-Type':'application/json','X-Test-Capability':f.capability},body:JSON.stringify({action,...values})});assert.equal(r.status,200);return r.json();}
async function begin(c,provider='google',intent='signin'){
 const verifier=token(),r=await call(c,'begin',{provider,intent,redirect_uri:f.return_targets[c.id],state:token(),code_challenge:s256(verifier),code_challenge_method:'S256'});
 assert.equal(r.result,'pending');ok(r.authorize_url===f.broker_url+'?flow_id='+r.flow_id,'exact registered launch URL');return {...r,verifier};
}
async function completed(c,identity='alpha',provider='google',intent='signin'){
 const flow=await begin(c,provider,intent),r=await qa('complete',{flow_id:flow.flow_id,identity});assert(r.return_uri,JSON.stringify(r));const u=new URL(r.return_uri);return {...flow,code:u.searchParams.get('code')};
}
const exchange=(c,flow,overrides={})=>call(c,'exchange',{provider:flow.provider,intent:flow.intent,code:flow.code,state:flow.state,verifier:flow.verifier,...overrides});
async function login(c,identity='alpha',provider='google'){const r=await exchange(c,await completed(c,identity,provider));assert.equal(r.result,'signed_in');c.session=r.session_token;return r;}
async function waitHeld(){for(let i=0;i<100;i++){if((await qa('stats')).held)return;await new Promise(r=>setTimeout(r,5));}throw Error('exchange barrier not reached');}
try{
 const ios=client(),android=client('fixture-android');
 for(const [raw,status]of [[' '.repeat(8193),413],['{"contract_version":1,"contract_version":1}',400],[Buffer.from([0xff]),400]]){
  const r=await fetch(f.origin+'/api/native-broker/v1',{method:'POST',headers:{'Content-Type':'application/json','X-Carve-Native-Binding':ios.binding},body:raw});ok(r.status===status,'raw bytes remain bounded and strict through Fetch adapter');
 }
 const flow=await completed(ios);ok((await exchange(ios,flow,{verifier:token()})).status===401,'wrong verifier rejected');
 const first=await exchange(ios,flow);assert.equal(first.result,'signed_in');ios.session=first.session_token;
 ok((await exchange(ios,flow)).error==='handoff_used','one-use code');
 ok((await call(ios,'session')).account_scope===first.account_scope,'persistent session');
 ok((await call({...ios,binding:token()},'session')).status===401,'instance isolation');
 ok((await call(ios,'session',{}, {Origin:''})).status===403,'Origin even empty rejected');
 ok((await call(ios,'session',{}, {Cookie:''})).status===403,'Cookie even empty rejected');
 const shared=await login(android);ok(shared.player_id===first.player_id&&shared.account_scope===first.account_scope,'same verified identity across platforms');
 const offer1=await exchange(ios,await completed(ios,'alpha','apple','link'));
 ok(offer1.result==='link_offer'&&typeof offer1.connection_hint==='string'&&!offer1.session_token,'Apple actual form-post callback stages explicit offer');
 ok((await call(ios,'cancel-link',{offer_id:offer1.offer_id})).result==='link_cancelled','explicit cancel');
 ok((await call(ios,'confirm-link',{offer_id:offer1.offer_id})).error==='offer_expired','cancel cannot confirm');
 const offer2=await exchange(ios,await completed(ios,'alpha','apple','link'));
 ok((await call(ios,'confirm-link',{offer_id:offer2.offer_id})).account_scope===first.account_scope,'explicit link preserves account');
 ok((await call(ios,'confirm-link',{offer_id:offer2.offer_id})).result==='linked','confirmation retry idempotent');
 ok((await call(ios,'cancel-link',{offer_id:offer2.offer_id})).error==='offer_expired','cancel cannot undo confirmed link');
 const appleClient=client('fixture-android'),apple=await login(appleClient,'alpha','apple');
 ok(apple.player_id===first.player_id,'linked Apple sign-in resolves original player');
 const other=client(),second=await login(other,'beta');ok(second.player_id!==first.player_id,'separate verified identity');
 const collision=await exchange(other,await completed(other,'alpha','apple','link'));
 ok((await call(other,'confirm-link',{offer_id:collision.offer_id})).error==='identity_already_owned','collision preserves owners');
 await call(ios,'signout');ios.session=null;
 ok((await call(android,'session')).result==='session','other device remains signed in');
 const staleClient=client(),old=await begin(staleClient),newer=await begin(staleClient);await call(staleClient,'cancel',{flow_id:old.flow_id});
 const latest=await qa('complete',{flow_id:newer.flow_id,identity:'gamma'});newer.code=new URL(latest.return_uri).searchParams.get('code');
 ok((await exchange(staleClient,newer)).result==='signed_in','stale cancel leaves newer intent valid');
 for(const operation of ['cancel','signout','new-intent']){
  const c=client(),pendingFlow=await completed(c,'gamma');await qa('hold');const pending=exchange(c,pendingFlow);await waitHeld();
  if(operation==='cancel')await call(c,'cancel',{flow_id:pendingFlow.flow_id});
  else if(operation==='signout')await call(c,'signout');else await begin(c);
  await qa('release');ok((await pending).error==='account_changed','held grant invalidated by '+operation);
 }
 const slow=client(),slowFlow=await begin(slow);await qa('advance',{ms:240000});const slowReturn=await qa('complete',{flow_id:slowFlow.flow_id,identity:'beta'});slowFlow.code=new URL(slowReturn.return_uri).searchParams.get('code');
 ok((await exchange(slow,slowFlow)).result==='signed_in','slow authorization has independent code clock');
 const expiredCode=client(),codeFlow=await completed(expiredCode);await qa('advance',{ms:120001});ok((await exchange(expiredCode,codeFlow)).error==='flow_expired','code expires');
 const expiredProvider=client(),providerFlow=await begin(expiredProvider);await qa('advance',{ms:600001});const providerResult=await qa('complete',{flow_id:providerFlow.flow_id,identity:'alpha'});ok(providerResult.status===410,'provider window expires');
 const exp=client();await login(exp);const expiredOffer=await exchange(exp,await completed(exp,'gamma','apple','link'));await qa('advance',{ms:120001});ok((await call(exp,'confirm-link',{offer_id:expiredOffer.offer_id})).error==='offer_expired','offer expires');
 await qa('advance',{ms:180000});ok((await call(exp,'session')).status===401,'session expires');
 const dbURL=new URL(admin);dbURL.pathname='/'+f.databaseName;const pool=new pg.Pool({connectionString:dbURL.href});
 try{
  const tables=(await pool.query("select relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='carve_shared_v1' and relkind='r'")).rows;
  ok(tables.length===9&&tables.every(t=>t.relrowsecurity),'native and shared tables have RLS');
  const persisted=(await pool.query('select data from carve_shared_v1.native_instances')).rows;
  ok(persisted.length>5&&persisted.every(r=>!JSON.stringify(r.data).includes(first.session_token)),'actual persisted state never stores raw native bearer');
  const restored=createNativeDatabase(dbURL.href);
  try{const saved=await restored.atomic(android.id,createHash('sha256').update(android.binding).digest('hex'),state=>state.sessions[createHash('sha256').update(android.session).digest('hex')]);ok(saved.player_id===first.player_id&&saved.scope===first.account_scope,'new database pool restores the same persisted player/scope');}finally{await restored.close();}
  const role='carve_native_probe_'+randomBytes(8).toString('hex');await pool.query('create role '+role+' nologin');
  const probe=await pool.connect();try{await probe.query('set role '+role);await assert.rejects(probe.query('select * from carve_shared_v1.native_instances'),/permission denied/);checks++;}finally{await probe.query('reset role');probe.release();}
 }finally{await pool.end();}
 ok((await f.stats()).trap_hits===0,'no unexpected redirects followed');
 console.log(`PASS native actual-handler/database: ${checks} assertions, signed provider callbacks, per-instance sessions, consent/collision, cancellation races, independent clocks and RLS`);
 console.log('Fresh synthetic database retained; no existing schema/data modified.');
}finally{await qa('release').catch(()=>{});await f.close();await assert.rejects(fetch(f.origin));await assert.rejects(fetch(f.qa_origin));}
