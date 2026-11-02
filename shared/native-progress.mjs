// First Ascent is a separate course/metric contract, never a Flow-height conversion.
export const NATIVE_COURSE='native.first-ascent-v1';
export const NATIVE_RULES='native-fa-rules-1';
export const exactKeys=(o,names)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...names].sort().join(',');
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const uuid=v=>typeof v==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/.test(v);
export function validateNativeEvent(e){
 const invalid=()=>{throw Error('invalid_event');};
 if(!exactKeys(e,['contract_version','event_id','kind','course_id','rules_version','mode','source_platform','payload'])||e.contract_version!==1||e.kind!=='completed_run'||typeof e.course_id!=='string'||typeof e.rules_version!=='string'||!['guided','replay'].includes(e.mode)||!['ios','android'].includes(e.source_platform))invalid();
 const p=e.payload;
 if(!exactKeys(p,['run_id','course_version','rules_version','tutorial_version','active_ms','best_chain','falls','resumed','tutorial_mask','testing'])||!uuid(p.run_id)||typeof p.course_version!=='string'||!Number.isSafeInteger(p.rules_version)||!Number.isSafeInteger(p.tutorial_version)||!integer(p.active_ms,1,86400000)||!integer(p.best_chain,0,10)||!integer(p.falls,0,10000)||typeof p.resumed!=='boolean'||typeof p.testing!=='boolean'||!integer(p.tutorial_mask,0,31)||(p.tutorial_mask&16)===0||e.event_id!==e.course_id+':'+p.run_id)invalid();
 if(e.course_id!==NATIVE_COURSE||e.rules_version!==NATIVE_RULES||p.course_version!=='first-ascent-1'||p.rules_version!==1||p.tutorial_version!==1)throw Error('unsupported_course');
 return e;
}
