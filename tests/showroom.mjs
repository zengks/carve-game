import assert from 'node:assert/strict';
import {loadGame,STEP} from './harness.mjs';
const checks=[];function test(name,fn){fn();checks.push(name);console.log('PASS showroom:',name);}
const el=id=>document.getElementById(id);
const demo=options=>loadGame({search:'?showroom=1',...options});
test('preview route is production-disabled and preserves all six free climbers',()=>{
 const g=loadGame({search:'?showroom=1',production:true});assert.equal(g.Showroom.enabled,false);assert.equal(g.Level.course,8);assert.equal(el('showroom-dialog').open,undefined);assert.equal(g.Showroom.start(),false);assert.equal(Object.keys(g.Avatars.catalog).length,6);
 const p=demo();assert.equal(p.Showroom.enabled,true);assert.equal(p.Level.course,10);assert.equal(el('showroom-dialog').open,true);
});
test('demo settings, wallets and records never read or change canonical or prior profiles',()=>{
 const local=new Map([['carve.terrain.profile.v1',JSON.stringify({version:1,name:'Owner',coins:327,avatar:'wisp'})],['carve.flow.profile.v1','{"version":1,"coins":900}'],['carve.terrain.controls.v1','{"scheme":"two","hand":"left","enabled":true}']]);const original=new Map(local),session=new Map([['carve.public-terrain.run.v1','preserve']]);
 const g=demo({local,session,coarse:true});assert.equal(g.Profile.coins,0);assert.equal(g.Profile.name,'Climber');assert.equal(g.Game.controlScheme,'one');g.Showroom.change({look:'solar'});g.Showroom.start();g.Profile.credit(7,'demo');g.Journey.peak=284;g.Journey.finish();
 for(const [key,value]of original)assert.equal(local.get(key),value,key);assert.equal(session.get('carve.public-terrain.run.v1'),'preserve');
 for(const key of local.keys())if(!original.has(key))assert.ok(key.startsWith('carve.showroom.'),key);
 assert.equal(g.Profile.records.length,1);assert.ok(g.Profile.records.every(r=>r.demo&&r.course==='showroom-demo-v1'));
});
test('selection changes are drafts; cancel and resume keep current identity, run and input neutral',()=>{
 const g=demo();g.Showroom.start();const id=g.Journey.id;assert.equal(g.Journey.avatar,'aster');g.Showroom.open();g.Showroom.change({look:'solar',trail:false});assert.equal(g.Showroom.active.look,'storm');assert.equal(g.Game.paused,true);
 el('showroom-try').onclick();assert.equal(el('showroom-restart').open,true);el('showroom-restart-cancel').onclick();assert.equal(g.Journey.id,id);assert.equal(g.Showroom.active.look,'storm');
 el('showroom-resume').onclick();assert.equal(g.Game.paused,false);assert.equal(g.Input.axis(),0);assert.equal(g.Input.carve(),false);g.Showroom.open();el('showroom-try').onclick();el('showroom-restart-confirm').onclick();assert.equal(g.Showroom.active.look,'solar');assert.equal(g.Journey.avatar,'cinder');assert.equal(g.Showroom.active.trail,false);
});
test('active appearance recovers independently of next-run draft; malformed cosmetics retain the run',()=>{
 const local=new Map(),session=new Map();let g=demo({local,session});g.Showroom.change({look:'solar',reduced:true});g.Showroom.start();g.Game.sim(STEP);const id=g.Journey.id;g.Showroom.open();g.Showroom.change({look:'storm'});g.RunSave.write();
 g=demo({local,session});assert.equal(g.Game.paused,true);assert.equal(g.Journey.id,id);assert.equal(g.Showroom.active.look,'solar');assert.equal(g.Showroom.draft.look,'storm');assert.equal(g.Journey.avatar,'cinder');
 const d=JSON.parse(session.get(g.RunSave.key));d.showroom={look:'unrecognized',trail:'evil'};session.set(g.RunSave.key,JSON.stringify(d));g=demo({local,session});assert.equal(g.Journey.id,id);assert.equal(g.Showroom.active.look,'storm');
});
test('blocked selection and run storage preserve playable tab state and cancellation',()=>{
 const g=demo();globalThis.localStorage.setItem=()=>{throw Error('blocked');};globalThis.sessionStorage.setItem=()=>{throw Error('blocked');};
 assert.doesNotThrow(()=>g.Showroom.change({look:'solar'}));assert.match(el('showroom-status').textContent,/this tab only/);g.Showroom.start();assert.equal(g.Journey.avatar,'cinder');assert.equal(g.RunSave.write(),false);g.Showroom.open();el('showroom-dialog').dispatch('cancel');assert.equal(g.Game.paused,true);assert.equal(el('showroom-dialog').open,false);
});
test('banked result is cosmetic-only, skippable and does not replay animation or grant bounty on reload',()=>{
 const local=new Map(),session=new Map();let g=demo({local,session});g.Showroom.start();g.Showroom.clock=1000;g.Journey.finish('banked');assert.equal(g.Showroom.burstAt,1000);assert.equal(g.Journey.result.showroom.look,'storm');const coins=g.Profile.coins;
 g=demo({local,session});assert.equal(g.Showroom.burstAt,null);assert.equal(g.Profile.coins,coins);assert.equal(g.Journey.result.outcome,'banked');assert.equal(g.Showroom.active.look,'storm');el('challenge-menu').onclick();assert.equal(el('challenge-result').open,false);
 g.Showroom.start();g.Journey.lives=0;g.Journey.finish('gameover');assert.equal(g.Showroom.burstAt,null);assert.equal(el('showroom-result-art').classList.contains('hidden'),true);
});
test('one-thumb and two-thumb both preserve controls and appearance through reload',()=>{
 for(const scheme of ['one','two']){const local=new Map(),session=new Map();let g=demo({local,session,coarse:true});g.Game.configureControls(scheme,'left');g.Showroom.change({look:'solar'});g.Showroom.start();g.RunSave.write();g=demo({local,session,coarse:true});assert.equal(g.Game.controlScheme,scheme);assert.equal(g.Game.controlHand,'left');assert.equal(g.Showroom.active.look,'solar');assert.equal(g.Game.paused,true);assert.equal(g.Input.carve(),false);}
});
test('outfits, trails and celebration do not change seeded simulation or rewards',()=>{
 function simulate(selection){const g=demo();g.Showroom.change(selection);g.Showroom.start();g.Journey.seed=100;g.Level.build();g.Player.reset();g.Game.setTouch(true);g.Game.configureControls('one');for(let i=0;i<360;i++){if(i%90===15)el('one-pad').dispatch('pointerdown',{pointerId:1,clientX:200,button:0});if(i%90===35)el('one-pad').dispatch('pointermove',{pointerId:1,clientX:240});if(i%90===60)el('one-pad').dispatch('pointerup',{pointerId:1});g.Game.sim(STEP);g.Game.drawPlayer(g.Game.ctx);}return {x:g.Player.x,y:g.Player.y,vx:g.Player.vx,vy:g.Player.vy,w:g.Player.w,h:g.Player.h,score:g.Game.score,flow:g.Game.flow,coins:g.Profile.coins,lives:g.Journey.lives};}
 const plain=simulate({original:true,trail:false,celebration:false});for(const look of ['storm','solar'])assert.deepEqual(simulate({look,trail:true,celebration:true}),plain);
});
test('original artwork and effects draw without state mutation, use bounded samples, and honor reduced motion',()=>{
 const g=demo({reduced:true});assert.equal(g.Showroom.draft.reduced,true);g.Showroom.change({reduced:false});assert.equal(g.Showroom.draft.reduced,true);
 const before=JSON.stringify([g.Player,g.Journey,g.Profile]);let lines=0;const ctx=new Proxy(g.Game.ctx,{get:(o,k)=>k==='lineTo'?()=>{lines++;}:o[k]});
 for(const look of ['storm','solar'])for(const face of [-1,1])for(const gripping of [true,false])g.Showroom.draw(ctx,{look},face,gripping);
 lines=0;g.Showroom.ribbon(ctx,Array.from({length:1000},(_,i)=>({x:i,y:i})),false);assert.equal(lines,30);g.Showroom.stars(ctx,600,600,100,true);assert.equal(JSON.stringify([g.Player,g.Journey,g.Profile]),before);
});
console.log(`${checks.length} showroom checks passed`);
