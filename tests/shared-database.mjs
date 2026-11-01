import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {createDatabase} from '../server/database.mjs';
const connectionString=process.env.CARVE_TEST_DATABASE_URL;
if(!connectionString)throw Error('Set CARVE_TEST_DATABASE_URL to a NEW isolated carve_shared_test_* database.');
const url=new URL(connectionString);
if(!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.startsWith('/carve_shared_test_'))throw Error('Refusing non-isolated test database');
const pool=new pg.Pool({connectionString}),db=createDatabase(connectionString);
try{
  await pool.query(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));
  const fixture=JSON.parse(await readFile(new URL('../shared/fixtures/web-flow-v1.json',import.meta.url),'utf8'));
  const identity={issuer:'http://isolated-auth.test',subject:crypto.randomUUID()},other={...identity,subject:crypto.randomUUID()};
  const first=await db.read(identity),second=await db.read(other);
  assert.notEqual(first.player_id,second.player_id);assert.notEqual(first.player_id,identity.subject);
  const replies=await Promise.all(Array.from({length:8},()=>db.write(identity,fixture)));
  assert(replies.every(r=>r.player_id===first.player_id&&r.accepted===fixture.event_id));
  assert.equal((await db.read(identity)).results.length,1);assert.equal((await db.read(other)).results.length,0);
  const conflict=structuredClone(fixture);conflict.payload.height_m++;
  await assert.rejects(db.write(identity,conflict),/event_conflict/);
  assert.equal(Number((await db.read(identity)).progress[0].best_height),123);
  const next=structuredClone(fixture);next.payload.run_id=crypto.randomUUID();next.event_id=next.course_id+':'+next.payload.run_id;
  next.payload.height_m=90;next.payload.unlocks.push('wing');next.payload.lessons.push('wing');
  await db.write(identity,next);const progressed=await db.read(identity);
  assert.equal(Number(progressed.progress[0].best_height),123);assert.deepEqual(progressed.progress[0].unlocks,['pulse','wing']);
  const practice=structuredClone(next);practice.mode='practice';practice.payload.run_id=crypto.randomUUID();practice.event_id=practice.course_id+':'+practice.payload.run_id;
  practice.payload.height_m=9999;await db.write(identity,practice);
  const categories=await db.read(identity);assert.equal(categories.progress.length,2);assert.equal(Number(categories.progress.find(p=>p.mode==='challenge').best_height),123);
  const sameSubjectNewIssuer=await db.read({...identity,issuer:'http://other-isolated-auth.test'});assert.equal(sameSubjectNewIssuer.results.length,0);
  const scope=await pool.query("select relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='carve_shared_v1' and relkind='r'");
  assert(scope.rows.length===7&&scope.rows.every(r=>r.relrowsecurity));
  const role='carve_probe_'+crypto.randomUUID().replaceAll('-','');
  await pool.query('create role '+role+' nologin');
  const probe=await pool.connect();try{await probe.query('set role '+role);await assert.rejects(probe.query('select * from carve_shared_v1.completed_results'),/permission denied/);}finally{await probe.query('reset role');probe.release();}
  console.log('PASS shared database: distinct stable players, concurrent replay, conflict rollback, monotone versioned progress, owner/issuer isolation and private schema denial');
  console.log('Synthetic records retained in isolated local test database. No existing backend or owner data used.');
}finally{await db.close();await pool.end();}
