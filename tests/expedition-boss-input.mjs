import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {installDomStubs} from './harness.mjs';
import {createBoss} from '../shared/bellkeeper-rules.mjs';
const course=JSON.parse(await readFile(new URL('../shared/common-bellkeeper-v1.json',import.meta.url)));
const fixture=JSON.parse(await readFile(new URL('../shared/fixtures/bellkeeper-parity-v1.json',import.meta.url)));
const code=(await readFile(new URL('../src/lantern/game.mjs',import.meta.url),'utf8'))
 .replace("'./coaching.mjs'",JSON.stringify(new URL('../shared/lantern-coaching.mjs',import.meta.url).href))
 .replace("'./bellkeeper.mjs'",JSON.stringify(new URL('../shared/bellkeeper-rules.mjs',import.meta.url).href))
 .replace("'./rules.mjs'",JSON.stringify(new URL('../shared/lantern-rules.mjs',import.meta.url).href));
const local=new Map([['carve.common.lantern-reach.v1','legacy climb'],['carve.common.bellkeeper.v2','legacy boss']]);
const get=id=>document.getElementById(id);let snapshot=null,returns=[],canSave=true,canFinish=true,frame,sequence=0;
async function load({connected=true,run=snapshot}={}){
 installDomStubs({local});location.pathname='/encounters/bellkeeper/';
 globalThis.parent=connected?{CARVEBellkeeper:()=>({run,scheme:'one',hand:'left',mode:'challenge',lives:2,height:312,
  save:r=>{if(!canSave)return false;snapshot=structuredClone(r);return true;},finish:r=>{if(!canFinish)return false;returns.push(r);return true;}})}:window;
 get('world').focus=()=>{};get('stage').clientWidth=390;get('stage').getBoundingClientRect=()=>({width:390,height:600});
 globalThis.requestAnimationFrame=fn=>{frame=fn;};globalThis.fetch=async()=>Response.json(course);
 await import('data:text/javascript;base64,'+Buffer.from(code+'\n// integration '+sequence++).toString('base64'));
}
await load({connected:false});assert(get('continue').disabled);get('continue').onclick();assert.equal(snapshot,null);assert.equal(get('title').textContent,'Enter from Expedition');
await load();assert.equal(get('hand').value,'left');assert(!get('continue').disabled);
let now;const ticks=n=>{for(let i=0;i<n;i++){now+=1000/120;frame(now);}};
const event=extra=>({pointerId:1,isPrimary:true,button:0,clientX:195,preventDefault(){},...extra});
get('continue').onclick();now=performance.now();ticks(2);let down=false;
for(const command of fixture.commands){
 const {held,aim}=command.input;if(held&&!down)get('pad').onpointerdown(event());
 if(held)get('pad').onpointermove(event({clientX:195+40*aim}));else if(down)get('pad').onpointerup(event({clientX:195+40*aim}));
 down=held;ticks(command.repeat);
}
assert.equal(snapshot.status,'won','complete boss through one-thumb pointer adapter');assert.deepEqual(returns,[],'receipt waits for player confirmation');
assert(get('description').textContent.includes('+30 bounty'));assert(get('detail').textContent.includes('312 m'));assert(get('restart').hidden);
await load();assert.equal(get('title').textContent,'The Bellkeeper rests');assert.equal(snapshot.status,'won');
canFinish=false;get('continue').onclick();assert.deepEqual(returns,[]);assert(get('save-note').textContent.includes('Could not save'));
canFinish=true;get('continue').onclick();assert.deepEqual(returns,['won']);
// No legacy local records, preferences or reward keys are changed.
assert.deepEqual([...local],[['carve.common.lantern-reach.v1','legacy climb'],['carve.common.bellkeeper.v2','legacy boss']]);
await load({run:createBoss(course)});canSave=false;get('continue').onclick();assert.equal(get('title').textContent,'Your challenge is safe');assert(get('save-note').textContent.includes('Saving is unavailable'));
canSave=true;globalThis.confirm=()=>false;get('boss-return').onclick();assert.deepEqual(returns,['won']);
globalThis.confirm=()=>true;get('boss-return').onclick();assert.deepEqual(returns,['won','withdrawn']);
console.log('PASS embedded Bellkeeper: direct entry blocked, inherited controls, full one-pad win, receipt confirmation/reload, blocked saves, withdrawal and untouched legacy data.');
