import assert from 'node:assert/strict';
import {loadGame,STEP} from './harness.mjs';
let passed=0;const el=id=>document.getElementById(id);
function test(name,fn){fn();passed++;console.log('PASS flow: '+name);}
function load(options={}){const g=loadGame({search:'?flow=1',...options});g.Game.setTouch(true);g.Game.configureControls('one');g.Journey.chooseMode('challenge');g.Game.start();return g;}
function camp(g,row=5){g.Level.ensure(150+row*230);const b=g.Level.blocks.find(b=>b.row===row&&b.rest);assert(b);Object.assign(g.Player,{x:b.x+50,y:b.y+b.h,vx:0,vy:0,onGround:true,state:'GROUND',carve:null,pole:null});g.Journey.peak=g.Player.y;g.Journey.fallAnchor=g.Player.y;g.Journey.contracts();return b;}
function rift(g,type='pulse',row=0){g.Journey.rift={id:'v:'+row,row,type,phase:'playing',elapsed:0,ready:true,progress:0,sequence:[0,1,2,0]};if(!g.Game.paused)g.Game.togglePause();}

test('render never changes zoom or switches horizontal origin with speed, altitude or lateral thresholds',()=>{
 const g=load();Object.assign(g.Game,{W:390,H:844,dpr:1});Object.assign(g.Cam,{x:405,y:1000,zoom:1,shake:1});let m;g.Game.ctx.setTransform=(...a)=>m=a;
 let first;for(const y of [1490,1529,1531,2910,4290,5660,7049,7051,50000])for(const x of [20,405,864,865,1200]){Object.assign(g.Player,{x,y,vx:x,vy:y});g.Game.render();const current=[m[0],m[4]];if(!first)first=current;assert.deepEqual(current,first);}
});
test('camera dead zone pans continuously, stays near a fast player and is frame-rate independent at rest',()=>{
 const g=load(),C=g.Cam;C.x=405;C.y=1000;let last=C.x;for(let i=0;i<120;i++){const px=405+i*7;C.follow(px,1000,2000,1/60);assert(Math.abs(C.x-last)<8);assert(Math.abs(px-C.x)<240);assert.equal(C.zoom,1);last=C.x;}
 C.x=405;for(let i=0;i<60;i++)C.follow(1000,1000,0,1/60);const a=C.x;C.x=405;for(let i=0;i<120;i++)C.follow(1000,1000,5000,1/120);assert(Math.abs(C.x-a)<1e-9);
});
test('camera position is retained with the paused run through reload',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});g.Cam.x=490.25;g.Cam.y=280.5;g.RunSave.write();g=loadGame({session,local,search:'?flow=1'});assert(g.Game.paused);assert.equal(g.Cam.x,490.25);assert.equal(g.Cam.y,280.5);
});
for(const win of [true,false])test(`rift ${win?'success':'failure'} holds a receipt, pays once and animates only after confirmation`,()=>{
 const session=new Map(),local=new Map();let g=load({session,local});g.Player.y=1200;g.Journey.peak=1200;g.Journey.contracts();rift(g);const before=g.Profile.coins;g.Journey.resolve(win);assert(g.Game.paused);assert.equal(g.Journey.rift.phase,'result');assert(el('rift-dialog').open===true||el('rift-copy').textContent.includes('RIFT'));
 const paid=g.Profile.coins,receipt={...g.Journey.rift.receipt},landing=[g.Player.x,g.Player.y],clock=g.Game.time;assert.equal(paid-before,(win?20:0)+(receipt.bonus||0));assert.equal(receipt.to,Math.floor((g.Player.y-64)/10));assert.match(el('rift-copy').textContent,/No life lost/);assert.equal(g.Journey.lives,3);g.Journey.resolve(win);assert.equal(g.Profile.coins,paid);g.Game.frame(1000);assert.equal(g.Game.time,clock);
 g=loadGame({session,local,search:'?flow=1'});assert(g.Game.paused);assert.equal(g.Journey.rift.phase,'result');assert(el('rift-dialog').open);assert.equal(g.Profile.coins,paid);assert.deepEqual([g.Player.x,g.Player.y],landing);g.Journey.leaveRift();assert(g.Game.returning);assert.equal(g.Journey.rift,null);assert(!el('rift-dialog').open);assert(g.Game.paused);g.Game.tickReturn(.5);assert(g.Game.returning);assert.equal(g.Game.time,clock);g.Game.tickReturn(.5);assert(!g.Game.paused);assert(!g.Game.returning);assert.equal(g.Input.oneId,null);assert.deepEqual([g.Player.x,g.Player.y],landing);assert.equal(g.Profile.coins,paid);
});
test('backgrounding return cancels auto-resume and reload never replays a paid reward',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});rift(g);g.Journey.resolve(true);const coins=g.Profile.coins;g.Journey.leaveRift();g.Game.tickReturn(.3);dispatchWindow('blur');g.Game.tickReturn(.2);assert(g.Game.paused);assert(!g.Game.returning);dispatchWindow('focus');assert(g.Game.paused);g.RunSave.write();g=loadGame({session,local,search:'?flow=1'});assert(g.Game.paused);assert(!g.Journey.rift);assert.equal(g.Profile.coins,coins);
});
test('two-stage timing gate requires different windows and rejects repeat settlement',()=>{
 const g=load();rift(g);g.Journey.rift.elapsed=Math.acos(1-2*.32)/2.2;g.Journey.pulse();assert.equal(g.Journey.rift.progress,1);assert.equal(g.Journey.rift.phase,'playing');assert.equal(g.Journey.pulseTarget(),.68);g.Journey.rift.elapsed=Math.acos(1-2*.68)/2.2;g.Journey.pulse();assert.equal(g.Journey.rift.phase,'result');assert(g.Journey.rift.win);const coins=g.Profile.coins;g.Journey.pulse();assert.equal(g.Profile.coins,coins);
});
test('four-symbol mirror vault explains reversal, ignores early input and restores exact progress',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});rift(g,'memory',21);g.Journey.renderRift();assert.match(el('rift-copy').textContent,/Remember: △  □  ○  △/);g.Journey.chooseGlyph(0);assert.equal(g.Journey.rift.progress,0);g.Journey.rift.elapsed=4;g.Journey.chooseGlyph(0);g.RunSave.write();g=loadGame({session,local,search:'?flow=1'});assert.equal(g.Journey.rift.progress,1);assert(!g.Journey.rift.ready);g.Journey.startTrial();g.Journey.chooseGlyph(1);g.Journey.chooseGlyph(2);g.Journey.chooseGlyph(0);assert.equal(g.Journey.rift.phase,'result');assert(g.Journey.rift.win);
});
test('public build starts with three lives and cannot enable Practice with mode calls or URL flags',()=>{
 for(const search of ['', '?flow=1&practice=1&testing=1','?relics=1&practice=1']){const g=loadGame({production:true,search});assert.equal(g.Journey.selectedMode,'challenge');assert(!g.Journey.chooseMode('practice'));g.Game.start();assert.equal(g.Journey.lives,3);for(let i=0;i<3;i++){g.Player.stun=0;g.Player.hit(true);if(g.Game.returning)g.Game.tickReturn(1);}assert(!g.Game.running);assert.equal(g.Journey.lives,0);assert.equal(g.Journey.result.outcome,'gameover');}
});
test('public build preserves old unlimited saves without restoring or overwriting their storage key',()=>{
 const local=new Map(),session=new Map();let g=loadGame({local,session});g.Game.start();assert.equal(g.Journey.mode,'practice');g.RunSave.write();const key=g.RunSave.key,raw=session.get(key);g=loadGame({local,session,production:true});assert(!g.Game.running);g.Game.start();g.RunSave.write();assert.notEqual(g.RunSave.key,key);assert.equal(session.get(key),raw);assert.equal(g.Journey.lives,3);
});
test('flow course isolates existing profiles, active runs and relic records',()=>{
 const local=new Map(),session=new Map();let old=loadGame({local,session});old.Game.start();old.Profile.credit(70);old.RunSave.write();const profile=local.get(old.Profile.key),run=session.get(old.RunSave.key);const g=load({local,session});assert.equal(g.Level.course,6);assert.equal(g.Profile.coins,0);g.Profile.credit(10);g.RunSave.write();assert.equal(local.get(old.Profile.key),profile);assert.equal(session.get(old.RunSave.key),run);const relic=load({local,session,search:'?flow=1&relics=1'});assert.equal(relic.Level.course,7);assert.equal(relic.Profile.coins,0);
});
test('camps, shortcut families and rescue walls continue beyond the five-section opening within stream bounds',()=>{
 const g=load();for(const row of [5,35,65,95,125]){g.Level.ensure(150+row*230);assert(g.Level.blocks.some(b=>b.rest&&b.row===row));assert(g.Level.blocks.length<85);assert(g.Level.tokens.length<=72);}g.Level.ensure(150+43*230);assert(g.Level.blocks.some(b=>b.shortcut&&b.row===43));g.Level.ensure(150+50*230);assert(g.Level.blocks.some(b=>b.rescue&&b.row===50));
});
test('directional rings require an actual directed crossing and pay bounty plus Flow only once',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});const t=g.Level.tokens.find(t=>t.direction);assert(t);Object.assign(g.Player,{x:t.x-17,y:t.y-23,vx:-t.direction*200,vy:0});g.Journey.peak=g.Player.y;g.Journey.contracts();const before=g.Profile.coins;g.Journey.update(STEP);assert(!g.Journey.collected.has(t.id));g.Player.vx=t.direction*200;g.Journey.update(STEP);assert(g.Journey.collected.has(t.id));assert.equal(g.Profile.coins,before+6);assert.equal(g.Game.flow,12);g.RunSave.write();g=loadGame({session,local,search:'?flow=1'});g.Journey.update(STEP);assert.equal(g.Profile.coins,before+6);assert.equal(g.Game.flow,12);
});
test('precision contracts count distinct eligible PERFECT surfaces, not repeated recovery catches',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});camp(g);g.Profile.credit(20);assert(g.Routes.open());const before=g.Profile.coins;assert(g.Routes.accept('precision'));assert.equal(g.Profile.coins,before-6);assert(!g.Routes.accept('courier'));g.Routes.close();for(const id of ['b:6:3','b:6:3','b:7:2'])g.Journey.onCarve({n:'perfect'},{id,row:6});assert.equal(g.Routes.contract.targets.length,2);g.Journey.onCarve({n:'good'},{id:'b:8:3',row:8});assert.equal(g.Routes.overdrive,0);g.Journey.onCarve({n:'perfect'},{id:'b:8:3',row:8});assert.equal(g.Routes.overdrive,1);assert.equal(g.Routes.contract.state,'paid');const coins=g.Profile.coins;g.RunSave.write();g=loadGame({session,local,search:'?flow=1'});g.Routes.event('precision','b:9:2',9);assert.equal(g.Profile.coins,coins);assert.equal(g.Routes.overdrive,1);
});
test('a failed contract loses only its deposit, expires once and does not change fall life rules',()=>{
 const g=load();camp(g);g.Profile.credit(10);g.Routes.open();const before=g.Profile.coins;g.Routes.accept('courier');g.Routes.close();g.Player.stun=0;g.Player.hit(true);assert.equal(g.Journey.lives,2);assert.equal(g.Routes.contract.state,'failed');assert.equal(g.Profile.coins,before-6);g.Routes.fail('again');assert.equal(g.Profile.coins,before-6);
});
test('camp repairs are paid once, capped at three lives and survive a saved-run reload',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});camp(g);g.Journey.lives=2;g.Profile.credit(30);g.Routes.open();const before=g.Profile.coins;assert(g.Routes.repair());assert.equal(g.Journey.lives,3);assert.equal(g.Profile.coins,before-18);assert(!g.Routes.repair());g=loadGame({session,local,search:'?flow=1'});assert.equal(g.Journey.lives,3);assert.equal(g.Profile.coins,before-18);
});
test('Overdrive bypasses one cooldown only after a valid skill activation',()=>{
 const g=load();g.Profile.credit(50);g.Journey.buy('hook');g.Journey.cooldown=10;g.Routes.overdrive=1;const blocks=g.Level.blocks;g.Level.blocks=[];assert(!g.Journey.useSkill());assert.equal(g.Routes.overdrive,1);g.Level.blocks=blocks;g.Profile.equipped='pulse';assert(g.Journey.useSkill());assert.equal(g.Routes.overdrive,0);assert(!g.Journey.useSkill());
});
test('first skill use is explained with no launch until consent, then retained with a readable journal',()=>{
 const local=new Map(),session=new Map();let g=load({local,session});const y=g.Player.y;el('ability').onclick();assert(el('skill-dialog').open);assert(g.Game.paused);assert.equal(g.Journey.cooldown,0);assert.equal(g.Player.y,y);el('skill-confirm').onclick();assert(!el('skill-dialog').open);assert(g.Journey.cooldown>0);assert(g.Profile.lessons.includes('pulse'));g.RunSave.write();g=loadGame({local,session,search:'?flow=1'});assert(g.Profile.lessons.includes('pulse'));el('journal-open').onclick();assert(el('journal-dialog').open);assert(g.Journal.entries.some(t=>t.includes('ROCKET PULSE')));
});
test('malformed route receipts and travel coordinates cannot resume a run',()=>{
 const session=new Map(),local=new Map();const g=load({session,local});rift(g);g.Journey.resolve(true);const d=g.RunSave.read();for(const bad of [{...d,camera:{x:'NaN',y:0}},{...d,route:{used:[],overdrive:99,contract:null}},{...d,rift:{...d.rift,receipt:{...d.rift.receipt,prize:999}}}]){session.set(g.RunSave.key,JSON.stringify(bad));assert(!loadGame({session,local,search:'?flow=1'}).Game.running);}
});
test('new-course recharge requires fresh rewarded catches or shards, never idle waiting or recovery farming',()=>{
 const g=load();g.Journey.cooldown=14;g.Journey.update(100);assert.equal(g.Journey.cooldown,14);const b=g.Level.blocks.find(b=>b.spine);g.Player.award(g.Player.quality(.7),b);assert.equal(g.Journey.cooldown,11);g.Player.award(g.Player.quality(.7),b);assert.equal(g.Journey.cooldown,11);const t=g.Level.tokens.find(t=>!t.direction);Object.assign(g.Player,{x:t.x-17,y:t.y-23});g.Journey.update(STEP);assert.equal(g.Journey.cooldown,10);
});
test('reading skill information from a keyboard grip then cancelling waits for a fresh grip input',()=>{
 const g=load();g.Game.setTouch(false);const b=g.Level.blocks.find(b=>b.spine);Object.assign(g.Player,{x:b.x-g.Player.w,y:b.y+20,onGround:false});g.Player.startCarve({type:'wallR',block:b});el('ability').onclick();assert(g.Game.paused);el('skill-cancel').onclick();assert(!g.Game.paused);assert(g.Game.awaitingGrip);const time=g.Game.time;g.Game.frame(50);assert.equal(g.Game.time,time);assert(g.Player.carve);
});
test('a stale pre-result flow snapshot cannot claim a second rift payout or upward warp',()=>{
 const session=new Map(),local=new Map();let g=load({session,local});rift(g);g.RunSave.write();const before=session.get(g.RunSave.key);g.Journey.resolve(true);const coins=g.Profile.coins;session.set(g.RunSave.key,before);g=loadGame({session,local,search:'?flow=1'});g.Journey.startTrial();const y=g.Player.y;g.Journey.resolve(true);assert.equal(g.Profile.coins,coins);assert.equal(g.Player.y,y);assert.equal(g.Journey.rift.receipt.prize,0);
});
test('camp planning is readable but cannot accept a contract or repair away from a camp',()=>{
 const g=load();g.Profile.credit(60);g.Journey.lives=2;g.Game.togglePause();g.Routes.preview();const coins=g.Profile.coins;assert(el('camp-repair').disabled);assert(!g.Routes.accept('courier'));assert(!g.Routes.repair());assert.equal(g.Profile.coins,coins);g.Routes.close();assert(g.Game.paused);assert.equal(g.Journey.lives,2);
});
test('courier rewards refresh skills and recovery contracts heal only once within the three-life cap',()=>{
 for(const kind of ['courier','rescue']){const g=load();camp(g,11);g.Profile.credit(30);g.Routes.open();g.Routes.accept(kind);g.Routes.close();g.Journey.lives=2;g.Journey.cooldown=10;for(let i=0;i<g.Routes.kinds[kind].goal;i++)g.Routes.event(kind,'t:12:'+i,12);const coins=g.Profile.coins;assert.equal(g.Routes.contract.state,'paid');if(kind==='courier')assert.equal(g.Journey.cooldown,0);else assert.equal(g.Journey.lives,3);g.Routes.event(kind,'t:13:9',13);assert.equal(g.Profile.coins,coins);assert(g.Journey.lives<=3);}
});
for(const charge of [.45,.7])test(`new course one-thumb scripted route reaches 1,000 m with ${charge<.6?'GOOD':'PERFECT'} releases and no skills`,()=>{
 const g=load();let peak=64,lastRow=-1,id=100,held=false;
 for(let i=0;i<120*180&&peak<10064&&g.Game.running;i++){
  if(!held){el('one-pad').dispatch('pointerdown',{pointerId:id,clientX:200});held=true;}
  const p=g.Player,route=g.Level.blocks.filter(b=>b.spine).sort((a,b)=>a.y-b.y),target=p.carve?route.find(b=>b.y>p.carve.block.y+5):route.find(b=>b.row>lastRow&&b.y+b.h>p.y+20),dx=(target?target.x+75:p.x+17)-(p.x+17);el('one-pad').dispatch('pointermove',{pointerId:id,clientX:200+(Math.abs(dx)>10?Math.sign(dx)*75:0)});
  if((p.groundCharge??p.carve?.charge??p.pole?.charge)>=charge){if(p.carve)lastRow=p.carve.block.row;el('one-pad').dispatch('pointerup',{pointerId:id});held=false;id++;}if(p.onGround&&p.y<100)lastRow=-1;if(g.Input.blocked){el('one-pad').dispatch('pointerup',{pointerId:id});held=false;id++;}g.Game.sim(STEP);peak=Math.max(peak,p.y);
 }
 assert(peak>=10064);assert.equal(g.Journey.lives,3);assert(g.Game.running);assert.equal(g.Journey.cooldown,0);
});
test('an uncompleted contract expires beyond the next camp without repeated debit or reward',()=>{
 const g=load();camp(g);g.Profile.credit(30);g.Routes.open();g.Routes.accept('courier');g.Routes.close();const coins=g.Profile.coins;g.Player.y=150+11*230+221;g.Routes.update();assert.equal(g.Routes.contract.state,'failed');g.Routes.update();assert.equal(g.Profile.coins,coins);assert.equal(g.Journey.lives,3);
});
test('public new-course keys also keep testing-only flow saves untouched',()=>{
 const local=new Map(),session=new Map();let g=loadGame({search:'?flow=1',local,session});g.Journey.chooseMode('practice');g.Game.start();g.RunSave.write();const key=g.RunSave.key,raw=session.get(key);g=loadGame({search:'?flow=1&testing=1',local,session,production:true});assert(!g.Game.running);g.Game.start();g.RunSave.write();assert.notEqual(g.RunSave.key,key);assert.equal(session.get(key),raw);assert.equal(g.Journey.lives,3);
});
test('a secret doorway offers a choice of mini-games before entry and locks that choice during play',()=>{
 const g=load();g.Journey.update(STEP);assert(g.Journey.enterPortal());assert(g.Journey.pickTrial('memory'));assert.equal(g.Journey.rift.type,'memory');assert.equal(el('rift-title').textContent,'THE ECHO VAULT');assert.match(el('rift-copy').textContent,/Remember 4 symbols/);assert.equal(g.Journey.rift.sequence.length,4);assert(g.Journey.pickTrial('pulse'));assert.equal(el('rift-title').textContent,'THE PENDULUM GATE');assert.match(el('rift-copy').textContent,/Seal two different gold windows/);assert(g.Journey.pickTrial('memory'));g.Journey.startTrial();assert(!g.Journey.pickTrial('pulse'));assert.equal(g.Journey.rift.type,'memory');
});
test('every skill has a first-use reading step and cancel never spends its recharge',()=>{
 for(const id of ['pulse','wing','hook']){const g=load();g.Profile.credit(75);g.Journey.buy(id);el('ability').onclick();assert.equal(el('skill-title').textContent,g.Journey.skills[id].name);assert.match(el('skill-copy').textContent,/recharge points/);assert(g.Game.paused);assert.equal(g.Journey.cooldown,0);el('skill-cancel').onclick();assert(!g.Game.paused);assert.equal(g.Journey.cooldown,0);assert(!g.Profile.lessons.includes(id));}
});
test('failed camp storage writes leave bounty, lives, contract and accepted-camp state unchanged',()=>{
 const g=load();camp(g);g.Profile.credit(60);g.Journey.lives=2;g.Routes.open();const coins=g.Profile.coins;localStorage.setItem=()=>{throw new Error('full storage');};assert(!g.Routes.accept('courier'));assert(!g.Routes.repair());assert.equal(g.Profile.coins,coins);assert.equal(g.Journey.lives,2);assert.equal(g.Routes.contract,null);assert.equal(g.Routes.used.length,0);
});
test('a checkpoint-clamped rift setback says no altitude was lost in the result and return notice',()=>{
 const g=load();rift(g);g.Journey.resolve(false);assert.equal(g.Journey.rift.receipt.from,g.Journey.rift.receipt.to);assert.match(el('rift-copy').textContent,/no altitude is lost/);assert.match(g.Game.notice,/checkpoint protected/);assert(!g.Game.notice.includes('lower'));
});
test('the return notice and receipt include the complete rift plus height-contract bounty once',()=>{
 const g=load();g.Player.y=1200;g.Journey.peak=1200;g.Journey.contracts();rift(g);g.Journey.resolve(true);const r=g.Journey.rift.receipt;assert.equal(r.prize,20);assert.equal(r.bonus,20);assert.match(g.Game.notice,/\+40 bounty/);assert.match(el('rift-copy').textContent,/includes 20 from height contracts/);assert.equal(g.Journal.entries.filter(t=>t.startsWith('RIFT CLEARED')).length,1);
});
test('Skyhook in the new course uses a frozen eased anchor transfer without a camera jump',()=>{
 const g=load();g.Profile.credit(50);g.Journey.buy('hook');const before={x:g.Cam.x,y:g.Cam.y};assert(g.Journey.useSkill());assert(g.Game.returning);assert(g.Game.paused);assert.equal(g.Cam.x,before.x);assert.equal(g.Cam.y,before.y);const landing=[g.Player.x,g.Player.y];assert.match(el('return-label').textContent,/SKYHOOK/);g.Game.tickReturn(.3);assert(g.Game.returning);assert.notEqual(g.Cam.y,before.y);g.Game.tickReturn(.3);assert(!g.Game.returning);assert(!g.Game.paused);assert.deepEqual([g.Player.x,g.Player.y],landing);assert.equal(g.Journey.cooldown,18);
});
test('a nearby camp is an explicit optional stop with eased docking and no free reward or skill spend',()=>{
 const g=load();const b=camp(g);Object.assign(g.Player,{x:b.x+b.w+70,y:b.y+190,vx:-380,vy:900,onGround:false,state:'AIR'});g.Journey.cooldown=12;g.Cam.x=500;g.Cam.y=1600;const before=g.Profile.coins;g.Journey.update(STEP);g.Journey.syncHUD();assert.equal(el('portal-enter').textContent,'Stop at camp · E / tap');assert(!g.Game.paused);assert(!el('camp-dialog').open);assert.equal(g.Routes.nearby(),null);assert(g.Journey.openNearby());assert(g.Game.paused);assert(g.Game.returning);assert.equal(g.Cam.x,500);assert.equal(g.Cam.y,1600);assert(!el('camp-dialog').open);g.Game.tickReturn(.3);assert(g.Game.returning);g.Game.tickReturn(.3);assert(g.Game.paused);assert(!g.Game.returning);assert(el('camp-dialog').open);assert.equal(g.Routes.nearby(),5);assert.equal(g.Profile.coins,before);assert.equal(g.Journey.cooldown,12);g.Routes.close();assert(!g.Game.paused);assert(g.Player.onGround);assert.equal(g.Player.vx,0);
});
test('camp docking rejects distant and held-input approaches and focus interruption never auto-opens a camp',()=>{
 const g=load();const b=camp(g);g.Player.x=b.x+1000;assert(!g.Routes.open());g.Player.x=b.x;g.Input.oneHeld=true;assert(!g.Routes.open());g.Input.oneHeld=false;g.Player.onGround=false;g.Player.y=b.y+200;assert(g.Routes.open());dispatchWindow('blur');g.Game.tickReturn(.1);assert(g.Game.paused);assert(!el('camp-dialog').open);dispatchWindow('focus');assert(g.Game.paused);assert.deepEqual(g.Routes.used,[]);
});
test('reloading a camp transfer preserves a safe landing without accepting or charging a contract',()=>{
 const local=new Map(),session=new Map();let g=load({local,session});const b=camp(g),coins=g.Profile.coins;g.Player.y=b.y+190;g.Player.onGround=false;assert(g.Routes.open());g.RunSave.write();g=loadGame({local,session,search:'?flow=1'});assert(g.Game.paused);assert(!g.Game.returning);assert(!el('camp-dialog').open);assert.equal(g.Routes.nearby(),5);assert.deepEqual(g.Routes.used,[]);assert.equal(g.Routes.contract,null);assert.equal(g.Profile.coins,coins);
});
test('a paused player can choose a nearby camp without a reaction-time race',()=>{
 const g=load();const b=camp(g);g.Player.onGround=false;g.Player.y=b.y+200;g.Game.togglePause();assert(!el('camp-pause').classList.contains('hidden'));el('camp-pause').onclick();assert(g.Game.returning);assert(el('paused').classList.contains('hidden'));g.Game.tickReturn(.6);assert(el('camp-dialog').open);assert(g.Game.paused);assert.equal(g.Routes.campRow,5);
});
test('Overdrive keeps the touch skill button usable during recharge and spends only one activation',()=>{
 const g=load();g.Profile.lessons=['pulse'];g.Journey.cooldown=10;g.Journey.syncHUD();assert(el('ability').disabled);g.Routes.overdrive=1;g.Journey.syncHUD();assert(!el('ability').disabled);el('ability').onclick();assert.equal(g.Routes.overdrive,0);assert.equal(g.Journey.cooldown,14);g.Journey.syncHUD();assert(el('ability').disabled);
});
test('a recovery contract reward stays readable over its routine rescue notice and states the real life result',()=>{
 for(const lives of [2,3]){const g=load();camp(g,11);g.Profile.credit(6);g.Routes.open();g.Routes.accept('rescue');g.Routes.close();g.Journey.lives=lives;const before=g.Profile.coins;g.Journey.onRescue({id:'b:12:3',row:12});assert.equal(g.Routes.contract.state,'paid');assert.equal(g.Profile.coins,before+20);assert.equal(g.Journey.lives,3);assert.match(g.Game.notice,/CONTRACT COMPLETE · Recovery specialist · \+20 bounty/);assert.match(g.Game.notice,lives===2?/\+1 life · 3\/3/:/lives already full · 3\/3/);g.Journey.notify('SPRINGBOARD');assert.match(g.Game.notice,/CONTRACT COMPLETE/);assert(g.Journal.entries.some(t=>t.startsWith('RESCUED')));g.Game.noticeTime=0;g.Journey.notify('SPRINGBOARD');assert.equal(g.Game.notice,'SPRINGBOARD');}
});
test('active contract progress remains in the HUD and paused journal while another notice is displayed',()=>{
 const g=load();camp(g);g.Profile.credit(6);g.Routes.open();g.Routes.accept('courier');g.Routes.close();g.Routes.event('courier','t:6:3',6);g.Journey.notify('SPRINGBOARD');g.Journey.syncHUD();assert.match(el('contractline').textContent,/Courier 1\/3/);g.Journal.open();assert.match(el('journal-entries').children[0].textContent,/Contract: Courier · 1\/3 · active/);
});
test('a nonterminal fall eases to its checkpoint, retires input and freezes the climb during recovery',()=>{
 const g=load();g.Player.y=4000;g.Journey.peak=4000;g.Cam.x=1000;g.Cam.y=4170;g.Input.oneHeld=true;const clock=g.Game.time;g.Player.hit(true);assert.equal(g.Journey.lives,2);assert(g.Game.returning);assert(g.Game.paused);assert.equal(g.Cam.x,1000);assert.equal(g.Cam.y,4170);assert.equal(g.Input.oneHeld,false);assert.match(el('return-label').textContent,/CHECKPOINT RECOVERY/);assert.match(el('return-copy').textContent,/2 of 3 lives remain/);g.Game.tickReturn(.4);assert(g.Cam.y<4170);assert.equal(g.Game.time,clock);g.Game.tickReturn(.4);assert(!g.Game.paused);assert.equal(g.Player.vx,0);assert.equal(g.Player.vy,0);assert.equal(g.Journey.peak,4000);
});
test('a completed contract survives a failed payout write and retries once without losing its earned goal',()=>{
 const local=new Map(),session=new Map();let g=load({local,session});camp(g);g.Profile.credit(6);g.Routes.open();g.Routes.accept('courier');g.Routes.close();g.Journey.cooldown=14;const before=g.Profile.coins,setItem=localStorage.setItem;localStorage.setItem=()=>{throw Error('storage blocked');};
 for(let i=0;i<3;i++)g.Routes.event('courier','t:'+(6+i)+':3',6+i);
 assert.equal(g.Profile.coins,before);assert.equal(g.Journey.cooldown,14);assert.equal(g.Routes.contract.state,'active');assert.equal(g.Routes.contract.targets.length,3);assert(!g.Routes.fail('fall'));const pending=session.get(g.RunSave.key);
 localStorage.setItem=setItem;g.Game.time+=1.1;g.Routes.update();assert.equal(g.Routes.contract.state,'paid');assert.equal(g.Profile.coins,before+18);assert.equal(g.Journey.cooldown,0);g.Journey.cooldown=7;g.Routes.update();assert.equal(g.Profile.coins,before+18);assert.equal(g.Journey.cooldown,7);
 session.set(g.RunSave.key,pending);g=loadGame({local,session,search:'?flow=1'});g.Routes.update();assert.equal(g.Routes.contract.state,'paid');assert.equal(g.Profile.coins,before+18);assert.equal(g.Journey.cooldown,14);
});
test('overlapping camp and rift regions keep the optional secret route reachable without accepting a contract',()=>{
 const g=load();camp(g,41);const before=g.Profile.coins;assert(g.Routes.open());assert(!el('camp-rift').classList.contains('hidden'));assert(g.Routes.enterRift());assert(!el('camp-dialog').open);assert(el('rift-dialog').open);assert.equal(g.Journey.rift.id,'v:42');assert.equal(g.Journey.rift.phase,'brief');assert(g.Game.paused);assert.equal(g.Routes.contract,null);assert.equal(g.Profile.coins,before);assert.equal(g.Journey.lives,3);g.Journey.leaveRift();assert(!g.Game.paused);
});
test('the endless HUD names the current trail and the next real camp instead of a completed opening checklist',()=>{
 const g=load();g.Player.y=7514;g.Journey.syncHUD();assert.match(el('contractline').textContent,/TRAIL 2 · LAUNCH GARDEN · camp 833 m ↑/);g.Player.y=8400;g.Journey.syncHUD();assert.match(el('contractline').textContent,/camp 971 m ↑/);
});
test('Flow shows spendable points and the touch Surge button clearly distinguishes cost from readiness',()=>{
 const g=load();g.Game.flow=25.8;g.Game.syncHUD();assert.equal(el('flowtier').textContent,'25 / 100');assert.equal(el('t-surge').textContent,'SURGE · 26 FLOW');assert(el('t-surge').disabled);g.Game.flow=26;g.Game.syncHUD();assert.equal(el('flowtier').textContent,'26 / 100');assert.equal(el('t-surge').textContent,'SURGE · READY');assert(!el('t-surge').disabled);el('t-surge').dispatch('pointerdown');g.Game.sim(STEP);assert(g.Player.vx>700);assert(g.Game.flow<1);g.Game.syncHUD();assert(el('t-surge').disabled);
});
test('the high route has distinct above-ledge shards that advance Courier and recharge once without changing movement',()=>{
 const g=load();camp(g);g.Profile.credit(6);g.Routes.open();g.Routes.accept('courier');g.Routes.close();g.Journey.cooldown=10;const coins=g.Profile.coins;
 for(const row of [6,7,8]){const b=g.Level.blocks.find(b=>b.spine&&b.row===row),t=g.Level.tokens.find(t=>t.highLine&&t.row===row);assert(t);assert.equal(t.value,1);assert.equal(t.y,b.y+b.h+200);assert(t.x>=b.x&&t.x<=b.x+b.w);Object.assign(g.Player,{x:t.x-17,y:t.y-23,vx:320,vy:500});const velocity=[g.Player.vx,g.Player.vy];g.Journey.update(STEP);assert(g.Journey.collected.has(t.id));assert.deepEqual([g.Player.vx,g.Player.vy],velocity);}
 assert.equal(g.Routes.contract.state,'paid');assert.equal(g.Journey.cooldown,0);assert(g.Profile.coins>=coins+21);const before=g.Profile.coins;g.Journey.update(STEP);assert.equal(g.Profile.coins,before);
});
test('a clean one-thumb launch from a Launch Garden camp can collect its first high-route shard during normal flight',()=>{
 const g=load();const b=camp(g,59);g.Player.x=b.x+b.w/2-g.Player.w/2;g.Player.face=1;const pad=el('one-pad');pad.dispatch('pointerdown',{pointerId:41,button:0,clientX:245});for(let i=0;i<48;i++)g.Game.sim(STEP);pad.dispatch('pointerup',{pointerId:41});for(let i=0;i<240&&g.Game.running&&!g.Game.paused;i++)g.Game.sim(STEP);assert(g.Journey.collected.has('t:60:7'));
});
test('a checkpoint catch records its location without erasing a just-earned contract reward',()=>{
 const g=load();g.Journey.notify('CONTRACT COMPLETE · Courier · +18 bounty · skill ready',true);g.Player.saveCheckpoint({kind:'check',x:520,y:9000,w:150,h:160});assert.match(g.Game.notice,/CONTRACT COMPLETE/);assert(g.Journal.entries.some(t=>t.startsWith('CHECKPOINT SAVED')));assert.equal(g.Player.respawn.y,9161);g.Game.noticeTime=0;g.Player.saveCheckpoint({kind:'check',x:140,y:9230,w:150,h:160});assert.match(g.Game.notice,/CHECKPOINT SAVED/);
});
console.log(`${passed} flow checks passed`);
