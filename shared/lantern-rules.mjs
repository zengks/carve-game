const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
export function quality(ticks,course){
 const [good,perfect,late,expired]=course.rules.charge_ticks;
 if(ticks>=expired)return 'expired';
 if(ticks>=late)return 'late';
 if(ticks>=perfect)return 'perfect';
 return ticks>=good?'good':'early';
}
export function createRun(course){
 return {course_id:course.course_id,rules_version:course.rules_version,
  x:course.start[0],y:course.start[1],vx:0,vy:0,status:'ready',ground:'start',grip:null,away:1,
  charge:0,held:false,require_lift:false,last_wall:null,ticks:0,lives:course.rules.lives,
  falls:0,peak:course.start[1],checkpoint:null,tokens:[],catches:0,launches:0,notice:'Hold, aim, release.'};
}
export function restoreRun(value,course){
 if(!value||value.course_id!==course.course_id||value.rules_version!==course.rules_version)return null;
 const s=createRun(course);
 for(const name of Object.keys(s)){
  if(!(name in value))return null;
  s[name]=value[name];
 }
 if(!['ready','playing','paused','recovery','won','lost'].includes(s.status))return null;
 if(!['x','y','vx','vy','ticks','peak','lives','falls','charge','catches','launches'].every(k=>Number.isFinite(s[k])))return null;
 if(!['ticks','lives','falls','charge','catches','launches'].every(k=>Number.isInteger(s[k])&&s[k]>=0))return null;
 if(s.x<0||s.x>course.width||s.y< -200||s.y>2000||s.peak<s.y||s.peak>2000||s.lives>3||s.charge>=147)return null;
 if((s.status==='lost')!==(s.lives===0)||![-1,1].includes(s.away))return null;
 const walls=[null,...course.surfaces.filter(b=>b.grip).map(b=>b.id)];
 if(!walls.includes(s.grip)||!walls.includes(s.last_wall)||![null,...course.surfaces.map(b=>b.id)].includes(s.ground)||![null,'camp'].includes(s.checkpoint))return null;
 if(s.grip&&s.ground)return null;
 if(!Array.isArray(s.tokens)||new Set(s.tokens).size!==s.tokens.length||!s.tokens.every(id=>course.tokens.some(t=>t.id===id)))return null;
 if(typeof s.notice!=='string'||s.notice.length>300||typeof s.held!=='boolean'||typeof s.require_lift!=='boolean')return null;
 if(s.status==='playing')s.status='paused';
 s.held=false;s.charge=0;s.require_lift=true;
 return s;
}
export function pauseRun(s){
 if(s.status!=='playing')return;
 s.status='paused';s.held=false;s.charge=0;s.require_lift=true;
}
export function resumeRun(s){
 if(!['ready','paused','recovery'].includes(s.status))return;
 s.status='playing';s.held=false;s.charge=0;s.require_lift=true;
}
export function stepRun(s,input,course){
 if(s.status!=='playing')return;
 if(input.cancel){pauseRun(s);return;}
 const r=course.rules,dt=1/course.step_hz,hw=r.half_width,hh=r.half_height;
 const aim=clamp(input.aim??0,-1,1);
 s.ticks++;
 if(!input.held)s.require_lift=false;
 const held=!!input.held&&!s.require_lift,release=s.held&&!held;
 if(s.last_wall){
  const b=course.surfaces.find(b=>b.id===s.last_wall),[x,y,w,h]=b.rect;
  if(s.x+hw<x-3||s.x-hw>x+w+3||s.y+hh<=y||s.y-hh>=y+h)s.last_wall=null;
 }
 if(release&&(s.ground||s.grip)&&s.charge>0){
  const q=quality(s.charge,course),speed=r.launch[q];
  if(speed){
   const wall=!!s.grip,direction=wall?s.away:(Math.abs(aim)>.05?Math.sign(aim):s.away);
   s.vx=direction*speed[0]*(wall?1:r.ground_horizontal)+aim*r.aim_adjustment;
   if(wall)s.vx=s.away*clamp(Math.abs(s.vx),180,r.horizontal_speed);
   s.vy=speed[1]*(wall?1:r.ground_vertical);
   if(wall)s.last_wall=s.grip;
   s.ground=null;s.grip=null;s.charge=0;s.launches++;
   s.notice=q.toUpperCase()+' release';
  }
 }
 if(held&&(s.ground||s.grip)){
  s.charge++;
  if(quality(s.charge,course)==='expired'){
   if(s.grip){s.last_wall=s.grip;s.grip=null;s.vx=s.away*40;s.vy=-35;}
   s.charge=0;s.require_lift=true;s.notice='Overheld. Lift your thumb, then catch again.';
  }
 }else if(!held)s.charge=0;
 s.held=held&&!s.require_lift;
 if(!s.grip&&!s.ground){
  s.vy=Math.max(-r.fall_speed,s.vy-r.gravity*dt);
  s.vx=clamp(s.vx+aim*r.steer_acceleration*dt,-r.horizontal_speed,r.horizontal_speed);
  const oldX=s.x,oldY=s.y;
  s.x+=s.vx*dt;
  for(const b of course.surfaces){
   if(!b.grip)continue;
   const [x,y,w,h]=b.rect;
   if(s.y+hh<=y||s.y-hh>=y+h)continue;
   let away=0;
   if(s.vx>0&&oldX+hw<=x&&s.x+hw>=x){s.x=x-hw;away=-1;}
   if(s.vx<0&&oldX-hw>=x+w&&s.x-hw<=x+w){s.x=x+w+hw;away=1;}
   if(!away)continue;
   s.vx=0;
   if(held&&b.grip&&s.last_wall!==b.id){
    s.grip=b.id;s.away=away;s.charge=0;s.vy=0;s.catches++;s.notice='Caught. Charge from zero, then release.';
   }
   break;
  }
  if(!s.grip){
   s.y+=s.vy*dt;
   for(const b of course.surfaces){
    const [x,y,w,h]=b.rect;
    if(s.x+hw<=x||s.x-hw>=x+w)continue;
    if(s.vy<=0&&oldY-hh>=y+h&&s.y-hh<=y+h){
     s.y=y+h+hh;s.vx=0;s.vy=0;s.ground=b.id;s.charge=0;
     if(b.kind==='checkpoint'&&!s.checkpoint){s.checkpoint=b.id;s.notice='Camp lit. Falls return here.';}
     if(b.kind==='rescue')s.notice='Rescue shelf caught you. Your lives are safe.';
     if(b.kind==='summit'){s.status='won';s.held=false;s.notice='Lantern Reach complete!';}
     break;
    }
    if(b.grip&&s.vy>0&&oldY+hh<=y&&s.y+hh>=y){s.y=y-hh;s.vy=0;break;}
   }
  }
 }
 s.peak=Math.max(s.peak,s.y);
 const [campX,campY,campW,campH]=course.checkpoint_zone;
 if(!s.checkpoint&&s.x>=campX&&s.x<=campX+campW&&s.y>=campY&&s.y<=campY+campH){
  s.checkpoint='camp';s.notice='Camp lit. Falls return here.';
 }
 for(const t of course.tokens){
  if(!s.tokens.includes(t.id)&&Math.hypot(s.x-t.position[0],s.y-t.position[1])<=r.token_radius){
   s.tokens.push(t.id);s.notice=t.id==='shortcut-light'?'Shortcut lantern found!':'Lantern collected · '+s.tokens.length+'/'+course.tokens.length;
  }
 }
 const [goalX,goalY,goalW,goalH]=course.goal_zone;
 if(s.status==='playing'&&s.x>=goalX&&s.x<=goalX+goalW&&s.y>=goalY&&s.y<=goalY+goalH){
  s.status='won';s.held=false;s.notice='Lantern Reach complete!';
 }
 const spawn=s.checkpoint?course.surfaces.find(b=>b.id===s.checkpoint).spawn:course.start;
 if(s.status==='playing'&&(s.y<spawn[1]-r.fall_below_checkpoint||s.x<0||s.x>course.width)){
  s.lives--;s.falls++;s.status=s.lives?'recovery':'lost';s.x=spawn[0];s.y=spawn[1];
  s.vx=0;s.vy=0;s.ground=s.checkpoint??'start';s.grip=null;s.last_wall=null;
  s.charge=0;s.held=false;s.require_lift=true;
  s.notice=s.lives?'One life lost. Return to '+(s.checkpoint?'camp':'the start')+' with a fresh touch.':'Three lives used. Your lanterns and height are in this run’s result.';
 }
}
