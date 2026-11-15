import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadGame,newRun} from './harness.mjs';
import {createBoss,restoreBoss,stepBoss} from '../shared/bellkeeper-rules.mjs';
import {resumeRun} from '../shared/lantern-rules.mjs';
const course=JSON.parse(await readFile(new URL('../shared/common-bellkeeper-v1.json',import.meta.url)));
const fixture=JSON.parse(await readFile(new URL('../shared/fixtures/bellkeeper-parity-v1.json',import.meta.url)));
const terminal=createBoss(course);resumeRun(terminal);
for(const command of fixture.commands)for(let i=0;i<command.repeat;i++)stepBoss(terminal,command.input,course);
assert.equal(terminal.status,'won');
const lost={...createBoss(course),status:'lost',lives:0,falls:3};assert(restoreBoss(lost,course));
const load=options=>loadGame({search:'?terrain=1&relics=1',...options});
const get=id=>document.getElementById(id);
function setup(options={}){
 const g=load(options);g.Journey.selectedMode='challenge';newRun(g);
 g.Level.ensure(3300);
 const b=g.Level.blocks.find(b=>b.y+b.h>=3064&&b.feature!=='spring'&&!b.mechanic&&!b.hazard);
 assert(b);Object.assign(g.Player,{x:b.x,y:b.y+b.h,vx:0,vy:0,onGround:true,state:'GROUND',carve:null,pole:null});
 g.Journey.peak=g.Player.y;g.Journey.cooldown=17;g.Game.flow=42;g.Routes.contract={kind:'courier',state:'active',start:11,targets:['shard:11']};g.Routes.used=[11];g.Routes.overdrive=1;
 return g;
}
function connect(g){const child={};get('boss-frame').contentWindow=child;return g.BossEncounter.connect(child);}
function accepted(g){assert(g.BossEncounter.open());assert(g.BossEncounter.accept());return connect(g);}
let g=setup();
assert(g.BossEncounter.available());g.Player.y=3063;assert(!g.BossEncounter.available(),'current height, not peak');
g=setup();g.Player.onGround=false;assert(!g.BossEncounter.available());
g=setup();g.Player.vx=31;assert(!g.BossEncounter.available());
for(const feature of ['spring','ferry','crumble']){
 g=setup();const b=g.Level.blocks.find(b=>Math.abs(g.Player.y-b.y-b.h)<3&&g.Player.x===b.x);if(feature==='spring')b.feature=feature;else b.mechanic=feature;
 assert(!g.BossEncounter.available(),feature+' is not a safe frozen entry');
}
g=setup();assert(g.BossEncounter.open());g.BossEncounter.decline();assert.equal(g.BossEncounter.state,null);assert(g.BossEncounter.open(),'dismiss does not consume');
const set=sessionStorage.setItem;sessionStorage.setItem=()=>{throw Error('blocked');};assert(!g.BossEncounter.accept());assert.equal(g.BossEncounter.state,null);sessionStorage.setItem=set;
const contract=JSON.parse(await readFile(new URL('../shared/fixtures/expedition-bellkeeper-v1.json',import.meta.url)));
assert.equal(contract.milestone_m,300);assert.equal(contract.encounter_rules,course.rules_version);
const cases=contract.cases.filter(c=>c.consumes_attempt).map(c=>[c.outcome,c.lives_before,c.lives_after,c.bounty_delta]);
for(const [outcome,before,after,reward] of cases){
 const local=new Map(),session=new Map();g=setup({local,session});
 if(before===null){g.Journey.mode='practice';g.Journey.selectedMode='practice';}g.Journey.lives=before;
 const position={x:g.Player.x,y:g.Player.y},bridge=accepted(g),coins=g.Profile.coins;
 assert.equal(g.BossEncounter.connect({}),null,'only the mounted child can connect');
 assert(!bridge.finish('won'),'cannot claim before winning');
 assert(bridge.save(outcome==='won'?terminal:outcome==='lost'?lost:createBoss(course),{scheme:'one',hand:'left'}));
 g.Game.togglePause();assert(g.Game.paused,'parent cannot resume behind the arena');
 assert(g.RunSave.read(),'active encounter is recoverable');
 const reloaded=load({local,session});g=reloaded;
 assert(g.BossEncounter.active());assert(g.Game.paused);assert.equal(g.Journey.lives,before);
 const resumed=connect(g);assert(resumed);assert.equal(resumed.scheme,'one');assert.equal(resumed.hand,'left');assert.equal(resumed.run.status,outcome==='won'?'won':outcome==='lost'?'lost':'ready');
 assert(resumed.finish(outcome));assert.equal(g.Journey.lives,after);assert.equal(g.Profile.coins,coins+reward);
 assert(!resumed.finish(outcome),'duplicate return rejected');assert(!bridge.finish(outcome),'detached callback rejected');
 assert.equal(g.Routes.contract.state,'active');assert.deepEqual(g.Routes.contract.targets,['shard:11']);assert.equal(g.Routes.overdrive,1);assert.equal(g.Journey.cooldown,17);assert.equal(g.Game.flow,42);assert.equal(g.Player.x,position.x);assert.equal(g.Player.y,position.y);
 if(after===0){assert.equal(g.Journey.result.outcome,'gameover');assert.equal(g.RunSave.readResult().lives,0);}
 else{
  assert(g.Game.returning);if(after!==null)assert.equal(get('run-mode-status')['aria-label'],`Challenge: ${after} of 3 lives remaining`);g.Game.tickReturn(2);assert(!g.Game.paused);assert(!g.BossEncounter.available());
  // Settled runs must remain loadable after leaving the entry ledge.
  g.Player.onGround=false;g.Player.state='AIR';g.RunSave.write();assert(g.RunSave.read());
 }
}
// Wallet succeeds but the parent save fails: retry and reload cannot pay twice.
const local=new Map(),session=new Map();g=setup({local,session});let bridge=accepted(g);bridge.save(terminal);
const coins=g.Profile.coins,write=sessionStorage.setItem;
sessionStorage.setItem=()=>{throw Error('quota');};assert(!bridge.finish('won'));assert.equal(g.Profile.coins,coins+30);assert(g.BossEncounter.active());sessionStorage.setItem=write;
g=load({local,session});bridge=connect(g);assert(bridge.finish('won'));assert.equal(g.Profile.coins,coins+30);
// A blocked wallet never consumes the win.
g=setup();bridge=accepted(g);bridge.save(terminal);const walletWrite=localStorage.setItem;localStorage.setItem=()=>{throw Error('quota');};assert(!bridge.finish('won'));assert(g.BossEncounter.active());localStorage.setItem=walletWrite;assert(bridge.finish('won'));
// A failed life commit rolls back; last-life terminal envelope is recoverable.
g=setup();g.Journey.lives=1;bridge=accepted(g);bridge.save(lost);const save=sessionStorage.setItem;sessionStorage.setItem=()=>{throw Error('quota');};assert(!bridge.finish('lost'));assert.equal(g.Journey.lives,1);sessionStorage.setItem=save;
g.BossEncounter.state.phase='settled';g.BossEncounter.state.outcome='lost';g.Journey.lives=0;assert(g.RunSave.write());assert(g.RunSave.read());
g=setup({production:true});bridge=accepted(g);bridge.save(terminal);assert(bridge.finish('won'));assert.equal(g.Journey.mode,'challenge');
// Older saves have no encounter metadata and remain supported.
g=setup();g.RunSave.write();let data=JSON.parse(sessionStorage.getItem(g.RunSave.key));delete data.boss;sessionStorage.setItem(g.RunSave.key,JSON.stringify(data));assert(g.RunSave.read());
data.boss={version:1,milestone:301,phase:'playing',outcome:null,run:null};sessionStorage.setItem(g.RunSave.key,JSON.stringify(data));assert.equal(g.RunSave.read(),null);
console.log('PASS Expedition boss: safe milestone entry, dismiss, reload, frozen parent, win/loss/withdraw, final life, duplicate receipts, storage-failure retry and legacy saves.');
