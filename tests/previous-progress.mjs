import assert from 'node:assert/strict';
import {loadGame} from './harness.mjs';
const oldKey='carve.expedition.profile.v1',runKey='carve.expedition.run.v1',key='carve.variety.profile.v1';
const old={version:1,name:'Returning',coins:73,unlocked:['pulse','wing','hook'],equipped:'hook',best:900,challengeBest:550,records:[{id:'old',name:'Returning',height:900,score:2700,time:120,portals:2,mode:'practice'}]};
const active={version:1,course:2,journey:{peak:3184},game:{score:980}};
const el=id=>document.getElementById(id),hidden=id=>el(id).classList.contains('hidden');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS previous progress: '+name);}
function setup(extra={}){const local=new Map([[oldKey,JSON.stringify(old)],...extra.local||[]]),session=new Map([[runKey,JSON.stringify(active)],...extra.session||[]]);return {local,session,g:loadGame({local,session})};}

test('returning players choose before beginning, while old scores and active run stay untouched',()=>{
 const {g,local,session}=setup();assert(el('previous-dialog').open);assert.equal(g.Profile.coins,0);assert(!g.Game.running);assert.equal(g.Profile.records.length,0);
 assert.match(el('previous-summary').textContent,/73 bounty.*900 m/);assert.match(el('previous-run').textContent,/312 m.*980 points.*snapshot is kept/);assert.equal(el('previous-records').children.length,1);
 el('play').onclick();assert(!g.Game.running);assert.equal(local.get(oldKey),JSON.stringify(old));assert.equal(session.get(runKey),JSON.stringify(active));
});
test('explicit import copies name, wallet and skills once without mixing course scores or resuming old geometry',()=>{
 let {g,local,session}=setup();el('previous-import').onclick();assert(!el('previous-dialog').open);assert(!g.Game.running);assert.equal(g.Profile.name,'Returning');assert.equal(g.Profile.coins,73);assert.deepEqual(g.Profile.unlocked,['pulse','wing','hook']);assert.equal(g.Profile.equipped,'hook');assert.equal(g.Profile.best,0);assert.equal(g.Profile.challengeBest,0);assert.equal(g.Profile.records.length,0);
 g=loadGame({local,session});assert(!el('previous-dialog').open);g.Profile.credit(7);el('previous-open').onclick();assert(hidden('previous-import'));el('previous-import').onclick();assert.equal(g.Profile.coins,80);el('previous-close').onclick();el('play').onclick();assert(g.Game.running);assert.equal(g.RunSave.read().course,4);assert.equal(local.get(oldKey),JSON.stringify(old));assert.equal(session.get(runKey),JSON.stringify(active));
});
test('Start separate keeps original progress readable and does not repeat the import prompt',()=>{
 let {g,local,session}=setup();el('previous-separate').onclick();assert.equal(g.Profile.coins,0);assert(!el('previous-dialog').open);g=loadGame({local,session});assert(!el('previous-dialog').open);assert(!hidden('previous-open'));el('previous-open').onclick();assert.equal(el('previous-records').children.length,1);assert(hidden('previous-import'));assert.equal(local.get(oldKey),JSON.stringify(old));
});
test('existing current progress is never overwritten or added to the old wallet',()=>{
 const current={version:1,name:'Current',coins:5,unlocked:['pulse'],equipped:'pulse',best:20,challengeBest:0,records:[]};const {g,local}=setup({local:[[key,JSON.stringify(current)]]});assert(!el('previous-dialog').open);el('previous-open').onclick();assert(hidden('previous-import'));el('previous-import').onclick();assert.equal(g.Profile.coins,5);assert.equal(g.Profile.name,'Current');assert.equal(local.get(key),JSON.stringify(current));
});
test('another tab finishing its choice wins over a stale open import dialog',()=>{
 const {g,local}=setup();const current={version:1,name:'Other tab',coins:22,unlocked:['pulse'],equipped:'pulse',records:[]};local.set(key,JSON.stringify(current));el('previous-import').onclick();assert.equal(g.Profile.coins,22);assert.equal(g.Profile.name,'Other tab');assert.equal(local.get(key),JSON.stringify(current));assert(!el('previous-dialog').open);
});
test('blocked saving never reports a completed import; a separate temporary run remains possible',()=>{
 const {g,local}=setup();globalThis.localStorage.setItem=()=>{throw Error('blocked');};el('previous-import').onclick();assert(el('previous-dialog').open);assert.equal(g.Profile.coins,0);assert.match(el('previous-message').textContent,/Saving is unavailable/);assert.equal(local.get(oldKey),JSON.stringify(old));el('previous-separate').onclick();assert(!el('previous-dialog').open);assert(!g.Profile.storageAvailable);el('play').onclick();assert(g.Game.running);
});
test('old active snapshots without a profile are explained and retained until explicit new play',()=>{
 const local=new Map(),session=new Map([[runKey,JSON.stringify(active)]]),g=loadGame({local,session});assert(!g.Game.running);assert(!el('previous-dialog').open);assert.match(el('menu-progress').textContent,/Previous active run kept/);el('previous-open').onclick();assert.match(el('previous-run').textContent,/changed route cannot resume/);assert(hidden('previous-import'));el('previous-close').onclick();el('play').onclick();assert(g.Game.running);assert.equal(session.get(runKey),JSON.stringify(active));
});
test('invalid legacy data is ignored and imported skill/coin fields are bounded',()=>{
 let local=new Map([[oldKey,'bad']]);let g=loadGame({local});assert(hidden('previous-open'));assert(!el('previous-dialog').open);
 local=new Map([[oldKey,JSON.stringify({...old,coins:2000000,unlocked:['admin'],equipped:'admin'})]]);g=loadGame({local});el('previous-import').onclick();assert.equal(g.Profile.coins,1000000);assert.deepEqual(g.Profile.unlocked,['pulse']);assert.equal(g.Profile.equipped,'pulse');
});
test('a current recoverable run resumes paused without a legacy dialog taking it over',()=>{
 let {g,local,session}=setup();el('previous-import').onclick();el('play').onclick();g.Game.score=91;g.RunSave.write();g=loadGame({local,session});assert(g.Game.running&&g.Game.paused);assert.equal(g.Game.score,91);assert(!el('previous-dialog').open);assert.equal(g.Profile.coins,73);
});
console.log(`${passed} previous-progress checks passed`);
