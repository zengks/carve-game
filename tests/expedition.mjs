import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadGame,STEP} from './harness.mjs';
import {build} from '../scripts/build.mjs';
import {createGameServer} from '../scripts/serve.mjs';
const path = new URL('../src/expedition.html',import.meta.url);
const load = options => loadGame({path,...options});
let passed = 0;
function test(name,fn) { fn(); passed++; console.log('PASS expedition: ' + name); }
function start(g) { g.Game.start(); }

test('arrow layout and WASD aliases support independent holds, surge and skills',()=>{
 const g=load();start(g);
 dispatchWindow('keydown',{key:'z'});dispatchWindow('keydown',{key:'ArrowRight'});
 assert(g.Input.carve());assert.equal(g.Input.axis(),1);
 dispatchWindow('keyup',{key:'ArrowRight'});assert(g.Input.carve());assert.equal(g.Input.axis(),0);
 dispatchWindow('keyup',{key:'z'});assert(!g.Input.carve());
 for(const key of ['j','Shift']) {dispatchWindow('keydown',{key});assert(g.Input.carve());dispatchWindow('keyup',{key});}
 for(const key of ['x','k']) {dispatchWindow('keydown',{key});assert(g.Input.surgeQ);g.Input.surgeQ=false;dispatchWindow('keyup',{key});}
 for(const key of ['c','l','q']) {
  g.Journey.cooldown=0;dispatchWindow('keydown',{key});assert.equal(g.Journey.cooldown,14);g.Journey.cooldown=0;
  dispatchWindow('keydown',{key,repeat:true});assert.equal(g.Journey.cooldown,0);dispatchWindow('keyup',{key});
 }
 dispatchWindow('keydown',{key:'z'});dispatchWindow('blur');assert(!g.Input.carve());assert(g.Game.paused);
});

test('X surge spends earned Flow, and explains an attempt without enough Flow',()=>{
 const g=load();start(g);g.Game.flow=50;dispatchWindow('keydown',{key:'x'});g.Game.sim(STEP);
 assert(g.Game.flow<25);assert(g.Player.surgeCD>0);assert(g.Player.vy>500);assert(g.Player.vx>700);
 dispatchWindow('keyup',{key:'x'});g.Player.surgeCD=0;g.Game.flow=0;dispatchWindow('keydown',{key:'x'});g.Game.sim(STEP);
 assert(g.Game.notice.includes('SURGE NEEDS 26 FLOW'));assert.equal(g.Player.surgeCD,0);
});

test('shortcuts preserve name editing, menu navigation, dialogs and browser modifiers',()=>{
 const g=load();let prevented=0;const preventDefault=()=>prevented++;
 for(const key of ['q','e',' ','ArrowLeft']) dispatchWindow('keydown',{key,preventDefault});
 assert.equal(prevented,0);assert.equal(Object.keys(g.Input.keys).length,0);
 start(g);
 for(const target of [{tagName:'INPUT'},{tagName:'TEXTAREA'},{tagName:'SELECT'},{isContentEditable:true}]) {
  for(const key of ['q','e','c','z','p',' ','ArrowLeft']) dispatchWindow('keydown',{key,target,preventDefault});
 }
 for(const modifier of ['ctrlKey','metaKey','altKey']) dispatchWindow('keydown',{key:'c',[modifier]:true,preventDefault});
 assert.equal(prevented,0);assert.equal(g.Journey.cooldown,0);assert(!g.Game.paused);assert(!g.Input.carve());
 dispatchWindow('keydown',{key:'p',preventDefault});assert(g.Game.paused);
 dispatchWindow('keydown',{key:'p',repeat:true});assert(g.Game.paused);
 dispatchWindow('keydown',{key:' ',preventDefault});assert.equal(prevented,1);assert.equal(g.Input.jumpBuf,0);
 dispatchWindow('keydown',{key:'p'});assert(!g.Game.paused);
 document.getElementById('help-dialog').showModal();dispatchWindow('keydown',{key:'c',preventDefault});assert.equal(g.Journey.cooldown,0);assert.equal(prevented,1);
});

