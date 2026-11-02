import assert from 'node:assert/strict';
import {parseStrictJSON} from '../server/strict-json.mjs';
for(const text of ['{}','{"a":{"b":2},"c":[{"b":3}]}','{"quote":"\\\"a\\\":1","a":1}','{"escaped\\u006bey":1}'])assert.deepEqual(parseStrictJSON(text),JSON.parse(text));
for(const text of ['{"a":1,"a":2}','{"event":{"run_id":"a","run_id":"b"}}','{"x":[{"k":1,"\\u006b":2}]}','{','{"a":1,}'])assert.throws(()=>parseStrictJSON(text),/invalid_request/);
assert.throws(()=>parseStrictJSON('[[[{}]]]',{maxDepth:3}),/invalid_request/);
console.log('PASS strict nested JSON: decoded duplicate keys, escaped strings, sibling objects, syntax and depth bounds');
