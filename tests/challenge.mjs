import assert from 'node:assert/strict';
import {loadGame,STEP} from './harness.mjs';
const path=new URL('../src/expedition.html',import.meta.url);
const load=options=>loadGame({path,...options});
function returnAfterReceipt(g){if(g.Journey.rift?.phase==='result'){g.Journey.leaveRift();if(g.Game.returning)g.Game.tickReturn(2);}}
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS challenge: '+name);}
function start(g,mode='challenge'){assert(g.Journey.chooseMode(mode));g.Game.start();}
function hit(g,fall=true){g.Player.stun=0;g.Player.hit(fall);}

test('Practice stays the default and supports unlimited falls with the original penalties',()=>{
 const g=load();g.Game.start();assert.equal(g.Journey.mode,'practice');assert.equal(g.Journey.lives,null);
 g.Game.flow=80;g.Game.combo=4;g.Journey.peak=2064;g.Profile.credit(20);
 for(let i=0;i<7;i++)hit(g);
 assert(g.Game.running);assert.equal(g.Journey.lives,null);assert.equal(g.Game.combo,0);assert.equal(g.Game.flow,0);
 assert.equal(g.Journey.peak,2064);assert.equal(g.Profile.coins,20);assert(!g.Journey.result);
});
test('a real Practice fall explains checkpoint recovery while preserving the run, score and unlimited lives',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});start(g,'practice');const cp=g.Level.blocks.find(b=>b.kind==='check'&&b.spine);g.Player.saveCheckpoint(cp);
 const id=g.Journey.id,respawn={...g.Player.respawn};g.Journey.peak=respawn.y;g.Journey.contracts();g.Game.score=91;g.Profile.credit(17);const coins=g.Profile.coins;g.Player.y=-400;g.Player.onGround=false;g.Game.sim(STEP);
 assert.match(g.Game.notice,/^FALL · returned to checkpoint · Practice: unlimited lives$/);assert.equal(g.Journey.id,id);assert.equal(g.Journey.lives,null);assert(g.Game.running);assert.equal(g.Game.score,91);assert.equal(g.Profile.coins,coins);assert.equal(g.Player.x,respawn.x);assert.equal(g.Player.y,respawn.y);
 g.RunSave.write();g=load({session,local});assert(g.Game.paused);assert.equal(g.Journey.id,id);assert.match(g.Game.notice,/returned to checkpoint/);assert.equal(g.Journey.lives,null);
});
test('a real Practice spike collision names the hazard without ending or reclassifying the run',()=>{
 const g=load();start(g,'practice');g.Level.ensure(3500);const spike=g.Level.blocks.find(b=>b.hazard);assert(spike);
 Object.assign(g.Player,{x:spike.x+10,y:spike.y+10,vx:0,vy:0,onGround:false});g.Game.sim(STEP);
 assert.match(g.Game.notice,/^SPIKES · returned to checkpoint · Practice: unlimited lives$/);assert(g.Game.running);assert.equal(g.Journey.mode,'practice');assert.equal(g.Journey.lives,null);assert(!g.Journey.result);
});

test('a simulated void fall costs one life and restores the checkpoint, with no duplicate damage',()=>{
 const g=load();start(g);const cp=g.Level.blocks.find(b=>b.kind==='check'&&b.spine);g.Player.saveCheckpoint(cp);
 const respawn={...g.Player.respawn};g.Game.flow=80;g.Game.combo=5;g.Player.y=-400;g.Player.onGround=false;g.Game.sim(STEP);
 assert.equal(g.Journey.lives,2);assert(g.Game.running);assert.equal(g.Player.x,respawn.x);assert.equal(g.Player.y,respawn.y);
 assert.equal(g.Game.combo,0);assert(g.Game.flow<51);assert(g.Game.notice.includes('2 lives left'));
 g.Player.hit(true);g.Player.hit(false);assert.equal(g.Journey.lives,2);
 assert.equal(g.RunSave.read().lives,2);
});

test('a real spike collision costs exactly one life even when both collision axes overlap',()=>{
 const g=load();start(g);g.Level.ensure(3500);const spike=g.Level.blocks.find(b=>b.hazard);assert(spike);
 g.Player.x=spike.x+10;g.Player.y=spike.y+10;g.Player.vx=0;g.Player.vy=0;g.Player.onGround=false;g.Game.sim(STEP);
 assert.equal(g.Journey.lives,2);assert(g.Game.running);assert(g.Game.notice.includes('SPIKES'));
});

