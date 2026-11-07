import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRun,restoreRun,resumeRun,pauseRun,stepRun,quality} from '../shared/lantern-rules.mjs';
const course=JSON.parse(await readFile(new URL('../shared/common-lantern-reach-v1.json',import.meta.url),'utf8'));
const parity=JSON.parse(await readFile(new URL('../shared/fixtures/lantern-parity-v1.json',import.meta.url),'utf8'));
for(const vector of parity.cases){
 const s=createRun(course);resumeRun(s);stepRun(s,{held:false},course);Object.assign(s,vector.patch);
 for(const command of vector.commands)for(let i=0;i<command.repeat;i++)stepRun(s,command.input,course);
 for(const [key,value]of Object.entries(vector.expected)){
  if(typeof value==='number')assert(Math.abs(s[key]-value)<=parity.tolerance,vector.name+'/'+key);
  else assert.deepEqual(s[key],value,vector.name+'/'+key);
 }
}
for(const [ticks,want]of [[0,'early'],[31,'early'],[32,'good'],[83,'good'],[84,'perfect'],[110,'perfect'],[111,'late'],[146,'late'],[147,'expired']]){
 assert.equal(quality(ticks,course),want);
}
function start(){const s=createRun(course);resumeRun(s);stepRun(s,{held:false},course);return s;}
const cancelled=start();stepRun(cancelled,{held:true},course);stepRun(cancelled,{held:false,cancel:true},course);
assert.equal(cancelled.status,'paused');assert.equal(cancelled.launches,0);assert.equal(cancelled.charge,0);
resumeRun(cancelled);stepRun(cancelled,{held:true},course);assert.equal(cancelled.charge,0);
const rescue=start();Object.assign(rescue,{x:100,y:370,ground:null,vy:-200});
for(let i=0;i<80;i++)stepRun(rescue,{held:false},course);
assert.equal(rescue.ground,'rescue');assert.equal(rescue.lives,3);
const deaths=start();for(let i=0;i<3;i++){deaths.y=-200;deaths.ground=null;stepRun(deaths,{held:false},course);assert.equal(deaths.lives,2-i);if(i<2)resumeRun(deaths);}
assert.equal(deaths.status,'lost');const ended=structuredClone(deaths);stepRun(deaths,{held:true},course);assert.deepEqual(deaths,ended);
const camp=start();Object.assign(camp,{x:310,y:650,ground:null,vy:0});stepRun(camp,{held:false},course);assert.equal(camp.checkpoint,'camp');
camp.y=400;stepRun(camp,{held:false},course);assert.equal(camp.status,'recovery');assert.equal(camp.y,624);assert.equal(camp.lives,2);
const expired=start();Object.assign(expired,{x:60,y:220,ground:null,grip:'west',away:1});
for(let i=0;i<147;i++)stepRun(expired,{held:true},course);
assert.equal(expired.grip,null);assert(expired.require_lift);assert.equal(expired.launches,0);
const saved=start();Object.assign(saved,{x:330,y:400,peak:400,ground:null,grip:'east',away:-1,charge:84,held:true});
const restored=restoreRun(saved,course);assert.equal(restored.status,'paused');assert.equal(restored.grip,'east');assert.equal(restored.charge,0);assert(restored.require_lift);
for(const patch of [{last_wall:'invalid'},{tokens:['first-light','first-light']},{x:NaN},{lives:0},{charge:147},{course_id:'web.flow-v1'}]){
 assert.equal(restoreRun({...saved,...patch},course),null);
}
for(const charge of [40,55,90]){
 const run=start();
 for(let i=0;i<6000&&run.status==='playing';i++){
  const aim=run.ground==='start'?1:run.grip?run.away:Math.sign(run.vx);
  stepRun(run,{held:run.charge<charge,aim},course);
 }
 assert.equal(run.status,'won','input-only route reaches the bell');
 assert.equal(run.lives,3);assert.equal(new Set(run.tokens).size,run.tokens.length);
 const snapshot=structuredClone(run);pauseRun(run);stepRun(run,{held:true},course);assert.deepEqual(run,snapshot);
}
console.log('PASS Lantern Reach: timing boundaries, cancellation, fresh input, rescue, three lives, camp recovery and input-only GOOD/PERFECT completion.');
