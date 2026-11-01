import pg from 'pg';
import {createHash} from 'node:crypto';
import {canonical,validateEvent} from '../shared/contract.mjs';
import {digest} from './oidc.mjs';

// Separate private schema; never call the older native game's fixed-course RPCs.
export function createDatabase(connectionString) {
  const pool=new pg.Pool({connectionString,max:3,connectionTimeoutMillis:5000,
    idleTimeoutMillis:10000,statement_timeout:5000});
  const transaction=async fn=>{
    const c=await pool.connect();
    try {await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}
    catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  };
  const principal=async(c,identity)=>{
    // Lock same identity across concurrent first requests, without locking others.
    await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[identity.issuer+':'+identity.subject]);
    const found=await c.query('select p.id,p.scope_key from carve_shared_v1.identities i join carve_shared_v1.players p on p.id=i.player_id where i.issuer=$1 and i.subject=$2 for update of p',[identity.issuer,identity.subject]);
    const rootScope=digest(identity.issuer+':'+identity.subject);
    if(found.rows.length){
      const p=found.rows[0];
      if(!p.scope_key)await c.query('update carve_shared_v1.players set scope_key=$2 where id=$1',[p.id,rootScope]);
      return {player_id:p.id,scope:p.scope_key??rootScope};
    }
    const row=await c.query('insert into carve_shared_v1.players(scope_key) values($1) returning id',[rootScope]);
    await c.query('insert into carve_shared_v1.identities(issuer,subject,player_id) values($1,$2,$3)',[identity.issuer,identity.subject,row.rows[0].id]);
    return {player_id:row.rows[0].id,scope:rootScope};
  };
  const player=async(c,identity)=>(await principal(c,identity)).player_id;
  const snapshot=async(c,id)=>{
    const results=await c.query('select event from carve_shared_v1.completed_results where player_id=$1 order by received_at desc,event_id limit 100',[id]);
    const progress=await c.query('select course_id,rules_version,mode,testing,best_height,unlocks,lessons from carve_shared_v1.course_progress where player_id=$1 order by course_id,rules_version,mode,testing',[id]);
    return {contract_version:1,player_id:id,results:results.rows.map(r=>r.event),progress:progress.rows,validation:'client_reported',
      bounty:{status:'not_connected'},purchases:{status:'not_implemented'}};
  };
  return {close:()=>pool.end(),resolve:identity=>transaction(c=>principal(c,identity)),
    providers:identity=>transaction(async c=>{
      const id=await player(c,identity),rows=await c.query('select issuer from carve_shared_v1.identities where player_id=$1 order by issuer',[id]);
      return [...new Set(rows.rows.map(r=>r.issuer==='https://appleid.apple.com'?'apple':r.issuer==='https://accounts.google.com'?'google':'email'))];
    }),
    startFlow:(flow,browser)=>transaction(async c=>{
      await c.query('insert into carve_shared_v1.auth_flows(id,browser_hash,data) values($1,$2,$3)',[flow.id,digest(browser),JSON.stringify(flow)]);
    }),
    consumeFlow:(id,browser)=>transaction(async c=>{
      const row=await c.query('update carve_shared_v1.auth_flows set consumed=true where id=$1 and browser_hash=$2 and not consumed and expires_at>clock_timestamp() returning data',[id,digest(browser)]);
      if(!row.rows.length)throw Error('flow_rejected');return row.rows[0].data;
    }),
    createSession:proof=>transaction(async c=>{
      await principal(c,proof);
      const row=await c.query('insert into carve_shared_v1.broker_sessions(issuer,subject,label) values($1,$2,$3) returning id',[proof.issuer,proof.subject,proof.label]);
      return row.rows[0].id;
    }),
    session:id=>transaction(async c=>{
      const row=await c.query('select issuer,subject,label,authenticated_at from carve_shared_v1.broker_sessions where id=$1 and not revoked and expires_at>clock_timestamp()',[id]);
      if(!row.rows.length)return null;const p=row.rows[0];
      return {...p,...await principal(c,p),fresh_at:p.authenticated_at.getTime(),binding:id};
    }),
    revokeSession:id=>transaction(c=>c.query('update carve_shared_v1.broker_sessions set revoked=true where id=$1',[id])),
    createOffer:(actor,proof)=>transaction(async c=>{
      const row=await c.query('insert into carve_shared_v1.link_offers(target_issuer,target_subject,binding_hash,proof) values($1,$2,$3,$4) returning id',
        [actor.issuer,actor.subject,digest(actor.binding),JSON.stringify(proof)]);return row.rows[0].id;
    }),
    offer:(id,actor)=>transaction(async c=>{
      const row=await c.query('select proof from carve_shared_v1.link_offers where id=$1 and target_issuer=$2 and target_subject=$3 and binding_hash=$4 and not consumed and expires_at>clock_timestamp()',
        [id,actor.issuer,actor.subject,digest(actor.binding)]);
      return row.rows.length?{provider:row.rows[0].proof.provider,label:row.rows[0].proof.label}:null;
    }),
    confirmLink:(id,actor)=>transaction(async c=>{
      const row=await c.query('select proof,consumed,confirmed from carve_shared_v1.link_offers where id=$1 and target_issuer=$2 and target_subject=$3 and binding_hash=$4 and expires_at>clock_timestamp() for update',
        [id,actor.issuer,actor.subject,digest(actor.binding)]);
      if(!row.rows.length||(row.rows[0].consumed&&!row.rows[0].confirmed))throw Error('link_offer_expired');const proof=row.rows[0].proof;
      // Serialize ownership changes against logout/revocation. An earlier HTTP
      // actor() check cannot authorize a write after its session was revoked.
      const session=await c.query("select id from carve_shared_v1.broker_sessions where id=$1 and issuer=$2 and subject=$3 and not revoked and expires_at>clock_timestamp() and authenticated_at>clock_timestamp()-interval '5 minutes' for update",
        [actor.binding,actor.issuer,actor.subject]);
      if(!session.rows.length)throw Error('link_offer_expired');
      for(const lock of [actor.issuer+':'+actor.subject,proof.issuer+':'+proof.subject].sort())await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[lock]);
      const target=await principal(c,actor);
      const existing=await c.query('select player_id from carve_shared_v1.identities where issuer=$1 and subject=$2',[proof.issuer,proof.subject]);
      if(existing.rows.length&&existing.rows[0].player_id!==target.player_id)throw Error('identity_already_owned');
      if(!existing.rows.length)await c.query('insert into carve_shared_v1.identities(issuer,subject,player_id) values($1,$2,$3)',[proof.issuer,proof.subject,target.player_id]);
      await c.query('update carve_shared_v1.link_offers set consumed=true,confirmed=true where id=$1',[id]);return target;
    }),
    cancelOffer:(id,actor)=>transaction(c=>c.query('update carve_shared_v1.link_offers set consumed=true where id=$1 and target_issuer=$2 and target_subject=$3 and binding_hash=$4 and not consumed',
      [id,actor.issuer,actor.subject,digest(actor.binding)])),
    read:identity=>transaction(async c=>snapshot(c,await player(c,identity))),
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
