import assert from 'node:assert/strict';
import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {indexedDB} from 'fake-indexeddb';
import pg from 'pg';
import {expeditionEvent} from '../shared/contract.mjs';
import {loadGame} from './harness.mjs';
import {createNativeProgressIntegrationFixture} from './lib/native-progress-fixture.mjs';

let admin=process.env.CARVE_NATIVE_TEST_ADMIN_URL;
if(!admin){
  const local=new URL(process.env.CARVE_TEST_DATABASE_URL??'http://invalid');
  if(local.hostname!=='127.0.0.1'||!local.pathname.startsWith('/carve_shared_test_'))throw Error('Fresh loopback QA database required');
  local.pathname='/postgres';admin=local.href;
}
const fixture = await createNativeProgressIntegrationFixture({adminConnectionString:admin,expedition:true});
const url = new URL(admin);url.pathname='/'+fixture.databaseName;
const pool = new pg.Pool({connectionString:url.href});
const network = globalThis.fetch;
const progressPath = '/api/expedition-progress?testing=true';
const token = () => randomBytes(32).toString('base64url');
const vectors = JSON.parse(await readFile(new URL('../shared/fixtures/expedition-scores-v1.json',import.meta.url)));
let checks = 0;
const check = (value,expected,label) => { assert.deepEqual(value,expected,label);checks++; };