test('six-column world has no goal, deterministic reconstruction and bounded streamed geometry',()=>{
 const g=load();start(g);const L=g.Level;
 assert.equal(new Set(L.blocks.filter(b=>b.column!==undefined).map(b=>b.column)).size,6);
 assert(!L.blocks.some(b=>b.kind==='goal'));
 const first=L.blocks.filter(b=>b.row===4).map(b=>[b.id,b.x,b.y,b.kind]);
 for(const row of [100,10000,5,500000,20]){L.ensure(row*230+150);assert(L.blocks.length<85);assert(L.tokens.length<=48);assert(L.poles.length<=3);}
 L.ensure(64);assert.deepEqual(L.blocks.filter(b=>b.row===4).map(b=>[b.id,b.x,b.y,b.kind]),first);
 assert(!L.blocks.some(b=>b.kind==='goal'));
});

test('shards and contracts reward once and cannot be replayed after reload',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});start(g);
 const t=g.Level.tokens[0];g.Player.x=t.x-17;g.Player.y=t.y-23;g.Journey.update(STEP);
 assert.equal(g.Profile.coins,t.value);const coins=g.Profile.coins;
 g.Journey.update(STEP);assert.equal(g.Profile.coins,coins);
 g.Journey.shards=6;g.Journey.clean=3;g.Journey.peak=1064;g.Journey.contracts();
 const bank=g.Profile.coins;assert.equal(bank,coins+12+15+20);g.Journey.contracts();assert.equal(g.Profile.coins,bank);
 g.RunSave.write();g=load({session,local});assert(g.Game.paused);g.Journey.contracts();assert.equal(g.Profile.coins,bank);assert(g.Journey.collected.has(t.id));
});

test('old streamed rewards stay ineligible even when their IDs have been pruned',()=>{
 const g=load();start(g);const b=g.Level.blocks.find(b=>b.spine);
 g.Player.award(g.Player.quality(.75),b);const score=g.Game.score;
 g.Journey.peak=100000;g.Journey.update(STEP);assert(!g.Game.rewarded.has(b.id));
 g.Player.award(g.Player.quality(.75),b);assert.equal(g.Game.score,score);
 g.Journey.collected.clear();const t=g.Level.tokens[0];g.Player.x=t.x-17;g.Player.y=t.y-23;const coins=g.Profile.coins;g.Journey.update(STEP);assert.equal(g.Profile.coins,coins);
});

test('earned unlocks persist across expeditions and equipment cannot reset cooldown',()=>{
 const local=new Map();let g=load({local});start(g);
 assert(!g.Journey.buy('hook'));g.Profile.credit(75);assert(g.Journey.buy('wing'));assert.equal(g.Profile.coins,50);
 g.Journey.cooldown=10;assert(g.Journey.buy('hook'));assert.equal(g.Profile.coins,0);assert.equal(g.Journey.cooldown,10);
 g=load({local});assert(g.Profile.unlocked.includes('hook'));assert.equal(g.Profile.equipped,'hook');start(g);assert.equal(g.Profile.coins,0);assert(g.Profile.unlocked.includes('wing'));
});

test('Rocket Pulse breaks a grip cleanly, respects pause and cannot repeat on cooldown',()=>{
 const g=load();start(g);const b=g.Level.blocks.find(b=>b.spine);g.Player.y=b.y+20;g.Player.startCarve({type:'wallR',block:b});
 assert(g.Journey.useSkill());assert.equal(g.Player.carve,null);assert.equal(g.Player.state,'AIR');assert.equal(g.Player.vy,1450);
 assert(!g.Journey.useSkill());g.Journey.cooldown=0;g.Game.togglePause();assert(!g.Journey.useSkill());
});

test('Windwing changes gravity and Skyhook ends on a safe higher ledge',()=>{
 let g=load();start(g);g.Profile.credit(75);g.Journey.buy('wing');assert(g.Journey.useSkill());const before=g.Player.vy;g.Player.update(STEP);const floatDrop=before-g.Player.vy;
 g.Journey.wingTime=0;g.Player.vy=before;g.Player.update(STEP);assert(floatDrop<before-g.Player.vy);
 g.Journey.cooldown=0;g.Journey.buy('hook');const y=g.Player.y;assert(g.Journey.useSkill());assert(g.Player.y>y+200);assert.equal(g.Player.vy,0);
 assert(g.Level.blocks.some(b=>b.grip&&g.Player.x>=b.x&&g.Player.x+g.Player.w<=b.x+b.w&&Math.abs(g.Player.y-b.y-b.h-1)<.01));
});

