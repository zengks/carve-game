import {createNativeBrokerHandler} from './native-broker.mjs';
import {createAndroidAuthDatabase} from './android-auth-database.mjs';
import {androidAuthConfiguration,classifyAuthRequest,androidAuthBody,quotaIdentity} from './android-auth-policy.mjs';

export const returnHTML='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CARVE staging sign-in</title><main><h1>Return to CARVE</h1><p>If CARVE did not open automatically, return to the staging app, cancel this attempt and try signing in again. This page cannot complete sign-in.</p></main></html>';
export const securityHeaders={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",'Permissions-Policy':'camera=(), microphone=(), geolocation=()'};
export function createAndroidAuthHandler({env=process.env,pins,database,oidc,now,beforeGrant}={}){
 const config=androidAuthConfiguration(env,pins);let db=database,broker;
 const store=()=>db??=createAndroidAuthDatabase(env.CARVE_SHARED_DATABASE_URL,{env});
 const reply=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
 return async(req,res)=>{
  for(const [key,value]of Object.entries(securityHeaders))res.setHeader(key,value);
  try{
   // Route policy runs before config/database work. No health/debug/game routes.
   const kind=classifyAuthRequest(req,pins.origin||'https://unconfigured.invalid');
   if(!config)return reply(res,503,{contract_version:1,error:'not_configured'});
   if(kind==='association')return reply(res,200,[{relation:['delegate_permission/common.handle_all_urls'],target:{namespace:'android_app',package_name:pins.android_package,sha256_cert_fingerprints:[pins.android_certificate_sha256]}}]);
   if(kind==='return'){res.setHeader('Content-Type','text/html; charset=utf-8');res.statusCode=200;return res.end(returnHTML);}
   const body=kind==='api'?await androidAuthBody(req,config.origin):null;
   const identity=quotaIdentity(req,env.CARVE_SESSION_SECRET);
   if(!await store().admitRequest({...identity,begin:body?.action==='begin'})){res.setHeader('Retry-After','60');return reply(res,429,{contract_version:1,error:'rate_limited'});}
   broker??=createNativeBrokerHandler({env:config.env,database:store(),oidc,now,beforeGrant,createOnSignout:false});
   return await broker(req,res);
  }catch(e){return reply(res,e.status??503,{contract_version:1,error:e.status?e.message:'unavailable'});}
 };
}
