// Presentation only: deriving cues from the run keeps reloads and old saves compatible.
export function climbCoaching(run,course,{scheme='one',pressed=run.held}={}){
 let objective=run.y>1400?'Reach the summit bell.':run.ground==='rescue'?'Rescue shelf: no life lost.':run.checkpoint?'Camp lit. Falls return here and cost one life.':'Follow blue walls to light the safe camp.';
 const cue=(id,action)=>({id,action,objective});
 if(run.status==='won'){objective='Lanterns are optional. Try another route or meet the Bellkeeper.';return cue('won','Climb complete.');}
 if(run.status==='lost'){objective='Your height and lanterns are in this run’s result.';return cue('lost','Three lives used.');}
 if(run.status==='recovery'){objective='Return to '+(run.checkpoint?'camp':'the start')+'. Height and lanterns are kept.';return cue('recovery','One life lost. Continue when ready.');}
 if(run.status==='paused')return cue('paused','Climb paused. Continue with a fresh touch.');
 if(run.status==='ready'){objective='Reach the summit bell. Lanterns are optional.';return cue('ready','First, hold to charge.');}
 if(run.require_lift&&pressed)return cue('lift','Lift, then press again.');
 if(!run.ground&&!run.grip)return pressed
  ?cue('aim',scheme==='two'?'Keep holding. Use arrows toward the next wall.':'Keep holding. Drag toward the next wall.')
  :cue('catch','Hold again to catch the wall.');
 if(!pressed)return cue('hold','Hold to charge.');
 if(run.grip&&run.charge===0)return cue('caught','Caught! Keep holding.');
 const [good,,late]=course.rules.charge_ticks;
 if(run.charge<good)return cue('charge','Keep holding until GOOD.');
 if(run.charge<late)return cue('release','Release to jump.');
 return cue('late','Release now.');
}
