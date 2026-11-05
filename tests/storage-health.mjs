import assert from 'node:assert/strict';
import projects from '../config/hosted-projects.json' with {type:'json'};
import {createStorageHealthHandler} from '../server/storage-health.mjs';
import {createNativeFetchHandler} from '../server/native-vercel.mjs';
const s=projects.staging,p=projects.production,pem='-----BEGIN CERTIFICATE-----\nTEST ONLY\n-----END CERTIFICATE-----';
const env={CARVE_STORAGE_HEALTH_ENABLED:'true',VERCEL_ENV:'preview',VERCEL_PROJECT_ID:s.vercel_project_id,CARVE_APP_ORIGIN:s.origin,CARVE_EXPECTED_PROJECT_REF:s.supabase_project_ref,CARVE_DATABASE_CA_CERT:pem,CARVE_SHARED_DATABASE_URL:`postgres://carve_runtime.${s.supabase_project_ref}:test-only@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?sslmode=verify-full`};
let opened=0,released=0,ended=0;let checks=0;
const run=async(overrides={},fault={},method='GET',path='/api/storage-health')=>{
 const core=createStorageHealthHandler({env:{...env,...overrides},poolFactory:options=>{
  opened++;assert.equal(options.max,1);assert.equal(options.ssl.rejectUnauthorized,true);
  return {connect:async()=>({connection:{stream:{encrypted:!fault.plain,authorized:!fault.untrusted}},query:async sql=>{assert(!/from carve_shared_v1\.|insert|update|delete/i.test(sql));if(fault.query)throw Error('private connection details');return {rows:[{role_ok:!fault.role,schema_ok:!fault.schema,native_reader_ok:!fault.reader}]};},release:()=>released++}),end:async()=>{ended++;}};
 }});
 try{const reply=await createNativeFetchHandler(core)(new Request(s.origin+path,{method}));assert.equal(reply.headers.get('cache-control'),'no-store');assert.equal(reply.headers.has('set-cookie'),false);return {code:reply.status,data:await reply.json()};}finally{await core.close();}
};
for(const change of [{CARVE_STORAGE_HEALTH_ENABLED:undefined},{VERCEL_ENV:'production'},{VERCEL_ENV:'development'},{VERCEL_PROJECT_ID:p.vercel_project_id},{CARVE_APP_ORIGIN:p.origin},{CARVE_EXPECTED_PROJECT_REF:p.supabase_project_ref},{CARVE_DATABASE_CA_CERT:undefined}]){
 const before=opened;assert.deepEqual(await run(change),{code:503,data:{error:'not_configured'}});assert.equal(opened,before);checks++;
}
for(const change of [{CARVE_SHARED_DATABASE_URL:env.CARVE_SHARED_DATABASE_URL.replace(s.supabase_project_ref,p.supabase_project_ref)},{CARVE_SHARED_DATABASE_URL:env.CARVE_SHARED_DATABASE_URL.replace('verify-full','disable')},{CARVE_SHARED_DATABASE_URL:env.CARVE_SHARED_DATABASE_URL+'&host=other.example.test'},{CARVE_SHARED_DATABASE_URL:'postgres://test:local@127.0.0.1:5432/test'}]){
 const before=opened;assert.deepEqual(await run(change),{code:503,data:{error:'unavailable'}});assert.equal(opened,before);checks++;
}
for(const fault of [{plain:true},{untrusted:true},{query:true},{role:true},{schema:true},{reader:true}]){assert.deepEqual(await run({},fault),{code:503,data:{error:'unavailable'}});checks++;}
assert.equal((await run({}, {},'POST')).code,405);checks++;
assert.equal((await run({}, {},'GET','/api/storage-health?secret=ignored')).code,400);checks++;
assert.deepEqual(await run(),{code:200,data:{status:'ready',checks:{database:true,tls:true,schema:true,role:true,native_results_reader:true},production_enabled:false}});checks++;
assert.equal(opened,released);assert.equal(opened,ended);checks++;
console.log(`PASS staging storage readiness: ${checks} project/realm/TLS/schema/role/method/error/cleanup checks (injected database double)`);
