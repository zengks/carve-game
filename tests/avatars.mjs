import assert from 'node:assert/strict';
import {loadGame,STEP} from './harness.mjs';
let passed=0;const el=id=>document.getElementById(id);
function test(name,fn){fn();passed++;console.log('PASS avatars: '+name);}
const load=options=>loadGame({search:'?terrain=1',...options});
function choose(g,id){assert(g.Avatars.open());assert(g.Avatars.choose(id));assert(g.Avatars.confirm());}
const ids=['aster','sprig','cinder','prism','orbit','wisp'];
test('six free cosmetic identities can each be selected before starting and stored without changing physics',()=>{
 for(const id of ids){const local=new Map(),g=load({local}),before=JSON.stringify(g.T);choose(g,id);assert.equal(el('avatar-current-name').textContent,g.Avatars.catalog[id].name);g.Game.start();assert.equal(g.Journey.avatar,id);assert.equal(g.Player.w,34);assert.equal(g.Player.h,46);assert.equal(JSON.stringify(g.T),before);assert.equal(JSON.parse(local.get(g.Profile.key)).avatar,id);assert.equal(g.Profile.coins,0);assert.equal(g.Journey.lives,3);}
});
test('previewing and cancelling never changes a saved preference, name, wallet or mode',()=>{
 const g=load(),key=g.Profile.key;g.Profile.credit(45);choose(g,'sprig');const raw=localStorage.getItem(key);assert(g.Avatars.open());g.Avatars.choose('cinder');el('avatar-cancel').onclick();assert.equal(localStorage.getItem(key),raw);assert.equal(g.Profile.avatar,'sprig');assert.equal(el('avatar-current-name').textContent,'Sprig');assert(!el('avatar-dialog').open);assert.equal(g.Journey.selectedMode,'challenge');
});
test('missing or unknown legacy profile appearance falls back safely while preserving earned data',()=>{
 for(const value of [undefined,'future-skin','__proto__',null,{},1]){const local=new Map(),g=load({local});g.Profile.credit(60);const d=JSON.parse(local.get(g.Profile.key));d.avatar=value;local.set(g.Profile.key,JSON.stringify(d));const next=load({local});assert.equal(next.Profile.avatar,'aster');assert.equal(next.Profile.coins,60);assert.equal(next.Avatars.get(value).name,'Aster');}
});
test('invalid choices, stale profile scope and changes during a run cannot commit',()=>{
 const g=load();assert(!g.Avatars.choose('orbit'));assert(g.Avatars.open());assert(!g.Avatars.choose('__proto__'));g.Avatars.pending='invalid';assert(!g.Avatars.confirm());g.Avatars.pending='orbit';g.Profile.key='carve.other-profile';assert(!g.Avatars.confirm());g.Avatars.close();g.Game.start();assert(!g.Avatars.open());assert(!g.Avatars.choose('sprig'));assert(!g.Avatars.confirm());assert.equal(g.Journey.avatar,'aster');
});
test('new profile selection retains a concurrently updated wallet and the unsaved name field',()=>{
 const local=new Map(),g=load({local});g.Profile.credit(15);el('climber-name').value='Cliff Runner';g.Avatars.open();g.Avatars.choose('orbit');const d=JSON.parse(local.get(g.Profile.key));d.coins=99;local.set(g.Profile.key,JSON.stringify(d));g.Avatars.confirm();assert.equal(g.Profile.coins,99);assert.equal(el('climber-name').value,'Cliff Runner');g.Game.start();assert.equal(g.Journey.name,'Cliff Runner');assert.equal(g.Journey.avatar,'orbit');
});
test('active-run avatar stays bound through profile edits, pause, a fall and reload',()=>{
 const local=new Map(),session=new Map();let g=load({local,session});choose(g,'cinder');g.Game.start();g.Game.sim(STEP);g.Game.togglePause();g.Profile.avatar='prism';g.Profile.save();g.RunSave.write();g=load({local,session});assert(g.Game.paused);assert.equal(g.Journey.avatar,'cinder');assert.equal(g.Profile.avatar,'prism');g.Game.togglePause();g.Player.hit(true);if(g.Game.returning)g.Game.tickReturn(1);assert.equal(g.Journey.avatar,'cinder');assert.equal(g.Journey.lives,2);g.RunSave.write();g=load({local,session});assert.equal(g.Journey.avatar,'cinder');assert.equal(g.Profile.avatar,'prism');
});
test('legacy or future unknown run cosmetics do not invalidate an otherwise valid saved climb',()=>{
 for(const id of [undefined,'future-avatar',null]){const session=new Map(),local=new Map();let g=load({session,local});choose(g,'orbit');g.Game.start();g.Game.time=8;g.RunSave.write();const d=JSON.parse(session.get(g.RunSave.key));d.avatar=id;session.set(g.RunSave.key,JSON.stringify(d));g=load({session,local});assert(g.Game.running&&g.Game.paused);assert.equal(g.Journey.avatar,'aster');assert.equal(g.Game.time,8);assert.equal(g.Profile.avatar,'orbit');}
});
test('finished records and recovered results retain cosmetic identity without changing score provenance',()=>{
 const local=new Map(),session=new Map();let g=load({local,session});choose(g,'wisp');g.Game.start();g.Journey.peak=300;g.Journey.finish('banked');assert.equal(g.Journey.result.avatar,'wisp');assert.equal(g.Profile.records[0].avatar,'wisp');assert.equal(g.Profile.records[0].course,'terrain-v1');assert.equal(g.Profile.records[0].rules,'terrain-v1');g=load({local,session});assert.equal(g.Journey.avatar,'wisp');assert.equal(g.Journey.result.avatar,'wisp');assert(!g.Game.running);
});
test('a blocked profile write still permits the chosen avatar for the current session and reports that limit',()=>{
 const g=load();g.Profile.credit(19);globalThis.localStorage.setItem=()=>{throw Error('blocked');};choose(g,'prism');assert.match(el('avatar-save-status').textContent,/session.*storage is unavailable/);g.Game.start();assert.equal(g.Journey.avatar,'prism');assert.equal(g.Profile.coins,19);assert.equal(g.Player.w,34);
});
test('picker keyboard navigation, cancel and confirm keep radio selection and neutral input consistent',()=>{
 const g=load();g.Input.keys.arrowright=true;g.Input.oneHeld=true;g.Input.oneAxis=1;assert(g.Avatars.open());assert(!g.Input.oneHeld);assert.equal(g.Input.axis(),0);el('avatar-aster').dispatch('keydown',{key:'ArrowRight'});assert.equal(g.Avatars.pending,'sprig');assert.equal(el('avatar-sprig')['aria-checked'],'true');assert.equal(el('avatar-aster').tabIndex,-1);el('avatar-sprig').dispatch('keydown',{key:'End'});assert.equal(g.Avatars.pending,'wisp');el('avatar-wisp').dispatch('keydown',{key:'Home'});assert.equal(g.Avatars.pending,'aster');g.Avatars.confirm();g.Game.start();assert(!g.Input.manualHeld());assert.equal(g.Input.axis(),0);
});
test('avatar selection cannot silently turn a pending legacy-wallet import into a new empty profile',()=>{
 const local=new Map(),old=loadGame({local});old.Game.start();old.Profile.credit(70);const raw=local.get(old.Profile.key);const g=loadGame({production:true,local});el('previous-close').onclick();assert(!g.Avatars.open());assert(!local.has(g.Profile.key));assert(el('previous-dialog').open);el('previous-import').onclick();assert.equal(g.Profile.coins,70);choose(g,'cinder');assert.equal(g.Profile.coins,70);assert.equal(local.get(old.Profile.key),raw);
});
test('starting uses the visible selected portrait even if another tab changes the stored cosmetic preference',()=>{
 const local=new Map(),g=load({local});choose(g,'sprig');const d=JSON.parse(local.get(g.Profile.key));d.avatar='orbit';local.set(g.Profile.key,JSON.stringify(d));assert.equal(el('avatar-current-name').textContent,'Sprig');g.Game.start();assert.equal(g.Journey.avatar,'sprig');
});
test('all portraits, facing directions and charge poses draw without mutating simulation state',()=>{
 const g=load();g.Game.start();const before=JSON.stringify({player:g.Player,T:g.T,camera:g.Cam,score:g.Game.score});for(const id of ids)for(const face of [-1,1])for(const held of [true,false])g.Avatars.draw(g.Game.ctx,id,face,held);assert.equal(JSON.stringify({player:g.Player,T:g.T,camera:g.Cam,score:g.Game.score}),before);
});
console.log(`${passed} avatar checks passed`);