test('Windwing exposes its remaining float time and freezes it while paused',()=>{
 const g=load();start(g);g.Profile.credit(25);g.Journey.buy('wing');g.Journey.useSkill();g.Journey.syncHUD();
 assert(document.getElementById('ability').textContent.includes('Float 8s'));
 g.Game.togglePause();g.Game.frame(50);assert.equal(g.Journey.wingTime,8);
 g.Game.togglePause();g.Game.sim(.5);g.Journey.syncHUD();assert.equal(g.Journey.wingTime,7.5);
 g.Journey.wingTime=0;g.Journey.syncHUD();assert(!document.getElementById('ability').textContent.includes('Float'));
});

test('springboards and environmental lanes affect movement without forcing portal entry',()=>{
 const g=load();start(g);const spring=g.Level.blocks.find(b=>b.feature==='spring');
 g.Player.x=spring.x+30;g.Player.y=spring.y+spring.h;g.Player.onGround=true;g.Journey.update(STEP);
 assert(g.Player.vy>1000);assert(!g.Player.onGround);assert(g.Player.relatch>0);assert(!g.Journey.rift);
 const lift=g.Level.zones.find(z=>z.type==='lift');g.Player.x=lift.x+10;g.Player.y=lift.y+10;g.Player.onGround=false;g.Player.vy=-200;g.Journey.update(STEP);assert(g.Player.vy>0);
 g.Level.ensure(3500);const wind=g.Level.zones.find(z=>z.type==='wind');g.Player.x=wind.x+10;g.Player.y=wind.y+10;g.Player.vx=0;g.Journey.update(STEP);assert(g.Player.vx*wind.direction>0);
});

test('portal is opt-in; declining does not change position, wallet or consume discovery',()=>{
 const g=load();start(g);g.Journey.update(STEP);assert(g.Journey.nearest);const p=g.Journey.nearest;const before=[g.Player.x,g.Player.y,g.Profile.coins];
 assert(g.Journey.enterPortal());assert(g.Game.paused);assert.equal(g.Journey.rift.phase,'brief');g.Journey.leaveRift();
 assert.deepEqual([g.Player.x,g.Player.y,g.Profile.coins],before);assert(!g.Journey.visited.has(p.id));
});

test('timing trial pauses climb, rewards once, warps upward and survives result reload',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});start(g);g.Journey.update(STEP);g.Journey.enterPortal();g.Journey.startTrial();
 const y=g.Player.y,time=g.Game.time,coins=g.Profile.coins;g.Game.frame(50);assert.equal(g.Game.time,time);
 g.Journey.rift.elapsed=Math.PI/4.4;g.Journey.pulse();assert(g.Journey.rift.win);assert(g.Player.y>y+600);assert.equal(g.Profile.coins,coins+20);
 const paid=g.Profile.coins,after=g.Player.y;g.Journey.resolve(true);assert.equal(g.Profile.coins,paid);
 g=load({session,local});assert(g.Game.paused);assert.equal(g.Player.y,after);assert.equal(g.Journey.rift.phase,'result');assert.equal(g.Profile.coins,paid);g.Journey.leaveRift();assert(g.Game.paused);
});

test('a stale portal prompt cannot re-enter a consumed rift between simulation frames',()=>{
 const g=load();start(g);g.Journey.update(STEP);const p=g.Journey.nearest;
 g.Journey.enterPortal();g.Journey.startTrial();g.Journey.rift.elapsed=Math.PI/4.4;g.Journey.pulse();g.Journey.leaveRift();
 g.Game.togglePause();g.Journey.nearest=p;const coins=g.Profile.coins;
 assert.equal(g.Journey.enterPortal(),false);assert.equal(g.Profile.coins,coins);assert(!g.Journey.rift);
});

