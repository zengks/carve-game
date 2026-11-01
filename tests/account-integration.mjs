// Explicit opt-in, new isolated containers only. Never points at retained Stage D.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createServer} from 'node:http';
import {createClient} from '@supabase/supabase-js';
import {readFile} from 'node:fs/promises';
import {createAccountHandler} from '../server/account.mjs';
import {createDatabase} from '../server/database.mjs';
const dburl=process.env.CARVE_TEST_DATABASE_URL,secret=process.env.CARVE_TEST_AUTH_SECRET;
if(!dburl||new URL(dburl).hostname!=='127.0.0.1'||!new URL(dburl).pathname.startsWith('/carve_shared_test_')||!secret)throw Error('Isolated test database and Auth secret required');
const token=role=>{
  const head=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const body=Buffer.from(JSON.stringify({role,iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
  return head+'.'+body+'.'+createHmac('sha256',secret).update(head+'.'+body).digest('base64url');
};
const db=createDatabase(dburl);let handler;
const server=createServer(async(req,res)=>{
  if(!req.url.startsWith('/auth/v1/'))return handler(req,res);
  try{
    let bytes=[];for await(const part of req)bytes.push(part);
    const reply=await fetch('http://127.0.0.1:55521'+req.url.slice('/auth/v1'.length),{method:req.method,
      headers:{'Content-Type':'application/json',Authorization:req.headers.authorization??''},
      body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(bytes)});
    res.writeHead(reply.status,{'Content-Type':'application/json'});res.end(await reply.text());
  }catch{res.writeHead(503).end('{}');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
handler=createAccountHandler({env:{CARVE_APP_ORIGIN:origin,CARVE_SUPABASE_URL:origin,
  CARVE_SUPABASE_PUBLISHABLE_KEY:token('anon'),CARVE_SHARED_DATABASE_URL:dburl,CARVE_SESSION_SECRET:'cd'.repeat(32)},database:db});
const admin=createClient(origin,token('service_role'),{auth:{persistSession:false,autoRefreshToken:false}});
const call=(path,body,cookie,scope)=>fetch(origin+path,{method:body?'POST':'GET',headers:{
  ...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{}),...(scope?{'X-Carve-Account':scope}:{})},body:body?JSON.stringify(body):undefined});
async function login(email) {
  const generated=await admin.auth.admin.generateLink({type:'magiclink',email});
  assert.equal(generated.error,null,'new isolated Auth must generate a synthetic email code');
  const verified=await call('/api/account',{action:'verify',email,code:generated.data.properties.email_otp});
  assert.equal(verified.status,200);const cookie=verified.headers.get('set-cookie').split(';')[0];
  const info=await(await call('/api/account',undefined,cookie)).json();assert(info.account.scope);
  return {cookie,scope:info.account.scope};
}
try{
  const id=crypto.randomUUID(),email='carve-'+id+'@example.test';
  const sent=await call('/api/account',{action:'email',email});assert.equal(sent.status,200);
  const mail=await(await fetch('http://127.0.0.1:55524/api/v1/messages')).json();
  const delivered=mail.messages.find(m=>m.To?.some(t=>t.Address===email));assert(delivered,'mail captured only in isolated Mailpit');
  const contents=await(await fetch('http://127.0.0.1:55524/api/v1/message/'+delivered.ID)).json();
  const actualCode=contents.HTML.match(/<strong>(\d{6,10})<\/strong>/)?.[1];assert(actualCode,'configure confirmation and magic-link templates to include .Token');
  const verified=await call('/api/account',{action:'verify',email,code:actualCode});assert.equal(verified.status,200);
  const cookie=verified.headers.get('set-cookie').split(';')[0];const info=await(await call('/api/account',undefined,cookie)).json();
  const a={cookie,scope:info.account.scope},b=await login('carve-other-'+id+'@example.test');assert.notEqual(a.scope,b.scope);
  const event=JSON.parse(await readFile(new URL('../shared/fixtures/web-flow-v1.json',import.meta.url),'utf8'));
  event.payload.run_id=id;event.event_id=event.course_id+':'+id;
  let reply=await call('/api/shared-progress',event,a.cookie,a.scope);assert.equal(reply.status,200);const data=await reply.json();
  assert.equal(data.validation,'client_reported');assert.equal(data.results.length,1);assert.equal(data.account_scope,a.scope);
  reply=await call('/api/shared-progress',event,a.cookie,a.scope);assert.equal(reply.status,200);assert.equal((await reply.json()).results.length,1);
  reply=await call('/api/shared-progress',event,b.cookie,a.scope);assert.equal(reply.status,409,'stale tab cannot upload to newly signed-in user');
  const bdata=await(await call('/api/shared-progress',undefined,b.cookie,b.scope)).json();assert.equal(bdata.results.length,0);
  const again=await login(email);assert.equal(again.scope,a.scope,'same identity returns to original player scope');
  const againData=await(await call('/api/shared-progress',undefined,again.cookie,again.scope)).json();assert.equal(againData.player_id,data.player_id);assert.equal(againData.results.length,1);
  reply=await call('/api/account',{action:'signout'},again.cookie);assert.equal(reply.status,200);assert(reply.headers.get('set-cookie').includes('Max-Age=0'));
  console.log('PASS isolated end-to-end: real Supabase email OTP, captured email, encrypted browser session, Postgres result/progress, duplicate retry, account switch and re-login persistence');
  console.log('Apple/Google remain code-gated; no real provider, hosted service or payment used. Synthetic test users/data retained.');
}finally{await new Promise(resolve=>server.close(resolve));await db.close();}
