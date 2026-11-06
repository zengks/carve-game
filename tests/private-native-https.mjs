import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {request} from 'node:https';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createNativeIntegrationFixture,privateBrokerHost} from './lib/native-integration-fixture.mjs';

let admin=process.env.CARVE_NATIVE_TEST_ADMIN_URL;
if(!admin){
 const url=new URL(process.env.CARVE_TEST_DATABASE_URL??'http://invalid');
 if(url.hostname!=='127.0.0.1'||!url.pathname.startsWith('/carve_shared_test_'))throw Error('Isolated loopback test database required');
 url.pathname='/postgres';admin=url.href;
}
const directory=await mkdtemp(join(tmpdir(),'carve-private-https-'));
const token=()=>randomBytes(32).toString('base64url');
let fixture,cert;
const send=(path,{body,headers={},ca=cert,servername=privateBrokerHost}={})=>new Promise((resolve,reject)=>{
 const req=request({hostname:'127.0.0.1',port:fixture.httpsAddress.port,servername,ca,path,agent:false,
  method:body?'POST':'GET',headers:{Host:privateBrokerHost,...(body?{'Content-Type':'application/json'}:{}),...headers},timeout:3000},res=>{
  let text='';res.setEncoding('utf8');res.on('data',part=>{text+=part;});
  res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}));
  res.on('error',reject);
 });
 req.on('error',reject);req.on('timeout',()=>req.destroy(Error('private_broker_timeout')));
 req.end(body?JSON.stringify(body):undefined);
});

try{
 const keyPath=join(directory,'key.pem'),certPath=join(directory,'cert.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-keyout',keyPath,'-out',certPath,
  '-subj','/CN='+privateBrokerHost,'-addext','subjectAltName=DNS:'+privateBrokerHost],{stdio:'ignore'});
 cert=await readFile(certPath);
 const privateTls={key:await readFile(keyPath),cert};
 const privateIosAppId='ABCDEFGHIJ.com.carve.authqa.q0000000000000.staging';
 await assert.rejects(createNativeIntegrationFixture({adminConnectionString:admin,privateTls,privateIosAppId:'ABCDEFGHIJ.com.carve.production'}),/Isolated signed iOS/);
 fixture=await createNativeIntegrationFixture({adminConnectionString:admin,privateTls,privateIosAppId});
 assert.equal(fixture.httpsAddress.address,'127.0.0.1');
 await assert.rejects(send('/native/authorize',{ca:[]}),{code:'DEPTH_ZERO_SELF_SIGNED_CERT'});
 await assert.rejects(send('/native/authorize',{servername:'different.test'}),{code:'ERR_TLS_CERT_ALTNAME_INVALID'});
 assert.equal((await send('/native/authorize',{headers:{Host:'different.test'}})).status,421);
 assert.equal((await send('/_fixture')).status,404);
 const associationPath='/.well-known/apple-app-site-association';
 const association=await send(associationPath);
 assert.equal(association.status,200);
 assert.equal(association.headers['content-type'],'application/json');
 assert.equal(association.headers.location,undefined);
 assert.deepEqual(JSON.parse(association.text),{webcredentials:{apps:[privateIosAppId]}});
 assert.equal((await send(associationPath+'?unexpected=1')).status,404);

 for(const [platform,provider] of [['ios','apple'],['android','google']]){
  const client_id='fixture-'+platform,verifier=token(),state=token();
  const headers={'X-Carve-Native-Binding':token()};
  const call=(action,fields)=>send('/api/native-broker/v1',{headers,body:{contract_version:1,client_id,action,...fields}});
  const pending=await call('begin',{provider,intent:'signin',state,redirect_uri:fixture.return_targets[client_id],
   code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
  assert.equal(pending.status,200);
  const {authorize_url}=JSON.parse(pending.text),launch=new URL(authorize_url);
  assert.equal(launch.origin,'https://'+privateBrokerHost);
  const returned=await send(launch.pathname+launch.search);
  assert.equal(returned.status,303);
  assert.equal(returned.headers['cache-control'],'no-store');
  assert.equal(returned.headers['referrer-policy'],'no-referrer');
  const target=new URL(returned.headers.location);
  assert.equal(target.origin+target.pathname,fixture.return_targets[client_id]);
  assert.deepEqual([...target.searchParams.keys()].sort(),['code','state']);
  assert.equal(target.searchParams.get('state'),state);
  const exchange={provider,intent:'signin',state,verifier,code:target.searchParams.get('code')};
  assert.equal((await call('exchange',{...exchange,verifier:token()})).status,401);
  const signed=await call('exchange',exchange);
  assert.equal(signed.status,200);
  assert.equal(JSON.parse(signed.text).result,'signed_in');
  assert.equal(JSON.parse((await call('exchange',exchange)).text).error,'handoff_used');
 }
 const stats=await fixture.stats();
 assert.equal(stats.grants,2);
 assert.equal(stats.callbacks,2);
}finally{
 try{if(fixture){await fixture.close();await assert.rejects(send('/native/authorize'),{code:'ECONNREFUSED'});}}
 finally{await rm(directory,{recursive:true});}
}
console.log('PASS private HTTPS broker: local TLS and hostname verification, signed Apple/Google fixtures, exact app returns, PKCE and replay protection.');
