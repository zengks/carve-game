import pg from 'pg';
import {resolvePrincipal} from './database.mjs';
import {postgresOptions} from './postgres.mjs';
const fail=(message,status=401)=>{throw Object.assign(Error(message),{status});};
export const quotaLimits={minute:{global:240,ip:60,binding:24},beginMinute:{global:60,ip:12,binding:4},beginHour:{global:600,ip:60,binding:12},keys:512,instances:128};
const initial=()=>({generation:0,active:null,current:null,flows:{},sessions:{},offers:{}});
// Independent transient schema and independent NOLOGIN role. Runtime never
// creates/migrates schema, enrolls testers, or touches old native instance rows.
export function createAndroidAuthDatabase(connectionString,{env=process.env,pool:injectedPool}={}){
 const pool=injectedPool??new pg.Pool(postgresOptions(connectionString,{max:1,ca:env.CARVE_DATABASE_CA_CERT,projectRef:env.CARVE_EXPECTED_PROJECT_REF,runtimeRole:'carve_android_auth'}));
 const transaction=async fn=>{
  const c=await pool.connect();
  try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='750ms'");await c.query("SET LOCAL statement_timeout='3s'");const value=await fn(c);await c.query('COMMIT');return value;}
  catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 };
 const admitted=async(c,proof)=>{
  if(proof.issuer!=='https://accounts.google.com'||typeof proof.subject!=='string'||!/^[\x21-\x7e]{1,255}$/.test(proof.subject))return false;
  return (await c.query('select carve_android_auth_v1.admitted($1,$2) as allowed',[proof.issuer,proof.subject])).rows[0].allowed===true;
 };
 return {
  close:()=>pool.end(),
  async admitRequest({ip,binding,begin=false}){
   if(!/^[a-f0-9]{64}$/.test(ip)||binding!==null&&!/^[a-f0-9]{64}$/.test(binding)||typeof begin!=='boolean')fail('client_rejected',403);
   return transaction(async c=>{
    // One bounded durable row serializes budgets across instances/restarts. Never
    // retain raw IPs or create a row for each attacker-supplied binding/IP.
    const row=(await c.query('select buckets,extract(epoch from clock_timestamp())::bigint as now from carve_android_auth_v1.budget where id=1 for update nowait')).rows[0];
    const now=Number(row.now),buckets=Object.fromEntries(Object.entries(row.buckets).filter(([,b])=>b.until>now));
    const checks=[];
    for(const [group,limits]of Object.entries(quotaLimits)){
     if(typeof limits!=='object'||group!=='minute'&&!begin)continue;
     const duration=group==='beginHour'?3600:60,window=Math.floor(now/duration),until=(window+1)*duration;
     for(const [dimension,limit]of Object.entries(limits)){
      const key=dimension==='global'?'global':dimension==='ip'?ip:binding;if(key===null)continue;
      checks.push({key:group+':'+dimension+':'+key+':'+window,limit,until});
     }
    }
    let allowed=true;
    for(const check of checks){const n=buckets[check.key]?.count??0;if(n>=check.limit)allowed=false;}
    const missing=checks.filter(x=>!Object.hasOwn(buckets,x.key));
    if(Object.keys(buckets).length+missing.length>quotaLimits.keys)allowed=false;
    if(allowed)for(const check of checks)buckets[check.key]={count:(buckets[check.key]?.count??0)+1,until:check.until};
    await c.query('update carve_android_auth_v1.budget set buckets=$1 where id=1',[JSON.stringify(buckets)]);
    // Retention is confined to new temporary auth records; never player/results.
    await c.query('delete from carve_android_auth_v1.instances where expires_at<=clock_timestamp()');
    return allowed;
   }).catch(e=>{if(['55P03','57014'].includes(e.code))return false;throw e;});
  },
  async locate(id){return (await pool.query('select client_id,binding_hash from carve_android_auth_v1.flow_index where id=$1',[id])).rows[0]??null;},
  async atomic(client,binding,fn,{create=false}={}){
   if(client!=='carve-staging-android-v1'||!/^[a-f0-9]{64}$/.test(binding))fail('client_rejected',403);
   return transaction(async c=>{
    if(create){
     // Shared guard serializes creation so parallel valid bindings cannot exceed
     // the aggregate cap. Signout on an unknown binding never allocates state.
     await c.query('select id from carve_android_auth_v1.budget where id=1 for update');
     const existing=(await c.query('select 1 from carve_android_auth_v1.instances where client_id=$1 and binding_hash=$2',[client,binding])).rows.length;
     if(!existing){
      const count=Number((await c.query('select count(*) as n from carve_android_auth_v1.instances')).rows[0].n);
      if(count>=quotaLimits.instances)fail('rate_limited',429);
      await c.query('insert into carve_android_auth_v1.instances(client_id,binding_hash,data) values($1,$2,$3)',[client,binding,JSON.stringify(initial())]);
     }
    }
    const row=(await c.query('select data from carve_android_auth_v1.instances where client_id=$1 and binding_hash=$2 and expires_at>clock_timestamp() for update',[client,binding])).rows[0];
    if(!row)fail('handoff_rejected');
    const state=row.data;
    const result=await fn(state,{
     index:id=>c.query('insert into carve_android_auth_v1.flow_index(id,client_id,binding_hash) values($1,$2,$3)',[id,client,binding]),
     admit:async proof=>{if(!await admitted(c,proof))fail('tester_not_admitted',403);},
     principal:async proof=>{
      // FOR SHARE admission lock survives until session state commits. Removal
      // during beforeGrant is observed; removal after this lock waits for commit.
      if(!await admitted(c,proof))fail('tester_not_admitted',403);
      const principal=await resolvePrincipal(c,proof);
      if(!await admitted(c,proof))fail('tester_not_admitted',403);
      return principal;
     },
     sessionAllowed:proof=>admitted(c,proof)
    });
    await c.query('update carve_android_auth_v1.instances set data=$3 where client_id=$1 and binding_hash=$2',[client,binding,JSON.stringify(state)]);
    return result;
   });
  }
 };
}
