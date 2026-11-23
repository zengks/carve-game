import {createNativeFetchHandler} from '../server/native-vercel.mjs';
import {createStorageHealthHandler} from '../server/storage-health.mjs';
export default {fetch:createNativeFetchHandler(createStorageHealthHandler())};
