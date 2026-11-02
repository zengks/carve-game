import pg from 'pg';
import projects from '../config/hosted-projects.json' with {type:'json'};
import {postgresOptions} from './postgres.mjs';

// Operator-only staging readiness, behind unchanged Vercel protection. Never
// reads player data, writes records, applies migrations, or enables sign-in.
export const healthQuery=`select current_user='carve_runtime'
 and exists(select 1 from pg_roles where rolname=current_user and not rolsuper and not rolcreatedb and not rolcreaterole and not rolinherit and not rolreplication and not rolbypassrls)
 and not exists(select 1 from pg_auth_members where member=current_user::regrole::oid)
 and not has_schema_privilege(current_user,'carve_shared_v1','CREATE') as role_ok,
 (select count(*)=11 and bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='carve_shared_v1' and c.relkind='r') as schema_ok`;
export function createStorageHealthHandler({env=process.env,poolFactory=options=>new pg.Pool(options)}={}){
 let pool;
 const handler=async(req,res)=>{
  for(const [k,v]of Object.entries({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}))res.setHeader(k,v);
  const json=(code,body)=>{res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(body));};
  let client;
  try{
   const s=projects.staging;
   if(env.CARVE_STORAGE_HEALTH_ENABLED!=='true'||env.VERCEL_ENV!=='preview'||env.VERCEL_PROJECT_ID!==s.vercel_project_id||env.CARVE_APP_ORIGIN!==s.origin||env.CARVE_EXPECTED_PROJECT_REF!==s.supabase_project_ref||!env.CARVE_DATABASE_CA_CERT) return json(503,{error:'not_configured'});
   const u=new URL(req.url,s.origin);
   if(u.pathname!=='/api/storage-health'||u.search)return json(400,{error:'invalid_request'});
   if(req.method!=='GET'){res.setHeader('Allow','GET');return json(405,{error:'method_not_allowed'});}
   const options=postgresOptions(env.CARVE_SHARED_DATABASE_URL,{max:1,ca:env.CARVE_DATABASE_CA_CERT,projectRef:s.supabase_project_ref});
   pool??=poolFactory(options);client=await pool.connect();
   if(client.connection?.stream?.encrypted!==true||client.connection.stream.authorized!==true)throw Error('unverified_tls');
   const r=(await client.query(healthQuery)).rows[0];
   if(r?.role_ok!==true||r?.schema_ok!==true)throw Error('unexpected_database');
   json(200,{status:'ready',checks:{database:true,tls:true,schema:true,role:true},production_enabled:false});
  }catch{json(503,{error:'unavailable'});}
  finally{client?.release();}
 };
 handler.close=()=>pool?.end();return handler;
}
