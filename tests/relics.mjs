import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadGame,STEP} from './harness.mjs';
let passed=0;
const el=id=>document.getElementById(id);
function test(name,fn){fn();passed++;console.log('PASS relics: '+name);}
function load(options={}){const g=loadGame({search:'?relics=1',...options});g.Game.setTouch(true);g.Game.configureControls('one','right');g.Game.start();return g;}
function rest(g,row=5){g.Level.ensure(150+row*230);const b=g.Level.blocks.find(b=>b.rest&&b.row===row);assert(b);Object.assign(g.Player,{x:b.x+50,y:b.y+b.h,vx:0,vy:0,onGround:true,state:'GROUND',carve:null,pole:null});g.Journey.peak=Math.max(g.Journey.peak,g.Player.y);return b;}
const step=(g,n=1)=>{for(let i=0;i<n;i++)g.Game.sim(STEP);};
function equipped(g,ids){g.Relics.owned=[...ids];g.Relics.consumed=[5,11,17].slice(0,ids.length);}

test('portable contract vectors pin seeded offers and assisted record provenance for a future native implementation',()=>{
 const contract=JSON.parse(readFileSync(new URL('./fixtures/relic-trial-v1.json',import.meta.url),'utf8'));
 const g=load();assert.equal(g.Level.course,contract.numericCourse);assert.deepEqual(g.Relics.rows,contract.cacheRows);assert.deepEqual(Object.keys(g.Relics.catalog),contract.poolOrder);
 for(const v of contract.offerVectors)assert.deepEqual(g.Relics.choices(v.seed,v.row,v.owned),v.choices,`seed ${v.seed}, row ${v.row}`);
 g.Journey.mode='challenge';g.Journey.lives=3;g.Journey.peak=1064;equipped(g,['collector','resonance']);g.Profile.record('banked');
 const actual=g.Profile.records[0];assert.deepEqual(Object.fromEntries(Object.keys(contract.recordProvenance).map(key=>[key,actual[key]])),contract.recordProvenance);
});