test('third loss ends the run once, saves a Challenge record and stops all catch-up simulation',()=>{
 const g=load();start(g);g.Journey.peak=2064;g.Game.score=123;g.Profile.credit(30);g.Game.acc=1;
 hit(g);hit(g,false);hit(g);
 assert.equal(g.Journey.lives,0);assert(!g.Game.running);assert.equal(g.Game.acc,0);assert.equal(g.Journey.result.outcome,'gameover');
 assert.equal(g.Journey.result.height,200);assert.equal(g.Journey.result.score,123);assert(document.getElementById('challenge-result').open);
 assert.equal(g.Profile.challengeBest,200);assert.equal(g.Profile.best,0);assert.equal(g.Profile.records.length,1);assert.equal(g.Profile.records[0].outcome,'gameover');
 const time=g.Game.time,coins=g.Profile.coins;g.Game.frame(1000);g.Player.hit();g.Journey.finish('gameover');
 assert.equal(g.Game.time,time);assert.equal(g.Game.score,123);assert.equal(g.Profile.coins,coins);assert.equal(g.Profile.records.length,1);
 assert.equal(g.RunSave.read(),null);assert.equal(g.RunSave.readResult().lives,0);
});

test('pause, grip slips, rift misses, checkpoints and skills neither charge nor refill lives',()=>{
 const g=load();start(g);hit(g);g.Player.stun=0;
 const cp=g.Level.blocks.find(b=>b.kind==='check'&&b.spine);g.Player.saveCheckpoint(cp);assert.equal(g.Journey.lives,2);
 assert(g.Journey.useSkill());assert.equal(g.Journey.lives,2);
 const b=g.Level.blocks.find(b=>b.spine);g.Player.y=b.y+20;g.Player.startCarve({type:'wallR',block:b});g.Player.releaseCarve(true);assert.equal(g.Journey.lives,2);
 g.Game.togglePause();g.Player.stun=0;g.Player.hit();assert.equal(g.Journey.lives,2);
 g.Journey.rift={id:'v:7',row:7,type:'pulse',phase:'playing',elapsed:0,ready:true,progress:0,sequence:[0,1,2]};g.Journey.resolve(false);returnAfterReceipt(g);
 assert.equal(g.Journey.lives,2);assert(!g.Game.paused);dispatchWindow('blur');assert(g.Game.paused);assert.equal(g.Journey.lives,2);
});

test('remaining lives and mode survive repeated reloads, and mode cannot change during a run',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});start(g);hit(g);
 g=load({session,local});assert(g.Game.running&&g.Game.paused);assert.equal(g.Journey.mode,'challenge');assert.equal(g.Journey.lives,2);
 assert.equal(g.Journey.selectedMode,'challenge');assert(!g.Journey.chooseMode('practice'));
 assert.equal(document.getElementById('run-mode-status')['aria-label'],'Challenge: 2 of 3 lives remaining');
 g.Game.togglePause();hit(g);g=load({session,local});assert.equal(g.Journey.lives,1);assert(g.Game.paused);
});

test('Game Over survives reload without resurrection or duplicate records; retry starts a new 3-life run',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});start(g);g.Game.setTouch(true);g.Journey.peak=1064;const id=g.Journey.id;
 hit(g);hit(g);hit(g);g.RunSave.write();g=load({session,local});
 assert(!g.Game.running);assert.equal(g.Journey.lives,0);assert.equal(g.Journey.result.outcome,'gameover');assert(document.getElementById('challenge-result').open);assert(document.body.classList.contains('istouch'));
 assert.equal(g.Profile.records.length,1);g.RunSave.write();g=load({session,local});assert(!g.Game.running);assert.equal(g.Profile.records.length,1);
 document.getElementById('challenge-retry').onclick();assert(g.Game.running);assert.equal(g.Journey.mode,'challenge');assert.equal(g.Journey.lives,3);
 assert.notEqual(g.Journey.id,id);assert.equal(g.Game.score,0);assert.equal(g.Journey.peak,64);assert(!g.Journey.result);assert(!document.getElementById('challenge-result').open);
 assert.equal(g.RunSave.read().lives,3);assert(document.body.classList.contains('istouch'));
});

test('banking a living Challenge ends it with a distinct summary; returning to Practice keeps unlocks',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});start(g);g.Profile.credit(25);assert(g.Journey.buy('wing'));g.Journey.peak=2064;hit(g);
 g.Journey.finish();assert(!g.Game.running);assert.equal(g.Journey.result.outcome,'banked');assert.equal(g.Journey.result.lives,2);
 assert.equal(document.getElementById('challenge-result-title').textContent,'CHALLENGE BANKED');
 g=load({session,local});assert.equal(g.Journey.result.outcome,'banked');document.getElementById('challenge-menu').onclick();assert(!g.Journey.result);assert.equal(g.RunSave.readResult(),null);
 start(g,'practice');assert.equal(g.Journey.lives,null);assert(g.Profile.unlocked.includes('wing'));assert.equal(g.Profile.equipped,'wing');
 hit(g);assert(g.Game.running);assert.equal(g.Profile.challengeBest,200);
});