test('failed rifts descend no farther than advertised and keep height record, bounty and checkpoint',()=>{
 const g=load();start(g);g.Level.ensure(2100);const cp=g.Level.blocks.find(b=>b.kind==='check'&&b.spine);g.Player.saveCheckpoint(cp);
 g.Player.y=cp.y+cp.h+600;g.Journey.peak=g.Player.y;g.Profile.credit(30);const before=g.Player.y,peak=g.Journey.peak,coins=g.Profile.coins;
 g.Journey.rift={id:'v:7',row:7,type:'pulse',phase:'playing',elapsed:0,ready:true,progress:0,sequence:[0,1,2]};g.Journey.pulse();
 assert(g.Player.y<before);assert(g.Player.y>=before-460);assert(g.Player.y>=g.Player.respawn.y);assert.equal(g.Journey.peak,peak);assert.equal(g.Profile.coins,coins);
});

test('memory trial ignores early taps, resumes explicitly after reload, and resolves actual sequence',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});start(g);g.Game.togglePause();
 g.Journey.rift={id:'v:7',row:7,type:'memory',phase:'playing',elapsed:1,ready:true,progress:0,sequence:[2,0,1]};g.Journey.chooseGlyph(2);assert.equal(g.Journey.rift.progress,0);
 g.Journey.rift.elapsed=3;g.Journey.chooseGlyph(2);g.RunSave.write();g=load({session,local});assert.equal(g.Journey.rift.progress,1);assert(!g.Journey.rift.ready);
 g.Journey.chooseGlyph(0);assert.equal(g.Journey.rift.progress,1);g.Journey.startTrial();g.Journey.chooseGlyph(0);g.Journey.chooseGlyph(1);assert(g.Journey.rift.win);
});

test('a wrong memory glyph resolves failure once and stays failed after reload',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});start(g);g.Game.togglePause();
 g.Journey.rift={id:'v:7',row:7,type:'memory',phase:'playing',elapsed:3,ready:true,progress:0,sequence:[0,1,2]};
 const coins=g.Profile.coins;g.Journey.chooseGlyph(2);assert.equal(g.Journey.rift.win,false);assert.equal(g.Profile.coins,coins);
 g.Journey.chooseGlyph(0);assert.equal(g.Journey.rift.phase,'result');assert.equal(g.Profile.coins,coins);
 g=load({session,local});assert.equal(g.Journey.rift.win,false);assert(!g.Journey.rift.ready);g.Journey.leaveRift();assert(g.Game.paused);
});

test('fixed rift actions expose only controls for the current trial phase',()=>{
 const g=load();start(g);g.Journey.update(STEP);g.Journey.enterPortal();
 const hidden=id=>document.getElementById(id).classList.contains('hidden');
 assert(!hidden('rift-start'));assert(hidden('rift-action'));assert(hidden('memory-trial'));
 g.Journey.startTrial();assert(hidden('rift-start'));assert(!hidden('rift-action'));assert(!hidden('pulse-trial'));
 dispatchWindow('blur');assert(!hidden('rift-start'));assert(hidden('rift-action'));
 g.Journey.startTrial();g.Journey.resolve(false);assert(hidden('rift-action'));assert(hidden('rift-start'));
 g.Journey.rift={id:'v:7',row:7,type:'memory',phase:'playing',elapsed:3,ready:true,progress:0,sequence:[0,1,2]};g.Journey.renderRift();
 assert(!hidden('memory-trial'));assert(hidden('rift-action'));assert(hidden('pulse-trial'));
});

test('active trial freezes on focus loss without consuming game time or silently failing',()=>{
 const g=load();start(g);g.Journey.update(STEP);g.Journey.enterPortal();g.Journey.startTrial();g.Journey.tickTrial(.4);const elapsed=g.Journey.rift.elapsed;
 dispatchWindow('blur');g.Journey.tickTrial(10);assert.equal(g.Journey.rift.elapsed,elapsed);assert(!g.Journey.rift.ready);assert(g.Game.paused);
});

