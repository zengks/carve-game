// Wire contract shared with native. No owner, wallet or payment claims from clients.
export const CONTRACT_VERSION = 1;
const keys = (o, names) => o && typeof o === 'object' && !Array.isArray(o) &&
  Object.keys(o).length === names.length && names.every(name => Object.hasOwn(o,name));
const word = v => typeof v === 'string' && /^[a-zA-Z0-9_.:-]{1,160}$/.test(v);
const integer = (v, max) => Number.isSafeInteger(v) && v >= 0 && v <= max;
export function validateEvent(e) {
  if (!keys(e, ['contract_version','event_id','kind','course_id','rules_version','mode','source_platform','payload']) ||
      e.contract_version !== 1 || e.kind !== 'completed_run' || !word(e.event_id) || !word(e.course_id) ||
      !word(e.rules_version) || !['challenge','practice','guided','replay'].includes(e.mode) ||
      !['web','ios','android'].includes(e.source_platform)) throw new Error('invalid_event');
  const p = e.payload;
  if (!keys(p, ['run_id','height_m','score','active_ms','portals','controls','outcome','testing','unlocks','lessons']) ||
      !word(p.run_id) || !integer(p.height_m, 1e8) || !integer(p.score, 1e12) ||
      !integer(p.active_ms, 30 * 86400000) || !integer(p.portals, 1e6) ||
      !['banked','gameover'].includes(p.outcome) || typeof p.testing !== 'boolean' ||
      !Array.isArray(p.controls) || p.controls.length < 1 || p.controls.length > 3 || new Set(p.controls).size !== p.controls.length ||
      p.controls.some(c => !['one','two','keyboard'].includes(c)) ||
      [p.unlocks,p.lessons].some(a => !Array.isArray(a) || a.length > 3 ||
        new Set(a).size !== a.length || a.some(id => !['pulse','wing','hook'].includes(id)))) throw new Error('invalid_event');
  if(e.event_id!==e.course_id+':'+p.run_id)throw new Error('invalid_event');
  // Version 1 deliberately accepts only web Flow. Native has different metrics;
  // add a reviewed native payload/version rather than translating its chain to height.
  if (e.course_id !== 'web.flow-v1' || e.rules_version !== 'flow-v1' || e.source_platform !== 'web' ||
      !['challenge','practice'].includes(e.mode)) throw new Error('unsupported_course');
  return e;
}
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export function completedEvent(record, profile, testing) {
  if (record.course !== 'flow-v1' || !['banked','gameover'].includes(record.outcome)) return null;
  const progress=record.sharedProgress??profile;
  return validateEvent({contract_version:1, event_id:'web.flow-v1:'+record.id, kind:'completed_run',
    course_id:'web.flow-v1',rules_version:record.rules,mode:record.mode,source_platform:'web',payload:{
      run_id:record.id,height_m:Math.max(0,Math.floor(record.height)),score:Math.max(0,Math.floor(record.score)),
      active_ms:Math.max(0,Math.round(record.time*1000)),portals:record.portals,
      controls:[...new Set(record.controls.map(c => ['one','two'].includes(c)?c:'keyboard'))],
      outcome:record.outcome,testing:typeof record.testing==='boolean'?record.testing:testing,
      unlocks:[...progress.unlocked].sort(),lessons:[...progress.lessons].sort(),
    }});
}

export const EXPEDITION_COURSE = 'carve.expedition-v1';
export const EXPEDITION_RULES = 'terrain-v1';

export function validateExpeditionEvent(event) {
  if (!keys(event, ['contract_version','event_id','kind','course_id','rules_version','mode','source_platform','payload']) ||
      event.contract_version !== 1 || event.kind !== 'completed_run' ||
      event.course_id !== EXPEDITION_COURSE || event.rules_version !== EXPEDITION_RULES ||
      !['challenge','practice'].includes(event.mode) || !['web','ios','android'].includes(event.source_platform)) {
    throw new Error('invalid_event');
  }
  const p = event.payload;
  const id = event.source_platform === 'web' ? /^[a-z\d]{1,16}-[a-z\d]{1,16}$/ :
    /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/;
  if (!keys(p, ['run_id','height_m','score','active_ms','outcome','testing']) ||
      typeof p.run_id !== 'string' || !id.test(p.run_id) ||
      event.event_id !== EXPEDITION_COURSE+':'+event.source_platform+':'+p.run_id ||
      !integer(p.height_m, 1e8) || p.height_m === 0 || !integer(p.score, 1e12) ||
      !integer(p.active_ms, 30 * 86400000) || !['banked','gameover'].includes(p.outcome) || typeof p.testing !== 'boolean') {
    throw new Error('invalid_event');
  }
  return event;
}

export function expeditionEvent(record, testing) {
  if (record.course !== EXPEDITION_RULES || record.rules !== EXPEDITION_RULES ||
      !['banked','gameover'].includes(record.outcome) || !(record.height > 0)) return null;
  return validateExpeditionEvent({
    contract_version: 1, event_id: EXPEDITION_COURSE+':web:'+record.id, kind: 'completed_run',
    course_id: EXPEDITION_COURSE, rules_version: EXPEDITION_RULES, mode: record.mode, source_platform: 'web',
    payload: {run_id:record.id, height_m:Math.floor(record.height), score:Math.floor(record.score),
      active_ms:Math.round(record.time*1000), outcome:record.outcome, testing},
  });
}
