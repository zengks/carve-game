import pg from 'pg';
import {resolvePrincipal} from './database.mjs';

// Private persistent state; the per-instance row lock serializes grant/cancel/link.
// Only token/binding/code hashes are persisted, never their wire secrets.
export function createNativeDatabase(connectionString) {
 const pool=new pg.Pool({connectionString,max:4,connectionTimeoutMillis:5000,idleTimeoutMillis:10000,statement_timeout:5000});
 return {
  close:()=>pool.end(),
  async locate(id){return (await pool.query('select client_id,binding_hash from carve_shared_v1.native_flow_index where id=$1',[id])).rows[0]??null;},
  async atomic(client,binding,fn,{create=false}={}){
   const c=await pool.connect();
   try{
    await c.query('BEGIN');
    if(create)await c.query('insert into carve_shared_v1.native_instances(client_id,binding_hash,data) values($1,$2,$3) on conflict do nothing',[client,binding,JSON.stringify({generation:0,active:null,current:null,flows:{},sessions:{},offers:{}})]);
    const row=(await c.query('select data from carve_shared_v1.native_instances where client_id=$1 and binding_hash=$2 for update',[client,binding])).rows[0];
    if(!row)throw Object.assign(Error('handoff_rejected'),{status:401});
    const state=row.data;
    const result=await fn(state,{
     index:id=>c.query('insert into carve_shared_v1.native_flow_index(id,client_id,binding_hash) values($1,$2,$3)',[id,client,binding]),
     principal:proof=>resolvePrincipal(c,proof),
     async link(actor,proof){
      for(const key of [actor.issuer+':'+actor.subject,proof.issuer+':'+proof.subject].sort())await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[key]);
      const target=await resolvePrincipal(c,actor);
      const existing=(await c.query('select player_id from carve_shared_v1.identities where issuer=$1 and subject=$2',[proof.issuer,proof.subject])).rows[0];
      if(existing&&existing.player_id!==target.player_id)throw Object.assign(Error('identity_already_owned'),{status:409});
      if(!existing)await c.query('insert into carve_shared_v1.identities(issuer,subject,player_id) values($1,$2,$3)',[proof.issuer,proof.subject,target.player_id]);
      return target;
     }
    });
    await c.query('update carve_shared_v1.native_instances set data=$3 where client_id=$1 and binding_hash=$2',[client,binding,JSON.stringify(state)]);
    await c.query('COMMIT');return result;
   }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }
 };
}
