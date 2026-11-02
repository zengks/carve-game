import {createNativeFetchHandler} from '../../server/native-vercel.mjs';
import {createNativeProgressHandler} from '../../server/native-progress.mjs';
export default {fetch:createNativeFetchHandler(createNativeProgressHandler())};
