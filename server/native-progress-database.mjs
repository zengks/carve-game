import {canonical} from '../shared/contract.mjs';
import {NATIVE_COURSE,NATIVE_RULES,validateNativeEvent} from '../shared/native-progress.mjs';
import {digest,equal} from './oidc.mjs';
const fail=(code,status)=>{throw Object.assign(Error(code),{status});};

// Reuses the native session transaction's client; no second pool or owner claim.
export function nativeProgressTransaction(c){
 const scope=(actor,testing)=>[actor.player_id,NATIVE_COURSE,NATIVE_RULES,testing];
 async function lock(actor,testing,write=false){
  const args=scope(actor,testing);
  await c.query('insert into carve_shared_v1.native_course_progress(player_id,course_id,rules_version,testing) values($1,$2,$3,$4) on conflict do nothing',args);
  return (await c.query('select revision,tutorial_mask,completed from carve_shared_v1.native_course_progress where player_id=$1 and course_id=$2 and rules_version=$3 and testing=$4 '+(write?'for update':'for share'),args)).rows[0];
 }
 async function snapshot(actor,testing,progress){
  const args=scope(actor,testing);
  const bests=(await c.query('select mode,resumed,min(active_ms) as best_time_ms,max(best_chain) as best_chain,min(falls) as fewest_falls from carve_shared_v1.native_completed_results where player_id=$1 and course_id=$2 and rules_version=$3 and testing=$4 group by mode,resumed order by mode,resumed',args)).rows;
  const recent=(await c.query('select event from carve_shared_v1.native_completed_results where player_id=$1 and course_id=$2 and rules_version=$3 and testing=$4 order by received_at desc,event_id desc limit 20',args)).rows;
  return {course_id:NATIVE_COURSE,rules_version:NATIVE_RULES,tutorial_version:1,testing,revision:Number(progress.revision),completed:progress.completed,tutorial_mask:progress.tutorial_mask,bests,recent_events:recent.map(r=>r.event),validation:'client_reported'};
 }
 return {
  async owner(actor){
   const row=(await c.query('select p.id,p.scope_key from carve_shared_v1.identities i join carve_shared_v1.players p on p.id=i.player_id where i.issuer=$1 and i.subject=$2',[actor.issuer,actor.subject])).rows[0];
   if(!row||row.id!==actor.player_id||!equal(row.scope_key,actor.scope))fail('sign_in_required',401);
  },
  async read(actor,testing){return snapshot(actor,testing,await lock(actor,testing));},
  async write(actor,event){
   validateNativeEvent(event);const p=event.payload,args=scope(actor,p.testing);
   await lock(actor,p.testing,true);
   const hash=digest(canonical(event));
   const inserted=(await c.query('insert into carve_shared_v1.native_completed_results(player_id,event_id,course_id,rules_version,testing,mode,resumed,active_ms,best_chain,falls,tutorial_mask,payload_hash,event) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) on conflict do nothing returning event_id',[actor.player_id,event.event_id,NATIVE_COURSE,NATIVE_RULES,p.testing,event.mode,p.resumed,p.active_ms,p.best_chain,p.falls,p.tutorial_mask,hash,JSON.stringify(event)])).rows.length>0;
   const stored=(await c.query('select payload_hash,event from carve_shared_v1.native_completed_results where player_id=$1 and event_id=$2',[actor.player_id,event.event_id])).rows[0];
   if(!stored||!equal(stored.payload_hash,hash))fail('event_conflict',409);
   if(inserted)await c.query('update carve_shared_v1.native_course_progress set completed=true,tutorial_mask=tutorial_mask|$5,revision=revision+1 where player_id=$1 and course_id=$2 and rules_version=$3 and testing=$4',[...args,p.tutorial_mask]);
   const progress=(await c.query('select revision,tutorial_mask,completed from carve_shared_v1.native_course_progress where player_id=$1 and course_id=$2 and rules_version=$3 and testing=$4',args)).rows[0];
   return {...await snapshot(actor,p.testing,progress),accepted_event:stored.event};
  }
 };
}
