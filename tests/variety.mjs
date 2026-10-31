import assert from 'node:assert/strict';
import {loadGame,STEP} from './harness.mjs';
let passed=0;function test(name,fn){fn();passed++;console.log('PASS variety: '+name);}
function load(options={}){const g=loadGame(options);g.Game.setTouch(true);g.Game.configureControls('one');g.Journey.chooseMode('challenge');g.Game.start();return g;}
const pad=()=>document.getElementById('one-pad');
const down=()=>pad().dispatch('pointerdown',{pointerId:1,clientX:200});
const move=x=>pad().dispatch('pointermove',{pointerId:1,clientX:x});
const up=()=>pad().dispatch('pointerup',{pointerId:1});
const step=(g,n=1)=>{for(let i=0;i<n&&g.Game.running;i++)g.Game.sim(STEP);};

test('five opening encounters and broad landmarks reconstruct deterministically after streaming',()=>{
 const g=load(),L=g.Level;assert.equal(L.encounters.length,5);assert.equal(new Set(L.encounters.map(e=>e.hint)).size,5);
 const sample=()=>L.blocks.map(b=>[b.id,b.x,b.y,b.w,b.h,b.feature,b.rescue,b.rest]);const before=sample();L.ensure(60000);L.ensure(64);assert.deepEqual(sample(),before);
 for(let stage=0;stage<5;stage++){L.ensure(150+stage*1380);assert.equal(L.stage(150+stage*1380),stage);assert(L.landmarks.some(l=>l.name===L.encounters[stage].name));assert(L.blocks.some(b=>b.rest&&b.w>=200));}
});
test('world streams remain bounded through the opening and many distant revisits',()=>{
 const g=load(),L=g.Level;for(const row of [0,6,12,18,24,30,100,1000,2,22,99999,14,0]){L.ensure(150+row*230);assert(L.blocks.length<85);assert(L.tokens.length<=52);assert(L.landmarks.length<=3);assert(L.poles.length<=3);}
});
test('Wind Gap makes steering matter while a good release can still reach the marked main wall',()=>{
 const attempt=steer=>{const g=load(),{Player:P,Level:L}=g;L.ensure(1530);const b=L.blocks.find(b=>b.spine&&b.row===6),target=L.blocks.find(b=>b.spine&&b.row===7);
 Object.assign(P,{x:b.x-P.w,y:b.y+30,vx:0,vy:0,onGround:false});g.Journey.fallAnchor=P.y;down();P.startCarve({type:'wallR',block:b});P.carve.charge=.45;move(steer?125:200);up();down();move(steer?125:200);
 let caught=false;for(let i=0;i<200;i++){step(g);if(P.carve?.block.id===target.id){caught=true;break;}}return caught;};
 assert(attempt(true),'manual steering with a good release must cross');assert(!attempt(false),'identical neutral releases must not solve every encounter');
});
test('shortcut is optional, has a stable reward and triggers a spring only on landing',()=>{
 const g=load();g.Level.ensure(3140);const b=g.Level.blocks.find(b=>b.shortcut);assert(b&&b.kind==='rail');assert(g.Level.blocks.some(b=>b.spine&&b.row===13));assert.equal(g.Level.tokens.find(t=>t.id==='t:13:9').value,8);
 Object.assign(g.Player,{x:b.x+50,y:b.y+b.h+1,vx:0,vy:-240,onGround:false});g.Journey.fallAnchor=g.Player.y;down();g.Player.collide(STEP);g.Journey.update(STEP);
 assert.equal(g.Player.vy,1450);assert.equal(g.Player.vx,-520);assert(!g.Player.onGround);assert(!g.Input.carve());assert(g.Input.blocked);assert.equal(g.Journey.lives,3);up();down();assert(g.Input.carve());
});
test('the shortcut shard cannot pay twice across reload or checkpoint reconstruction',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});g.Level.ensure(3140);const t=g.Level.tokens.find(t=>t.id==='t:13:9');g.Journey.peak=t.y;g.Journey.contracts();const before=g.Profile.coins;
 g.Player.x=t.x-17;g.Player.y=t.y-23;g.Journey.update(STEP);assert.equal(g.Profile.coins,before+8);g.RunSave.write();const coins=g.Profile.coins;
 g=loadGame({session,local});assert(g.Game.paused);g.Game.togglePause();g.Journey.update(STEP);assert.equal(g.Profile.coins,coins);assert(g.Journey.collected.has(t.id));
});
test('a fresh descending catch on the visible rescue wall saves a life without granting bounty',()=>{
 const g=load();g.Level.ensure(4750);const b=g.Level.blocks.find(b=>b.rescue);assert(b&&b.grip&&!b.hazard);
 Object.assign(g.Player,{x:b.x+b.w,y:b.y+70,vx:0,vy:-350,onGround:false});g.Journey.peak=b.y+500;g.Journey.fallAnchor=b.y+500;g.Journey.contracts();const coins=g.Profile.coins;down();step(g);
 assert.equal(g.Player.carve?.block.id,b.id);assert(g.Player.carve.manual);assert.equal(g.Journey.rescues,1);assert.equal(g.Journey.lives,3);assert.equal(g.Profile.coins,coins);assert.match(g.Game.notice,/RESCUE WALL/);
});
test('missing the rescue wall costs one life at the world boundary and resets its recovery anchor',()=>{
 const g=load();g.Level.ensure(4750);const b=g.Level.blocks.find(b=>b.rescue);g.Journey.peak=b.y+500;g.Journey.fallAnchor=b.y+500;
 Object.assign(g.Player,{x:2000,y:b.y+70,vx:0,vy:-350,onGround:false});step(g,170);assert.equal(g.Journey.lives,2);assert.equal(g.Journey.rescues,0);assert(g.Journey.fallAnchor<100);step(g,100);assert.equal(g.Journey.lives,2);
});
test('life loss depends on world coordinates rather than camera position or viewport',()=>{
 for(const cam of [-1e6,0,1e6])for(const [width,height]of [[320,568],[844,390]]){
  const g=load();g.Game.W=width;g.Game.H=height;g.Journey.fallAnchor=5000;g.Cam.y=cam;const floor=g.Level.fallFloor();
  Object.assign(g.Player,{x:2000,y:floor+20,vx:0,vy:-1000});g.Player.collide(STEP);assert.equal(g.Journey.lives,3);
  g.Player.y=floor+5;g.Player.collide(STEP);assert.equal(g.Journey.lives,2);assert.equal(g.Player.y,g.Player.respawn.y);
 }
});
test('warp/recovery resets the local fall anchor without deleting the highest-climb record',()=>{
 const g=load();g.Journey.peak=10000;g.Journey.fallAnchor=10000;const b=g.Level.blocks.find(b=>b.spine&&b.kind==='check');g.Journey.landOn(b);assert(g.Level.fallFloor()<g.Player.y);step(g);assert.equal(g.Journey.lives,3);assert.equal(g.Journey.peak,10000);
});
test('falling HUD reports the remaining rescue space; normal HUD names a section objective',()=>{
 const g=load();g.Game.lesson=4;g.Game.syncHUD();assert.match(document.getElementById('contractline').textContent,/LAUNCH GARDEN/);assert.equal(document.getElementById('coach').textContent,g.Level.encounter(g.Player.y).hint);
 g.Journey.fallAnchor=2000;g.Player.y=1500;g.Player.vy=-350;g.Game.syncHUD();assert.match(document.getElementById('contractline').textContent,/RECOVERY.*fall limit/);assert.match(document.getElementById('coach').textContent,/FALLING/);
});
test('reload retains trial course, remaining lives, rescue count and exact fall boundary',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});g.Player.y=1700;g.Journey.peak=2200;g.Journey.fallAnchor=2200;g.Journey.rescues=2;g.Journey.lives=1;g.RunSave.write();const floor=g.Level.fallFloor();
 g=loadGame({session,local});assert(g.Game.running&&g.Game.paused);assert.equal(g.RunSave.read().course,4);assert.equal(g.Level.fallFloor(),floor);assert.equal(g.Journey.rescues,2);assert.equal(g.Journey.lives,1);
});
test('legacy game profile, wallet and active run remain untouched by the isolated experiment',()=>{
 const oldProfile=JSON.stringify({version:1,name:'Existing',coins:90,best:500}),oldRun='old active run';const local=new Map([['carve.expedition.profile.v1',oldProfile]]),session=new Map([['carve.expedition.run.v1',oldRun]]);
 const g=load({local,session});assert.equal(g.Profile.coins,0);assert.notEqual(g.RunSave.key,'carve.expedition.run.v1');g.Profile.credit(5);g.RunSave.write();g.Journey.finish();assert.equal(local.get('carve.expedition.profile.v1'),oldProfile);assert.equal(session.get('carve.expedition.run.v1'),oldRun);
});
test('old course and malformed rescue state are rejected without starting a run',()=>{
 const session=new Map();const g=load({session});g.RunSave.write();const valid=JSON.parse(session.get(g.RunSave.key));
 for(const bad of [{...valid,course:2},{...valid,journey:{...valid.journey,fallAnchor:'bad'}},{...valid,journey:{...valid.journey,rescues:-1}}]){session.set(g.RunSave.key,JSON.stringify(bad));assert(!loadGame({session}).Game.running);}
});
test('spring departure requires releasing a held keyboard CARVE before catching again',()=>{
 const g=load();g.Game.configureControls('two');g.Game.togglePause();g.Level.ensure(3140);const b=g.Level.blocks.find(b=>b.shortcut);Object.assign(g.Player,{x:b.x+50,y:b.y+b.h,onGround:true,vx:0,vy:0});g.Input.keys.z=true;g.Journey.update(STEP);assert(!g.Input.carve());g.Input.keys.z=false;assert(!g.Input.carve());g.Input.keys.z=true;assert(g.Input.carve());
});
test('both crossing walls and the shortcut landing line fit inside a phone viewport',()=>{
 for(const y of [1560,3170]){
  const g=load();g.Level.ensure(y);Object.assign(g.Player,{x:606,y});Object.assign(g.Game,{W:390,H:844,dpr:1});Object.assign(g.Cam,{x:405,y:y+173,zoom:1,shake:0});for(let i=0;i<240;i++)g.Cam.follow(623,y,0,STEP);
  let m;g.Game.ctx.setTransform=(...a)=>m=a;g.Game.render();
  const targets=y<2000?g.Level.blocks.filter(b=>b.spine&&[6,7].includes(b.row)):g.Level.blocks.filter(b=>b.shortcut||b.spine&&b.row===14);
  for(const b of targets){assert(b.x*m[0]+m[4]>=0);assert((b.x+b.w)*m[0]+m[4]<=390,`${b.id} lies beyond the phone camera`);}
 }
});
test('the shortcut boost reaches its visible upper main wall with a fresh manual catch',()=>{
 const g=load();g.Level.ensure(3140);const b=g.Level.blocks.find(b=>b.shortcut);Object.assign(g.Player,{x:b.x+50,y:b.y+b.h+1,vx:0,vy:-240,onGround:false});g.Journey.fallAnchor=g.Player.y;
 g.Player.collide(STEP);g.Journey.update(STEP);down();move(125);let caught=false;
 for(let i=0;i<200;i++){step(g);if(g.Player.carve?.block.spine&&g.Player.carve.block.row>=15){caught=true;break;}}
 assert(caught);assert.equal(g.Journey.lives,3);assert.equal(g.Journey.cooldown,0);
});
test('keyboard good releases clear all five sections without skills or perfects',()=>{
 const g=loadGame(),{Player:P,Game:G,Level:L,Input:I,T}=g;g.Journey.chooseMode('challenge');G.start();let peak=64,lastRow=-1;
 for(let i=0;i<120*300&&peak<10064;i++){
  const route=L.blocks.filter(b=>b.spine).sort((a,b)=>a.y-b.y);
  const target=P.carve?route.find(b=>b.y>P.carve.block.y+5):route.find(b=>b.row>lastRow&&b.y+b.h>P.y+20);
  const dx=(target?target.x+75:P.x+17)-(P.x+17);I.keys=dx>10?{arrowright:true}:dx< -10?{arrowleft:true}:{};
  const release=P.carve?.charge>=.45||P.pole?.charge>=.45;I._tCarve=!I.blocked&&!release;
  if(P.carve&&release)lastRow=P.carve.block.row;
  if(P.onGround)I.jumpBuf=T.JUMP_BUFFER;G.sim(STEP);peak=Math.max(peak,P.y);
 }
 assert(peak>=10064);assert.equal(G.perfects,0);assert.equal(g.Journey.cooldown,0);assert.equal(g.Journey.lives,3);
});
test('Skyhook chooses a resting main ledge instead of the optional reward spring',()=>{
 const g=load(),{Player:P,Journey:J,Level:L,Profile:F}=g;P.x=405;P.y=2450;L.ensure(P.y);F.unlocked.push('hook');F.equipped='hook';
 assert(J.useSkill());const landed=L.blocks.find(b=>Math.abs(P.y-b.y-b.h-1)<1&&P.x>=b.x&&P.x+P.w<=b.x+b.w);
 assert(landed&&(landed.spine||landed.rest));assert.notEqual(landed.feature,'spring');assert(!landed.shortcut);step(g,10);assert(P.onGround);assert.equal(P.vy,0);assert(!J.collected.has('t:13:9'));assert.equal(J.lives,3);
});
test('Skyhook refuses a region with only springs or exposed outer ledges without spending cooldown',()=>{
 const g=load(),{Player:P,Journey:J,Level:L,Profile:F}=g;F.unlocked.push('hook');F.equipped='hook';P.x=400;P.y=3000;
 L.blocks=[{id:'r:13:1',x:700,y:3260,w:180,h:18,grip:true,feature:'spring',shortcut:true},{id:'b:14:4',x:820,y:3370,w:150,h:160,grip:true}];
 const before=[P.x,P.y];assert(!J.useSkill());assert.deepEqual([P.x,P.y],before);assert.equal(J.cooldown,0);
});
test('late opening camera shows rescue and landmark targets while an outer overshoot stays visible',()=>{
 for(const y of [4510,6860])for(const x of [200,600,1200]){
  const g=load();g.Level.ensure(y);Object.assign(g.Player,{x,y});Object.assign(g.Game,{W:390,H:844,dpr:1});Object.assign(g.Cam,{x:x+17,y:y+173,zoom:1,shake:0});
  let m;g.Game.ctx.setTransform=(...a)=>m=a;g.Game.render();const playerX=(x+17)*m[0]+m[4];assert(playerX>20&&playerX<370);
  if(x<1000)for(const b of g.Level.blocks.filter(b=>b.rescue||b.rest||b.spine&&Math.abs(b.y-y)<300)){assert(b.x*m[0]+m[4]>=0);assert((b.x+b.w)*m[0]+m[4]<=390);}
 }
 const g=load();g.Level.ensure(4750);g.Player.x=1200;g.Player.y=4750;g.Player.vy=-400;g.Journey.fallAnchor=5300;g.Game.syncHUD();assert.match(document.getElementById('contractline').textContent,/Rescue ←/);
});
test('passing all five sections stays acknowledged when revisiting lower ground after reload',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});g.Journey.peak=7240;g.Journey.fallAnchor=7240;g.Player.y=6900;g.Player.vy=0;g.Level.ensure(6900);g.Game.syncHUD();assert.match(document.getElementById('contractline').textContent,/OPENING CLEARED/);g.RunSave.write();
 g=loadGame({session,local});g.Game.syncHUD();assert.match(document.getElementById('contractline').textContent,/OPENING CLEARED/);g.Player.vy=-400;g.Game.syncHUD();assert.match(document.getElementById('contractline').textContent,/RECOVERY/);
});
test('crossing the Observatory exit acknowledges completion without interrupting the climb or adding a reward',()=>{
 const g=load(),{Player:P,Journey:J,Game:G}=g;g.Level.ensure(7049);Object.assign(P,{x:380,y:7049,vx:0,vy:300,onGround:false,state:'AIR'});J.peak=7049;J.fallAnchor=7049;J.contracts();
 const coins=g.Profile.coins,score=G.score,time=G.time;step(g);G.syncHUD();
 assert.match(G.notice,/^OBSERVATORY CLEARED · five sections complete · keep climbing in Endless Frontier$/);assert.match(document.getElementById('coach').textContent,/OBSERVATORY CLEARED/);assert.match(document.getElementById('contractline').textContent,/5\/5 CLEARED · ENDLESS FRONTIER/);
 assert(G.running&&!G.paused);assert(P.y>7050&&P.vy>0);assert.equal(G.time,time+STEP);assert.equal(J.lives,3);assert.equal(g.Profile.coins,coins);assert.equal(G.score,score);assert(!g.Input.manualHeld());
 J.notify('SHARD HUNTER · +12 bounty');assert.match(G.notice,/OBSERVATORY CLEARED/);G.noticeTime=0;J.notify('ordinary feedback');assert.equal(G.notice,'ordinary feedback');
});
test('completion feedback resumes with its remaining time and never replays after reload or a lower revisit',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});g.Level.ensure(7049);Object.assign(g.Player,{x:380,y:7049,vx:0,vy:300,onGround:false});g.Journey.peak=7049;g.Journey.fallAnchor=7049;step(g);g.Game.noticeTime=1.25;g.RunSave.write();
 g=loadGame({session,local});assert(g.Game.paused);assert.match(g.Game.notice,/OBSERVATORY CLEARED/);assert.equal(g.Game.noticeTime,1.25);g.Game.togglePause();step(g);assert(g.Game.noticeTime<1.25);
 g.Game.notice='';g.Game.noticeTime=0;g.Player.y=6900;g.Player.vy=0;g.Journey.update(STEP);g.Player.y=7060;g.Journey.update(STEP);assert(!g.Game.notice.includes('OBSERVATORY CLEARED'));g.RunSave.write();
 g=loadGame({session,local});g.Game.togglePause();g.Journey.update(STEP);assert(!g.Game.notice.includes('OBSERVATORY CLEARED'));
});
test('completion feedback preserves hazard priority and lets a unique relic explanation take precedence',()=>{
 const g=load();g.Journey.notify('OBSERVATORY CLEARED · five sections complete');g.Journey.onHit(true);assert.match(g.Game.notice,/^FALL ·/);g.Journey.notify('OBSERVATORY CLEARED · five sections complete');assert.match(g.Game.notice,/^FALL ·/);
 g.Game.noticeTime=0;g.Journey.notify('OBSERVATORY CLEARED · five sections complete');g.Journey.notify('SPRINGBOARD · lift, then press to catch · RELIC +5 bounty');assert.match(g.Game.notice,/RELIC \+5/);
});
test('every part of the shortcut pad clears the overhang and permits a fresh upper catch',()=>{
 for(const seed of [1,8,39,44,60,69,71,76])for(const x of [712,740,790,840,874])for(const vx of [-360,0,360]){
  const g=load(),{Player:P,Level:L,Journey:J}=g;J.seed=seed;L.build();L.ensure(3140);const b=L.blocks.find(b=>b.shortcut);Object.assign(P,{x,y:b.y+b.h+1,vx,vy:-240,onGround:false});J.fallAnchor=P.y;
  P.collide(STEP);J.update(STEP);assert.equal(P.vy,1450);down();move(125);let caught=false;
  for(let i=0;i<200;i++){step(g);if(P.carve?.block.spine&&P.carve.block.row>=15){caught=true;break;}}
  assert(caught,`seed ${seed}, landing ${x}, incoming speed ${vx}`);assert.equal(J.lives,3);
 }
});
test('an older trial run is kept with an explanation until the player explicitly starts the revised course',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});g.Profile.credit(30);g.RunSave.write();const old=JSON.parse(session.get(g.RunSave.key));old.course=3;const raw=JSON.stringify(old);session.set(g.RunSave.key,raw);
 g=loadGame({session,local});assert(!g.Game.running);assert.equal(session.get(g.RunSave.key),raw);assert.equal(g.Profile.coins,30);assert.match(document.getElementById('menu-progress').textContent,/Course revised.*Choose Begin/);
 document.getElementById('play').onclick();assert(g.Game.running);assert.equal(g.RunSave.read().course,4);assert(!g.RunSave.incompatibleCourse);assert.equal(g.Profile.coins,30);
});
test('a deliberate rescue catch still counts after wall-slide slows the descent',()=>{
 const g=load();g.Level.ensure(4750);const b=g.Level.blocks.find(b=>b.rescue);Object.assign(g.Player,{x:b.x+b.w,y:b.y+50,vx:0,vy:-220,onGround:false});g.Journey.fallAnchor=b.y+500;g.Journey.peak=b.y+500;g.Journey.contracts();
 down();step(g);assert.equal(g.Player.carve?.block.id,b.id);assert.equal(g.Journey.rescues,1);assert.match(g.Game.notice,/RESCUE WALL/);assert.equal(g.Journey.lives,3);
});
console.log(`${passed} variety checks passed`);
