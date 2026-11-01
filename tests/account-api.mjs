import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {cookieCodec} from '../server/session.mjs';
import {createAccountHandler} from '../server/account.mjs';

const secret='ab'.repeat(32);let now=0;
const codec=cookieCodec(secret,{now:()=>now}),sealed=codec.seal({access_token:'secret'},'session',100);
assert.deepEqual(codec.open(sealed,'session'),{access_token:'secret'});
assert.equal(codec.open(sealed,'oauth'),null);assert.equal(codec.open(sealed.slice(0,-4)+'abcd','session'),null);
now=101;assert.equal(codec.open(sealed,'session'),null);
console.log('PASS account: encrypted, purpose-bound, expiring and tamper-resistant cookie');

const calls=[];
let authOutage=false;
const userA='11111111-1111-4111-8111-111111111111',userB='22222222-2222-4222-8222-222222222222';
const session={access_token:'token-a',refresh_token:'refresh-a',expires_at:Math.floor(Date.now()/1000)+3600};
const sdk=()=>({auth:{
  signInWithOtp:async value=>{calls.push(['email',value]);return {data:{},error:null};},
  verifyOtp:async value=>{calls.push(['verify',value]);return value.token==='123456'?{data:{session},error:null}:{data:{},error:{}};},
  getUser:async token=>authOutage?{data:{user:null},error:{status:503}}:{data:{user:{id:token==='token-a'?userA:userB}},error:null},
  refreshSession:async()=>({data:{session},error:null}),
  admin:{signOut:async(...args)=>{calls.push(['signout',...args]);}},
}});
let writes=0;
const database={read:async id=>({contract_version:1,player_id:id.subject,results:[]}),write:async(id,event)=>{writes++;return {contract_version:1,accepted:event.event_id,player_id:id.subject,results:[event]};}};
let origin;
const server=createServer((req,res)=>handler(req,res));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
origin='http://127.0.0.1:'+server.address().port;
const env={CARVE_APP_ORIGIN:origin,CARVE_SUPABASE_URL:'http://127.0.0.1:55521',CARVE_SUPABASE_PUBLISHABLE_KEY:'test-key',
  CARVE_SESSION_SECRET:secret,CARVE_SHARED_DATABASE_URL:'postgres://unused',CARVE_OAUTH_LINKING_REVIEWED:'true'};
let handler=createAccountHandler({env,authFactory:sdk,database});
const call=(path='/api/account',body,extra={})=>fetch(origin+path,{method:body?'POST':'GET',
  headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...extra},body:body?JSON.stringify(body):undefined});
try{
  let response=await call();assert.equal(response.headers.get('cache-control'),'private, no-store');
  let value=await response.json();assert.equal(value.account,null);assert.equal(value.providers.email,true);assert.equal(value.providers.apple,false);assert.equal(value.providers.google,false);
  response=await call('/api/account',{action:'oauth',provider:'google'});assert.equal(response.status,503,'environment flag cannot bypass unresolved linking gate');
  response=await call('/api/account',{action:'email',email:'player@example.test'},{Origin:'https://attacker.test'});assert.equal(response.status,403);assert.equal(calls.length,0);
  response=await call('/api/account',{action:'email',email:'player@example.test'});assert.equal(response.status,200);assert.equal(calls[0][0],'email');
  response=await call('/api/account',{action:'verify',email:'player@example.test',code:'000000'});assert.equal(response.status,401);assert.equal(response.headers.get('set-cookie'),null);
  response=await call('/api/account',{action:'verify',email:'player@example.test',code:'123456'});assert.equal(response.status,200);
  const raw=response.headers.get('set-cookie');assert(raw.includes('HttpOnly'));assert(raw.includes('SameSite=Lax'));assert(!raw.includes('token-a'));
  const cookie=raw.split(';')[0];value=await(await call('/api/account',undefined,{Cookie:cookie})).json();const scope=value.account.scope;
  assert(!JSON.stringify(value).includes('token-a'));assert.equal(scope.length,64);
  authOutage=true;response=await call('/api/account',undefined,{Cookie:cookie});assert.equal(response.status,503);assert.equal(response.headers.get('set-cookie'),null,'outage must preserve session for retry');authOutage=false;
  response=await call('/api/shared-progress',undefined,{Cookie:cookie,'X-Carve-Account':scope});assert.equal(response.status,200);
  response=await call('/api/shared-progress',undefined,{Cookie:cookie,'X-Carve-Account':'b'.repeat(64)});assert.equal(response.status,409);
  response=await call('/api/shared-progress',{player_id:userB},{Cookie:cookie,'X-Carve-Account':scope});assert.equal(response.status,400);assert.equal(writes,0);
  response=await call('/api/shared-progress');assert.equal(response.status,401);
  response=await call('/api/account',{action:'email',email:'x'.repeat(9000)});assert.equal(response.status,413);
  response=await call('/api/account',{action:'signout'},{Cookie:cookie});assert.equal(response.status,200);assert(response.headers.get('set-cookie').includes('Max-Age=0'));assert(calls.some(c=>c[0]==='signout'));
  const secureCodec=cookieCodec(secret);let header;
  secureCodec.write({getHeader:()=>undefined,setHeader:(_,v)=>{header=v;}},'session',session);assert(header[0].includes('__Host-carve-session='));assert(header[0].endsWith('; Secure'));
  let parsedStatus;
  await handler({url:'/api/account',method:'POST',headers:{origin,'content-type':'application/json'},body:{action:'email',email:'parsed@example.test'}},
    {setHeader(){},getHeader(){},set statusCode(v){parsedStatus=v;},end(){}});
  assert.equal(parsedStatus,200,'Vercel pre-parsed bodies use the same adapter');
  handler=createAccountHandler({env:{...env,VERCEL_ENV:'production'},authFactory:sdk,database});
  value=await(await call()).json();assert.equal(value.configured,false,'production activation blocked independently');
  handler=createAccountHandler({env:{}});value=await(await call()).json();assert.equal(value.configured,false);assert.equal(value.account,null);
  console.log('PASS account: email adapter, no browser tokens, same-origin guards, stale-account rejection, logout and preview-only gates');
}finally{await new Promise(resolve=>server.close(resolve));}
