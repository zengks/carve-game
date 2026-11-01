// TEST ENTRYPOINT ONLY. Production routes never import this module.
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import pg from 'pg';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {createOidc} from '../../server/oidc.mjs';
import {createNativeBrokerHandler} from '../../server/native-broker.mjs';
import {createNativeDatabase} from '../../server/native-database.mjs';
import {createNativeFetchHandler} from '../../server/native-vercel.mjs';
const secret=()=>randomBytes(32).toString('base64url');
export async function createNativeIntegrationFixture({artifactDirectory,adminConnectionString=process.env.CARVE_NATIVE_TEST_ADMIN_URL}={}){
 const adminURL=new URL(adminConnectionString??'http://invalid');
 if(adminURL.protocol!=='postgres:'||adminURL.hostname!=='127.0.0.1'||adminURL.pathname!=='/postgres')throw Error('Explicit loopback PostgreSQL admin URL required');
 const databaseName='carve_shared_test_native_'+randomUUID().replaceAll('-','');
 const admin=new pg.Pool({connectionString:adminURL.href});
 try{await admin.query('CREATE DATABASE '+databaseName);}finally{await admin.end();}
 const url=new URL(adminURL);url.pathname='/'+databaseName;
 const pool=new pg.Pool({connectionString:url.href});let db,server,qaServer;
 const capability=secret(),clockBase=Math.floor(Date.now()/1000)*1000;let clock=clockBase,hold=false,held=null,closed=false;
 const codes=new Map(),subjects={alpha:'synthetic-alpha-'+databaseName,beta:'synthetic-beta-'+databaseName,gamma:'synthetic-gamma-'+databaseName};
 let requests=0,callbacks=0,grant_attempts=0,trapHits=0;
 const client_ids=['fixture-ios','fixture-android'];
 const broker_url='https://broker.carve.example.test/native/authorize';
 const return_targets=Object.fromEntries(client_ids.map(id=>[id,'https://carve.example.test/'+id.slice(8)+'/return']));
 const closeServer=async s=>{if(s?.listening){s.closeAllConnections();await new Promise(r=>s.close(r));}};
 const close=async()=>{held?.release();held=null;await closeServer(qaServer);await closeServer(server);await db?.close();await pool.end();closed=true;return {listener_closed:true,database_connections_closed:true};};
 try{
  await pool.query(await readFile(new URL('../../server/schema.sql',import.meta.url),'utf8'));
  await pool.query(await readFile(new URL('../../server/native-schema.sql',import.meta.url),'utf8'));
  db=createNativeDatabase(url.href);
  const rsa=await generateKeyPair('RS256'),jwk={...await exportJWK(rsa.publicKey),kid:'isolated-native-key',alg:'RS256'};
  const env={CARVE_APP_ORIGIN:'https://broker.carve.example.test',CARVE_SESSION_SECRET:randomBytes(32).toString('hex'),CARVE_SHARED_DATABASE_URL:url.href,
   CARVE_NATIVE_CLIENTS:JSON.stringify(Object.fromEntries(client_ids.map(id=>[id,{redirect_uri:return_targets[id],broker_url}]))),
   CARVE_GOOGLE_CLIENT_ID:'synthetic-web-client',CARVE_GOOGLE_CLIENT_SECRET:secret(),
   CARVE_APPLE_SERVICE_ID:'synthetic-apple-service',CARVE_APPLE_TEAM_ID:'SYNTHETIC',CARVE_APPLE_KEY_ID:'isolated-native-key'};
  // Apple client-secret signing is exercised too; never a real developer key.
  const apple=await generateKeyPair('ES256',{extractable:true});
  const {exportPKCS8}=await import('jose');env.CARVE_APPLE_PRIVATE_KEY=await exportPKCS8(apple.privateKey);
  const oidc=createOidc(env,{now:()=>clock,keyResolvers:{apple:createLocalJWKSet({keys:[jwk]}),google:createLocalJWKSet({keys:[jwk]})},
   transport:async(_url,init)=>{
    const p=init.body,item=codes.get(p.get('code'));
    if(!item||item.used||p.get('redirect_uri')!==item.redirect||p.get('client_id')!==item.client)throw Error('synthetic_code_rejected');
    item.used=true;return Response.json({id_token:item.token});
   }});
  const handler=createNativeBrokerHandler({env,database:db,oidc,now:()=>clock,beforeGrant:async()=>{
   grant_attempts++;if(hold){hold=false;await new Promise(release=>{held={release};});}
  }});
  const fetchHandler=createNativeFetchHandler(handler);
  server=createServer(async(req,res)=>{
   requests++;if(req.url==='/_trap'){trapHits++;res.writeHead(400).end();return;}
   const request=new Request(env.CARVE_APP_ORIGIN+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
   const response=await fetchHandler(request);res.statusCode=response.status;
   for(const [k,v]of response.headers)if(k!=='set-cookie')res.setHeader(k,v);
   const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
   res.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const origin='http://127.0.0.1:'+server.address().port;
  const complete=async q=>{
   if(!/^[A-Za-z0-9_-]{43}$/.test(q.flow_id)||!Object.hasOwn(subjects,q.identity))throw Error('invalid_fixture_request');
   const launch=await fetch(origin+'/native/authorize?flow_id='+q.flow_id,{redirect:'manual'});
   if(launch.status!==303)return {status:launch.status,error:await launch.json()};
   const location=new URL(launch.headers.get('location')),provider=location.hostname==='appleid.apple.com'?'apple':'google';
   const redirect=location.searchParams.get('redirect_uri'),client=location.searchParams.get('client_id'),state=location.searchParams.get('state');
   if(redirect!==env.CARVE_APP_ORIGIN+'/api/native-broker/callback?provider='+provider)throw Error('unsafe_provider_callback');
   const age=q.proof_age_ms??0;if(!Number.isSafeInteger(age)||age<0||age>3600000)throw Error('invalid_proof_age');
   const token=await new SignJWT({nonce:location.searchParams.get('nonce'),email:'same-display@example.test',email_verified:true})
    .setProtectedHeader({alg:'RS256',kid:jwk.kid}).setIssuer(provider==='apple'?'https://appleid.apple.com':'https://accounts.google.com')
    .setSubject(subjects[q.identity]).setAudience(client).setIssuedAt(Math.floor((clock-age)/1000)).setExpirationTime(Math.floor(clock/1000)+300).sign(rsa.privateKey);
   const code=secret();codes.set(code,{token,redirect,client});
   const cookies=new Map();const remember=r=>{for(const value of r.headers.getSetCookie()){const [kv]=value.split(';');const at=kv.indexOf('=');cookies.set(kv.slice(0,at),kv.slice(at+1));}};
   remember(launch);const cookie=()=>[...cookies].map(([k,v])=>k+'='+v).join('; ');
   const path=new URL(redirect).pathname+new URL(redirect).search;
   let callback;
   if(provider==='apple'){
    const staged=await fetch(origin+path,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,state})});
    if(staged.status!==303)throw Error('apple_stage_'+staged.status);remember(staged);
    callback=await fetch(origin+staged.headers.get('location'),{redirect:'manual',headers:{Cookie:cookie()}});
   }else callback=await fetch(origin+path+'&'+new URLSearchParams({code,state}),{redirect:'manual',headers:{Cookie:cookie()}});
   callbacks++;if(callback.status!==303)return {status:callback.status,error:await callback.json()};
   const target=callback.headers.get('location');const u=new URL(target);
   if(!Object.values(return_targets).includes(u.origin+u.pathname)||[...u.searchParams.keys()].sort().join(',')!=='code,state')throw Error('unsafe_app_callback');
   return {return_uri:target};
  };
  const stats=async()=>{
   const players=Number((await pool.query('select count(*) from carve_shared_v1.players')).rows[0].count);
   const identities=Number((await pool.query('select count(*) from carve_shared_v1.identities')).rows[0].count);
   const rows=(await pool.query('select data from carve_shared_v1.native_instances')).rows;
   const sessions=rows.flatMap(r=>Object.values(r.data.sessions));
   return {requests,callbacks,grant_attempts,grants:sessions.length,players,identities,active_sessions:sessions.filter(s=>!s.revoked&&s.until>clock).length,held:!!held,trap_hits:trapHits,database_isolated:true};
  };
  qaServer=createServer(async(req,res)=>{
   res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
   try{
    if(req.method!=='POST'||req.url!=='/_fixture'||req.headers['x-test-capability']!==capability){res.writeHead(403).end('{}');return;}
    let raw='',size=0;for await(const p of req){size+=p.length;if(size>8192)throw Error('too_large');raw+=p;}
    const q=JSON.parse(raw);let result;
    if(q.action==='complete')result=await complete(q);
    else if(q.action==='advance'){if(!Number.isSafeInteger(q.ms)||q.ms<0||q.ms>3600000)throw Error('invalid_clock');clock+=q.ms;}
    else if(q.action==='hold')hold=true;
    else if(q.action==='release'){held?.release();held=null;}
    else if(q.action!=='stats')throw Error('invalid_action');
    res.end(JSON.stringify(result??await stats()));
   }catch{res.writeHead(400).end('{"error":"fixture_rejected"}');}
  });
  await new Promise((resolve,reject)=>{qaServer.once('error',reject);qaServer.listen(0,'127.0.0.1',resolve);});
  const qa_origin='http://127.0.0.1:'+qaServer.address().port;
  if(artifactDirectory){await mkdir(artifactDirectory,{recursive:true,mode:0o700});await writeFile(join(artifactDirectory,'isolation.json'),JSON.stringify({database:databaseName,created_fresh:true,retained:true,origin,qa_origin},null,2),{mode:0o600});}
  return {kind:'actual-native-broker',isolation:{fresh:true,retained_data_access:false},origin,qa_origin,capability,client_ids,broker_url,return_targets,stats,close,databaseName,closed:()=>closed};
 }catch(e){await close();throw e;}
}
