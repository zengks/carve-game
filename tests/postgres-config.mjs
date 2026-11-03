import assert from 'node:assert/strict';
import pg from 'pg';
import {postgresOptions} from '../server/postgres.mjs';
import {runtimeRoleSQL,runtimePrivileges} from '../server/runtime-role.mjs';
// Build checks also run inside configured Preview environments. Keep their
// synthetic endpoints independent of hosted secrets; never open a connection.
const inherited=Object.fromEntries(['CARVE_EXPECTED_PROJECT_REF','CARVE_DATABASE_CA_CERT'].map(key=>[key,process.env[key]]));
for(const key of Object.keys(inherited))delete process.env[key];
const local='postgres://test:local@127.0.0.1:5432/carve_shared_test_options';
assert.equal(postgresOptions(local,{max:3}).connectionString,local);
assert.equal(postgresOptions(local,{max:3}).ssl,undefined);
for(const suffix of ['?host=remote.example.test&sslmode=disable','?hostaddr=203.0.113.1','?user=postgres','?port=6543','?sslmode=disable&sslmode=disable'])assert.throws(()=>postgresOptions(local+suffix),/invalid_database_configuration/);
const hosted='postgres://carve_runtime.ref:test-only@pooler.example.test:6543/postgres';
for(const suffix of ['', '?sslmode=verify-full']){
 const options=postgresOptions(hosted+suffix,{max:4});const pool=new pg.Pool(options);
 const client=new pg.Client(pool.options);
 assert.equal(client.connectionParameters.ssl.rejectUnauthorized,true);
 assert.equal(new URL(options.connectionString).searchParams.has('sslmode'),false);
 assert.equal(options.max,4);
}
for(const suffix of ['?sslmode=disable','?sslmode=require','?sslmode=verify-ca','?sslmode=verify-full&sslmode=verify-full','?ssl=false','?sslrootcert=arbitrary-path','?sslkey=key','?sslcert=cert','?uselibpqcompat=true'])assert.throws(()=>postgresOptions(hosted+suffix),/invalid_database_configuration/);
const named=postgresOptions(hosted+'?application_name=carve-staging&sslmode=verify-full');
assert.equal(new pg.Client(named).connectionParameters.host,'pooler.example.test');
assert.equal(new pg.Client(named).connectionParameters.application_name,'carve-staging');
const projectRef='a'.repeat(20),bound=`postgres://carve_runtime.${projectRef}:test-only@aws-1-ca-central-1.pooler.supabase.com:6543/postgres`;
assert.throws(()=>postgresOptions(local,{projectRef}),/invalid_database_configuration/);
assert.equal(postgresOptions(bound,{projectRef}).ssl.rejectUnauthorized,true);
assert.equal(postgresOptions(bound.replace('carve_runtime.','carve_android_auth.'),{projectRef,runtimeRole:'carve_android_auth'}).ssl.rejectUnauthorized,true);
assert.throws(()=>postgresOptions(bound,{projectRef,runtimeRole:'carve_android_auth'}),/invalid_database_configuration/);
assert.throws(()=>postgresOptions(bound,{projectRef,runtimeRole:'postgres'}),/invalid_database_configuration/);
for(const url of [bound.replace(projectRef,'b'.repeat(20)),bound.replace('/postgres','/other'),bound.replace('carve_runtime.','postgres.'),bound.replace('pooler.supabase.com','other.example.test')])assert.throws(()=>postgresOptions(url,{projectRef}),/invalid_database_configuration/);
for(const url of ['not-a-url','https://example.test/db','postgres://pooler.example.test/db',hosted+'#fragment'])assert.throws(()=>postgresOptions(url),/invalid_database_configuration/);
for(const ca of ['',false,'PRIVATE KEY','-----BEGIN CERTIFICATE-----\nPRIVATE KEY'])assert.throws(()=>postgresOptions(hosted,{ca}),/invalid_database_configuration/);
const pem='-----BEGIN CERTIFICATE-----\nTEST ONLY\n-----END CERTIFICATE-----';
assert.equal(postgresOptions(hosted,{ca:pem}).ssl.ca,pem);
try{
 process.env.CARVE_EXPECTED_PROJECT_REF=projectRef;
 process.env.CARVE_DATABASE_CA_CERT=pem;
 assert.equal(postgresOptions(bound).ssl.ca,pem);
 assert.throws(()=>postgresOptions(local),/invalid_database_configuration/);
 assert.throws(()=>postgresOptions(hosted),/invalid_database_configuration/);
}finally{
 for(const [key,value]of Object.entries(inherited))if(value===undefined)delete process.env[key];else process.env[key]=value;
}
assert.equal(Object.keys(runtimePrivileges).length,11);
for(const role of ['postgres','anon','carve_runtime;DROP ROLE postgres','carve_runtime_ABC','carve_runtime_1234567'])assert.throws(()=>runtimeRoleSQL(role),/invalid_runtime_role/);
const sql=runtimeRoleSQL('carve_runtime');assert(sql.includes('NOLOGIN')&&sql.includes('NOBYPASSRLS'));
assert(!sql.includes('GRANT ALL')&&!sql.includes('TO PUBLIC')&&!sql.includes('GRANT DELETE'));
assert.deepEqual(runtimePrivileges.native_completed_results,['SELECT','INSERT']);
console.log('PASS hosted Postgres configuration: verified TLS survives pg parsing, unsafe overrides rejected, bounded new-role SQL');
