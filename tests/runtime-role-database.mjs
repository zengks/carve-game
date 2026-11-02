import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {runtimeRoleSQL,runtimePrivileges} from '../server/runtime-role.mjs';
import {createDatabase} from '../server/database.mjs';
import {createNativeDatabase} from '../server/native-database.mjs';
const supplied=new URL(process.env.CARVE_TEST_DATABASE_URL??'http://invalid');
if(supplied.protocol!=='postgres:'||supplied.hostname!=='127.0.0.1'||!supplied.pathname.startsWith('/carve_shared_test_'))throw Error('Explicit isolated loopback test database required');
const id=randomUUID().replaceAll('-',''),name='carve_shared_test_runtime_'+id,role='carve_runtime_'+id;
const bootstrap=new pg.Pool({connectionString:supplied.href});
try{await bootstrap.query('CREATE DATABASE '+name);}finally{await bootstrap.end();}
const url=new URL(supplied);url.pathname='/'+name;
const admin=new pg.Pool({connectionString:url.href});let app,native,probe;
let checks=0;const ok=(value,label)=>{assert(value,label);checks++;};
try{
 for(const file of ['schema.sql','native-schema.sql','native-progress-schema.sql'])await admin.query(await readFile(new URL('../server/'+file,import.meta.url),'utf8'));
 await admin.query('CREATE TABLE public.hosted_role_canary(secret text); INSERT INTO public.hosted_role_canary VALUES(\'private synthetic canary\'); REVOKE ALL ON public.hosted_role_canary FROM PUBLIC');
 await admin.query('BEGIN');await admin.query(runtimeRoleSQL(role));await admin.query('COMMIT');
 // A real LOGIN role, not SET ROLE under an administrator session. No password
 // is logged, committed or reused. Disable this fresh probe role after testing.
 const password=randomBytes(32).toString('hex');await admin.query(`ALTER ROLE ${role} LOGIN PASSWORD '${password}'`);
 const runtimeURL=new URL(url);runtimeURL.username=role;runtimeURL.password=password;
 probe=new pg.Pool({connectionString:runtimeURL.href});
 const identity=(await probe.query('select current_user,session_user')).rows[0];ok(identity.current_user===role&&identity.session_user===role,'actual restricted LOGIN authority');
 const attrs=(await admin.query('select rolsuper,rolcreatedb,rolcreaterole,rolinherit,rolreplication,rolbypassrls from pg_roles where rolname=$1',[role])).rows[0];ok(Object.values(attrs).every(v=>v===false),'no global/elevated role attributes');
 const rls=(await admin.query("select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='carve_shared_v1' and relkind='r'")).rows;ok(rls.length===11&&rls.every(r=>r.relrowsecurity),'all app tables retain RLS');
 for(const [table,privileges]of Object.entries(runtimePrivileges)){
  for(const operation of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']){
   const granted=(await admin.query('select has_table_privilege($1,$2,$3) as allowed',[role,'carve_shared_v1.'+table,operation])).rows[0].allowed;
   ok(granted===privileges.includes(operation),'exact table privilege '+table+'/'+operation);
  }
 }
 for(const sql of ['SELECT * FROM public.hosted_role_canary','CREATE TABLE carve_shared_v1.denied(id int)','DELETE FROM carve_shared_v1.players','TRUNCATE carve_shared_v1.native_instances','UPDATE carve_shared_v1.native_completed_results SET falls=0','SET ROLE postgres']){
  await assert.rejects(probe.query(sql),e=>e.code==='42501');checks++;
 }
 app=createDatabase(runtimeURL.href);native=createNativeDatabase(runtimeURL.href);
 const web=JSON.parse(await readFile(new URL('../shared/fixtures/web-flow-v1.json',import.meta.url),'utf8'));
 const proof={issuer:'https://restricted-runtime.example.test',subject:'owner-'+id};
 const written=await app.write(proof,web);ok(written.accepted===web.event_id,'web result write through restricted role');
 ok((await app.read(proof)).results.length===1,'web result read through restricted role');
 const peer={...proof,subject:'other-'+id};ok((await app.read(peer)).results.length===0,'runtime API still scopes another owner');
 const event=JSON.parse(await readFile(new URL('../shared/fixtures/native-first-ascent-v1.json',import.meta.url),'utf8'));
 const client='role-ios',binding=randomBytes(32).toString('hex');
 const first=await native.atomic(client,binding,async(_state,tx)=>{
  const owner=await tx.principal(proof);const actor={...proof,...owner};await tx.nativeProgress.owner(actor);
  await tx.index(randomBytes(32).toString('base64url'));return tx.nativeProgress.write(actor,event);
 },{create:true});ok(first.revision===1&&first.accepted_event.event_id===event.event_id,'native locked write/index/progress through restricted role');
 const retry=await native.atomic(client,binding,async(_state,tx)=>tx.nativeProgress.write({...proof,...await tx.principal(proof)},event));ok(retry.revision===1,'restricted-role immutable retry');
 const outsider='carve_outsider_'+id;await admin.query('CREATE ROLE '+outsider+' NOLOGIN');const denied=await admin.connect();
 try{await denied.query('SET ROLE '+outsider);await assert.rejects(denied.query('SELECT * FROM carve_shared_v1.players'),e=>e.code==='42501');checks++;}finally{await denied.query('RESET ROLE');denied.release();}
 console.log(`PASS hosted runtime role: ${checks} assertions with real LOGIN, exact grants, RLS, denied escalation and web/native saves`);
}finally{
 await app?.close();await native?.close();await probe?.end();
 await admin.query('ALTER ROLE '+role+' NOLOGIN');await admin.end();
 console.log('Fresh synthetic database/roles retained; restricted probe login disabled and pools closed.');
}
