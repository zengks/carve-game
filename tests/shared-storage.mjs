import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {loadGame} from './harness.mjs';
import {validateEvent,completedEvent,canonical} from '../shared/contract.mjs';
// Node uses the same source as the browser; the dev/build server maps imports.
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../src/storage/outbox.mjs',import.meta.url),'utf8'))
  .replace("'./contract.mjs'",JSON.stringify(new URL('../shared/contract.mjs',import.meta.url).href));
const {openOutbox,flushOutbox}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const accountA='a'.repeat(64),accountB='b'.repeat(64);
export const fixture=()=>({contract_version:1,event_id:'web.flow-v1:test-run',kind:'completed_run',
  course_id:'web.flow-v1',rules_version:'flow-v1',mode:'challenge',source_platform:'web',payload:{
    run_id:'test-run',height_m:123,score:432,active_ms:12000,portals:1,controls:['one'],
    outcome:'banked',testing:true,unlocks:['pulse'],lessons:['pulse'],
  }});
validateEvent(fixture());
for(const mutate of [e=>e.player_id='other',e=>e.bounty=10,e=>e.payload.paid=true,
  e=>e.event_id+='different',e=>e.payload.height_m=-1,e=>e.payload.controls=[],
  e=>e.payload.controls=['one','one'],e=>e.payload.height_m=NaN,e=>e.payload.testing='false',
  e=>e.payload.outcome='active',e=>e.payload.unlocks=['admin']]){
  const e=fixture();mutate(e);assert.throws(()=>validateEvent(e));
}
const native=fixture();native.course_id='native.first-ascent-v1';native.event_id=native.course_id+':test-run';assert.throws(()=>validateEvent(native),/unsupported_course/);
console.log('PASS storage: strict result provenance, canonical run identity and no wallet/payment/owner claims');

const name='carve-isolated-test-'+crypto.randomUUID();let outbox=openOutbox(indexedDB,name);
const event=fixture();await outbox.put('guest',event);assert.equal((await outbox.list(accountA)).length,0);
await outbox.put(accountA,event);await outbox.put(accountA,event);assert.equal((await outbox.list(accountA)).length,1);
await outbox.close();outbox=openOutbox(indexedDB,name);assert.equal((await outbox.list(accountA)).length,1);
await assert.rejects(flushOutbox({outbox,scope:accountA,currentScope:()=>accountA,send:async()=>{throw Error('offline');}}));
assert.equal((await outbox.list(accountA)).length,1,'failed request retains event');
const changed=structuredClone(event);changed.payload.score++;
await assert.rejects(outbox.put(accountA,changed));
let owner=accountA;
await flushOutbox({outbox,scope:accountA,currentScope:()=>owner,send:async()=>{owner=accountB;return{accepted:event.event_id,contract_version:1};}});
assert.equal((await outbox.list(accountA)).length,1,'account switch cannot acknowledge old request');
await flushOutbox({outbox,scope:accountA,currentScope:()=>accountA,send:async e=>({accepted:e.event_id,contract_version:1,results:[e]})});
assert.equal((await outbox.list(accountA)).length,0);await outbox.put(accountA,event);
assert.equal((await outbox.list(accountA)).length,0,'accepted event is not requeued');
assert.equal((await outbox.list('guest')).length,1,'guest source remains intact');
assert.equal(await outbox.cached(accountB),null);assert.equal((await outbox.cached(accountA)).results.length,1);
await outbox.close();
console.log('PASS storage: transactional queue survives restart/offline, deduplicates and isolates guest/account receipts');

const local=new Map(),session=new Map();let game=loadGame({local,session,search:'?flow=1'});
let completed=[];globalThis.CarveAccount={scope:()=>accountA,completed:(...args)=>completed.push(args)};
game.Game.start();game.Journey.peak=1294;game.Profile.record();assert.equal(completed.length,0);
game.RunSave.write();game=loadGame({local,session,search:'?flow=1'});assert.equal(game.Journey.cloudOwner,accountA);
globalThis.CarveAccount={scope:()=>accountB,completed:(...args)=>completed.push(args)};
game.Journey.finish();assert.equal(completed.length,1);assert.equal(completed[0][2],accountA,'resumed climb retains original owner');
const [record,profile,,testing]=completed[0];const e=completedEvent(record,profile,testing);
assert.equal(globalThis.CarveGameStorage.accountRecords(accountA).length,1,'retained account completion available to recover a failed queue write');
assert.equal(globalThis.CarveGameStorage.accountRecords(accountB).length,0);
assert.equal(globalThis.CarveGameStorage.guestRecords().length,0,'account recovery never imports guest data implicitly');
profile.unlocked.push('hook');assert.equal(canonical(completedEvent(record,profile,testing)),canonical(e),'completion progress frozen');
assert(local.has('carve.flow.profile.v1'),'guest gameplay profile preserved');
delete globalThis.CarveAccount;
console.log('PASS storage: only completed runs queued, account pinned through reload and frozen import payload');