test('long-distance reload restores checkpoint, skills, portal state and finite reward IDs',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});start(g);g.Level.ensure(22000);g.Player.y=22000;g.Player.x=400;g.Player.vy=600;
 g.Player.saveCheckpoint(g.Level.blocks.find(b=>b.kind==='check'&&b.spine));g.Journey.peak=23000;g.Journey.cooldown=7;g.Journey.wingTime=3;
 g.Journey.visited.add('v:91');g.Journey.quests=[5,3,22];g.Game.time=78.2;g.RunSave.write();g=load({session,local});
 assert(g.Game.running&&g.Game.paused);assert.equal(g.Player.y,22000);assert.equal(g.Player.vy,600);assert.equal(g.Journey.peak,23000);assert.equal(g.Journey.cooldown,7);assert.equal(g.Journey.wingTime,3);assert(g.Journey.visited.has('v:91'));assert.equal(g.Game.time,78.2);
});

test('a restored wall grip waits for fresh input and keeps reward eligibility',()=>{
 const session=new Map();let g=load({session});start(g);const b=g.Level.blocks.find(b=>b.spine);g.Player.y=b.y+30;g.Player.startCarve({type:'wallR',block:b});g.Player.carve.charge=.7;g.RunSave.write();
 g=load({session});assert(g.Game.paused&&g.Game.awaitingGrip);g.Game.togglePause();g.Game.frame(50);assert.equal(g.Player.carve.charge,.7);
 g.Input._tCarve=true;g.Game.frame(66);assert(g.Player.carve.charge>.7);
});

test('banking creates one local run record and does not contaminate classic saves',()=>{
 const local=new Map([['carve.best.v2','1234']]),session=new Map([['carve.run.v1','classic snapshot']]);let g=load({local,session});start(g);g.Journey.peak=4000;g.Game.score=500;g.Journey.wins=2;
 g.RunSave.write();g.RunSave.write();assert.equal(g.Profile.records.length,1);g.Journey.finish();assert(!g.Game.running);assert.equal(g.Profile.records[0].height,393);assert.equal(g.Profile.records[0].portals,2);
 assert.equal(local.get('carve.best.v2'),'1234');assert.equal(session.get('carve.run.v1'),'classic snapshot');assert.equal(session.get('carve.expedition.run.v1'),'null');
 g=load({local,session});assert.equal(g.Profile.best,393);assert.equal(g.Profile.records.length,1);assert(!g.Game.running);
});

test('separate expedition tabs preserve each others wallet, unlocks and records on sequential updates',()=>{
 const local=new Map();const a=load({local});start(a);const b=load({local});start(b);
 a.Profile.credit(30);a.Journey.buy('wing');assert.equal(a.Profile.coins,5);
 b.RunSave.write();assert.equal(b.Profile.coins,5);assert(b.Profile.unlocked.includes('wing'));assert(!b.Journey.buy('hook'));
 b.Profile.credit(4);a.Journey.peak=500;a.RunSave.write();assert.equal(a.Profile.coins,9);
 b.Journey.peak=1000;b.RunSave.write();const c=load({local});assert.equal(c.Profile.coins,9);assert.equal(c.Profile.records.length,2);
});

test('incompatible preview courses do not restore mismatched geometry or erase the profile',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});start(g);g.Profile.credit(30);g.Journey.peak=3000;g.RunSave.write();
 const d=JSON.parse(session.get('carve.expedition.run.v1'));d.course=1;session.set('carve.expedition.run.v1',JSON.stringify(d));g=load({session,local});
 assert(!g.Game.running);assert.equal(g.Profile.coins,30);assert.equal(g.Profile.best,293);
});

test('malformed expedition storage and unavailable storage never crash boot or play',()=>{
 const g=load({session:new Map([['carve.expedition.run.v1','{"version":1}']]),local:new Map([['carve.expedition.profile.v1','bad']])});assert(!g.Game.running);
 globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};globalThis.sessionStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 assert.doesNotThrow(()=>g.Game.start());assert.doesNotThrow(()=>g.Journey.update(STEP));assert.equal(g.RunSave.write(),false);
});