test('legacy runs and records remain Practice rather than silently becoming a Challenge',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});start(g,'practice');g.RunSave.write();
 const snapshot=JSON.parse(session.get(g.RunSave.key));delete snapshot.mode;delete snapshot.lives;session.set(g.RunSave.key,JSON.stringify(snapshot));
 local.set(g.Profile.key,JSON.stringify({version:1,name:'Old climber',coins:7,best:300,unlocked:['pulse'],equipped:'pulse',records:[{id:'old',name:'Old climber',height:300,score:100,time:20,portals:1}]}));
 g=load({session,local});assert(g.Game.running&&g.Game.paused);assert.equal(g.Journey.mode,'practice');assert.equal(g.Journey.lives,null);
 assert.equal(g.Profile.best,300);assert.equal(g.Profile.challengeBest,0);assert.equal(g.Profile.records[0].mode,'practice');
});

test('invalid mode/life combinations cannot reset a damaged Challenge into a healthy saved run',()=>{
 const session=new Map();let g=load({session});start(g);g.RunSave.write();const snapshot=JSON.parse(session.get(g.RunSave.key));
 for(const [mode,lives] of [['challenge',0],['challenge',4],['challenge',1.5],['challenge',null],['unknown',3],['practice',3],['challenge',undefined]]){
  session.set(g.RunSave.key,JSON.stringify({...snapshot,mode,lives}));g=load({session});assert(!g.Game.running,`${mode}/${lives} must be rejected`);assert(!g.Journey.result);
 }
 session.set(g.RunSave.key,JSON.stringify({version:1,finished:{id:'bad',name:'Bad',mode:'challenge',outcome:'gameover',lives:3,height:1,score:0,time:1,portals:0}}));
 g=load({session});assert(!g.Journey.result);assert(!g.Game.running);
});

test('Practice and Challenge keep separate bests and top tens while sharing bounty',()=>{
 const local=new Map();let g=load({local});start(g,'practice');g.Journey.peak=10064;g.Profile.credit(50);g.Journey.finish();start(g);
 g.Journey.peak=2064;g.Journey.finish();g.Journey.dismissResult();assert.equal(g.Profile.best,1000);assert.equal(g.Profile.challengeBest,200);assert.equal(g.Profile.coins,50);
 g.Profile.records=[];for(const mode of ['practice','challenge'])for(let i=0;i<12;i++)g.Profile.records.push({id:mode+i,mode,name:mode,height:i+1,score:0,time:1,portals:0});g.Profile.save();
 g=load({local});assert.equal(g.Profile.records.filter(r=>r.mode==='practice').length,10);assert.equal(g.Profile.records.filter(r=>r.mode==='challenge').length,10);
 assert(g.Journey.chooseMode('challenge'));g.Journey.openRecords();assert.equal(document.getElementById('records-title').textContent,'Challenge expeditions');
 assert(document.getElementById('record-rows').children.every(el=>el.textContent.includes('challenge')));
});

test('a full session-storage quota cannot leave an old living run behind after Game Over',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});start(g);hit(g);hit(g);assert.equal(g.RunSave.read().lives,1);
 globalThis.sessionStorage={getItem:key=>session.get(key),removeItem:key=>session.delete(key),setItem(){throw Error('quota');}};
 hit(g);assert(!g.Game.running);assert(!session.has(g.RunSave.key));g=load({session,local});assert(!g.Game.running);
});
test('input-only Challenge climb crosses 1,990 m without consuming or refilling lives',()=>{
 const g=load();start(g);const {Game:G,Player:P,Input:I,Level:L,T}=g;let peak=64;
 for(let i=0;i<120*180&&G.running&&peak<20000;i++){
  const route=L.blocks.filter(b=>b.spine).sort((a,b)=>a.y-b.y);
  const target=P.carve?route.find(b=>b.y>P.carve.block.y+5):route.find(b=>b.y+b.h>P.y+20);
  const x=target?target.x+75:P.x+17,axis=x>P.x+27?1:x<P.x+7?-1:0;
  I.keys=axis>0?{arrowright:true}:axis<0?{arrowleft:true}:{};
  I._tCarve=!I.blocked && !(P.carve?.charge>=T.ZONE_PERFECT_LO||P.pole?.charge>=T.ZONE_PERFECT_LO);
  if(P.onGround)I.jumpBuf=T.JUMP_BUFFER;G.sim(STEP);peak=Math.max(peak,P.y);
 }
 assert(peak>=20000);assert(G.running);assert.equal(g.Journey.lives,3);assert(L.blocks.length<85);
});
console.log(`${passed} challenge checks passed`);