test('opt-in trial uses separate course, wallet, preferences and run keys without importing baseline assets',()=>{
 const local=new Map(),session=new Map();let base=loadGame({local,session});base.Game.start();base.Profile.credit(33);base.RunSave.write();const oldProfile=local.get(base.Profile.key),oldRun=session.get(base.RunSave.key);
 const g=load({local,session});assert.equal(g.Level.course,5);assert.equal(g.Profile.coins,0);assert(!el('previous-dialog').open);g.Profile.credit(7);g.RunSave.write();
 assert.equal(local.get('carve.variety.profile.v1'),oldProfile);assert.equal(session.get('carve.variety.run.v1'),oldRun);assert(local.has('carve.relic-trial.controls.v1'));assert(!g.Profile.key.includes('variety'));
});
test('offers have deterministic unique choices and exclude owned relics for every tested seed',()=>{
 const g=load();for(let seed=1;seed<=80;seed++)for(const row of [5,11,17]){const a=g.Relics.choices(seed,row,[]);assert.equal(new Set(a).size,3);assert.deepEqual(a,g.Relics.choices(seed,row,[]));const b=g.Relics.choices(seed,row,[a[0]]);assert(!b.includes(a[0]));assert.equal(b.length,3);}
});
test('a cache needs a safe stationary rest and a lifted control; early/airborne/moving inputs cannot open it',()=>{
 const g=load();assert.equal(g.Relics.availableRow(),null);assert(!g.Relics.open(true));rest(g);g.Player.onGround=false;assert(!g.Relics.open(true));g.Player.onGround=true;g.Player.vx=40;assert(!g.Relics.open(true));g.Player.vx=0;
 el('one-pad').dispatch('pointerdown',{pointerId:1,clientX:200});assert(!g.Relics.open(true));g.Input.clear();assert.equal(g.Relics.availableRow(),5);assert(g.Relics.open(true));assert(g.Game.paused);
});
test('offers freeze the active clock, retain their choices through reload and consume one selection once',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});rest(g);g.Relics.open(true);const choices=[...g.Relics.offer.choices],time=g.Game.time;g.Game.frame(1000);g.Game.frame(2000);assert.equal(g.Game.time,time);
 g=loadGame({search:'?relics=1',session,local});assert(g.Game.running&&g.Game.paused);assert(el('relic-dialog').open);assert.deepEqual(g.Relics.offer.choices,choices);assert(g.Relics.choose(0));assert(!g.Game.paused);assert(!el('relic-dialog').open);assert.deepEqual(g.Relics.owned,[choices[0]]);assert.deepEqual(g.Relics.consumed,[5]);assert(!g.Relics.choose(0));assert.equal(g.Input.oneId,null);assert.equal(g.Game.acc,0);
});
test('skip consumes only that cache and the cap remains three distinct relics',()=>{
 const g=load();rest(g);g.Relics.open(true);assert(g.Relics.choose(null));assert.equal(g.Relics.owned.length,0);assert.equal(g.Relics.availableRow(),null);rest(g,11);g.Relics.open(true);g.Relics.choose(1);assert.equal(g.Relics.owned.length,1);
 equipped(g,['collector','resonance','prospector']);rest(g,17);assert.equal(g.Relics.availableRow(),null);assert(!g.Relics.open(true));
});
test('Escape does not accidentally select, skip or resume an offer; background selection stays paused',()=>{
 const g=load();rest(g);g.Relics.open(true);let prevented=false;el('relic-dialog').dispatch('cancel',{preventDefault(){prevented=true;}});assert(prevented&&g.Game.paused);assert.equal(g.Relics.consumed.length,0);
 dispatchWindow('blur');assert(g.Relics.choose(0));assert(g.Game.paused);assert.equal(g.Relics.owned.length,1);assert.equal(g.Input.oneId,null);
});
test('Collector expands only collection reach and Prospector pays a unique shard once',()=>{
 const g=load();g.Level.tokens=[];const token={id:'t:0:3',row:0,x:g.Player.x+17+55,y:g.Player.y+23,value:2};g.Level.tokens=[token];g.Journey.update(STEP);assert.equal(g.Journey.shards,0);
 equipped(g,['collector','prospector']);g.Journey.update(STEP);assert.equal(g.Journey.shards,1);assert.equal(g.Profile.coins,3);g.Journey.update(STEP);assert.equal(g.Profile.coins,3);assert.equal(g.Game.flow,0);
});
test('a committed relic payout survives an older per-tab snapshot without being credited again',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});equipped(g,['spring']);g.RunSave.write();const before=session.get(g.RunSave.key);const spring={id:'r:2',row:2,feature:'spring'};assert(g.Relics.reward('spring',spring,5));assert.equal(g.Profile.coins,5);
 const profile=JSON.parse(local.get(g.Profile.key));assert.equal(profile.coins,5);assert(profile.trialCredits[0].includes(g.Journey.id));assert(profile.trialCredits[0].startsWith('relic-v1:'));
 session.set(g.RunSave.key,before);g=loadGame({search:'?relics=1',session,local});assert(g.Game.running);assert(!g.Relics.claims.size);assert(!g.Relics.reward('spring',spring,5));assert.equal(g.Profile.coins,5);
});
test('trial contract high-water and wallet commit together even when an older session replays intermediate totals',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});g.RunSave.write();const before=session.get(g.RunSave.key);g.Profile.creditContract(0,2,0,12);assert.equal(g.Profile.coins,24);
 session.set(g.RunSave.key,before);g=loadGame({search:'?relics=1',session,local});g.Profile.creditContract(0,1,0,12);g.Profile.creditContract(0,2,1,12);assert.equal(g.Profile.coins,24);g.Profile.creditContract(0,3,2,12);assert.equal(g.Profile.coins,36);
});
test('Resonance changes only future activations; choosing/restoring it does not shorten a running cooldown twice',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});assert(g.Journey.useSkill());assert.equal(g.Journey.cooldown,14);equipped(g,['resonance']);g.RunSave.write();assert.equal(g.Journey.cooldown,14);
 g=loadGame({search:'?relics=1',session,local});assert.equal(g.Journey.cooldown,14);g.Game.togglePause();g.Journey.cooldown=0;assert(g.Journey.useSkill());assert.equal(g.Journey.cooldown,11.9);g.RunSave.write();g=loadGame({search:'?relics=1',session,local});assert.equal(g.Journey.cooldown,11.9);
});
for(const row of [0,7])test(`Gatekeeper rewards ${row===0?'timing':'memory'} success once without changing Challenge lives`,()=>{
 const g=load();equipped(g,['gatekeeper']);g.Journey.mode='challenge';g.Journey.lives=2;g.Level.ensure(150+row*230);const p=g.Level.portals.find(p=>p.row===row);assert(p);Object.assign(g.Player,{x:p.x-17,y:p.y-23,vx:0,vy:0,onGround:false,state:'AIR'});g.Journey.update(STEP);const before=g.Profile.coins,quests=[...g.Journey.quests];assert(g.Journey.enterPortal());g.Journey.startTrial();g.Journey.resolve(true);const questDelta=g.Journey.quests.reduce((sum,n,i)=>sum+(n-quests[i])*[12,15,20][i],0);assert.equal(g.Profile.coins-before,28+questDelta);assert.equal(g.Journey.lives,2);assert(!g.Game.paused);const coins=g.Profile.coins;g.Journey.resolve(true);assert.equal(g.Profile.coins,coins);
});
test('Springfinder is paid once by real spring contact and keeps the original launch',()=>{
 const g=load();equipped(g,['spring']);g.Level.ensure(800);const b=g.Level.blocks.find(b=>b.feature==='spring');assert(b);Object.assign(g.Player,{x:b.x+20,y:b.y+b.h,onGround:true,vx:0,vy:0});g.Journey.update(STEP);assert.equal(g.Player.vy,1350);assert.equal(g.Profile.coins,5);assert(!g.Player.onGround);assert.match(g.Game.notice,/RELIC \+5 bounty/);
 Object.assign(g.Player,{x:b.x+20,y:b.y+b.h,onGround:true,vx:0,vy:0});g.Journey.update(STEP);assert.equal(g.Profile.coins,5);assert.doesNotMatch(g.Game.notice,/RELIC \+5 bounty/);
});
test('simultaneous shard and height contracts pay without replacing the one-time spring reward explanation',()=>{
 const g=load();equipped(g,['spring']);g.Level.ensure(800);const b=g.Level.blocks.find(b=>b.feature==='spring');assert(b);
 Object.assign(g.Player,{x:b.x+20,y:b.y+b.h,onGround:true,vx:0,vy:0});g.Journey.shards=5;g.Journey.peak=2064;
 g.Level.tokens=[{id:'t:2:3',row:2,x:g.Player.x+17,y:g.Player.y+23,value:2}];g.Journey.update(STEP);
 assert.match(g.Game.notice,/SPRINGBOARD.*RELIC \+5 bounty/);assert.deepEqual(g.Journey.quests,[1,0,2]);assert.equal(g.Profile.coins,59);
 g.Journey.contracts();assert.equal(g.Profile.coins,59);g.Game.noticeTime=0;g.Journey.shards=12;g.Journey.contracts();assert.match(g.Game.notice,/SHARD HUNTER/);assert.equal(g.Profile.coins,71);
});
test('Rescue Seal pays a real descending marked-wall catch once and never heals a Challenge life',()=>{
 const g=load();equipped(g,['rescue']);g.Journey.mode='challenge';g.Journey.lives=2;g.Level.ensure(4700);const b=g.Level.blocks.find(b=>b.rescue);assert(b);
 function catchWall(id){g.Input.clear();Object.assign(g.Player,{x:b.x-g.Player.w,y:b.y+20,vx:0,vy:-230,onGround:false,state:'AIR',carve:null,pole:null,relatch:0});g.Journey.peak=g.Player.y+500;g.Journey.fallAnchor=g.Player.y+500;el('one-pad').dispatch('pointerdown',{pointerId:id,clientX:200});step(g);assert(g.Player.carve);}
 g.Journey.peak=b.y+520;g.Journey.contracts();const before=g.Profile.coins;catchWall(1);assert.equal(g.Profile.coins-before,6);assert.equal(g.Journey.lives,2);assert.match(g.Game.notice,/RELIC \+6 bounty/);catchWall(2);assert.equal(g.Profile.coins-before,6);assert.equal(g.Journey.lives,2);assert.doesNotMatch(g.Game.notice,/RELIC \+6 bounty/);
});
test('malformed inventories, rerolled offers and concurrent rift/offer snapshots cannot resume',()=>{
 const session=new Map();const g=load({session});rest(g);g.Relics.open(true);const valid=JSON.parse(session.get(g.RunSave.key));
 for(const relics of [{...valid.relics,owned:['collector','collector']},{...valid.relics,owned:['unknown']},{...valid.relics,offer:{row:5,choices:[...valid.relics.offer.choices].reverse()}},{...valid.relics,claims:['bad']}]){session.set(g.RunSave.key,JSON.stringify({...valid,relics}));assert(!loadGame({search:'?relics=1',session}).Game.running);}
 session.set(g.RunSave.key,JSON.stringify({...valid,onGround:false,state:'AIR'}));assert(!loadGame({search:'?relics=1',session}).Game.running);
});
test('trial records preserve assisted loadout provenance and a new run resets only its relic state',()=>{
 const g=load();equipped(g,['collector','resonance']);g.Journey.peak=1400;g.Profile.record();const record=g.Profile.records[0];assert.equal(record.course,'relic-trial-v1');assert.deepEqual(record.relics,{version:1,owned:['collector','resonance']});g.Relics.claims.add('spring:r:2');g.Journey.finish();g.Game.start();assert.deepEqual(g.Relics.owned,[]);assert.equal(g.Relics.claims.size,0);assert(g.Profile.records.some(r=>r.id===record.id));
});
test('terminal Challenge keeps its relic provenance after reload without resurrecting or refilling the run',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});equipped(g,['gatekeeper']);g.Journey.mode='challenge';g.Journey.lives=3;g.Journey.peak=500;
 for(let i=0;i<3;i++){Object.assign(g.Player,{y:-400,onGround:false,stun:0});step(g);}
 assert(!g.Game.running);assert.equal(g.Journey.result.lives,0);assert.deepEqual(g.Journey.result.relics,{version:1,owned:['gatekeeper']});
 g=loadGame({search:'?relics=1',session,local});assert(!g.Game.running);assert.equal(g.Journey.result.lives,0);assert.match(el('challenge-result-wallet').textContent,/Gatekeeper/);assert.equal(g.Profile.records[0].rules,'relic-v1');
 el('challenge-retry').onclick();assert(g.Game.running);assert.equal(g.Journey.lives,3);assert.deepEqual(g.Relics.owned,[]);
});
test('the opt-in trial with no relics keeps an identical deterministic movement, Flow, score and reward trace',()=>{
 function trace(search){
  const g=loadGame({search});g.Game.start();g.Journey.seed=127;g.Level.build();g.Player.reset();const samples=[];
  for(let i=0;i<1800;i++){
   const target=g.Level.blocks.filter(b=>b.spine&&b.y>g.Player.y+30).sort((a,b)=>a.y-b.y)[0];
   g.Input.keys.d=!!target&&target.x>g.Player.x;g.Input.keys.a=!!target&&target.x<g.Player.x;g.Input.keys.z=true;
   if(g.Player.carve?.charge>=.45)g.Input.keys.z=false;
   step(g);if(i%30===0)samples.push([g.Player.x,g.Player.y,g.Player.vx,g.Player.vy,g.Game.flow,g.Game.score,g.Journey.lives,g.Profile.coins]);
  }
  return samples;
 }
 assert.deepEqual(trace(''),trace('?relics=1'));
});
for(const charge of [.45,.7])test(`one-thumb input climbs 1,000 m with a three-relic loadout and ${charge<.6?'good':'perfect'} releases`,()=>{
 const g=load();equipped(g,charge<.6?['collector','prospector','resonance']:['gatekeeper','spring','rescue']);g.Journey.mode='challenge';g.Journey.lives=3;let peak=64,lastRow=-1,id=100,held=false;
 for(let i=0;i<120*180&&peak<10064;i++){
  if(!held){el('one-pad').dispatch('pointerdown',{pointerId:id,clientX:200});held=true;}
  const route=g.Level.blocks.filter(b=>b.spine).sort((a,b)=>a.y-b.y),p=g.Player;
  const target=p.carve?route.find(b=>b.y>p.carve.block.y+5):route.find(b=>b.row>lastRow&&b.y+b.h>p.y+20);
  const dx=(target?target.x+75:p.x+17)-(p.x+17);el('one-pad').dispatch('pointermove',{pointerId:id,clientX:200+(Math.abs(dx)>10?Math.sign(dx)*75:0)});
  if((p.groundCharge??p.carve?.charge??p.pole?.charge)>=charge){if(p.carve)lastRow=p.carve.block.row;el('one-pad').dispatch('pointerup',{pointerId:id});held=false;id++;}
  if(p.onGround&&p.y<100)lastRow=-1;
  if(g.Input.blocked){el('one-pad').dispatch('pointerup',{pointerId:id});held=false;id++;}
  step(g);peak=Math.max(peak,p.y);
 }
 assert(peak>=10064);assert.equal(g.Journey.lives,3);assert(g.Game.running);assert.equal(g.Relics.owned.length,3);assert(g.Level.blocks.length<85);
});
console.log(`${passed} relic checks passed`);
