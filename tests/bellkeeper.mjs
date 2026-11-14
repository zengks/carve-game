import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createBoss,restoreBoss,stepBoss,bellState} from '../shared/bellkeeper-rules.mjs';
import {resumeRun,pauseRun} from '../shared/lantern-rules.mjs';
const course=JSON.parse(await readFile(new URL('../shared/common-bellkeeper-v1.json',import.meta.url)));
const run=createBoss(course);resumeRun(run);stepBoss(run,{held:false,aim:0},course);
const commands=[];
for(let i=0;i<15000&&run.status==='playing';i++){
 const target=course.tokens[run.tokens.length].position;
 const near=Math.hypot(run.x-target[0],run.y-target[1])<=42;
 const wait=run.ground&&(near||bellState(run,course).stage!=='rest');
 const settle=Math.abs(run.x-target[0])<45&&run.y>=target[1]-10;
 const aim=run.ground?Math.sign(target[0]-run.x):run.grip?run.away:Math.sign(run.vx);
 const input={held:!wait&&!settle&&run.charge<55,aim:settle?0:aim};
 const last=commands.at(-1);
 if(last&&last.input.held===input.held&&last.input.aim===input.aim)last.repeat++;
 else commands.push({repeat:1,input});
 stepBoss(run,input,course);
}
assert.equal(run.status,'won');assert.equal(run.lives,3);assert.equal(run.tokens.length,3);
assert.equal(restoreBoss(run,course).status,'won');
if(process.argv.includes('--fixtures'))await writeFile(new URL('../shared/fixtures/bellkeeper-parity-v1.json',import.meta.url),JSON.stringify({commands,expected:run},null,2)+'\n');
const hazard=createBoss(course);resumeRun(hazard);hazard.require_lift=false;
hazard.bell_ticks=course.bell.warning_ticks[0];hazard.x=100;hazard.y=300;hazard.peak=300;hazard.ground=null;
stepBoss(hazard,{held:false,aim:0},course);assert.equal(hazard.status,'recovery');assert.equal(hazard.lives,2);
const saved=structuredClone(hazard);stepBoss(hazard,{held:true,aim:1},course);assert.deepEqual(hazard,saved);
for(const lives of [1,0]){
 resumeRun(hazard);hazard.require_lift=false;hazard.bell_ticks=course.bell.warning_ticks[0];
 hazard.x=100;hazard.y=300;hazard.ground=null;
 stepBoss(hazard,{held:false,aim:0},course);
 assert.equal(hazard.lives,lives);assert.equal(hazard.status,lives?'recovery':'lost');
}
assert.equal(restoreBoss(hazard,course).status,'lost');
const resting=createBoss(course);resumeRun(resting);resting.require_lift=false;
resting.x=300;resting.y=240;resting.peak=240;
stepBoss(resting,{held:false,aim:0},course);assert.equal(resting.tokens.length,0,'warning does not grant a rope');
resting.bell_ticks=course.bell.warning_ticks[0]+course.bell.sweep_ticks;
stepBoss(resting,{held:false,aim:0},course);assert.deepEqual(resting.tokens,['rope-1'],'rest grants the current rope');
for(let phase=0;phase<3;phase++){
 for(const x of [course.tokens[phase].position[0]-12,course.tokens[phase].position[0],course.tokens[phase].position[0]+12]){
  const shelf=createBoss(course);resumeRun(shelf);shelf.require_lift=false;
  shelf.tokens=course.tokens.slice(0,phase).map(t=>t.id);
  shelf.x=x;shelf.y=course.tokens[phase].position[1];shelf.peak=shelf.y;shelf.ground=course.tokens[phase].id;
  for(let tick=0;tick<800;tick++)stepBoss(shelf,{held:false,aim:0},course);
  assert.equal(shelf.lives,3,'resting near a rope on its shelf is safe through every bell stage');
  assert.equal(shelf.tokens.length,phase+1);
 }
}
assert.equal(restoreBoss({...run,rules_version:'bellkeeper-rules-1'},course),null,'old attempts must not silently adopt new balance');
const paused=createBoss(course);resumeRun(paused);pauseRun(paused);stepBoss(paused,{held:true},course);assert.equal(paused.bell_ticks,0);
assert.equal(restoreBoss({...run,tokens:['rope-3']},course),null);
assert.equal(restoreBoss({...run,bell_ticks:-1},course),null);
console.log('PASS Bellkeeper: input-only three-rope win, rest-only ropes, three-life failure, safe recovery, pause, strict restore and terminal idempotency.');
