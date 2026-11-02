// TEST ONLY. Production routing has no synthetic completion or clock controls.
import {createNativeIntegrationFixture} from './native-integration-fixture.mjs';
export async function createNativeProgressIntegrationFixture(options={}){
 const fixture=await createNativeIntegrationFixture({...options,progress:true});
 return {...fixture,kind:'actual-native-broker-progress',progress_path:'/api/native-progress/v1'};
}
