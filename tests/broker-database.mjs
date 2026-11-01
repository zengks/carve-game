import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {generateKeyPair,exportJWK,exportPKCS8,createLocalJWKSet,SignJWT} from 'jose';
import {createAccountHandler} from '../server/account.mjs';
import {createOidc} from '../server/oidc.mjs';
import {createDatabase} from '../server/database.mjs';
import {cookieCodec} from '../server/session.mjs';

const connectionString=process.env.CARVE_TEST_DATABASE_URL;
if(!connectionString||new URL(connectionString).hostname!=='127.0.0.1'||!new URL(connectionString).pathname.startsWith('/carve_shared_test_'))throw Error('New isolated loopback database required');
const pool=new pg.Pool({connectionString}),db=createDatabase(connectionString);
await pool.query(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));
const pair=await generateKeyPair('RS256'),apple=await generateKeyPair('ES256',{extractable:true});
const publicKey={...await exportJWK(pair.publicKey),alg:'RS256',kid:'synthetic'};
const run=crypto.randomUUID(),subjects={a:crypto.randomUUID(),b:crypto.randomUUID()};
const env={CARVE_SUPABASE_URL:'https://isolated-auth.test',CARVE_SUPABASE_PUBLISHABLE_KEY:'test-only',
  CARVE_SHARED_DATABASE_URL:connectionString,CARVE_SESSION_SECRET:'ef'.repeat(32),
  CARVE_GOOGLE_CLIENT_ID:'google-web',CARVE_GOOGLE_CLIENT_SECRET:'test-only',CARVE_APPLE_SERVICE_ID:'apple-web',
  CARVE_APPLE_TEAM_ID:'TESTTEAM',CARVE_APPLE_KEY_ID:'test-key',CARVE_APPLE_PRIVATE_KEY:await exportPKCS8(apple.privateKey)};
