import assert from 'node:assert/strict';
import {loadGame,STEP} from './harness.mjs';
let passed=0;const el=id=>document.getElementById(id);
const test=(name,fn)=>{fn();console.log('PASS terrain: '+name);passed++;};
function load(options={}){const g=loadGame({search:'?terrain=1',...options});g.Game.setTouch(true);g.Game.configureControls('one');g.Game.start();return g;}
function surface(g,kind){return g.Level.blocks.find(b=>b.mechanic===kind);}
function land(g,b){Object.assign(g.Player,{x:b.x+45,y:b.y+b.h+.1,vx:0,vy:-50,state:'AIR',onGround:false,carve:null,pole:null,groundCharge:null});g.Journey.fallAnchor=g.Player.y;g.Player.collide(STEP);assert(g.Player.onGround);}
const step=(g,n=1)=>{for(let i=0;i<n;i++)g.Game.sim(STEP);};
test('preview isolates profiles, settings, active runs and outcome provenance from released Flow and relics',()=>{
 const local=new Map(),session=new Map();let old=loadGame({search:'?flow=1',local,session});old.Game.start();old.Profile.credit(81);old.RunSave.write();const oldProfile=local.get(old.Profile.key),oldRun=session.get(old.RunSave.key);
 const g=load({local,session});assert.equal(g.Level.course,8);assert.equal(g.Profile.coins,0);g.Profile.credit(15);g.RunSave.write();g.Journey.peak=300;g.Profile.record('banked');assert.equal(g.Profile.records[0].course,'terrain-v1');assert.equal(g.Profile.records[0].rules,'terrain-v1');assert.equal(local.get(old.Profile.key),oldProfile);assert.equal(session.get(old.RunSave.key),oldRun);
 const relic=load({local,session,search:'?terrain=1&relics=1'});assert.equal(relic.Level.course,9);assert.equal(relic.Profile.coins,0);assert.notEqual(relic.RunSave.key,g.RunSave.key);
 const publicGame=loadGame({production:true,search:'?terrain=1&testing=1'});assert.equal(publicGame.Level.course,8);assert.equal(publicGame.RunSave.key,'carve.public-terrain.run.v1');
});
test('every required wall, camp, rescue and spring retains stable released collision geometry',()=>{
 const base=loadGame({search:'?flow=1'});base.Game.start();const g=load();g.Journey.seed=base.Journey.seed;g.Level.build();
 for(const row of [0,5,9,13,16,20,29,31,100,1000]){base.Level.ensure(150+row*230);g.Level.ensure(150+row*230);for(const b of base.Level.blocks){const other=g.Level.blocks.find(n=>n.id===b.id);assert(other);for(const k of ['x','y','w','h','kind','grip','feature'])assert.equal(other[k],b[k],b.id+':'+k);}assert(g.Level.blocks.length<100);}
});
test('cloud ferry is one-way and carries standing and charged players at every frame rate',()=>{
 for(const hz of [60,120])for(const charged of [false,true]){
  const g=load(),b=surface(g,'ferry');land(g,b);if(charged){el('one-pad').dispatch('pointerdown',{pointerId:1,clientX:200});g.Player.startCarve({type:'rail',block:b});g.Player.carve.manual=true;}
  const offset=g.Player.x-b.x;for(let i=0;i<hz*.2;i++){g.Game.time+=1/hz;g.Terrain.update();g.Player.update(1/hz);assert(Math.abs(g.Player.x-b.x-offset)<1e-9);}assert(!g.Terrain.absent(b));
  Object.assign(g.Player,{x:b.x+30,y:b.y-50,vy:500,vx:0,carve:null,onGround:false});g.Player.collide(.1);assert(g.Player.y>b.y-50);assert(g.Player.vy>0);
 }
});
test('ferry position and rider offset survive reload and paused time does not advance it',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});g.Game.time=17;g.Terrain.position(false);const b=surface(g,'ferry');land(g,b);g.RunSave.write();const x=g.Player.x,bx=b.x;g=loadGame({session,local,search:'?terrain=1'});assert(g.Game.paused);assert.equal(g.Player.x,x);assert.equal(surface(g,'ferry').x,bx);const time=g.Game.time;g.Game.frame(1000);g.Game.frame(1500);assert.equal(g.Game.time,time);assert.equal(surface(g,'ferry').x,bx);
});
test('ferry reversal keeps the gesture neutral fixed on screen and final aim independent of deck velocity',()=>{
 const g=load(),b=surface(g,'ferry');g.Game.time=(5*Math.PI/2-b.row*1.7)/.65-.2;g.Terrain.position(false);land(g,b);g.Player.onGround=false;
 el('one-pad').dispatch('pointerdown',{pointerId:1,clientX:200});el('one-pad').dispatch('pointermove',{pointerId:1,clientX:275});g.Player.startCarve({type:'rail',block:b});g.Player.carve.manual=true;g.Player.carve.charge=.7;
 const offset=g.Player.x-b.x;for(let i=0;i<48;i++){g.Game.time+=STEP;g.Terrain.position();assert(Math.abs(g.Player.x-b.x-offset)<1e-9);assert.equal(g.Input.oneOrigin,200);assert.equal(g.Input.axis(),1);}
 el('one-pad').dispatch('pointerup',{pointerId:1});assert.equal(g.Player.vx,g.T.RAIL_FWD+g.T.STEER);assert(g.Player.vy>0);
});
test('cracked shelf warns on first contact, collapses at 1.8 seconds, and regrows after five more',()=>{
 const g=load(),b=surface(g,'crumble');land(g,b);assert.match(g.Game.notice,/CRACKED SHELF/);const at=g.Terrain.cracks.get(b.id);g.Game.time=at+1.79;g.Terrain.update();assert(!g.Terrain.absent(b));g.Game.time=at+1.8;g.Terrain.update();assert(g.Terrain.absent(b));assert(!g.Player.onGround);assert.equal(g.Player.groundCharge,null);assert.equal(g.Journey.lives,3);g.Game.time=at+6.81;g.Terrain.update();assert(!g.Terrain.absent(b));assert(!g.Terrain.cracks.has(b.id));land(g,b);assert.equal(g.Terrain.cracks.get(b.id),g.Game.time);
});
test('shelf collapse cannot leave a ground charge or either touch layout latched to air',()=>{
 for(const scheme of ['one','two'])for(const grip of ['ground','rail']){
  const g=load(),b=surface(g,'crumble');g.Game.configureControls(scheme);if(g.Game.paused)g.Game.togglePause();land(g,b);if(grip==='ground')g.Player.groundCharge=.3;else{g.Player.startCarve({type:'rail',block:b});g.Player.carve.manual=true;}g.Game.time=1.81;g.Terrain.update();assert.equal(g.Player.groundCharge,null);assert.equal(g.Player.carve,null);assert(!g.Player.onGround);assert(g.Input.blocked);assert.equal(g.Journey.lives,3);
 }
});
test('cracked timer persists without restart across reload, and inactive shelves cannot be caught or landed on',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});const b=surface(g,'crumble');land(g,b);g.Game.time=1;g.RunSave.write();g=loadGame({search:'?terrain=1',session,local});assert(g.Game.paused);const restored=surface(g,'crumble');assert.equal(g.Terrain.age(restored),1);g.Game.time=2;assert(g.Terrain.absent(restored));Object.assign(g.Player,{x:restored.x+20,y:restored.y+restored.h+1,vx:0,vy:-200});assert.notEqual(g.Player.findCarve()?.block.id,restored.id);g.Player.collide(.02);assert(!g.Player.onGround);
});
test('malformed crack histories never restore and source save text stays preserved',()=>{
 const session=new Map();const g=load({session});g.RunSave.write();const valid=JSON.parse(session.get(g.RunSave.key));
 for(const cracks of [[{id:'b:4:3',at:0}],[{id:'r:5:3',at:0}],[{id:'r:4:3',at:-1}],[{id:'r:4:3',at:2}],[{id:'r:4:3',at:0},{id:'r:4:3',at:0}],null]){const raw=JSON.stringify({...valid,terrain:{version:1,cracks}});session.set(g.RunSave.key,raw);const next=loadGame({search:'?terrain=1',session});assert(!next.Game.running);assert.equal(session.get(g.RunSave.key),raw);}
});
test('perfect crystal bell gives a noncurrency bonus once, survives reload and good releases remain normal',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});const b=g.Level.blocks.find(b=>b.bell),coins=g.Profile.coins;g.Game.flow=0;g.Journey.cooldown=20;g.Terrain.reward(g.Player.quality(.45),b);assert.equal(g.Game.flow,0);assert.equal(g.Journey.cooldown,20);g.Terrain.reward(g.Player.quality(.7),b);assert.equal(g.Game.flow,12);assert.equal(g.Journey.cooldown,16);assert.equal(g.Profile.coins,coins);g.Terrain.reward(g.Player.quality(.7),b);assert.equal(g.Game.flow,12);g.RunSave.write();g=loadGame({session,local,search:'?terrain=1'});g.Terrain.reward(g.Player.quality(.7),g.Level.blocks.find(b=>b.bell));assert.equal(g.Game.flow,12);assert.equal(g.Journey.cooldown,16);
});
test('a GOOD first catch does not consume bell mastery, and repeated perfects cannot farm it',()=>{
 const g=load(),b=g.Level.blocks.find(b=>b.bell);g.Game.flow=0;g.Journey.cooldown=20;
 g.Player.award(g.Player.quality(.45),b);assert.equal(g.Journey.cooldown,18);const score=g.Game.score;
 g.Player.award(g.Player.quality(.7),b);assert.equal(g.Game.flow,20);assert.equal(g.Journey.cooldown,14);assert.equal(g.Game.score,score);
 g.Player.award(g.Player.quality(.7),b);assert.equal(g.Game.flow,20);assert.equal(g.Journey.cooldown,14);
});
test('perfect top launches ring the same bell through either manual touch layout',()=>{
 for(const scheme of ['one','two']){
  const g=load(),b=g.Level.blocks.find(b=>b.bell);g.Game.configureControls(scheme);if(g.Game.paused)g.Game.togglePause();land(g,b);g.Journey.cooldown=10;const pad=el(scheme==='one'?'one-pad':'t-carve');pad.dispatch('pointerdown',{pointerId:1,clientX:200});step(g,43);assert.equal(g.Player.quality(g.Player.groundCharge).n,'perfect');pad.dispatch('pointerup',{pointerId:1});assert.equal(g.Game.flow,12);assert.equal(g.Journey.cooldown,6);assert(g.Journey.collected.has(`t:${b.row}:10`));assert(g.Player.vy>0);assert.match(g.Game.notice,/CRYSTAL BELL/);
 }
});
test('bell receipts state capped actual benefits instead of claiming unused recharge',()=>{
 const g=load(),b=g.Level.blocks.find(b=>b.bell);g.Game.flow=97;g.Journey.cooldown=0;g.Terrain.reward(g.Player.quality(.7),b);assert.equal(g.Game.flow,100);assert.match(g.Game.notice,/\+3 Flow · skill already ready/);
});
test('bells below the retained reward horizon remain ineligible after claim pruning and reload',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});const b=g.Level.blocks.find(b=>b.bell);g.Terrain.reward(g.Player.quality(.7),b);g.Journey.peak=150+60*230;g.Journey.update(STEP);assert(!g.Journey.collected.has(`t:${b.row}:10`));g.Game.flow=0;g.Journey.cooldown=10;g.RunSave.write();g=loadGame({session,local,search:'?terrain=1'});g.Terrain.reward(g.Player.quality(.7),b);assert.equal(g.Game.flow,0);assert.equal(g.Journey.cooldown,10);
});
test('new surface failures still lose exactly one life per incident and Game Over stops the run',()=>{
 const g=load();for(let lives=2;lives>=0;lives--){g.Player.stun=0;g.Player.hit(true);assert.equal(g.Journey.lives,lives);if(g.Game.returning)g.Game.tickReturn(1);}assert(!g.Game.running);assert.equal(g.Journey.result.course,8);assert.equal(g.Journey.result.outcome,'gameover');
});
test('all themed shapes render in portrait, landscape and tablet without changing camera zoom',()=>{
 const g=load();for(const [W,H]of [[390,844],[844,390],[1366,768],[768,1024]]){Object.assign(g.Game,{W,H,dpr:1});for(const row of [0,6,12,18,24,31]){const y=150+230*row;g.Level.ensure(y);g.Cam.y=y;g.Cam.x=405;g.Game.render();assert.equal(g.Cam.zoom,1);}}
});
for(const charge of [.45,.7])for(const seed of [1,44,76])test(`one-thumb scripted no-skill route reaches 1000m with seed ${seed}, ${charge<.6?'GOOD':'PERFECT'} releases`,()=>{
 const g=load();g.Journey.seed=seed;g.Level.build();let peak=64,lastRow=-1,id=100,held=false;
 for(let i=0;i<120*180&&peak<10064&&g.Game.running;i++){
  if(!held){el('one-pad').dispatch('pointerdown',{pointerId:id,clientX:200});held=true;}
  const p=g.Player,route=g.Level.blocks.filter(b=>b.spine).sort((a,b)=>a.y-b.y),target=p.carve?route.find(b=>b.y>p.carve.block.y+5):route.find(b=>b.row>lastRow&&b.y+b.h>p.y+20),dx=(target?target.x+75:p.x+17)-(p.x+17);el('one-pad').dispatch('pointermove',{pointerId:id,clientX:200+(Math.abs(dx)>10?Math.sign(dx)*75:0)});
  if((p.groundCharge??p.carve?.charge??p.pole?.charge)>=charge){if(p.carve)lastRow=p.carve.block.row;el('one-pad').dispatch('pointerup',{pointerId:id});held=false;id++;}if(p.onGround&&p.y<100)lastRow=-1;if(g.Input.blocked){el('one-pad').dispatch('pointerup',{pointerId:id});held=false;id++;}g.Game.sim(STEP);peak=Math.max(peak,p.y);
 }
 assert(peak>=10064,`peak ${peak}`);assert.equal(g.Journey.lives,3);assert(g.Game.running);
});
console.log(`${passed} living terrain checks passed`);
