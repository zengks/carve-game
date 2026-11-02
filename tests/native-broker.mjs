import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createNativeBrokerHandler,parseNativeJSON} from '../server/native-broker.mjs';
import {createNativeFetchHandler} from '../server/native-vercel.mjs';
assert.deepEqual(parseNativeJSON('{"action":"session","contract_version":1}'),{action:'session',contract_version:1});
for(const raw of ['[]','null','{"a":{},"b":1}','{"a":1,"a":2}','{"action":1,"a\\u0063tion":2}'])assert.throws(()=>parseNativeJSON(raw),/invalid_request/);
for(const env of [{},{VERCEL_ENV:'production',CARVE_NATIVE_CLIENTS:'{}'}]){
 const handler=createNativeBrokerHandler({env});const server=createServer(handler);
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  for(const path of ['/api/native-broker/v1','/native/authorize','/api/native-broker/callback']){
   const r=await fetch(origin+path);assert.equal(r.status,503);assert.deepEqual(await r.json(),{contract_version:1,error:'not_configured'});
   assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert(!r.headers.has('set-cookie'));assert(!r.headers.has('access-control-allow-origin'));
  }
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
}
const fetchHandler=createNativeFetchHandler(createNativeBrokerHandler({env:{}}));
assert.equal((await fetchHandler(new Request('https://broker.example.test/api/native-broker/v1',{method:'POST',body:'{"action":"session"}'}))).status,503);
console.log('PASS native broker: strict duplicate/flat JSON and independently disabled production/unconfigured routes');
