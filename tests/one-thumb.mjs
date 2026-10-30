import assert from 'node:assert/strict';
import {loadGame,STEP} from './harness.mjs';
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS one-thumb: '+name);}
const el=id=>document.getElementById(id);
function load(options={}){const g=loadGame(options);g.Game.setTouch(true);g.Game.configureControls('one','right');g.Game.start();return g;}
const down=(id=1,x=200)=>el('one-pad').dispatch('pointerdown',{pointerId:id,clientX:x,button:0});
const move=(x,id=1)=>el('one-pad').dispatch('pointermove',{pointerId:id,clientX:x});
const up=(id=1)=>el('one-pad').dispatch('pointerup',{pointerId:id});
const step=(g,n=1)=>{for(let i=0;i<n;i++)g.Game.sim(STEP);};
const settle=g=>step(g,12);
function grip(g){const b=g.Level.blocks.find(b=>b.spine);g.Player.x=b.x-g.Player.w;g.Player.y=b.y+30;g.Player.vx=0;g.Player.vy=0;g.Player.onGround=false;down();step(g);assert(g.Player.carve?.manual);return b;}

test('coarse-pointer first use defaults to one thumb; stored two-thumb and handedness choices survive boot',()=>{
 let g=loadGame({coarse:true});assert.equal(g.Game.controlLabel(),'one');assert(document.body.classList.contains('one-thumb'));
 const local=new Map();g=load({local});g.Game.togglePause();g.Game.configureControls('two','left');g=loadGame({local,coarse:true});assert.equal(g.Game.controlLabel(),'two');assert.equal(g.Game.controlHand,'left');
});
test('one pointer owns steering with a fixed dead zone; other fingers and stale releases cannot steal it',()=>{
 const g=load();down();move(206);assert.equal(g.Input.axis(),0);move(242.5);assert.equal(g.Input.axis(),.5);
 down(2,20);move(0,2);up(2);assert.equal(g.Input.oneId,1);assert.equal(g.Input.axis(),.5);
 move(80);assert.equal(g.Input.axis(),-1);up();assert.equal(g.Input.axis(),0);assert(!g.Input.carve());
});
test('ground hold charges without jumping; release preserves selected direction without score farming',()=>{
 const g=load();settle(g);assert(g.Player.onGround);const y=g.Player.y;down();move(125);step(g,45);assert.equal(g.Player.y,y);assert(g.Player.groundCharge>.5);assert.equal(g.Player.vy,0);
 up();assert.equal(g.Player.state,'AIR');assert(g.Player.vy>500);assert(g.Player.vx<0);assert.equal(g.Game.score,0);const vx=g.Player.vx;step(g);assert(Math.abs(g.Player.vx)>Math.abs(vx)*.95);
});
test('short ground tap hops; expired charge never launches and requires lift plus a fresh press',()=>{
 const g=load();settle(g);down();up();assert(g.Player.vy>=320);
 g.Game.start();settle(g);down();step(g,200);assert(g.Player.onGround);assert.equal(g.Player.vy,0);assert(g.Input.blocked);assert.equal(g.Player.groundCharge,null);
 step(g,100);assert(g.Player.onGround);up();down();assert.equal(g.Player.groundCharge,0);up();assert(g.Player.vy>0);
});
test('touch wall holds stay still; only release launches, using the last dragged steering axis',()=>{
 const g=load();grip(g);const y=g.Player.y;move(125);step(g,45);assert.equal(g.Player.y,y);assert.equal(g.Player.vy,0);assert(g.Player.carve.charge>.6);assert.equal(g.Game.score,0);
 up();assert(!g.Player.carve);assert(g.Player.vy>1000);assert(g.Player.vx<0);assert(g.Game.score>0);assert(!g.Input.carve());
});
test('wall overhold slips once and cannot auto-recatch until a new gesture',()=>{
 const g=load();grip(g);step(g,190);assert(!g.Player.carve);assert(g.Input.blocked);assert(!g.Input.carve());assert.equal(g.Game.score,0);up();down();assert(g.Input.carve());
});
test('release in free flight does not manufacture a launch or preserve steering input',()=>{
 const g=load();g.Player.x=400;g.Player.y=700;g.Player.vx=530;g.Player.vy=100;g.Player.onGround=false;down();move(275);const before=[g.Player.vx,g.Player.vy];up();assert.deepEqual([g.Player.vx,g.Player.vy],before);assert.equal(g.Input.axis(),0);assert(!g.Input.carve());
});
test('ground and wall pointer cancellation pause without a launch or rewarded release',()=>{
 for(const kind of ['ground','wall']){const g=load();if(kind==='ground'){settle(g);down();}else grip(g);step(g,45);const score=g.Game.score;
 el('one-pad').dispatch('pointercancel',{pointerId:1});assert(g.Game.paused);assert.equal(g.Input.oneId,null);assert.equal(g.Player.groundCharge,null);assert.equal(g.Game.score,score);assert.equal(g.Player.vy,0);
 if(kind==='wall'){assert(g.Player.carve);assert.equal(g.Player.carve.charge,0);assert(g.Game.awaitingGrip);}
 g.Game.togglePause();up();assert.equal(g.Game.score,score);assert(!g.Input.carve());}
});
test('normal release followed by lost capture is harmless; extra cancel cannot pause another owner',()=>{
 const g=load();settle(g);down();el('one-pad').dispatch('lostpointercapture',{pointerId:7});assert(!g.Game.paused);up();const vy=g.Player.vy;el('one-pad').dispatch('lostpointercapture',{pointerId:1});assert(!g.Game.paused);assert.equal(g.Player.vy,vy);
});
test('switching layouts pauses, clears the gesture, keeps lives and requires explicit resume',()=>{
 const g=load();g.Journey.mode='challenge';g.Journey.lives=2;grip(g);step(g,40);g.Game.configureControls('two','left');assert(g.Game.paused);assert.equal(g.Journey.lives,2);assert.equal(g.Input.oneId,null);assert.equal(g.Player.carve.charge,0);assert(document.body.classList.contains('left-hand'));assert(!document.body.classList.contains('one-thumb'));
 el('controls-close').onclick();assert(g.Game.paused);assert(g.Journey.controlsUsed.includes('one')&&g.Journey.controlsUsed.includes('two'));
});
test('manual grips and layout survive reload with zero charge, no stale contact and no free launch',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});g.Game.configureControls('one','left');g.Game.togglePause();grip(g);step(g,50);g.RunSave.write();const score=g.Game.score;
 g=loadGame({session,local});assert(g.Game.running&&g.Game.paused);assert.equal(g.Game.controlScheme,'one');assert.equal(g.Game.controlHand,'left');assert(g.Player.carve.manual);assert.equal(g.Player.carve.charge,0);assert.equal(g.Input.oneId,null);assert(g.Game.awaitingGrip);
 g.Game.togglePause();up();assert.equal(g.Game.score,score);assert(g.Player.carve);down();g.Game.frame(100);assert(!g.Game.awaitingGrip);
});
test('touch skills and Surge do not trigger underneath a held pad; taps work between launches',()=>{
 const g=load();down();assert(!g.Journey.useSkill());el('t-surge').dispatch('pointerdown',{pointerId:2});assert(!g.Input.surgeQ);up();assert(g.Journey.useSkill());assert(g.Player.vy>=1450);el('t-surge').dispatch('pointerdown',{pointerId:2});assert(g.Input.surgeQ);
});
test('two-thumb steering and manual CARVE remain independent; cancel never launches',()=>{
 const g=load();g.Game.configureControls('two');g.Game.togglePause();settle(g);
 el('t-left').dispatch('pointerdown',{pointerId:3});el('t-carve').dispatch('pointerdown',{pointerId:4});step(g,45);assert.equal(g.Input.axis(),-1);assert(g.Player.groundCharge>.5);
 el('t-carve').dispatch('pointerup',{pointerId:4});assert(g.Player.vy>0);assert.equal(g.Input.axis(),-1);el('t-left').dispatch('pointerup',{pointerId:3});assert.equal(g.Input.axis(),0);
 el('t-carve').dispatch('pointerdown',{pointerId:5});el('t-carve').dispatch('pointercancel',{pointerId:5});assert(g.Game.paused);
});
test('resize and focus loss pause, discard charge and keep the active run',()=>{
 for(const event of ['resize','blur']){const g=load();settle(g);down();step(g,60);const id=g.Journey.id;dispatchWindow(event);assert(g.Game.paused);assert.equal(g.Player.groundCharge,null);assert.equal(g.Journey.id,id);up();assert.equal(g.Player.vy,0);}
});
test('a real void fall clears held controls in Practice and loses exactly one Challenge life',()=>{
 for(const mode of ['practice','challenge']){const g=load();g.Journey.mode=mode;g.Journey.lives=mode==='challenge'?3:null;down();move(275);g.Player.y=-400;g.Player.onGround=false;step(g);assert.equal(g.Input.oneId,null);assert(!g.Input.carve());assert.equal(g.Journey.lives,mode==='challenge'?2:null);}
});
test('invalid scheme and grip metadata cannot restore a malformed run',()=>{
 const session=new Map();const g=load({session});grip(g);g.RunSave.write();const valid=JSON.parse(session.get(g.RunSave.key));
 for(const patch of [{controls:{scheme:'auto',hand:'right'}},{controls:{scheme:'one',hand:'bad'}},{carve:{...valid.carve,manual:'yes'}}]){session.set(g.RunSave.key,JSON.stringify({...valid,...patch}));assert(!loadGame({session}).Game.running);}
});
test('two-thumb CARVE rejects an extra owner and does not end on that finger release',()=>{
 const g=load();g.Game.configureControls('two');g.Game.togglePause();settle(g);
 el('t-carve').dispatch('pointerdown',{pointerId:1});step(g,10);const charge=g.Player.groundCharge;
 el('t-carve').dispatch('pointerdown',{pointerId:2});el('t-carve').dispatch('pointerup',{pointerId:2});assert(g.Input.touchCarveHeld);assert.equal(g.Player.groundCharge,charge);
 el('t-carve').dispatch('pointerup',{pointerId:1});assert(g.Player.vy>0);assert(!g.Input.touchCarveHeld);
});
test('finished Challenge retains layout even when local preferences cannot be stored',()=>{
 const session=new Map();let g=load({session});g.Game.configureControls('one','left');g.Game.togglePause();g.Journey.mode='challenge';g.Journey.selectedMode='challenge';g.Journey.lives=3;
 globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 g.Journey.finish();g=loadGame({session});assert(!g.Game.running);assert.equal(g.Game.controlLabel(),'one');assert.equal(g.Game.controlHand,'left');el('challenge-retry').onclick();assert(g.Game.running);assert.equal(g.Journey.lives,3);assert.equal(g.Game.controlLabel(),'one');
});
test('one-thumb camera leaves the player above lower controls in portrait and landscape',()=>{
 for(const [width,height] of [[320,568],[390,844],[844,390],[768,1024]]){
  const g=load();g.Game.W=width;g.Game.H=height;g.Game.dpr=1;g.Cam.zoom=1;g.Cam.shake=0;g.Cam.x=g.Player.x+17;g.Cam.y=g.Player.y+23+150;
  let transform;g.Game.ctx.setTransform=(...a)=>transform=a;g.Game.render();const y=(g.Player.y+23)*transform[3]+transform[5];
  const actionTop=height-(height<=480?164:212);assert(y+Math.abs(transform[3])*23<actionTop,`${width}x${height}: player ${y} overlaps actions ${actionTop}`);assert(y>100);
 }
});
for (const releaseAt of [0.45,0.7]) test(`pointer-only one-thumb bot climbs 1,000 metres using ${releaseAt<0.6?'good':'perfect'} releases`,()=>{
 const g=load();g.Journey.mode='challenge';g.Journey.lives=3;let peak=64,releases=0,lastRow=-1,id=100,held=false;const {Player:P,Game:G,Level:L,T}=g;
 for(let i=0;i<120*300&&peak<10064;i++){
  if(!held){down(id,200);held=true;}
  const route=L.blocks.filter(b=>b.spine).sort((a,b)=>a.y-b.y);
  const target=P.carve?route.find(b=>b.y>P.carve.block.y+5):route.find(b=>b.row>lastRow&&b.y+b.h>P.y+20);
  const dx=(target?target.x+75:P.x+17)-(P.x+17);move(200+(Math.abs(dx)>10?Math.sign(dx)*75:0),id);
  const charge=P.groundCharge??P.carve?.charge??P.pole?.charge;
  if(charge>=releaseAt){if(P.carve)lastRow=P.carve.block.row;up(id);held=false;id++;releases++;}
  if(P.onGround&&P.y<100)lastRow=-1;
  if(g.Input.blocked){up(id);held=false;id++;}
  step(g);peak=Math.max(peak,P.y);
 }
 assert(peak>=10064,`climbed ${Math.floor((peak-64)/10)} m after ${releases} releases`);assert(releases>=3);assert(G.running);assert.equal(g.Journey.lives,3);assert(L.blocks.length<85);g.Profile.record();assert.equal(g.Profile.records[0].rules,'manual-touch-v1');assert.deepEqual(g.Profile.records[0].controls,['one']);
 console.log(`  pointer bot: ${Math.floor((peak-64)/10)} m, ${releases} releases, ${G.time.toFixed(1)} s`);
});
console.log(`${passed} one-thumb checks passed`);
