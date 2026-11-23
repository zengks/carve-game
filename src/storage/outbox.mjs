import {canonical,validateEvent} from './contract.mjs';

export function openOutbox(indexedDB, name='carve.shared.outbox.v1', validate=validateEvent) {
  let opening;
  const database=()=>opening??=new Promise((resolve,reject)=>{
    if(!indexedDB)return reject(new Error('storage_unavailable'));
    const request=indexedDB.open(name,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('entries',{keyPath:'key'});
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('storage_unavailable'));
    request.onblocked=()=>reject(new Error('storage_unavailable'));
  });
  async function transaction(action, write=false) {
    const db=await database();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('entries',write?'readwrite':'readonly'),store=tx.objectStore('entries');let result;
      tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(new Error('storage_unavailable'));
      action(store,value=>{result=value;},tx);
    });
  }
  const key=(scope,event)=>scope+':'+event.event_id;
  async function putAll(scope,events) {
    if(!/^(guest|[a-f\d]{64})$/.test(scope))throw new Error('invalid_scope');
    const unique=new Map();
    for(const event of events){
      validate(event);
      const prior=unique.get(event.event_id);
      if(prior&&canonical(prior)!==canonical(event))throw new Error('event_conflict');
      unique.set(event.event_id,event);
    }
    return transaction((store,done,tx)=>{
      for(const event of unique.values()){
        const k=key(scope,event),read=store.get(k);
        read.onsuccess=()=>{
          const old=read.result;
          if(old && canonical(old.event)!==canonical(event)){tx.abort();return;}
          if(!old)store.put({key:k,scope,event,state:'pending'});
          done(!old);
        };
      }
    },true);
  }
  return {
    put:(scope,event)=>putAll(scope,[event]),
    putAll,
    async list(scope) {
      return transaction((store,done)=>{const request=store.getAll();request.onsuccess=()=>done(request.result.filter(r=>r.scope===scope&&r.state==='pending').map(r=>r.event));});
    },
    async acknowledge(scope,event) {
      return transaction((store,done)=>{const request=store.get(key(scope,event));request.onsuccess=()=>{
        const row=request.result;if(row&&canonical(row.event)===canonical(event))store.put({...row,state:'accepted'});done(true);
      };},true);
    },
    async cache(scope,snapshot) {
      return transaction((store,done,tx)=>{
        const key=scope+':snapshot',request=store.get(key);
        request.onsuccess=()=>{
          const prior=request.result?.snapshot;
          if(Number.isSafeInteger(snapshot.revision)&&Number.isSafeInteger(prior?.revision)){
            if(prior.revision>snapshot.revision){done(prior);return;}
            if(prior.revision===snapshot.revision&&canonical(prior.results)!==canonical(snapshot.results)){tx.abort();return;}
          }
          store.put({key,scope,snapshot});done(snapshot);
        };
      },true);
    },
    async cached(scope) {
      return transaction((store,done)=>{const request=store.get(scope+':snapshot');request.onsuccess=()=>done(request.result?.snapshot??null);});
    },
    async close(){if(opening)(await opening).close();},
  };
}

// Auth identity and owner are rechecked server-side on every batch. In-flight
// account changes stop processing and never apply the previous owner's reply.
export async function flushOutbox({outbox,scope,currentScope,send,onSnapshot=()=>{},matches=(reply,event)=>reply.accepted===event.event_id,saveSnapshot=reply=>outbox.cache(scope,reply)}) {
  if(!scope||scope==='guest')return;
  for(const event of await outbox.list(scope)) {
    if(currentScope()!==scope)return;
    const reply=await send(event);
    if(currentScope()!==scope)return;
    if(reply.contract_version!==1||!matches(reply,event))throw new Error('invalid_receipt');
    await saveSnapshot(reply);
    if(currentScope()!==scope)return;
    await outbox.acknowledge(scope,event);
    onSnapshot(reply);
  }
}