const codes=new Map();let exchanged=0;
const oidc=createOidc(env,{keyResolvers:{google:createLocalJWKSet({keys:[publicKey]}),apple:createLocalJWKSet({keys:[publicKey]})},transport:async(url,options)=>{
  const entry=codes.get(options.body.get('code'));assert(entry,'unknown synthetic code');exchanged++;
  if(entry.gate){entry.gate.enter();await entry.gate.wait;}
  if(entry.provider==='google')assert.equal(options.body.get('code_verifier'),entry.verifier);
  return Response.json({id_token:entry.token});
}});
const sdk=()=>({auth:{
  signInWithOtp:async()=>({error:null}),
  verifyOtp:async({email,token})=>token==='123456'?{data:{session:{access_token:email}},error:null}:{data:{},error:{}},
  getUser:async email=>({data:{user:{id:email.startsWith('a@')?subjects.a:subjects.b,email,email_confirmed_at:new Date().toISOString()}},error:null}),
  admin:{signOut:async()=>({error:null})},
}});
let handler;const server=createServer((req,res)=>handler(req,res));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;env.CARVE_APP_ORIGIN=origin;
handler=createAccountHandler({env,database:db,authFactory:sdk,oidc});
const jar=()=>new Map();
async function call(cookies,path='/api/account',data,scope,{headers={},form}={}){
  const response=await fetch(origin+path,{method:data||form?'POST':'GET',redirect:'manual',headers:{
    Cookie:[...cookies].map(([k,v])=>k+'='+v).join('; '),
    ...(data||form?{Origin:origin,'Content-Type':form?'application/x-www-form-urlencoded':'application/json'}:{}),
    ...(scope?{'X-Carve-Account':scope}:{}),...headers},body:form??(data?JSON.stringify(data):undefined)});
  for(const cookie of response.headers.getSetCookie()){
    const [part]=cookie.split(';'),at=part.indexOf('='),key=part.slice(0,at),value=part.slice(at+1);
    if(cookie.includes('Max-Age=0'))cookies.delete(key);else cookies.set(key,value);
  }return response;
}
const info=async cookies=>(await call(cookies)).json();
async function emailLogin(cookies,email){assert.equal((await call(cookies,'/api/account',{action:'verify',email,code:'123456'})).status,200);return (await info(cookies)).account;}
async function start(cookies,provider='google',intent='oauth',scope){
  const response=await call(cookies,'/api/account',{action:intent,provider},scope);assert.equal(response.status,200);
  const location=new URL((await response.json()).url),id=location.searchParams.get('state');
  const flow=(await pool.query('select data from carve_shared_v1.auth_flows where id=$1',[id])).rows[0].data;
  assert.equal(flow.client_id,provider==='apple'?'apple-web':'google-web');return flow;
}
async function code(flow,subject,extra={}){
  const value=crypto.randomUUID(),time=Math.floor(Date.now()/1000);
  const token=await new SignJWT({iss:flow.provider==='google'?'https://accounts.google.com':'https://appleid.apple.com',
    aud:flow.client_id,sub:subject,nonce:flow.nonce,iat:time,exp:time+300,email:'a@example.test',email_verified:true,...extra})
    .setProtectedHeader({alg:'RS256',kid:'synthetic'}).sign(pair.privateKey);
  codes.set(value,{token,verifier:flow.verifier,provider:flow.provider});return value;
}
function hold(value){
  let enter,release;const entered=new Promise(r=>{enter=r;}),wait=new Promise(r=>{release=r;});
  codes.get(value).gate={enter,wait,release};
  return {entered:()=>Promise.race([entered,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('exchange did not reach barrier')),3000);timer.unref();})]),release};
}
async function callback(cookies,flow,subject,extra={}){
  const params=new URLSearchParams({state:flow.id,code:await code(flow,subject,extra)});
  if(flow.provider==='apple'){
    const before=exchanged;
    const staged=await call(new Map(),'/api/account?provider_return=apple',undefined,undefined,{form:params.toString(),headers:{Origin:'https://appleid.apple.com'}});
    assert.equal(staged.status,303);assert.equal(exchanged,before,'cross-site POST must not verify or grant');
    for(const raw of staged.headers.getSetCookie()){const p=raw.split(';')[0],at=p.indexOf('=');cookies.set(p.slice(0,at),p.slice(at+1));}
    return call(cookies,staged.headers.get('location'));
  }
  return call(cookies,'/api/account?provider_return=google&'+params);
}
const signedIn=response=>assert.equal(response.headers.get('location'),'/?flow=1&account=return');
try{
  const a=jar(),aInfo=await emailLogin(a,'a@example.test'),g=jar();
  const gFlow=await start(g);signedIn(await callback(g,gFlow,'g-owned-'+run));const gInfo=(await info(g)).account;
  assert.notEqual(aInfo.scope,gInfo.scope,'equal provider emails never merge players');
  const fixture=JSON.parse(await readFile(new URL('../shared/fixtures/web-flow-v1.json',import.meta.url),'utf8'));
  fixture.payload.run_id=run;fixture.event_id=fixture.course_id+':'+run;
  assert.equal((await call(a,'/api/shared-progress',fixture,aInfo.scope)).status,200);
  const conflicting=await start(a,'google','link-provider',aInfo.scope);
  assert.equal((await callback(a,conflicting,'g-owned-'+run)).headers.get('location'),'/?flow=1&account=confirm-link');
  assert((await info(a)).link_offer);assert.equal((await call(a,'/api/account',{action:'confirm-link'},aInfo.scope)).status,409);
  assert.equal((await info(a)).account.scope,aInfo.scope);assert.equal((await info(g)).account.scope,gInfo.scope);
  await call(a,'/api/account',{action:'cancel-link'},aInfo.scope);
  const connecting=await start(a,'google','link-provider',aInfo.scope);
  await callback(a,connecting,'g-new-'+run);
  assert.equal(Number((await pool.query('select count(*) from carve_shared_v1.identities where issuer=$1 and subject=$2',['https://accounts.google.com','g-new-'+run])).rows[0].count),0,'proof return stages only; explicit confirmation required');
  assert.equal((await call(a,'/api/account',{action:'confirm-link'},aInfo.scope)).status,200);
  assert((await info(a)).account.linked.includes('google'));
  const g2=jar();signedIn(await callback(g2,await start(g2),'g-new-'+run));
  assert.equal((await info(g2)).account.scope,aInfo.scope,'linked Google reaches original scope');
  assert.equal((await(await call(g2,'/api/shared-progress',undefined,aInfo.scope)).json()).results.length,1);
  // Email can be added to a Google-created account without replacing its session.
  assert.equal((await call(g,'/api/account',{action:'link-email-verify',email:'b@example.test',code:'123456'},gInfo.scope)).status,200);
  assert.equal((await call(g,'/api/account',{action:'confirm-link'},gInfo.scope)).status,200);
  const b=jar(),bInfo=await emailLogin(b,'b@example.test');assert.equal(bInfo.scope,gInfo.scope);
  // A callback cannot revive a guest or older signed-in generation.
  const race=jar(),old=await start(race),oldCookies=new Map(race);await emailLogin(race,'a@example.test');
  race.set('carve-local-oauth',oldCookies.get('carve-local-oauth'));
  const before=exchanged;assert.equal((await callback(race,old,'never-owned-'+run)).headers.get('location'),'/?flow=1&account=provider-error');assert.equal(exchanged,before);
  const oldLink=await start(a,'google','link-provider',aInfo.scope);await callback(a,oldLink,'stale-'+run);const staleCookie=a.get('carve-local-link');
  await call(a,'/api/account',{action:'signout'});await emailLogin(a,'a@example.test');a.set('carve-local-link',staleCookie);
  assert.equal((await call(a,'/api/account',{action:'confirm-link'},aInfo.scope)).status,409,'reauthenticated same account cannot reuse old offer');
  // Apple POST uses a staged receipt; missing original browser cookie cannot grant.
  const app=jar(),appleFlow=await start(app,'apple');signedIn(await callback(app,appleFlow,'apple-'+run));
  const missing=await start(jar(),'apple'),params=new URLSearchParams({state:missing.id,code:await code(missing,'missing-'+run)});
  const stray=jar();await call(stray,'/api/account?provider_return=apple',undefined,undefined,{form:params.toString(),headers:{Origin:'https://appleid.apple.com'}});
  const count=exchanged;assert.equal((await call(stray,'/api/account?provider_finalize=apple')).headers.get('location'),'/?flow=1&account=provider-error');assert.equal(exchanged,count);
  assert.equal((await call(jar(),'/api/account?provider_return=apple',undefined,undefined,{form:'state='+appleFlow.id+'&state='+appleFlow.id+'&code=x'})).status,400);
  const replay=new Map(oldCookies);assert.equal((await callback(replay,old,'never-owned-'+run)).headers.get('location'),'/?flow=1&account=provider-error');
  const invalid=await start(a,'google','link-provider',aInfo.scope);
  assert.equal((await callback(a,invalid,'wrong-nonce-'+run,{nonce:'wrong'})).headers.get('location'),'/?flow=1&account=provider-error');assert.equal((await info(a)).account.scope,aInfo.scope);
  const generations=await start(a),generationCookie=a.get('carve-local-oauth');
  await emailLogin(a,'b@example.test');await emailLogin(a,'a@example.test');a.set('carve-local-oauth',generationCookie);
  const generationCount=exchanged;assert.equal((await callback(a,generations,'wrong-generation-'+run)).headers.get('location'),'/?flow=1&account=provider-error');assert.equal(exchanged,generationCount);
  const cancelled=await start(a),cancelCount=exchanged;
  assert.equal((await call(a,'/api/account?provider_return=google&state='+cancelled.id+'&error=access_denied')).headers.get('location'),'/?flow=1&account=provider-error');assert.equal(exchanged,cancelCount);
  const wrongRoute=await start(a),routeCode=await code(wrongRoute,'route-'+run);
  await call(a,'/api/account?provider_return=apple',undefined,undefined,{form:new URLSearchParams({state:wrongRoute.id,code:routeCode}).toString()});
  assert.equal((await call(a,'/api/account?provider_finalize=apple')).headers.get('location'),'/?flow=1&account=provider-error');assert.equal(exchanged,cancelCount);
  const expired=await start(a);await pool.query("update carve_shared_v1.auth_flows set expires_at=now()-interval '1 second' where id=$1",[expired.id]);
  assert.equal((await callback(a,expired,'expired-'+run)).headers.get('location'),'/?flow=1&account=provider-error');
  // Provider exchange is intentionally held while other tab actions complete.
  // A pre-exchange binding check alone cannot protect these interleavings.
  for(const action of ['guest-login','A-B-A','logout']){
    const tab=jar();if(action!=='guest-login')await emailLogin(tab,'a@example.test');
    const flow=await start(tab),subject='late-'+action+'-'+run,value=await code(flow,subject),gate=hold(value);
    const pending=call(tab,'/api/account?provider_return=google&'+new URLSearchParams({state:flow.id,code:value}));
    await gate.entered();
    if(action==='guest-login')await emailLogin(tab,'a@example.test');
    else if(action==='A-B-A'){await emailLogin(tab,'b@example.test');await emailLogin(tab,'a@example.test');}
    else await call(tab,'/api/account',{action:'signout'});
    gate.release();assert.equal((await pending).headers.get('location'),'/?flow=1&account=provider-error');
    assert.equal((await info(tab)).account?.scope??null,action==='logout'?null:aInfo.scope);
    assert.equal(Number((await pool.query('select count(*) from carve_shared_v1.identities where issuer=$1 and subject=$2',['https://accounts.google.com',subject])).rows[0].count),0,'late proof cannot create an identity after intent cancellation');
    assert.equal((await pool.query('select result_session_id from carve_shared_v1.auth_flows where id=$1',[flow.id])).rows[0].result_session_id,null);
  }
  const completedFlowJar=jar(),completedFlow=await start(completedFlowJar);
  const browser=cookieCodec(env.CARVE_SESSION_SECRET,{secure:false}).read({headers:{cookie:[...completedFlowJar].map(([k,v])=>k+'='+v).join('; ')}},'oauth');
  signedIn(await callback(completedFlowJar,completedFlow,'completed-then-cancelled-'+run));
  const committedScope=(await info(completedFlowJar)).account.scope;
  await db.invalidateFlow(completedFlow.id,browser.browser);
  assert.equal((await info(completedFlowJar)).account,null,'cancelling a flow with a committed result revokes the issued session');
  assert.equal((await call(completedFlowJar,'/api/shared-progress',undefined,committedScope)).status,401,'replayed issued cookie cannot read progress');
  const baseProof={issuer:'https://accounts.google.com',subject:'two-returns-'+run,label:'Google',provider:'google'};
  const sharedInitiator=await db.createSession(baseProof),otherDevice=await db.createSession(baseProof);
  const finalFlows=[0,1].map(()=>({...oidc.begin('google',origin).flow,intent:'signin',initiator_session:sharedInitiator}));
  for(const flow of finalFlows){await db.startFlow(flow,'test-browser');await db.consumeFlow(flow.id,'test-browser');}
  const completions=await Promise.allSettled(finalFlows.map((flow,i)=>db.createSession({...baseProof,subject:baseProof.subject+'-'+i},{flow_id:flow.id,browser:'test-browser'})));
  assert.equal(completions.filter(c=>c.status==='fulfilled').length,1,'one initiator session permits at most one final grant');
  assert(completions.some(c=>c.status==='rejected'&&c.reason.message==='account_changed'));
  assert(await db.session(otherDevice),'another device session survives replacement');
  const lockedFlow={...oidc.begin('google',origin).flow,intent:'signin',initiator_session:null};
  await db.startFlow(lockedFlow,'locked-browser');await db.consumeFlow(lockedFlow.id,'locked-browser');
  const flowLock=await pool.connect();await flowLock.query('begin');await flowLock.query('select id from carve_shared_v1.auth_flows where id=$1 for update',[lockedFlow.id]);
  const finalGrant=db.createSession({...baseProof,subject:'locked-result-'+run},{flow_id:lockedFlow.id,browser:'locked-browser'}).then(id=>({id}),e=>({error:e.message}));
  const cancelGrant=db.invalidateFlow(lockedFlow.id,'locked-browser');
  let flowWaiters=false;
  for(let i=0;i<100;i++){
    const q=await pool.query("select count(*) from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query like '%carve_shared_v1.auth_flows%'");
    if(Number(q.rows[0].count)>=2){flowWaiters=true;break;}await new Promise(r=>setTimeout(r,5));
  }
  await flowLock.query('commit');flowLock.release();assert(flowWaiters,'grant and cancellation both reached the held flow lock');
  const finalState=await finalGrant;await cancelGrant;
  if(finalState.id)assert.equal(await db.session(finalState.id),null);else assert.equal(finalState.error,'flow_rejected');
  assert.equal((await pool.query('select cancelled from carve_shared_v1.auth_flows where id=$1',[lockedFlow.id])).rows[0].cancelled,true);
  assert(await db.session(otherDevice),'other device remains valid after flow cancellation');
  // Atomic collision: concurrent explicit links cannot move an identity.
  const proof={issuer:'https://accounts.google.com',subject:'concurrent-'+run,label:'Google',provider:'google'};
  const pa=await db.session((await pool.query('select id from carve_shared_v1.broker_sessions where issuer=$1 and subject=$2 and not revoked order by authenticated_at desc limit 1',[env.CARVE_SUPABASE_URL,subjects.a])).rows[0].id);
  const pb=await db.session((await pool.query('select id from carve_shared_v1.broker_sessions where issuer=$1 and subject=$2 and not revoked order by authenticated_at desc limit 1',[env.CARVE_SUPABASE_URL,subjects.b])).rows[0].id);
  const offers=await Promise.all([db.createOffer(pa,proof),db.createOffer(pb,proof)]);
  const settled=await Promise.allSettled([db.confirmLink(offers[0],pa),db.confirmLink(offers[1],pb)]);
  assert.equal(settled.filter(r=>r.status==='fulfilled').length,1);assert(settled.some(r=>r.status==='rejected'&&r.reason.message==='identity_already_owned'));
  const winner=settled.findIndex(r=>r.status==='fulfilled');
  assert.equal((await db.confirmLink(offers[winner],[pa,pb][winner])).scope,[pa,pb][winner].scope,'lost confirmation reply can be retried idempotently');
  const cancelledOffer=await db.createOffer(pa,{...proof,subject:'cancel-'+run});await db.cancelOffer(cancelledOffer,pa);
  await assert.rejects(db.confirmLink(cancelledOffer,pa),/link_offer_expired/);
  const expiredOffer=await db.createOffer(pa,{...proof,subject:'expired-offer-'+run});
  await pool.query("update carve_shared_v1.link_offers set expires_at=now()-interval '1 second' where id=$1",[expiredOffer]);
  await assert.rejects(db.confirmLink(expiredOffer,pa),/link_offer_expired/);
  // Logout holding the row wins before a delayed confirmation can mutate ownership.
  const revocable=await db.createSession({issuer:'https://accounts.google.com',subject:'revoke-'+run,label:'Google',provider:'google'});
  const revokedActor=await db.session(revocable),revokedProof={...proof,subject:'must-not-link-'+run};
  const offer=await db.createOffer(revokedActor,revokedProof),lock=await pool.connect();
  await lock.query('begin');await lock.query('update carve_shared_v1.broker_sessions set revoked=true where id=$1',[revocable]);
  const waiting=db.confirmLink(offer,revokedActor).then(()=>({ok:true}),e=>({error:e.message}));
  let blocked=false;
  for(let i=0;i<100;i++){
    const check=await pool.query("select count(*) from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query like '%broker_sessions%for update%'");
    if(Number(check.rows[0].count)>0){blocked=true;break;}await new Promise(r=>setTimeout(r,5));
  }
  await lock.query('commit');lock.release();assert(blocked,'confirmation serialized behind revocation row lock');
  assert.equal((await waiting).error,'link_offer_expired');
  assert.equal(Number((await pool.query('select count(*) from carve_shared_v1.identities where issuer=$1 and subject=$2',[revokedProof.issuer,revokedProof.subject])).rows[0].count),0);
  console.log('PASS broker/database: signed Google/Apple flows, email linking, no email joins, explicit consent, stable data ownership, collision/replay/nonce/Apple staging and revoked-session races');
}finally{for(const e of codes.values())e.gate?.release();await new Promise(resolve=>server.close(resolve));await db.close();await pool.end();}
