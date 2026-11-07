import {createRun,restoreRun,pauseRun,resumeRun,stepRun,quality} from './rules.mjs';
const course=await (await fetch('./course.json')).json();
const $=id=>document.getElementById(id),canvas=$('world'),ctx=canvas.getContext('2d');
const saveKey='carve.common.lantern-reach.v1',preferencesKey=saveKey+'.controls';
let run=createRun(course),runId=crypto.randomUUID(),camera=0,previous=performance.now(),accumulator=0;
let chargeOwner=null,originX=0,pointerAim=0,lastAim=0;
const keys=new Set(),leftOwners=new Set(),rightOwners=new Set();
let scheme='one',hand='right',muted=false,audio=null,audioUnlocked=false,lastNotice='',noticeUntil=0,storageOK=true;
try{
 const prefs=JSON.parse(localStorage.getItem(preferencesKey));
 if(['one','two'].includes(prefs?.scheme))scheme=prefs.scheme;
 if(['left','right'].includes(prefs?.hand))hand=prefs.hand;
 const saved=JSON.parse(localStorage.getItem(saveKey));
 const restored=restoreRun(saved?.run,course);
 if(restored&&typeof saved.run_id==='string'){run=restored;runId=saved.run_id;}
}catch{storageOK=false;}
function save(){
 try{localStorage.setItem(saveKey,JSON.stringify({run_id:runId,run}));}
 catch{storageOK=false;}
}
function recordResult(){
 if(!['won','lost'].includes(run.status))return;
 try{
  const records=JSON.parse(localStorage.getItem(saveKey+'.results')??'[]');
  if(!Array.isArray(records)||records.some(r=>r.run_id===runId))return;
  records.unshift({run_id:runId,course_id:course.course_id,rules_version:course.rules_version,
   outcome:run.status,height_m:Math.floor(run.peak/10),active_ticks:run.ticks,falls:run.falls,tokens:[...run.tokens]});
  localStorage.setItem(saveKey+'.results',JSON.stringify(records.slice(0,20)));
 }catch{storageOK=false;}
}
function clearInput(){
 chargeOwner=null;pointerAim=0;lastAim=0;keys.clear();leftOwners.clear();rightOwners.clear();
 $('pad').classList.remove('active');
}
function pause(){
 pauseRun(run);clearInput();accumulator=0;save();showOverlay();
}
function showOverlay(){
 const status=run.status,visible=status!=='playing';$('overlay').hidden=!visible;$('pause').disabled=visible;
 if(!visible)return;
 recordResult();
 $('title').textContent=status==='won'?'You lit Lantern Reach':status==='lost'?'Every climb teaches you':status==='recovery'?'Take a breath':status==='paused'?'Your climb is safe':'Lantern Reach';
 $('description').textContent=status==='won'?'The summit bell is yours. Can you find another lantern?':status==='lost'?'Three lives used. Choose a new route on your next attempt.':status==='recovery'?run.notice:status==='paused'?'Resume with a fresh touch when you are ready.':'A little courage. A brighter way up.';
 $('detail').textContent=status==='ready'?'Hold to charge. Drag to aim. Release to leap. Hold again in flight to catch a blue wall.':status==='recovery'?'Your height record and collected lanterns are kept. The blue camp saves your next recovery point.':status==='paused'?'Blue walls are the steady route. The narrow gold pillar offers a quicker crossing and a bonus lantern.':'Blue walls, a safe camp, and a golden shortcut. Every lantern is an optional challenge.';
 $('result').textContent=run.ticks?Math.floor(run.peak/10)+' m reached · '+run.tokens.length+'/4 lanterns · '+(run.ticks/120).toFixed(1)+' s · '+run.falls+' falls':'Three lives. Reach the bell at 148 m.';
 $('continue').textContent=['won','lost'].includes(status)?'Climb again':status==='ready'?'Begin the climb':'Continue climbing';
 $('restart').hidden=!['paused','recovery'].includes(status);
 $('save-note').textContent=storageOK?'This preview keeps its own local save. Earlier CARVE progress stays separate.':'Browser storage is unavailable. Keep this tab open to retain this attempt.';
}
function begin(){
 if(['won','lost'].includes(run.status)){run=createRun(course);runId=crypto.randomUUID();camera=0;}
 clearInput();resumeRun(run);previous=performance.now();accumulator=0;audioUnlocked=true;save();showOverlay();canvas.focus({preventScroll:true});
}
$('continue').onclick=begin;
$('restart').onclick=()=>{if(confirm('Start a new Lantern Reach run? This replaces this preview attempt.')){run=createRun(course);runId=crypto.randomUUID();camera=0;begin();}};
$('pause').onclick=pause;
function configure(event){
 scheme=$('scheme').value;hand=$('hand').value;if(event)pause();
 $('controls').classList.toggle('two',scheme==='two');$('controls').classList.toggle('left',hand==='left');$('two-steer').hidden=scheme!=='two';
 $('pad-detail').textContent=scheme==='one'?'drag ← to aim → · release to leap':'hold to catch · release to leap';
 try{localStorage.setItem(preferencesKey,JSON.stringify({scheme,hand}));}catch{}
}
$('scheme').value=scheme;$('hand').value=hand;
$('scheme').onchange=configure;$('hand').onchange=configure;configure();
function aimFromPointer(e){
 if(scheme!=='one')return;
 const logical=(e.clientX-originX)*390/$('stage').clientWidth;
 pointerAim=Math.abs(logical)<=4?0:Math.max(-1,Math.min(1,logical/40));
}
$('pad').onpointerdown=e=>{
 if(run.status!=='playing'||chargeOwner!==null||(scheme==='one'&&!e.isPrimary)||e.button!==0)return;
 e.preventDefault();chargeOwner=e.pointerId;originX=e.clientX;pointerAim=0;lastAim=0;
 $('pad').setPointerCapture(e.pointerId);$('pad').classList.add('active');
};
$('pad').onpointermove=e=>{if(e.pointerId===chargeOwner){e.preventDefault();aimFromPointer(e);}};
$('pad').onpointerup=e=>{
 if(e.pointerId!==chargeOwner)return;
 e.preventDefault();aimFromPointer(e);lastAim=pointerAim;chargeOwner=null;$('pad').classList.remove('active');
};
$('pad').onpointercancel=e=>{if(e.pointerId===chargeOwner)pause();};
$('pad').onlostpointercapture=e=>{if(e.pointerId===chargeOwner)pause();};
for(const [id,owners]of [['left',leftOwners],['right',rightOwners]]){
 const button=$(id);
 button.onpointerdown=e=>{if(run.status!=='playing'||e.button!==0)return;e.preventDefault();owners.add(e.pointerId);button.setPointerCapture(e.pointerId);};
 button.onpointerup=e=>{e.preventDefault();owners.delete(e.pointerId);};
 button.onpointercancel=e=>{if(owners.has(e.pointerId))pause();};
 button.onlostpointercapture=e=>{if(owners.has(e.pointerId))pause();};
}
addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey||/INPUT|SELECT|BUTTON/.test(e.target.tagName))return;
 if(e.code==='Escape'||e.code==='KeyP'){if(!e.repeat)pause();return;}
 if(['Space','ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)){e.preventDefault();if(run.status==='playing')keys.add(e.code);}
});
addEventListener('keyup',e=>{if(keys.delete(e.code))e.preventDefault();});
addEventListener('blur',pause);addEventListener('pagehide',()=>{pause();save();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
let viewSize=innerWidth+'x'+innerHeight;
addEventListener('resize',()=>{const size=innerWidth+'x'+innerHeight;if(size!==viewSize)pause();viewSize=size;});
function sound(frequency){
 if(muted||!audioUnlocked)return;
 try{
  audio??=new (window.AudioContext||window.webkitAudioContext)();
  if(audio.state==='suspended')void audio.resume();
  const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';
  osc.frequency.setValueAtTime(frequency,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(frequency*1.45,audio.currentTime+.12);
  gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.2);
  osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.21);
 }catch{}
}
$('mute').onclick=()=>{muted=!muted;$('mute').textContent=muted?'Sound off':'Sound on';$('mute').setAttribute('aria-pressed',String(muted));};
function draw(now,elapsed){
 const rect=$('stage').getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}
 const scale=rect.width/390,H=rect.height/scale;
 ctx.setTransform(dpr*scale,0,0,dpr*scale,0,0);
 const target=Math.max(0,run.y-H*.38);
 if(['playing','recovery'].includes(run.status))camera+=(target-camera)*(-Math.expm1(-8*elapsed));
 else if(run.status==='ready')camera=0;
 const sy=y=>H-(y-camera);
 const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#111d33');sky.addColorStop(1,'#24424a');ctx.fillStyle=sky;ctx.fillRect(0,0,390,H);
 for(let layer=0;layer<3;layer++){
  ctx.fillStyle=['#14283b','#183443','#1d3b46'][layer];ctx.beginPath();ctx.moveTo(0,H);
  for(let x=0;x<=400;x+=20)ctx.lineTo(x,H*.45+Math.sin(x*.025+layer*2)*40+Math.cos(x*.06)*18+layer*55+(camera*.06)%80);
  ctx.lineTo(400,H);ctx.fill();
 }
 ctx.fillStyle='#d9ecd360';
 for(let i=0;i<26;i++){const x=(i*73+19)%390,y=(i*101+camera*.13)%H;ctx.globalAlpha=.3+.3*Math.sin(i+now*.0007);ctx.fillRect(x,y,1.5,1.5);}
 ctx.globalAlpha=1;
 for(const b of course.surfaces){
  const [x,y,w,h]=b.rect,top=sy(y+h);if(top>H+50||top+h< -50)continue;
  const gold=b.kind==='shortcut',teal=['camp','rescue'].includes(b.id);
  ctx.fillStyle=gold?'#8f713e':teal?'#38676b':'#3a4e60';ctx.fillRect(x,top,w,h);
  ctx.fillStyle=gold?'#edcb78':teal?'#8ad1ba':'#8caaa9';ctx.fillRect(x-2,top,w+4,3);
  if(b.grip){
   ctx.fillStyle=gold?'#ddbc76':'#759fa4';ctx.fillRect(x+2,top,Math.max(2,w-4),h);
   ctx.strokeStyle=gold?'#715537':'#345767';ctx.lineWidth=1;
   for(let yy=top+18;yy<top+h;yy+=24){ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x+w,yy+3);ctx.stroke();}
  }else{
   ctx.fillStyle='#223e49';for(let xx=x+8;xx<x+w-4;xx+=22)ctx.fillRect(xx,top+5,16,Math.max(2,h-6));
   ctx.fillStyle='#91b89c';for(let xx=x;xx<x+w;xx+=17)ctx.fillRect(xx,top-3,9,4);
  }
 }
 ctx.fillStyle=run.checkpoint?'#aff0c8':'#6d9696';ctx.font='bold 10px system-ui';ctx.textAlign='right';ctx.fillText(run.checkpoint?'CAMP LIT':'LIGHT CAMP',328,sy(654));
 const campGlow=ctx.createRadialGradient(321,sy(636),1,321,sy(636),38);
 campGlow.addColorStop(0,run.checkpoint?'#adf1c884':'#6cc9de66');campGlow.addColorStop(1,'#6cc9de00');
 ctx.fillStyle=campGlow;ctx.fillRect(283,sy(636)-38,76,76);
 ctx.strokeStyle=run.checkpoint?'#c5f7d8':'#8be5e4';ctx.lineWidth=2;ctx.strokeRect(315,sy(636)-8,12,16);
 ctx.fillStyle='#d1b677';ctx.textAlign='left';ctx.fillText('GOLDEN SHORTCUT',84,sy(965));
 ctx.fillStyle='#99c9c1';ctx.fillText('RESCUE SHELF',58,sy(345));
 for(const t of course.tokens){
  if(run.tokens.includes(t.id))continue;
  const [x,y]=t.position,Y=sy(y);if(Y< -30||Y>H+30)continue;
  const glow=ctx.createRadialGradient(x,Y,0,x,Y,27);glow.addColorStop(0,'#f7dc8a65');glow.addColorStop(1,'#f7dc8a00');
  ctx.fillStyle=glow;ctx.fillRect(x-27,Y-27,54,54);
  ctx.save();ctx.translate(x,Y+Math.sin(now*.003)*3);ctx.rotate(Math.PI/4);ctx.fillStyle='#f2d277';ctx.fillRect(-5,-5,10,10);ctx.restore();
 }
 const bellY=sy(1510);ctx.strokeStyle='#e5c16b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(195,bellY,24,Math.PI,0);ctx.lineTo(219,bellY+13);ctx.lineTo(171,bellY+13);ctx.closePath();ctx.stroke();
 ctx.fillStyle='#e5c16b';ctx.beginPath();ctx.arc(195,bellY+19,4,0,Math.PI*2);ctx.fill();
 const X=run.x,Y=sy(run.y);ctx.fillStyle='#8be8cc15';ctx.beginPath();ctx.ellipse(X,Y+17,16,5,0,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.translate(X,Y);ctx.rotate(run.grip?run.away*.12:Math.max(-.2,Math.min(.2,run.vx/1200)));
 ctx.fillStyle='#d5ab56';ctx.beginPath();ctx.moveTo(-8,1);ctx.lineTo(-17,13);ctx.lineTo(-3,7);ctx.closePath();ctx.fill();
 ctx.fillStyle='#f1d798';ctx.fillRect(-7,-5,14,13);ctx.fillStyle='#5ca59c';ctx.fillRect(-8,0,16,5);
 ctx.fillStyle='#182c39';ctx.fillRect(-5,8,4,5);ctx.fillRect(2,8,4,5);
 ctx.fillStyle='#f4d482';ctx.beginPath();ctx.arc(0,-8,9,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#253744';ctx.fillRect(-6,-10,12,5);ctx.fillStyle='#c3f1dd';ctx.fillRect(run.away>0?1:-5,-9,4,2);ctx.restore();
 if((run.ground||run.grip)&&run.charge){
  const q=quality(run.charge,course);ctx.strokeStyle=q==='perfect'?'#ffe18a':q==='late'?'#eb9c72':'#8ce1c2';
  ctx.lineWidth=3;ctx.beginPath();ctx.arc(X,Y,19,-Math.PI/2,-Math.PI/2+2*Math.PI*Math.min(run.charge/147,1));ctx.stroke();
 }
 $('height').textContent=Math.floor(run.peak/10)+' m';$('lives').textContent='♥ '.repeat(run.lives).trim();$('lanterns').textContent=run.tokens.length+' / 4 lanterns';
 $('charge').style.width=(run.charge/147*100)+'%';
 $('quality').textContent=run.charge?quality(run.charge,course).toUpperCase()+' · release to leap':run.grip?'Caught · hold to charge from zero':'Hold again in flight to catch';
 $('instruction').textContent=run.launches===0?'HOLD · DRAG TO AIM · RELEASE':run.y>1400?'REACH THE SUMMIT BELL':run.y>700&&run.y<1050?'GOLD PILLAR · SHORTER CROSSING, SMALLER TARGET':run.checkpoint?'CAMP LIT · FIND YOUR NEXT LANTERN':'BLUE WALLS LEAD TO THE SAFE CAMP';
 if(run.notice!==lastNotice){
  lastNotice=run.notice;noticeUntil=now+4500;
  if(run.notice.includes('lantern')||run.notice.includes('Lantern'))sound(620);else if(run.notice.includes('release'))sound(330);
 }
 $('caption').textContent=now<noticeUntil?run.notice:'';
}
let savedAt=0;
function frame(now){
 const elapsed=Math.min((now-previous)/1000,.1);previous=now;
 if(run.status==='playing'){
  accumulator+=elapsed;
  const keyboardAim=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0);
  const padAim=scheme==='one'?(chargeOwner===null?lastAim:pointerAim):(rightOwners.size?1:0)-(leftOwners.size?1:0);
  const held=chargeOwner!==null||keys.has('Space'),aim=Math.max(-1,Math.min(1,keyboardAim+padAim));
  let steps=0;
  while(accumulator>=1/120&&steps<12){stepRun(run,{held,aim},course);accumulator-=1/120;steps++;if(run.status!=='playing')break;}
  if(steps)lastAim=0;
  if(run.status!=='playing'){clearInput();save();showOverlay();if(run.status==='won')sound(880);}
  if(now-savedAt>1500){save();savedAt=now;}
 }
 draw(now,elapsed);requestAnimationFrame(frame);
}
camera=Math.max(0,run.y-190);showOverlay();requestAnimationFrame(frame);
