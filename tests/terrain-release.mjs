import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from '../scripts/build.mjs';
import {loadGame,STEP} from './harness.mjs';
import {mobileRelease} from '../future/mobile-handoff.mjs';
const output=await mkdtemp(join(tmpdir(),'carve-terrain-release-'));
let passed=0;const el=id=>document.getElementById(id);
function test(name,fn){fn();passed++;console.log('PASS terrain release: '+name);}
const profileKey='carve.flow.profile.v1',oldRunKey='carve.public-flow.run.v1',currentKey='carve.terrain.profile.v1';
const old={version:1,name:'Flow Climber',avatar:'cinder',coins:73,unlocked:['pulse','hook'],equipped:'hook',best:900,challengeBest:550,records:[{id:'old-flow',name:'Flow Climber',height:550,score:2700,time:120,portals:2,mode:'challenge',course:'flow-v1'}]};
const oldRun={version:1,course:6,journey:{peak:3184},game:{score:980}};
try{
 await build(output,{production:true});
 const html=await readFile(join(output,'index.html'),'utf8');
 const asset=html.match(/src="(\/assets\/cache\/expedition\.[a-f\d]+\.js)"/)[1];
 const script=await readFile(join(output,asset),'utf8');
 const load=options=>loadGame({script,...options});
 const prior=()=>({local:new Map([[profileKey,JSON.stringify(old)],['carve.variety.profile.v1',JSON.stringify({...old,coins:999,name:'Earlier'})]]),session:new Map([[oldRunKey,JSON.stringify(oldRun)]])});
 test('the actual production artifact defaults to new platforms, avatars and three lives without flags',()=>{
  for(const search of ['', '?terrain=0&flow=0&testing=1&practice=1','?terrain=1']){
   const g=load({search});assert.equal(g.Level.course,8);assert.equal(g.RunSave.key,'carve.public-terrain.run.v1');assert.equal(g.Profile.key,currentKey);assert.equal(g.Journey.selectedMode,'challenge');assert(!g.Journey.chooseMode('practice'));g.Game.start();assert.equal(g.Journey.lives,3);assert(g.Level.blocks.some(b=>b.mechanic==='ferry'));assert(g.Level.blocks.some(b=>b.mechanic==='crumble'));assert(g.Level.blocks.some(b=>b.bell));assert.equal(g.Journey.avatar,'aster');assert.equal(Object.keys(g.Avatars.catalog).length,6);assert(!el('menu-summary').textContent.includes('preview'));assert(!el('menu-progress').textContent.includes('preview'));
  }
  assert.equal(mobileRelease.enabled,false);assert(!html.includes('mobile-handoff'));assert(!script.includes('mobile-handoff'));assert(!/experimental/i.test(html));
 });
 test('current Flow progress is offered before older Variety, and cannot be bypassed by Begin or avatar selection',()=>{
  const {local,session}=prior(),g=load({local,session});assert(el('previous-dialog').open);assert.match(el('previous-summary').textContent,/Flow Climber.*73 bounty/);assert.match(el('previous-run').textContent,/312 m.*980 points/);assert(!g.Game.running);el('previous-close').onclick();el('play').onclick();assert(!g.Game.running);el('previous-close').onclick();assert(!g.Avatars.open());assert(!local.has(currentKey));assert.equal(local.get(profileKey),JSON.stringify(old));assert.equal(session.get(oldRunKey),JSON.stringify(oldRun));
 });
 test('explicit carry preserves identity, bounty, skill and cosmetic while retaining old scores and active run separately',()=>{
  const {local,session}=prior(),g=load({local,session});el('previous-import').onclick();assert.equal(g.Profile.name,old.name);assert.equal(g.Profile.coins,73);assert.equal(g.Profile.avatar,'cinder');assert.equal(el('avatar-current-name').textContent,'Cinder');assert.deepEqual(g.Profile.unlocked,['pulse','hook']);assert.equal(g.Profile.equipped,'hook');assert.equal(g.Profile.best,0);assert.equal(g.Profile.challengeBest,0);assert.equal(g.Profile.records.length,0);el('play').onclick();assert(g.Game.running);assert.equal(g.Journey.avatar,'cinder');assert.equal(g.Journey.lives,3);g.RunSave.write();assert.equal(g.RunSave.read().course,8);assert.equal(local.get(profileKey),JSON.stringify(old));assert.equal(session.get(oldRunKey),JSON.stringify(oldRun));assert.equal(JSON.parse(local.get('carve.variety.profile.v1')).coins,999);
 });
 test('Start separate makes no old wallet changes or repeat prompt',()=>{
  const {local,session}=prior();let g=load({local,session});el('previous-separate').onclick();assert.equal(g.Profile.coins,0);g=load({local,session});assert(!el('previous-dialog').open);el('previous-open').onclick();assert(el('previous-import').classList.contains('hidden'));assert.equal(local.get(profileKey),JSON.stringify(old));assert.equal(session.get(oldRunKey),JSON.stringify(oldRun));
 });
 test('an existing Terrain profile or another tab completing its choice wins without wallet summing',()=>{
  for(const before of [true,false]){const {local,session}=prior(),current={version:1,name:'Terrain Climber',avatar:'orbit',coins:5,unlocked:['pulse'],equipped:'pulse',records:[]};if(before)local.set(currentKey,JSON.stringify(current));const g=load({local,session});if(!before)local.set(currentKey,JSON.stringify(current));else el('previous-open').onclick();el('previous-import').onclick();assert.equal(g.Profile.coins,5);assert.equal(g.Profile.name,current.name);assert.equal(g.Profile.avatar,'orbit');assert.equal(local.get(currentKey),JSON.stringify(current));assert.equal(local.get(profileKey),JSON.stringify(old));}
 });
 test('blocked carry saving retains the original and its decision, with temporary separate play still available',()=>{
  const {local,session}=prior(),g=load({local,session});localStorage.setItem=()=>{throw Error('blocked');};el('previous-import').onclick();assert(el('previous-dialog').open);assert.equal(g.Profile.coins,0);assert.equal(g.Profile.avatar,'aster');assert(!local.has(currentKey));assert.equal(local.get(profileKey),JSON.stringify(old));el('previous-separate').onclick();el('play').onclick();assert(g.Game.running);assert.equal(g.Journey.lives,3);
 });
 test('an old Flow active run without a profile is visible and retained until explicit new play',()=>{
  const session=new Map([[oldRunKey,JSON.stringify(oldRun)]]),g=load({session});assert(!g.Game.running);assert.match(el('menu-progress').textContent,/Previous active run kept/);el('previous-open').onclick();assert.match(el('previous-run').textContent,/312 m.*cannot resume/);assert(el('previous-import').classList.contains('hidden'));el('previous-close').onclick();el('play').onclick();assert(g.Game.running);assert.equal(session.get(oldRunKey),JSON.stringify(oldRun));
 });
 test('the new public save reloads exact terrain transient state and avatar without a fresh import dialog',()=>{
  const local=new Map(),session=new Map();let g=load({local,session});g.Avatars.open();g.Avatars.choose('wisp');g.Avatars.confirm();g.Game.start();const b=g.Level.blocks.find(b=>b.mechanic==='crumble');g.Game.time=1;g.Terrain.contact(b);g.Game.time=2;g.RunSave.write();g=load({local,session});assert(g.Game.running&&g.Game.paused);assert.equal(g.Level.course,8);assert.equal(g.Journey.avatar,'wisp');assert.equal(g.Game.time,2);assert.equal(g.Terrain.age(g.Level.blocks.find(n=>n.id===b.id)),1);assert(!el('previous-dialog').open);g.Game.togglePause();g.Game.sim(STEP);assert.equal(g.Journey.lives,3);
 });
 test('testing-only Terrain Practice saves stay separate from three-life public recovery',()=>{
  const local=new Map(),session=new Map();let g=loadGame({search:'?terrain=1',local,session});g.Journey.chooseMode('practice');g.Game.start();g.RunSave.write();const key=g.RunSave.key,raw=session.get(key);g=load({local,session,search:'?practice=1&testing=1'});assert(!g.Game.running);g.Game.start();assert.equal(g.Journey.lives,3);assert.notEqual(g.RunSave.key,key);assert.equal(session.get(key),raw);
 });
 console.log(`${passed} compiled production release checks passed`);
}finally{await rm(output,{recursive:true,force:true});}