// Input-only climb through multiple streamed regions, through the endless course.
{
 const g=load(),{Game:G,Player:P,Input:I,Level:L,T}=g;start(g);
 let peak=64;
 for(let i=0;i<120*480&&peak<100000;i++){
  const r=L.blocks.filter(b=>b.spine).sort((a,b)=>a.y-b.y);
  const target=P.carve?r.find(b=>b.y>P.carve.block.y+5):r.find(b=>b.y+b.h>P.y+20);
  const x=target?target.x+75:P.x+17;const ax=x>P.x+27?1:x<P.x+7?-1:0;
  I.keys=ax>0?{arrowright:true}:ax<0?{arrowleft:true}:{};
  I._tCarve=!(P.carve?.charge>=T.ZONE_PERFECT_LO||P.pole?.charge>=T.ZONE_PERFECT_LO);
  if(P.onGround)I.jumpBuf=T.JUMP_BUFFER;
  G.sim(STEP);peak=Math.max(peak,P.y);
 }
 assert(peak>=100000,'input-only bot must sustain a long climb through repeated biomes');assert(G.running);assert(L.blocks.length<85);assert(G.rewarded.size<250);
 g.RunSave.write();assert(JSON.stringify(g.RunSave.read()).length<20000,'long runs keep a bounded recovery snapshot');
 passed++;console.log(`PASS expedition: input-only bot climbs ${Math.floor((peak-64)/10)} m in ${G.time.toFixed(1)} simulated seconds with bounded world (${L.blocks.length} blocks)`);
}

// Both outer route pairs are also reachable using the same public inputs.
for (const side of ['left','right']) {
 for (const seed of [1,8,39,44,60,69,71,76]) {
  const g=load(),{Game:G,Player:P,Input:I,Level:L,T}=g;start(g);g.Journey.seed=seed;L.build();let peak=64;
  for(let i=0;i<120*180&&peak<9000;i++){
   const r=L.blocks.filter(b=>b.column!==undefined&&(side==='left'?b.column<2:b.column>3)).sort((a,b)=>a.y-b.y);
   const target=P.carve?r.find(b=>b.y>P.carve.block.y+5):r.find(b=>b.y+b.h>P.y+20);
   const x=target?target.x+75:P.x+17,ax=x>P.x+27?1:x<P.x+7?-1:0;
   I.keys=ax>0?{arrowright:true}:ax<0?{arrowleft:true}:{};I._tCarve=!(P.carve?.charge>=T.ZONE_PERFECT_LO||P.pole?.charge>=T.ZONE_PERFECT_LO);
   if(P.onGround)I.jumpBuf=T.JUMP_BUFFER;G.sim(STEP);peak=Math.max(peak,P.y);
  }
  assert(peak>=9000,`${side} branch seed ${seed} must remain climbable`);assert(L.blocks.length<85);
 }
 passed++;console.log('PASS expedition: input-only bot climbs beyond 890 m on '+side+' outer route for eight fixed seeds');
}

const output=await mkdtemp(join(tmpdir(),'carve-expedition-'));
try {
 await build(output);
 const html=await readFile(join(output,'index.html'),'utf8');
 assert(html.includes('Endless Expedition'));assert(html.includes('noindex,nofollow'));
 assert(!html.includes('mobile-handoff'));assert(!html.includes('/classic/'));
 assert(!(await readdir(output,{recursive:true})).some(f=>f.includes('mobile-handoff') || f.startsWith('future/') || f.startsWith('classic/')));
 for(const m of html.matchAll(/(?:src|href)="(\/assets\/cache\/[^"?#]+)"/g))await readFile(join(output,m[1]));
 const server=createGameServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  const base=`http://127.0.0.1:${server.address().port}`;
  assert((await(await fetch(base)).text()).includes('Endless Expedition'));
  for(const path of ['/classic','/classic/','/classic/index.html','/src/carve.html'])for(const method of ['GET','HEAD']){
   const response=await fetch(base+path,{method,redirect:'manual'});assert.equal(response.status,308);assert.equal(response.headers.get('location'),'/');
  }
  assert.equal((await fetch(base+'/classic/',{method:'POST',redirect:'manual'})).status,405);
  assert.equal((await fetch(base+'/package.json')).status,404);
 } finally {await new Promise(resolve=>server.close(resolve));}
 console.log('PASS expedition: only current course is published; retired course URLs redirect to it');passed++;
} finally {await rm(output,{recursive:true,force:true});}
console.log(`${passed} expedition checks passed`);
