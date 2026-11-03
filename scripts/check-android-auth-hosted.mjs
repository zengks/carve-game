// Explicit staging-only probe: read-only metadata and lock-only admission
// transaction, both rolled back. Never applies migrations, enrolls a
// tester, rotates a password, creates a player or emits credentials/errors with
// connection values. Caller supplies approved credentials in memory, not argv.
import assert from 'node:assert/strict';
import pg from 'pg';
import {realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {postgresOptions} from '../server/postgres.mjs';
const ref='ffxcsgtissldpkuxgxvo';
export function androidAuthHostedOptions(env){
 assert(env.CARVE_EXPECTED_PROJECT_REF===ref,'wrong_staging_ref');
 let url;try{url=new URL(env.CARVE_SHARED_DATABASE_URL);}catch{throw Error('invalid_staging_database');}
 assert(url.hostname==='aws-1-ca-central-1.pooler.supabase.com'&&url.port==='6543'&&url.username==='carve_android_auth.'+ref&&url.pathname==='/postgres','wrong_staging_receiver');
 return postgresOptions(url.href,{max:1,ca:env.CARVE_DATABASE_CA_CERT,projectRef:ref,runtimeRole:'carve_android_auth'});
}
export async function checkAndroidAuthHosted({env}={}){
 const pool=new pg.Pool({...androidAuthHostedOptions(env),query_timeout:5000});let c;
 try{
  c=await pool.connect();await c.query('BEGIN READ ONLY');
  await c.query("SET LOCAL statement_timeout='3s'");
  const stream=c.connection.stream;
  assert(stream.encrypted===true&&stream.authorized===true,'pooler_tls_not_verified');
  const r=(await c.query("select current_user as actor,session_user as session_actor,rolsuper,rolinherit,rolcanlogin,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolconnlimit from pg_roles where rolname=current_user")).rows[0];
  assert(r.actor==='carve_android_auth'&&r.session_actor==='carve_android_auth'&&r.rolcanlogin&&r.rolconnlimit===4,'wrong_login_role');
  assert(!r.rolsuper&&!r.rolinherit&&!r.rolcreatedb&&!r.rolcreaterole&&!r.rolreplication&&!r.rolbypassrls,'role_escalation');
  const memberships=Number((await c.query("select count(*) as n from pg_auth_members where member=(select oid from pg_roles where rolname=current_user)")).rows[0].n);assert(memberships===0,'unexpected_role_membership');
  const tables=(await c.query("select relname,relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='carve_android_auth_v1' and relkind='r' order by relname")).rows;
  assert(tables.length===4&&tables.every(t=>t.relrowsecurity),'private_rls_missing');
  const f=(await c.query("select prosecdef,proconfig from pg_proc where oid='carve_android_auth_v1.admitted(text,text)'::regprocedure")).rows[0];assert(f.prosecdef&&f.proconfig.includes('search_path=pg_catalog'),'admission_function_not_pinned');
  const grants=(await c.query("select r.rolname,has_schema_privilege(r.rolname,'carve_android_auth_v1','USAGE') as schema_usage,has_function_privilege(r.rolname,'carve_android_auth_v1.admitted(text,text)','EXECUTE') as function_execute,exists(select 1 from pg_class t join pg_namespace n on n.oid=t.relnamespace where n.nspname='carve_android_auth_v1' and t.relkind='r' and (has_table_privilege(r.rolname,t.oid,'SELECT') or has_table_privilege(r.rolname,t.oid,'INSERT') or has_table_privilege(r.rolname,t.oid,'UPDATE') or has_table_privilege(r.rolname,t.oid,'DELETE'))) as table_access from pg_roles r where r.rolname in('anon','authenticated','service_role') order by r.rolname")).rows;
  assert(grants.length===3&&grants.every(g=>!g.schema_usage&&!g.function_execute&&!g.table_access),'data_api_grants_present');
  const scope=(await c.query("select has_column_privilege('carve_shared_v1.players','scope_key','UPDATE') as scope_update,has_column_privilege('carve_shared_v1.players','id','UPDATE') as id_update,has_table_privilege('carve_shared_v1.identities','UPDATE') as identity_update,has_table_privilege('carve_shared_v1.players','DELETE') as player_delete")).rows[0];
  assert(scope.scope_update&&!scope.id_update&&!scope.identity_update&&!scope.player_delete,'shared_identity_grants_too_broad');
  let denials=0;
  for(const table of ['carve_android_auth_v1.testers','carve_shared_v1.completed_results','carve_shared_v1.course_progress','carve_shared_v1.native_instances','carve_shared_v1.broker_sessions','carve_shared_v1.native_completed_results','carve_shared_v1.native_course_progress']){
   await c.query('SAVEPOINT denied_probe');let denied=false;
   try{await c.query('select 1 from '+table+' limit 0');}catch(e){if(e.code!=='42501')throw e;denied=true;}
   await c.query('ROLLBACK TO SAVEPOINT denied_probe');assert(denied,'unexpected_legacy_or_enrollment_access');denials++;
  }
  const budget=(await c.query('select buckets from carve_android_auth_v1.budget where id=1')).rows[0];assert(budget&&typeof budget.buckets==='object','budget_missing');
  await c.query('ROLLBACK');
  // admitted() contains FOR SHARE, forbidden even with no rows in READ ONLY.
  // Only this fixed SELECT runs in a separate lock-only transaction; no DML.
  await c.query('BEGIN');
  const unknown=(await c.query("select carve_android_auth_v1.admitted('https://accounts.google.com','carve-unenrolled-readonly-probe') as allowed")).rows[0].allowed;assert(unknown!==true,'probe_subject_unexpectedly_admitted');
  await c.query('ROLLBACK');
  return {project_ref:ref,role:r.actor,actual_login_verified:true,pooler_tls_verified:true,read_only_metadata_transaction:true,admission_transaction:'lock_only_rolled_back',role_connection_limit:r.rolconnlimit,role_memberships:memberships,private_rls_tables:tables.length,data_api_roles_denied:grants.map(g=>g.rolname),legacy_and_tester_select_denials:denials,admission_definer_search_path:'pg_catalog',unknown_subject_admitted:false,player_or_session_created:false,credentials_in_output:false};
 }finally{
  // A pooler can queue before a backend statement timeout exists. Bound client
  // queries too; on failure disconnect so an unresponsive ROLLBACK cannot hang.
  if(c)c.release(true);await pool.end();
 }
}
if(process.argv[1]&&await realpath(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const chunks=[];let size=0;
  for await(const chunk of process.stdin){size+=chunk.length;if(size>8192)throw Error('config_too_large');chunks.push(chunk);}
  const env=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  console.log(JSON.stringify(await checkAndroidAuthHosted({env})));
 }catch(e){console.error(JSON.stringify({error:'hosted_probe_failed',code:/^[A-Z0-9_]{2,64}$/.test(e.code??'')?e.code:'UNAVAILABLE'}));process.exitCode=1;}
}
