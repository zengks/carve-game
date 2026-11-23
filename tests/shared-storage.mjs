import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {loadGame} from './harness.mjs';
import {validateEvent,expeditionEvent,validateExpeditionEvent} from '../shared/contract.mjs';
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

const oldSnapshot={revision:1,results:[event]},latestSnapshot={revision:2,results:[event,changed]};
const otherTab=openOutbox(indexedDB,name);
outbox=openOutbox(indexedDB,name);
await outbox.cache(accountA,latestSnapshot);
assert.deepEqual(await otherTab.cache(accountA,oldSnapshot),latestSnapshot,'a delayed tab cannot roll back the cached snapshot');
await assert.rejects(otherTab.cache(accountA,{...latestSnapshot,results:[]}));
assert.deepEqual(await outbox.cached(accountA),latestSnapshot);
await otherTab.close();await outbox.close();

const local=new Map(),session=new Map(),game=loadGame({local,session,search:'?terrain=1'});
const records=()=>globalThis.CarveGameStorage.expeditionRecords().map(r=>expeditionEvent(r,true)).filter(Boolean);
assert.equal(globalThis.CarveGameStorage.scorePreview,true);
game.Game.start();game.Journey.peak=1294;game.Profile.record();assert.equal(records().length,0);
game.RunSave.write();game.Journey.finish('banked');
assert.equal(records().length,1);
assert.equal(records()[0].payload.height_m,123);
assert.deepEqual(Object.keys(records()[0].payload).sort(),['active_ms','height_m','outcome','run_id','score','testing']);
loadGame({local,session,search:'?terrain=1'});assert.equal(records().length,1,'local completion is retained');
loadGame({production:true});assert.equal(globalThis.CarveGameStorage.scorePreview,false);
loadGame({search:'?flow=1'});assert.equal(globalThis.CarveGameStorage.scorePreview,false);
const vectors=JSON.parse(await readFile(new URL('../shared/fixtures/expedition-scores-v1.json',import.meta.url)));
for(const platform of ['web','ios','android'])validateExpeditionEvent(vectors[platform]);
for(const mutate of [e=>e.payload.outcome='active',e=>e.payload.bounty=300,e=>e.mode='replay',
  e=>e.payload.height_m=0,e=>e.payload.active_ms=.1,e=>e.source_platform='android',e=>e.rules_version='first-ascent-1']){
  const bad=structuredClone(vectors.web);mutate(bad);assert.throws(()=>validateExpeditionEvent(bad),/invalid_event/);
}
console.log('PASS storage: only completed, positive-height Expedition results are eligible for review on the dedicated preview');
