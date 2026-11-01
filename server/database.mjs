import pg from 'pg';
import {createHash} from 'node:crypto';
import {canonical,validateEvent} from '../shared/contract.mjs';

// Separate private schema; never call the older native game's fixed-course RPCs.
export function createDatabase(connectionString) {
  const pool=new pg.Pool({connectionString,max:3,connectionTimeoutMillis:5000,
    idleTimeoutMillis:10000,statement_timeout:5000});
  const transaction=async fn=>{
    const c=await pool.connect();
    try {await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}
    catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  };
  const player=async(c,identity)=>{
    // Lock same identity across concurrent first requests, without locking others.
    await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[identity.issuer+':'+identity.subject]);
    const found=await c.query('select player_id from carve_shared_v1.identities where issuer=$1 and subject=$2',[identity.issuer,identity.subject]);
    if(found.rows.length)return found.rows[0].player_id;
    const row=await c.query('insert into carve_shared_v1.players default values returning id');
    await c.query('insert into carve_shared_v1.identities(issuer,subject,player_id) values($1,$2,$3)',[identity.issuer,identity.subject,row.rows[0].id]);
    return row.rows[0].id;
  };
  const snapshot=async(c,id)=>{
    const results=await c.query('select event from carve_shared_v1.completed_results where player_id=$1 order by received_at desc,event_id limit 100',[id]);
    const progress=await c.query('select course_id,rules_version,mode,testing,best_height,unlocks,lessons from carve_shared_v1.course_progress where player_id=$1 order by course_id,rules_version,mode,testing',[id]);
    return {contract_version:1,player_id:id,results:results.rows.map(r=>r.event),progress:progress.rows,validation:'client_reported',
      bounty:{status:'not_connected'},purchases:{status:'not_implemented'}};
  };
  return {close:()=>pool.end(),read:identity=>transaction(async c=>snapshot(c,await player(c,identity))),
    write:(identity,event)=>transaction(async c=>{
      validateEvent(event);const id=await player(c,identity), payload=canonical(event);
      const hash=createHash('sha256').update(payload).digest('hex');
      const inserted=await c.query('insert into carve_shared_v1.completed_results(player_id,event_id,payload_hash,event) values($1,$2,$3,$4::jsonb) on conflict do nothing returning event_id',[id,event.event_id,hash,payload]);
      if(!inserted.rows.length){const old=await c.query('select payload_hash from carve_shared_v1.completed_results where player_id=$1 and event_id=$2',[id,event.event_id]);
        if(old.rows[0]?.payload_hash!==hash)throw new Error('event_conflict');}
      await c.query(`insert into carve_shared_v1.course_progress as current
        (player_id,course_id,rules_version,mode,testing,best_height,unlocks,lessons) values($1,$2,$3,$4,$5,$6,$7,$8)
        on conflict(player_id,course_id,rules_version,mode,testing) do update set
        best_height=greatest(current.best_height,excluded.best_height),
        unlocks=array(select distinct x from unnest(current.unlocks||excluded.unlocks) x order by x),
        lessons=array(select distinct x from unnest(current.lessons||excluded.lessons) x order by x)`,
        [id,event.course_id,event.rules_version,event.mode,event.payload.testing,event.payload.height_m,event.payload.unlocks,event.payload.lessons]);
      return {accepted:event.event_id,...await snapshot(c,id)};
    })};
}
