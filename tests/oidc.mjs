import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT,jwtVerify} from 'jose';
import {createOidc} from '../server/oidc.mjs';
import {createHash} from 'node:crypto';

const keys=await generateKeyPair('RS256'),appleSecret=await generateKeyPair('ES256',{extractable:true});
const {exportPKCS8}=await import('jose');
const jwk={...await exportJWK(keys.publicKey),kid:'test-rsa',alg:'RS256'};
const env={CARVE_GOOGLE_CLIENT_ID:'google-web',CARVE_GOOGLE_CLIENT_SECRET:'synthetic-secret',
  CARVE_APPLE_SERVICE_ID:'apple-web',CARVE_APPLE_TEAM_ID:'TESTTEAM',CARVE_APPLE_KEY_ID:'test-key',
  CARVE_APPLE_PRIVATE_KEY:await exportPKCS8(appleSecret.privateKey)};
const resolvers={google:createLocalJWKSet({keys:[jwk]}),apple:createLocalJWKSet({keys:[jwk]})};
const timestamp=Math.floor(Date.now()/1000);
const sign=claims=>new SignJWT({iss:'https://accounts.google.com',aud:'google-web',sub:'google-user',iat:timestamp,
  exp:timestamp+300,nonce:'expected',email:'same@example.test',email_verified:true,...claims})
  .setProtectedHeader({alg:'RS256',kid:'test-rsa'}).sign(keys.privateKey);
const oidc=createOidc(env,{keyResolvers:resolvers});
assert.equal((await oidc.verify('google',await sign({}),'expected')).subject,'google-user');
assert.equal((await oidc.verify('google',await sign({iss:'accounts.google.com'}),'expected')).issuer,'https://accounts.google.com');
for(const bad of [{iss:'https://evil.test'},{aud:'other-app'},{aud:['google-web','another']},{azp:'android-client'},
  {exp:timestamp-300},{iat:timestamp+300},{iat:timestamp-4000},{nonce:'other'},{nonce:undefined},{sub:''},{sub:22},
  {aud:undefined},{iat:undefined},{exp:undefined},{sub:' '},{sub:'\n'},{sub:'nonascii-你好'}])await assert.rejects(oidc.verify('google',await sign(bad),'expected'));
const token=await sign({});await assert.rejects(oidc.verify('google',token.slice(0,-20)+'a'.repeat(20),'expected'));
const untrusted=await new SignJWT({iss:'https://accounts.google.com',aud:'google-web',sub:'fake',nonce:'expected',iat:timestamp,exp:timestamp+300})
  .setProtectedHeader({alg:'RS256',kid:'unknown',jku:'https://attacker.test/keys'}).sign(keys.privateKey);
await assert.rejects(oidc.verify('google',untrusted,'expected'));
const a=await oidc.verify('google',await sign({sub:'one'}),'expected'),b=await oidc.verify('google',await sign({sub:'two'}),'expected');
assert.notEqual(a.subject,b.subject,'equal emails do not select an identity');
const g=oidc.begin('google','https://carve-preview.test'),gurl=new URL(g.url);
assert.equal(gurl.searchParams.get('state'),g.flow.id);assert.equal(gurl.searchParams.get('nonce'),g.flow.nonce);
assert.equal(gurl.searchParams.get('code_challenge_method'),'S256');
assert.equal(gurl.searchParams.get('code_challenge'),createHash('sha256').update(g.flow.verifier).digest('base64url'));
const apple=oidc.begin('apple','https://carve-preview.test'),aurl=new URL(apple.url);
assert.equal(aurl.searchParams.get('response_mode'),'form_post');assert(!aurl.searchParams.has('code_challenge'));
let exchanges=0;
const exchanging=createOidc(env,{keyResolvers:resolvers,transport:async(url,request)=>{
  exchanges++;assert.equal(url,'https://appleid.apple.com/auth/token');
  assert(!request.body.has('code_verifier'));
  const secret=request.body.get('client_secret');
  await jwtVerify(secret,appleSecret.publicKey,{algorithms:['ES256'],issuer:'TESTTEAM',audience:'https://appleid.apple.com',subject:'apple-web'});
  return Response.json({id_token:await sign({iss:'https://appleid.apple.com',aud:'apple-web',sub:'opaque.apple.subject',nonce:apple.flow.nonce})});
}});
assert.equal((await exchanging.exchange(apple.flow,'test-code')).subject,'opaque.apple.subject');assert.equal(exchanges,1);
await assert.rejects(exchanging.exchange({...apple.flow,client_id:'rotated-client'},'test-code'));assert.equal(exchanges,1,'client rotation rejects before exchanging old code');
assert(!createOidc({}).ready('google'));assert(!createOidc({}).ready('apple'));
console.log('PASS OIDC: real RS256 signature/issuer/exact-audience/azp/time/nonce verification, subject identity, Google S256 and Apple ES256 secret + form_post');
