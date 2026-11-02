import assert from 'node:assert/strict';
import pg from 'pg';
import {postgresOptions} from '../server/postgres.mjs';
import {runtimeRoleSQL,runtimePrivileges} from '../server/runtime-role.mjs';
const local='postgres://test:local@127.0.0.1:5432/carve_shared_test_options';
assert.equal(postgresOptions(local,{max:3}).connectionString,local);
assert.equal(postgresOptions(local,{max:3}).ssl,undefined);
const hosted='postgres://carve_runtime.ref:test-only@pooler.example.test:6543/postgres';
for(const suffix of ['', '?sslmode=verify-full']){
 const options=postgresOptions(hosted+suffix,{max:4});const pool=new pg.Pool(options);
 const client=new pg.Client(pool.options);
 assert.equal(client.connectionParameters.ssl.rejectUnauthorized,true);
 assert.equal(new URL(options.connectionString).searchParams.has('sslmode'),false);
 assert.equal(options.max,4);
}
for(const suffix of ['?sslmode=disable','?sslmode=require','?sslmode=verify-ca','?sslmode=verify-full&sslmode=verify-full','?ssl=false','?sslrootcert=arbitrary-path','?sslkey=key','?sslcert=cert','?uselibpqcompat=true'])assert.throws(()=>postgresOptions(hosted+suffix),/invalid_database_configuration/);
for(const url of ['not-a-url','https://example.test/db','postgres://pooler.example.test/db',hosted+'#fragment'])assert.throws(()=>postgresOptions(url),/invalid_database_configuration/);
for(const ca of ['',false,'PRIVATE KEY','-----BEGIN CERTIFICATE-----\nPRIVATE KEY'])assert.throws(()=>postgresOptions(hosted,{ca}),/invalid_database_configuration/);
const pem='-----BEGIN CERTIFICATE-----\nTEST ONLY\n-----END CERTIFICATE-----';
assert.equal(postgresOptions(hosted,{ca:pem}).ssl.ca,pem);
assert.equal(Object.keys(runtimePrivileges).length,11);
for(const role of ['postgres','anon','carve_runtime;DROP ROLE postgres','carve_runtime_ABC','carve_runtime_1234567'])assert.throws(()=>runtimeRoleSQL(role),/invalid_runtime_role/);
const sql=runtimeRoleSQL('carve_runtime');assert(sql.includes('NOLOGIN')&&sql.includes('NOBYPASSRLS'));
assert(!sql.includes('GRANT ALL')&&!sql.includes('TO PUBLIC')&&!sql.includes('GRANT DELETE'));
assert.deepEqual(runtimePrivileges.native_completed_results,['SELECT','INSERT']);
console.log('PASS hosted Postgres configuration: verified TLS survives pg parsing, unsafe overrides rejected, bounded new-role SQL');
