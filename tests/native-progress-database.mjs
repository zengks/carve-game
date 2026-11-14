import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {createDatabase} from '../server/database.mjs';
import {createNativeProgressIntegrationFixture} from './lib/native-progress-fixture.mjs';
const token=()=>randomBytes(32).toString('base64url'),hash=s=>createHash('sha256').update(s).digest('hex'),challenge=s=>createHash('sha256').update(s).digest('base64url');
let admin=process.env.CARVE_NATIVE_TEST_ADMIN_URL;
if(!admin){const u=new URL(process.env.CARVE_TEST_DATABASE_URL??'http://invalid');if(u.hostname!=='127.0.0.1'||!u.pathname.startsWith('/carve_shared_test_'))throw Error('Fresh loopback QA database required');u.pathname='/postgres';admin=u.href;}
const f=await createNativeProgressIntegrationFixture({adminConnectionString:admin});
const dbURL=new URL(admin);dbURL.pathname='/'+f.databaseName;const pool=new pg.Pool({connectionString:dbURL.href});
const web=createDatabase(dbURL.href);
const identity=name=>({issuer:'https://accounts.google.com',subject:`synthetic-${name}-${f.databaseName}`});
const base=JSON.parse(await readFile(new URL('../shared/fixtures/native-first-ascent-v1.json',import.meta.url),'utf8'));
let checks=0;const ok=(condition,label)=>{assert(condition,label);checks++;};
const client=(id='fixture-ios')=>({id,binding:token(),session:null,scope:null,player:null});
async function qa(action,extra={}){const r=await fetch(f.qa_origin+'/_fixture',{method:'POST',headers:{'Content-Type':'application/json','X-Test-Capability':f.capability},body:JSON.stringify({action,...extra})});assert.equal(r.status,200);return r.json();}
async function broker(c,action,extra={}){const r=await fetch(f.origin+'/api/native-broker/v1',{method:'POST',headers:{'Content-Type':'application/json','X-Carve-Native-Binding':c.binding,...(c.session?{Authorization:'Bearer '+c.session}:{})},body:JSON.stringify({contract_version:1,client_id:c.id,action,...extra})});return {status:r.status,data:await r.json()};}
async function login(c,identity='alpha'){
 const verifier=token(),state=token();const started=await broker(c,'begin',{provider:'google',intent:'signin',redirect_uri:f.return_targets[c.id],state,code_challenge:challenge(verifier),code_challenge_method:'S256'});assert.equal(started.status,200);
 const completion=await qa('complete',{flow_id:started.data.flow_id,identity});assert(completion.return_uri);
 const granted=await broker(c,'exchange',{provider:'google',intent:'signin',state,verifier,code:new URL(completion.return_uri).searchParams.get('code')});assert.equal(granted.status,200);
 c.session=granted.data.session_token;c.scope=granted.data.account_scope;c.player=granted.data.player_id;return c;
}
function event(c,patch={},payload={}){const e=structuredClone(base);e.source_platform=c.id==='fixture-ios'?'ios':'android';Object.assign(e,patch);Object.assign(e.payload,{run_id:randomUUID()},payload);e.event_id=e.course_id+':'+e.payload.run_id;return e;}
async function progress(c,action='read',e=null,overrides={},options={}){
 const body={contract_version:1,action,client_id:c.id,account_scope:c.scope,testing:e?.payload.testing??true,...(e?{event:e}:{}),...overrides};
 const r=await fetch(f.origin+f.progress_path,{method:'POST',headers:{'Content-Type':'application/json','X-Carve-Native-Binding':c.binding,Authorization:'Bearer '+c.session,...options.headers},body:options.raw??JSON.stringify(body)});
 ok(r.headers.get('cache-control')==='no-store'&&!r.headers.has('set-cookie')&&!r.headers.has('access-control-allow-origin'),'private native progress transport');
 return {status:r.status,data:await r.json()};
}
async function wait(condition,label){for(let i=0;i<100;i++){if(await condition())return;await new Promise(r=>setTimeout(r,5));}throw Error(label);}
try{
 const ios=await login(client()),android=await login(client('fixture-android'));
 ok(ios.player===android.player&&ios.scope===android.scope,'same canonical account across aliases');
 const sessionBefore=(await pool.query('select data from carve_shared_v1.native_instances where client_id=$1 and binding_hash=$2',[ios.id,hash(ios.binding)])).rows[0].data.sessions[hash(ios.session)];
 const first=(await progress(ios)).data;
 ok(first.revision===0&&!first.completed&&first.tutorial_mask===0&&first.bests.length===0&&first.recent_events.length===0,'empty native snapshot');
 const webBefore=await web.read(identity('alpha'));
 ok(webBefore.player_id===ios.player&&webBefore.native_results.length===0,'same web account has no native result before copy');
 const original=event(ios,{}, {active_ms:42000,best_chain:7,falls:2,tutorial_mask:17});
 const accepted=await progress(ios,'write',original);ok(accepted.status===200&&accepted.data.revision===1&&accepted.data.completed,'first completed result');assert.deepEqual(accepted.data.accepted_event,original);checks++;
 const originalReceipt=(await pool.query('select received_at from carve_shared_v1.native_completed_results where player_id=$1 and event_id=$2',[ios.player,original.event_id])).rows[0].received_at.getTime();
 const repeats=await Promise.all(Array.from({length:6},()=>progress(ios,'write',original)));
 ok(repeats.every(r=>r.status===200&&r.data.revision===1),'concurrent retry has one immutable receipt/revision');
 const webAfter=await web.read(identity('alpha'));
 assert.deepEqual(webAfter.native_results,[original],'web reads the exact same First Ascent event once after copy');checks++;
 ok(webAfter.results.length===0&&(await web.read(identity('beta'))).native_results.length===0,'native results stay separate from Flow and other accounts');
 assert.deepEqual((await progress(android)).data.recent_events,[original],'other mobile platform reads the same event');checks++;
 const changed=structuredClone(original);changed.payload.active_ms++;
 ok((await progress(ios,'write',changed)).data.error==='event_conflict','changed retry rejects');
 ok((await progress(android,'write',original)).data.error==='platform_mismatch','strict platform also applies on retry');
 const second=event(android,{}, {active_ms:38000,best_chain:3,falls:5,tutorial_mask:18});await progress(android,'write',second);
 let cloud=(await progress(ios)).data;
 ok(cloud.revision===2&&cloud.tutorial_mask===19&&cloud.recent_events.some(e=>e.source_platform==='ios')&&cloud.recent_events.some(e=>e.source_platform==='android'),'cross-device read preserves both sources and teaching union');
 assert.deepEqual(cloud.bests,[{mode:'guided',resumed:false,best_time_ms:38000,best_chain:7,fewest_falls:2}]);checks++;
 for(const [mode,resumed]of [['guided',true],['replay',false],['replay',true]])await progress(android,'write',event(android,{mode},{resumed,tutorial_mask:31}));
 cloud=(await progress(ios)).data;ok(cloud.bests.length===4&&cloud.revision===5&&cloud.tutorial_mask===31,'four independent native best categories');
 const parallel=await Promise.all([
  ...Array.from({length:6},(_,i)=>{const c=i%2?ios:android;return progress(c,'write',event(c,{}, {active_ms:45000+i}));}),
  ...Array.from({length:4},(_,i)=>progress(i%2?ios:android))
 ]);
 for(const r of parallel)ok(r.status===200&&r.data.recent_events.length===r.data.revision,'cross-instance read/write snapshots have one coherent revision');
 ok((await progress(ios)).data.revision===11,'different-device concurrent inserts increment once each');
 const nonTesting=event(ios,{}, {testing:false,active_ms:1});await progress(ios,'write',nonTesting);
 ok((await progress(ios,'read',null,{testing:false})).data.revision===1&&(await progress(ios)).data.revision===11,'testing records stay separate');
 const badBucket=structuredClone(original);badBucket.payload.testing=false;
 ok((await progress(ios,'write',badBucket)).data.error==='event_conflict','run cannot silently change testing classification');
 const other=await login(client(),'beta');ok(other.player!==ios.player,'same display email never merges identities');
 const otherCloud=(await progress(other)).data;ok(otherCloud.revision===0&&otherCloud.recent_events.length===0,'other account reads none of first player results');
 for(const action of ['read','write'])ok((await progress(other,action,action==='write'?event(other):null,{account_scope:ios.scope})).data.error==='account_changed','wrong expected scope rejects '+action);
 ok((await progress(ios,'read',null,{player_id:other.player})).data.error==='invalid_request','caller cannot select player');
 const injected=event(ios);injected.payload.player_id=other.player;ok((await progress(ios,'write',injected)).data.error==='invalid_event','event cannot select owner');
 for(const headers of [{Origin:''},{Cookie:''}])ok((await progress(ios,'read',null,{}, {headers})).status===403,'browser auth context rejected');
 const malformed=JSON.stringify({contract_version:1,action:'write',client_id:ios.id,account_scope:ios.scope,testing:true,event:original}).replace('"active_ms":42000','"active_ms":42000,"active_ms":1');
 ok((await progress(ios,'write',original,{}, {raw:malformed})).status===400,'nested duplicate metric rejected');
 for(let i=0;i<21;i++)assert.equal((await progress(ios,'write',event(ios,{}, {active_ms:50000+i,best_chain:0,falls:10}))).status,200);
 const retry=await progress(ios,'write',original);ok(retry.data.revision===32&&retry.data.recent_events.length===20&&!retry.data.recent_events.some(e=>e.event_id===original.event_id),'old retry does not reinsert or reorder recent history');assert.deepEqual(retry.data.accepted_event,original);checks++;
 ok(Buffer.byteLength(JSON.stringify(retry.data))<16384,'bounded full-history response');
 ok((await pool.query('select received_at from carve_shared_v1.native_completed_results where player_id=$1 and event_id=$2',[ios.player,original.event_id])).rows[0].received_at.getTime()===originalReceipt,'duplicate keeps original server receipt time');
 const storedBeforeFault=(await pool.query('select data from carve_shared_v1.native_instances where client_id=$1 and binding_hash=$2',[ios.id,hash(ios.binding)])).rows[0].data;
 const corrupt=structuredClone(storedBeforeFault);corrupt.sessions[hash(ios.session)].player_id=other.player;
 await pool.query('update carve_shared_v1.native_instances set data=$3 where client_id=$1 and binding_hash=$2',[ios.id,hash(ios.binding),JSON.stringify(corrupt)]);
 ok((await progress(ios)).status===401,'canonical issuer/subject guard rejects inconsistent stored owner');
 await pool.query('update carve_shared_v1.native_instances set data=$3 where client_id=$1 and binding_hash=$2',[ios.id,hash(ios.binding),JSON.stringify(storedBeforeFault)]);
 const revoked=await login(client()),lateEvent=event(revoked);await qa('hold-progress');const pending=progress(revoked,'write',lateEvent);
 await wait(async()=>(await qa('stats')).progress_held,'progress hold not reached');assert.equal((await broker(revoked,'signout')).status,200);await qa('release');ok((await pending).status===401,'signout before actual transaction prevents late save');
 ok(Number((await pool.query('select count(*) from carve_shared_v1.native_completed_results where player_id=$1 and event_id=$2',[ios.player,lateEvent.event_id])).rows[0].count)===0,'revoked late result not inserted');
 ok((await progress(android)).status===200,'peer native session survives scoped signout');
 const tables=(await pool.query("select relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='carve_shared_v1' and relkind='r'")).rows;
 ok(tables.length===11&&tables.every(t=>t.relrowsecurity),'all native/shared private tables have RLS');
 const role='carve_progress_probe_'+randomBytes(8).toString('hex');await pool.query('create role '+role+' nologin');const probe=await pool.connect();
 try{await probe.query('set role '+role);await assert.rejects(probe.query('select * from carve_shared_v1.native_completed_results'),/permission denied/);checks++;}finally{await probe.query('reset role');probe.release();}
 ok(Number((await pool.query('select count(*) from carve_shared_v1.completed_results')).rows[0].count)===0&&Number((await pool.query('select count(*) from carve_shared_v1.course_progress')).rows[0].count)===0,'Flow result/progress tables remain untouched');
 const sessionAfter=(await pool.query('select data from carve_shared_v1.native_instances where client_id=$1 and binding_hash=$2',[ios.id,hash(ios.binding)])).rows[0].data.sessions[hash(ios.session)];
 ok(sessionAfter.until===sessionBefore.until&&sessionAfter.auth_at===sessionBefore.auth_at,'reads/writes never refresh native expiry or authentication time');
 // Hold the progress row so expiry occurs after authorization, before commit.
 const lock=await pool.connect();await lock.query('begin');await lock.query('select * from carve_shared_v1.native_course_progress where player_id=$1 and testing=true for update',[ios.player]);
 const expiresDuring=event(ios),waiting=progress(ios,'write',expiresDuring);
 try{
  await wait(async()=>Number((await pool.query("select count(*) from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query like '%native_course_progress%'")).rows[0].count)>0,'write did not reach held progress row');
  await qa('advance',{ms:300001});await lock.query('commit');
 }finally{await lock.query('rollback');lock.release();}
 ok((await waiting).status===401,'expired authority rolls back work after a SQL wait');
 ok(Number((await pool.query('select count(*) from carve_shared_v1.native_completed_results where player_id=$1 and event_id=$2',[ios.player,expiresDuring.event_id])).rows[0].count)===0,'expiry rollback leaves no result');
 ok((await progress(ios)).status===401,'original expiry remains enforced');
 console.log(`PASS native progress PostgreSQL: ${checks} assertions, signed synthetic auth, idempotency/conflicts, coherent snapshots, platform/account isolation, RLS and revocation/expiry races`);
 console.log('Fresh native progress database retained; no existing app/database/profile data used.');
}finally{await qa('release').catch(()=>{});await web.close();await pool.end();await f.close();await assert.rejects(fetch(f.origin));await assert.rejects(fetch(f.qa_origin));}
