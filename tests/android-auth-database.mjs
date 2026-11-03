import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import pg from 'pg';
import {createAndroidAuthDatabase,quotaLimits} from '../server/android-auth-database.mjs';
import {createAndroidAuthHandler} from '../server/android-auth.mjs';
import {createNativeFetchHandler} from '../server/native-vercel.mjs';
import {androidClient} from '../server/android-auth-policy.mjs';
import {digest} from '../server/oidc.mjs';
import {androidAuthCredentialSQL} from '../scripts/android-auth-credential-sql.mjs';
const adminURL=new URL(process.env.CARVE_TEST_DATABASE_URL??'http://invalid');
if(!['postgres:','postgresql:'].includes(adminURL.protocol)||adminURL.hostname!=='127.0.0.1'||!adminURL.pathname.startsWith('/carve_shared_test_'))throw Error('Explicit isolated loopback QA database URL required');
const databaseName='carve_shared_test_android_'+randomUUID().replaceAll('-','');
const admin=new pg.Pool({connectionString:adminURL.href});
await admin.query('CREATE DATABASE '+databaseName);await admin.end();
const url=new URL(adminURL);url.pathname='/'+databaseName;
const owner=new pg.Pool({connectionString:url.href});let db,second,release=null;
const token=()=>randomBytes(32).toString('base64url');
try{
 for(const name of ['schema.sql','native-schema.sql'])await owner.query(await readFile(new URL('../server/'+name,import.meta.url),'utf8'));
 // Reproduce explicit platform default grants in this NEW QA database. The
 // migration must revoke them on new auth objects without changing old grants.
 for(const role of ['anon','authenticated','service_role']){
  if(!(await owner.query('select 1 from pg_roles where rolname=$1',[role])).rowCount)await owner.query('create role '+role+' nologin');
  await owner.query('alter default privileges grant select,insert,update,delete on tables to '+role);
  await owner.query('alter default privileges grant execute on functions to '+role);
 }
 let sql=await readFile(new URL('../server/android-auth-schema.sql',import.meta.url),'utf8');
 // Cluster roles are retained across fresh QA databases. Never alter an old role.
 if((await owner.query("select 1 from pg_roles where rolname='carve_android_auth'")).rowCount){
  const r=(await owner.query("select * from pg_roles where rolname='carve_android_auth'")).rows[0];
  assert(!r.rolcanlogin&&!r.rolsuper&&!r.rolbypassrls&&!r.rolcreatedb&&!r.rolcreaterole&&!r.rolinherit);assert.equal(r.rolconnlimit,4);
  sql=sql.replace(/^CREATE ROLE carve_android_auth .*;\n/m,'');
 }
 await owner.query(sql);
 const defaultGrants=(await owner.query("select r.rolname,has_schema_privilege(r.rolname,'carve_android_auth_v1','USAGE') as schema_usage,has_table_privilege(r.rolname,'carve_android_auth_v1.testers','SELECT') as tester_select,has_function_privilege(r.rolname,'carve_android_auth_v1.admitted(text,text)','EXECUTE') as admission from pg_roles r where r.rolname in('anon','authenticated','service_role')")).rows;
 assert.equal(defaultGrants.length,3);assert(defaultGrants.every(g=>!g.schema_usage&&!g.tester_select&&!g.admission),'Explicit platform default grants must be removed from new auth objects');
 const pool=()=>new pg.Pool({connectionString:url.href,max:2,options:'-c role=carve_android_auth'});
 db=createAndroidAuthDatabase(url.href,{pool:pool()});second=createAndroidAuthDatabase(url.href,{pool:pool()});
 const pins={project_id:'prj_fixture',origin:'https://android-auth.example.test',google_web_client_id:'123456789012-fixturewebclient.apps.googleusercontent.com',database_ref:'ffxcsgtissldpkuxgxvo',android_package:'com.carve.preview.staging',android_certificate_sha256:Array(32).fill('AB').join(':')};
 const env={VERCEL:'1',VERCEL_ENV:'preview',VERCEL_PROJECT_ID:pins.project_id,CARVE_ANDROID_AUTH_ENABLED:'true',CARVE_EXPECTED_PROJECT_REF:pins.database_ref,CARVE_SHARED_DATABASE_URL:`postgres://carve_android_auth.${pins.database_ref}:synthetic@aws-1-ca-central-1.pooler.supabase.com:6543/postgres`,CARVE_SESSION_SECRET:'a'.repeat(64),CARVE_GOOGLE_CLIENT_ID:pins.google_web_client_id,CARVE_GOOGLE_CLIENT_SECRET:'synthetic'};
 let proof={issuer:'https://accounts.google.com',subject:'synthetic-admitted',provider:'google',label:'same-display@example.test',authenticated_at:Date.now()},hold=null;
 const oidc={ready:p=>p==='google',begin:()=>{const flow={id:token(),provider:'google'};return {flow,url:'https://accounts.google.com/o/oauth2/v2/auth?state='+flow.id};},exchange:async()=>({...proof})};
 const handler=createNativeFetchHandler(createAndroidAuthHandler({env,pins,database:db,oidc,beforeGrant:async()=>{if(hold){hold();hold=null;await new Promise(r=>{release=r;});}}}));
 const client=()=>({binding:token(),verifier:token(),state:token(),session:null});
 const request=(c,path,body,extra={})=>handler(new Request(pins.origin+path,{method:body?'POST':'GET',headers:{Host:new URL(pins.origin).host,'X-Vercel-Forwarded-For':'203.0.113.8',...(body?{'Content-Type':'application/json','X-Carve-Native-Binding':c.binding,...(c.session?{Authorization:'Bearer '+c.session}:{})}:{}),...extra},...(body?{body:JSON.stringify({contract_version:1,client_id:androidClient,...body})}:{})}));
 const call=(c,action,fields={})=>request(c,'/api/native-broker/v1',{action,...fields});
 const begin=async c=>{const r=await call(c,'begin',{provider:'google',intent:'signin',redirect_uri:pins.origin+'/native/return/android',state:c.state,code_challenge:Buffer.from(digest(c.verifier),'hex').toString('base64url'),code_challenge_method:'S256'});assert.equal(r.status,200);return r.json();};
 const callback=async(c,start)=>{
  const launch=await request(c,'/native/authorize?flow_id='+start.flow_id);assert.equal(launch.status,303);
  const state=new URL(launch.headers.get('location')).searchParams.get('state');
  return request(c,'/api/native-broker/callback?'+new URLSearchParams({provider:'google',state,code:'synthetic-provider-code'}),null,{Cookie:launch.headers.getSetCookie()[0].split(';')[0]});
 };
 const exchange=(c,code)=>call(c,'exchange',{provider:'google',intent:'signin',code,state:c.state,verifier:c.verifier});
 const count=async table=>Number((await owner.query('select count(*) as n from '+table)).rows[0].n);
 const enroll=subject=>owner.query("insert into carve_android_auth_v1.testers(issuer,subject,expires_at) values('https://accounts.google.com',$1,clock_timestamp()+interval '1 day')",[subject]);
 const unknown=client();assert.equal((await call(unknown,'signout')).status,401);assert.equal((await call(unknown,'cancel',{flow_id:token()})).status,401);assert.equal(await count('carve_android_auth_v1.instances'),0);
 const uninvited=client();const rejected=await callback(uninvited,await begin(uninvited));assert.equal(rejected.status,403);assert.equal(await count('carve_shared_v1.players'),0);assert.equal(await count('carve_shared_v1.identities'),0);
 await enroll(proof.subject);
 const admitted=client(),ok=await callback(admitted,await begin(admitted));assert.equal(ok.status,303);const code=new URL(ok.headers.get('location')).searchParams.get('code');
 const signed=await exchange(admitted,code);assert.equal(signed.status,200);admitted.session=(await signed.json()).session_token;
 assert.equal(await count('carve_shared_v1.players'),1);assert.equal((await call(admitted,'session')).status,200);
 await owner.query('delete from carve_android_auth_v1.testers where subject=$1',[proof.subject]);
 assert.equal((await call(admitted,'session')).status,401);assert.equal((await call(admitted,'session')).status,401);
 const state=(await owner.query('select data from carve_android_auth_v1.instances where binding_hash=$1',[digest(admitted.binding)])).rows[0].data;
 assert.equal(state.current,null);assert(Object.values(state.sessions).every(s=>s.revoked));
 // Hold the real exchange BETWEEN consume and grant transactions; remove tester
 // while held. Same display email must not merge or create a second principal.
 proof={...proof,subject:'synthetic-held'};await enroll(proof.subject);
 const held=client(),returned=await callback(held,await begin(held));assert.equal(returned.status,303);
 const heldCode=new URL(returned.headers.get('location')).searchParams.get('code');
 const waiting=new Promise(r=>{hold=r;});const pending=exchange(held,heldCode);await waiting;
 await owner.query('delete from carve_android_auth_v1.testers where subject=$1',[proof.subject]);release();release=null;
 assert.equal((await pending).status,403);assert.equal(await count('carve_shared_v1.players'),1);assert.equal(await count('carve_shared_v1.identities'),1);
 assert.equal((await exchange(held,heldCode)).status,409);
 // Privileges, RLS and least-privilege denial are tested under the actual role.
 const restrictedPool=pool(),restricted=await restrictedPool.connect();
 try{
  await restricted.query('BEGIN READ ONLY');
  await assert.rejects(restricted.query("select carve_android_auth_v1.admitted('https://accounts.google.com','readonly-probe')"),e=>e.code==='25006');
  await restricted.query('ROLLBACK');await restricted.query('BEGIN');
  assert.equal((await restricted.query("select carve_android_auth_v1.admitted('https://accounts.google.com','lock-only-probe') as allowed")).rows[0].allowed,null);
  await restricted.query('ROLLBACK');
  for(const query of ["insert into carve_android_auth_v1.testers(issuer,subject,expires_at) values('https://accounts.google.com','injected',clock_timestamp()+interval '1 day')",'select * from carve_android_auth_v1.testers','delete from carve_shared_v1.players','select * from carve_shared_v1.completed_results','select * from carve_shared_v1.native_instances','select * from carve_shared_v1.broker_sessions','create table carve_android_auth_v1.evil(id int)'])await assert.rejects(restricted.query(query),e=>e.code==='42501');
 }finally{restricted.release();await restrictedPool.end();}
 const rls=await owner.query("select relname,relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='carve_android_auth_v1' and relkind='r'");assert.equal(rls.rows.length,4);assert(rls.rows.every(r=>r.relrowsecurity));
 // Budgets survive fresh adapter instances and key rotation attempts. Known
 // budgets are reset only inside this new QA database, never hosted/old data.
 await owner.query("update carve_android_auth_v1.budget set buckets='{}'");
 const q={ip:digest('synthetic-ip'),binding:digest('synthetic-binding'),begin:true};
 for(let i=0;i<quotaLimits.beginMinute.binding;i++)assert.equal(await db.admitRequest(q),true);
 assert.equal(await second.admitRequest(q),false);
 for(let i=0;i<8;i++)assert.equal(await second.admitRequest({...q,binding:digest('rotate-'+i)}),true);
 assert.equal(await db.admitRequest({...q,binding:digest('rotate-exceeded')}),false,'IP quota survives binding changes');
 await owner.query("update carve_android_auth_v1.budget set buckets='{}'");
 for(let i=0;i<quotaLimits.beginMinute.global;i++)assert(await db.admitRequest({ip:digest('global-ip-'+i),binding:digest('global-binding-'+i),begin:true}));
 assert.equal(await second.admitRequest({ip:digest('global-new-ip'),binding:digest('global-new-binding'),begin:true}),false,'Global quota survives IP and binding changes');
 const keyTime=Number((await owner.query('select extract(epoch from clock_timestamp())::bigint as now')).rows[0].now);
 const full=Object.fromEntries(Array.from({length:quotaLimits.keys},(_,i)=>['bounded-fixture-'+i,{count:1,until:keyTime+3600}]));
 await owner.query('update carve_android_auth_v1.budget set buckets=$1',[JSON.stringify(full)]);
 assert.equal(await db.admitRequest(q),false,'No allocation beyond fixed budget-key capacity');
 assert.equal(Object.keys((await owner.query('select buckets from carve_android_auth_v1.budget')).rows[0].buckets).length,quotaLimits.keys);
 await owner.query("update carve_android_auth_v1.budget set buckets='{}'");
 const parallel=await Promise.all(Array.from({length:30},(_,i)=>[db,second][i%2].admitRequest({ip:digest('parallel-'+i),binding:digest('parallel-binding-'+i),begin:true})));
 assert(parallel.some(Boolean));assert(parallel.filter(Boolean).length<=quotaLimits.beginMinute.global);
 assert(Object.keys((await owner.query('select buckets from carve_android_auth_v1.budget')).rows[0].buckets).length<=quotaLimits.keys);
 // Aggregate instance cap under concurrent creation and narrow retention.
 const oldNativeBinding=digest('untouched-existing-native');await owner.query('insert into carve_shared_v1.native_instances(client_id,binding_hash,data) values($1,$2,$3)',['fixture-old',oldNativeBinding,'{}']);
 const priorPlayers=await count('carve_shared_v1.players');
 await owner.query("update carve_android_auth_v1.instances set expires_at=clock_timestamp()-interval '1 second'");
 await owner.query("update carve_android_auth_v1.budget set buckets='{}'");assert(await db.admitRequest({...q,begin:false}));
 assert.equal(await count('carve_android_auth_v1.instances'),0);assert.equal(await count('carve_android_auth_v1.flow_index'),0);assert.equal(await count('carve_shared_v1.native_instances'),1);assert.equal(await count('carve_shared_v1.players'),priorPlayers);
 for(let i=0;i<quotaLimits.instances-1;i++)await db.atomic(androidClient,digest('cap-'+i),()=>true,{create:true});
 const race=await Promise.allSettled([db,second].map((d,i)=>d.atomic(androidClient,digest('cap-race-'+i),()=>true,{create:true})));
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(race.find(r=>r.status==='rejected').reason.status,429);assert.equal(await count('carve_android_auth_v1.instances'),quotaLimits.instances);
 // One-shot provisioning is operator-only, creates an actual working fresh
 // login and refuses to rotate an already enabled role. Synthetic QA only.
 await owner.query('create schema extensions');await owner.query('create extension pgcrypto with schema extensions');
 const operator=await owner.connect();let loginPool;
 try{
  const result=await operator.query(androidAuthCredentialSQL),credential=result.at(-1).rows[0].credential;
  assert.equal(credential.role,'carve_android_auth');assert(/^[a-f0-9]{64}$/.test(credential.database_password));assert(/^[a-f0-9]{64}$/.test(credential.session_secret));assert.notEqual(credential.database_password,credential.session_secret);
  const loginURL=new URL(url);loginURL.username=credential.role;loginURL.password=credential.database_password;
  loginPool=new pg.Pool({connectionString:loginURL.href,max:1});
  assert.equal((await loginPool.query('select current_user as actor')).rows[0].actor,credential.role);
  await assert.rejects(operator.query('select pg_temp.carve_android_credentials_once()'),e=>e.code==='P0001'&&e.message==='fresh_restricted_nologin_role_required');
 }finally{await loginPool?.end();await operator.query('alter role carve_android_auth nologin password null');operator.release();}
 console.log('PASS Android auth actual SQL/Fetch: restricted NOLOGIN role, unknown tester denied before player creation, successful synthetic handoff, removal during held exchange, bearer revocation persisted, restart-safe quotas, parallel cap and scoped retention. Fresh QA DB retained: '+databaseName);
}finally{release?.();await db?.close();await second?.close();await owner.end();}
