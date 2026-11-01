import {canonical,validateEvent} from './contract.mjs';

export function openOutbox(indexedDB, name='carve.shared.outbox.v1') {
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
  return {
    async put(scope,event) {
      validateEvent(event);
      if(!/^(guest|[a-f\d]{64})$/.test(scope))throw new Error('invalid_scope');
      return transaction((store,done,tx)=>{
        const k=key(scope,event),read=store.get(k);
        read.onsuccess=()=>{
          const old=read.result;
          if(old && canonical(old.event)!==canonical(event)){tx.abort();return;}
          if(!old)store.put({key:k,scope,event,state:'pending'});
          done(!old);
        };
      },true);
    },
    async list(scope) {
      return transaction((store,done)=>{const request=store.getAll();request.onsuccess=()=>done(request.result.filter(r=>r.scope===scope&&r.state==='pending').map(r=>r.event));});
    },
    async acknowledge(scope,event) {
      return transaction((store,done)=>{const request=store.get(key(scope,event));request.onsuccess=()=>{
        const row=request.result;if(row&&canonical(row.event)===canonical(event))store.put({...row,state:'accepted'});done(true);
      };},true);
    },
    async cache(scope,snapshot) {
      return transaction((store,done)=>{store.put({key:scope+':snapshot',scope,snapshot});done(true);},true);
    },
    async cached(scope) {
      return transaction((store,done)=>{const request=store.get(scope+':snapshot');request.onsuccess=()=>done(request.result?.snapshot??null);});
    },
    async close(){if(opening)(await opening).close();},
  };
}

// Auth identity and owner are rechecked server-side on every batch. In-flight
// account changes stop processing and never apply the previous owner's reply.
export async function flushOutbox({outbox,scope,currentScope,send,onSnapshot=()=>{}}) {
  if(!scope||scope==='guest')return;
  for(const event of await outbox.list(scope)) {
    if(currentScope()!==scope)return;
    const reply=await send(event);
    if(currentScope()!==scope)return;
    if(reply.accepted!==event.event_id || reply.contract_version!==1)throw new Error('invalid_receipt');
    await outbox.acknowledge(scope,event);
    await outbox.cache(scope,reply);onSnapshot(reply);
  }
}