async function qa(action,fields) {
  const reply = await network(fixture.qa_origin+'/_fixture',{method:'POST',
    headers:{'Content-Type':'application/json','X-Test-Capability':fixture.capability},body:JSON.stringify({action,...fields})});
  assert.equal(reply.status,200);
  return reply.json();
}
async function nativeRequest(path,client,body) {
  const reply=await network(fixture.origin+path,{method:'POST',headers:{
    'Content-Type':'application/json','X-Carve-Native-Binding':client.binding,
    ...(client.session?{Authorization:'Bearer '+client.session}:{})},
    body:JSON.stringify({contract_version:1,client_id:client.id,...body})});
  assert.equal(reply.headers.get('Cache-Control'),'no-store');
  return {status:reply.status,data:await reply.json()};
}
async function login(platform,identity='alpha') {
  const client={id:'fixture-'+platform,binding:token()};
  const call=(action,body)=>nativeRequest('/api/native-broker/v1',client,{action,...body});
  const verifier=token(),state=token(),provider='google',intent='signin';
  const started=await call('begin',{provider,intent,redirect_uri:fixture.return_targets[client.id],state,
    code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
  assert.equal(started.status,200);
  const result=await qa('complete',{identity,flow_id:started.data.flow_id});
  const granted=await call('exchange',{provider,intent,state,verifier,code:new URL(result.return_uri).searchParams.get('code')});
  assert.equal(granted.status,200);
  return {...client,session:granted.data.session_token,scope:granted.data.account_scope,player:granted.data.player_id};
}
function progress(client, event, testing=event?.payload.testing??true) {
  return nativeRequest('/api/native-progress/v1',client,{action:event?'expedition_write':'expedition_read',
    account_scope:client.scope,testing,...(event?{event}:{})});
}
const rows=async player=>Number((await pool.query("select count(*) from carve_shared_v1.completed_results where player_id=$1 and event_id like 'carve.expedition-v1:%'",[player])).rows[0].count);

const cookies=new Map(), $=id=>document.getElementById(id);
let writes=0, authURL, lostReply=false;
async function browserFetch(path,init={}) {
  const headers=new Headers(init.headers);
  if(init.method==='POST')headers.set('Origin',fixture.origin);
  if(cookies.size)headers.set('Cookie',[...cookies.values()].join('; '));
  const reply=await network(new URL(path,fixture.origin),{...init,headers,redirect:'manual'});
  for(const cookie of reply.headers.getSetCookie()){
    const pair=cookie.split(';')[0], name=pair.slice(0,pair.indexOf('='));
    if(/Max-Age=0(?:;|$)/.test(cookie))cookies.delete(name);else cookies.set(name,pair);
  }
  if(path===progressPath&&init.method==='POST'){
    writes++;
    if(lostReply){lostReply=false;await reply.arrayBuffer();throw Error('lost_reply');}
  }
  return reply;
}
const asModule=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
async function waitFor(check) {
  for(let i=0;i<100;i++){
    if(check())return;
    await new Promise(resolve=>setTimeout(resolve,5));
  }
  assert.fail($('account-status').textContent);
}
async function loadBrowserAccount() {
  const contract=new URL('../shared/contract.mjs',import.meta.url).href;
  const outbox=(await readFile(new URL('../src/storage/outbox.mjs',import.meta.url),'utf8')).replace('./contract.mjs',contract);
  const account=(await readFile(new URL('../src/storage/account.mjs',import.meta.url),'utf8'))
    .replace('./contract.mjs',contract).replace('./outbox.mjs',asModule(outbox));
  await import(asModule(account));
  $('account-open').onclick();
  await waitFor(()=>$('account-google').disabled===false);
}
async function browserSignIn(identity) {
  authURL=null;
  await $('account-google').onclick();
  assert(authURL,$('account-status').textContent);
  const grant=await qa('complete-web',{authorization_url:authURL,identity});
  const browser=await browserFetch(grant.return_uri);
  assert.equal(browser.headers.get('Location'),'/?terrain=1&account=return');
  $('account-open').onclick();
  await waitFor(()=>$('account-signed').hidden===false&&$('account-sync').disabled===false);
  const current=await (await browserFetch('/api/account')).json();
  assert(current.account);
  return current.account.scope;
}

try {
  const ios=await login('ios'), android=await login('android'), peer=await login('ios','beta');
  check(ios.player,android.player,'same documented account');
  const local=new Map(),game=loadGame({local,search:'?terrain=1'});
  game.Game.start();game.Journey.peak=4254;game.Game.score=1025;game.Game.time=55.432;game.Journey.finish('banked');
  const retained=game.Profile.records[0],web=expeditionEvent(retained,true);
  // Retain a high active record in the same profile to prove the UI omits it.
  game.Profile.records.push({...retained,id:'active-run',outcome:'active',height:900});
  game.Profile.save();
  const profileBefore=local.get(game.Profile.key);
  globalThis.indexedDB=indexedDB;
  globalThis.fetch=(path,init)=>typeof path==='string'&&path.startsWith('/')?browserFetch(path,init):network(path,init);
  globalThis.location.assign=value=>{authURL=value;};
  await loadBrowserAccount();
  check(writes,0,'local finish and opening Account send no result');
  const scope=await browserSignIn('alpha');
  check(scope,ios.scope,'signed browser and native resolve the same account');
  await $('account-sync').onclick();
  check((await progress(ios)).data.results,[],'sign-in/manual refresh never uploads guest scores');
  await $('account-import').onclick();
  check($('account-copy-review').hidden,false,'confirmation panel is visible');
  assert.match($('account-import-copy').textContent,/^Copy 1 completed Expedition result to /);
  check(await rows(ios.player),0,'opening the confirmation panel makes no database write');
  $('account-import-cancel').onclick();
  await $('account-import-confirm').onclick();
  check(writes,0,'cancelled confirmation cannot enqueue');
  check((await progress(android)).data.revision,0,'other device still sees no copied result');
  await $('account-import').onclick();
  lostReply=true;await $('account-import-confirm').onclick();
  check(writes,1,'confirm is the first upload');
  check((await progress(ios)).data.results,[web],'iOS reads the web score after confirmation');
  check((await progress(android)).data.results,[web],'Android reads the same confirmed web score');
  await $('account-sync').onclick();
  check(writes,2,'lost write reply retries the same approved result');
  check(await rows(ios.player),1,'lost reply never creates an extra row');
  check((await progress(android)).data.revision,1,'duplicate acknowledgment leaves revision unchanged');
  check(local.get(game.Profile.key),profileBefore,'source profile retained byte-for-byte');

  for(const [device,event] of [[ios,vectors.ios],[android,vectors.android]]){
    const reply=await progress(device,event);
    check(reply.status,200,'native route accepts completed run from its registered platform');
    check(reply.data.accepted_event,event,'native result retention returns full immutable receipt');
  }
  const webRead=async()=>browserFetch(progressPath,{headers:{'X-Carve-Account':scope}}).then(r=>r.json());
  const shared=await webRead();
  check(shared.results.map(r=>r.source_platform),vectors.ranked_after_copy,'stable ranking and native provenance across transports');
  check((await progress(ios)).data.results,shared.results,'both transports read identical records');
  check((await progress(peer)).data.results,[],'different account reads nothing');
  check((await progress(android,vectors.ios)).data.error,'platform_mismatch','native must claim registered provenance');
  const changed=structuredClone(vectors.ios);changed.payload.score++;
  check((await progress(ios,changed)).data.error,'event_conflict','different receipt cannot replace original');
  changed.payload.outcome='active';
  check((await progress(ios,changed)).data.error,'invalid_event','active result rejected server-side');
  check((await progress(ios,undefined,false)).data.results,[],'test and normal buckets separated');

  const generate=index=>{
    const event=structuredClone(vectors.ios);event.payload.run_id=randomUUID();
    event.event_id=event.course_id+':ios:'+event.payload.run_id;event.payload.height_m=500+index;return event;
  };
  const parallel=await Promise.all(Array.from({length:12},(_,i)=>progress(ios,generate(i))));
  check(parallel.map(r=>r.data.revision).sort((a,b)=>a-b),Array.from({length:12},(_,i)=>i+4),'each accepted write increments the same revision once');
  const ranked=(await webRead()).results;
  check(ranked.filter(e=>e.mode==='challenge').map(e=>e.payload.height_m),Array.from({length:10},(_,i)=>511-i),'top 10 independently capped by mode');
  check(ranked.filter(e=>e.mode==='practice'),[vectors.android],'Practice remains separate');
  check((await browserFetch('/api/shared-progress',{headers:{'X-Carve-Account':scope}}).then(r=>r.json())).results,[],'legacy web Flow remains separate');
  check((await nativeRequest('/api/native-progress/v1',ios,{action:'read',account_scope:scope,testing:true})).data.recent_events,[],'legacy First Ascent remains separate');

  await $('account-import').onclick();
  await $('account-signout').onclick();
  await browserSignIn('beta');
  await $('account-import-confirm').onclick();
  check(await rows(peer.player),0,'changing account clears the prior confirmation');
  check((await browserFetch(progressPath,{headers:{'X-Carve-Account':scope}})).status,409,'stale scope rejected by server');
  console.log(`PASS Expedition score sync: ${checks} assertions against actual HTTP and PostgreSQL, with signed synthetic OAuth and browser confirmation handlers.`);
} finally {
  globalThis.fetch=network;
  await pool.end();await fixture.close();
  await assert.rejects(network(fixture.origin));await assert.rejects(network(fixture.qa_origin));
}
