import {completedEvent} from './contract.mjs';
import {openOutbox,flushOutbox} from './outbox.mjs';

const $=id=>document.getElementById(id);
const outbox=openOutbox(globalThis.indexedDB);
let session={configured:false,account:null,providers:{}},snapshot=null,busy=false,syncing=false,epoch=0;
const scope=()=>session.account?.scope??'guest';
const message=text=>{$('account-status').textContent=text;};
async function request(path,body,owner) {
  const reply=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
    headers:{...(body?{'Content-Type':'application/json'}:{}),...(owner?{'X-Carve-Account':owner}:{})},body:body?JSON.stringify(body):undefined,
    signal:AbortSignal.timeout(10000)});
  const data=await reply.json();if(!reply.ok)throw new Error(data.error??'service_unavailable');return data;
}
const explanation=e=>({invalid_email:'Enter a valid email address.',invalid_code:'That code was not accepted. Check it or request a new one.',
  origin_rejected:'Sign-in is unavailable at this preview address.',code_unavailable:'A code could not be sent. Try again later.',
  sign_in_required:'Your session has ended. Sign in again; pending results are kept.',event_conflict:'A conflicting result was kept locally for review.',
  account_changed:'The account changed in another tab. Results stayed with their original account.',
  storage_unavailable:'Local sync storage is blocked. Your existing game save is kept; cloud uploads are unavailable.',
  not_configured:'Cloud sign-in is not configured in this preview.',provider_not_ready:'This provider is awaiting secure account-linking setup.',
}[e.message]??'Cloud storage is temporarily unavailable. Your climb stays on this device; try Sync again later.');
function renderSnapshot() {
  const rows=$('account-results');rows.textContent='';
  for(const event of snapshot?.results??[]) {
    const li=document.createElement('li');li.textContent=`${event.payload.height_m} m · ${event.mode} · ${event.payload.testing?'testing · ':''}${event.course_id} · unverified`;rows.appendChild(li);
  }
  if(!rows.children.length)rows.textContent='No shared results loaded.';
}
function render() {
  const signed=scope()!=='guest';
  $('account-open').textContent=signed?'Account & sync':'Guest · Sign in';
  $('account-identity').textContent=signed?'Signed in as '+session.account.label+'.':'Playing as a guest on this device.';
  $('account-signin').hidden=signed;$('account-signed').hidden=!signed;
  $('account-email').disabled=busy||!session.providers.email;
  for(const provider of ['apple','google'])$('account-'+provider).disabled=busy||!session.providers[provider];
  for(const id of ['account-send','account-verify'])$(id).disabled=busy||!session.providers.email;
  for(const id of ['account-sync','account-import','account-signout'])$(id).disabled=busy;
  $('account-config').textContent=!session.configured?'Cloud sign-in is not configured in this preview. You can keep playing as a guest.':
    !session.providers.apple||!session.providers.google?'Email code is available. Apple and Google await secure linking and provider setup.':'';
  renderSnapshot();
}
async function refresh() {
  const version=++epoch,next=await request('/api/account');if(version!==epoch)return;
  session=next;const owner=scope();snapshot=null;render();
  const saved=owner==='guest'?null:await outbox.cached(owner);
  if(version!==epoch||scope()!==owner)return;snapshot=saved;render();
}
async function synchronize() {
  if(syncing||scope()==='guest')return;
  syncing=true;const owner=scope();message('Syncing completed results…');
  try {
    // Refresh first: another tab could have changed the cookie owner.
    await refresh();if(scope()!==owner){message('The account changed. Pending results stayed with their original account.');return;}
    const send=async event=>{
      const reply=await request('/api/shared-progress',{...event},owner);
      if(reply.account_scope!==owner)throw new Error('sign_in_required');return reply;
    };
    await flushOutbox({outbox,scope:owner,currentScope:scope,send,onSnapshot:value=>{snapshot=value;}});
    const value=await request('/api/shared-progress',undefined,owner);
    if(scope()!==owner||value.account_scope!==owner)return;
    snapshot=value;await outbox.cache(owner,value);renderSnapshot();message('Completed results are synced. Unfinished climbs stay on this device.');
  } catch(e){message(explanation(e));}finally{syncing=false;}
}
async function act(fn) {
  if(busy)return;busy=true;render();
  try{await fn();}catch(e){message(explanation(e));}finally{busy=false;render();}
}

window.CarveAccount={scope,completed(record,profile,owner,testing) {
  try {
    const event=completedEvent(record,profile,testing);if(!event)return;
    outbox.put(owner??'guest',event).then(()=>{
      if(scope()===owner&&owner!=='guest')return synchronize();
    }).catch(e=>message(explanation(e)));
  }catch(e){message(explanation(e));}
}};
$('account-open').hidden=false;
$('account-open').onclick=()=>{
  if(window.CarveGameStorage.running())return;
  $('account-dialog').showModal();act(async()=>{await refresh();message(scope()==='guest'?'Sign in optionally; guest progress is never imported automatically.':'Choose Sync or explicitly import completed guest records.');});
};
$('account-close').onclick=()=>$('account-dialog').close();
$('account-send').onclick=()=>act(async()=>{
  await request('/api/account',{action:'email',email:$('account-email').value.trim()});
  message('If delivery is available, your email will contain a sign-in code. Enter it below.');$('account-code').focus();
});
$('account-verify').onclick=()=>act(async()=>{
  await request('/api/account',{action:'verify',email:$('account-email').value.trim(),code:$('account-code').value.trim()});
  $('account-code').value='';await refresh();message('Signed in. Guest data stays local unless you choose Import.');await synchronize();
});
for(const provider of ['apple','google'])$('account-'+provider).onclick=()=>act(async()=>{
  const result=await request('/api/account',{action:'oauth',provider});location.assign(result.url);
});
$('account-signout').onclick=()=>act(async()=>{
  await request('/api/account',{action:'signout'});++epoch;session={...session,account:null};snapshot=null;render();
  message('Signed out. Pending account results are kept separately; guest play is ready.');
});
$('account-sync').onclick=()=>act(synchronize);
$('account-import').onclick=()=>act(async()=>{
  const owner=scope();if(owner==='guest')return;
  const candidates=window.CarveGameStorage.guestRecords().map(({record,profile,testing})=>completedEvent(record,profile,testing)).filter(Boolean);
  if(!candidates.length){$('account-import-confirm').hidden=true;message('No completed guest Flow records are available to import. Your existing saves are kept.');return;}
  $('account-import-copy').textContent=`Import ${candidates.length} completed Flow results into ${session.account.label}? These are unverified personal records. Active climbs, bounty and purchased items will not be imported. Original saves are kept.`;
  $('account-import-confirm').hidden=false;
  $('account-import-confirm').onclick=()=>act(async()=>{
    if(scope()!==owner)throw new Error('sign_in_required');
    await refresh();if(scope()!==owner)throw new Error('sign_in_required');
    for(const event of candidates)await outbox.put(owner,event);
    $('account-import-confirm').hidden=true;await synchronize();
  });
});
window.addEventListener('online',()=>{synchronize();});
// A cookie can change in another tab; never keep another user's log visible.
window.addEventListener('focus',()=>{act(async()=>{await refresh();});});
refresh().catch(e=>{render();message(explanation(e));});
