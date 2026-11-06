// Local operator entry point. Run only with an AASA produced by the native signing preflight.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createNativeIntegrationFixture} from './lib/native-integration-fixture.mjs';

const [associationPath,keyPath,certPath]=process.argv.slice(2);
if(process.argv.length!==5||!process.env.CARVE_NATIVE_TEST_ADMIN_URL){
 throw Error('Set CARVE_NATIVE_TEST_ADMIN_URL and supply the preflight AASA, TLS key and TLS certificate paths.');
}
const association=JSON.parse(await readFile(associationPath,'utf8'));
const privateIosAppId=association?.webcredentials?.apps?.[0];
assert.deepEqual(association,{webcredentials:{apps:[privateIosAppId]}},'Expected only the signing preflight webcredentials association');
const privateTls={key:await readFile(keyPath),cert:await readFile(certPath)};
const fixture=await createNativeIntegrationFixture({privateTls,privateIosAppId});
process.once('SIGINT',()=>void fixture.close());
process.once('SIGTERM',()=>void fixture.close());
console.log(JSON.stringify({listener:fixture.httpsAddress,authorize:fixture.broker_url,return:fixture.return_targets['fixture-ios'],database:fixture.databaseName}));
