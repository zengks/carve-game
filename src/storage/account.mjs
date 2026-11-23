import {canonical, expeditionEvent, EXPEDITION_COURSE, EXPEDITION_RULES, validateExpeditionEvent} from './contract.mjs';
import {openOutbox,flushOutbox} from './outbox.mjs';

if (window.CarveGameStorage.scorePreview) {
const $=id=>document.getElementById(id);
const outbox=openOutbox(globalThis.indexedDB,'carve.expedition.outbox.v1',validateExpeditionEvent);
const progressPath='/api/expedition-progress?testing=true';
let session={configured:false,account:null,providers:{}},snapshot=null,copyOffer=null,busy=false,syncing=false,epoch=0;
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
  email_not_ready:'Email sign-in is unavailable in this preview.',
  not_configured:'Cloud sign-in is not configured in this preview.',provider_not_ready:'This provider is awaiting secure account-linking setup.',
  reauth_required:'Sign out and sign in again before connecting another sign-in method. Your saved results are kept.',
  identity_already_owned:'That sign-in method belongs to another CARVE account. Neither account was merged or changed.',
  link_offer_expired:'This connection request expired or was cancelled. Start a new connection.',
}[e.message]??'Cloud storage is temporarily unavailable. Your climb stays on this device; try Sync again later.');
function renderSnapshot() {
  const rows=$('account-results');rows.textContent='';
  for(const event of snapshot?.results??[]) {
    const li=document.createElement('li');li.textContent=`${event.payload.height_m} m · ${event.payload.score} points · ${event.mode} · ${event.source_platform}`;rows.appendChild(li);
  }
  if(!rows.children.length)rows.textContent='No shared results loaded.';
}
function render() {
  const signed=scope()!=='guest';
  const canSignIn=Object.values(session.providers).some(Boolean);
  $('account-open').textContent=signed?'Account & sync':canSignIn?'Guest · Sign in':'Guest · Account';
  $('account-identity').textContent=signed?'Signed in as '+session.account.label+'.':'Playing as a guest on this device.';
  $('account-signin').hidden=signed;$('account-signed').hidden=!signed;
  $('account-email').disabled=busy||!session.providers.email;$('account-code').disabled=busy||!session.providers.email;
  for(const provider of ['apple','google']){
    $('account-'+provider).disabled=busy||!session.providers[provider];
    $('account-link-'+provider).disabled=busy||!signed||!session.providers[provider]||session.account.linked?.includes(provider);
  }
  for(const id of ['account-link-email','account-link-code','account-link-send','account-link-verify'])$(id).disabled=busy||!signed||!session.providers.email||session.account.linked?.includes('email');
  $('account-linked').textContent=signed?'Connected methods: '+(session.account.linked??[]).join(', ')+'.':'';
  $('account-link-offer').hidden=!signed||!session.link_offer;
  $('account-link-copy').textContent=signed&&session.link_offer?'Connect '+session.link_offer.label+' to '+session.account.label+'? This will not merge another account’s progress.':'';
  for(const id of ['account-link-confirm','account-link-cancel'])$(id).disabled=busy;
  for(const id of ['account-send','account-verify'])$(id).disabled=busy||!session.providers.email;
  $('account-copy-review').hidden=!signed||!copyOffer;
  for(const id of ['account-sync','account-import','account-signout','account-import-confirm','account-import-cancel'])$(id).disabled=busy;
  $('account-config').hidden=canSignIn||signed;
  $('account-config').textContent='Cloud sign-in is unavailable here. You can keep playing as a guest.';
  renderSnapshot();
}
async function refresh() {
  const version=++epoch,next=await request('/api/account');if(version!==epoch)return;
  const prior=scope();session=next;const owner=scope();
  if(owner!==prior){snapshot=null;copyOffer=null;}render();
  const saved=owner==='guest'?null:await outbox.cached(owner);
  if(version!==epoch||scope()!==owner)return;
  if(saved&&(!snapshot||saved.revision>=snapshot.revision))snapshot=saved;
  render();
}
function validateSnapshot(value,owner,result) {
  if(value.contract_version!==1||value.account_scope!==owner||value.result!==result||
    value.course_id!==EXPEDITION_COURSE||value.rules_version!==EXPEDITION_RULES||value.testing!==true||
    value.validation!=='client_reported'||!Number.isSafeInteger(value.revision)||value.revision<0||
    !Array.isArray(value.results)||value.results.length>20||value.results.length>value.revision)throw new Error('invalid_receipt');
  for(const event of value.results)if(!validateExpeditionEvent(event).payload.testing)throw new Error('invalid_receipt');
  return value;
}
async function synchronize() {
  if(syncing||scope()==='guest')return;
  syncing=true;const owner=scope();message('Syncing completed results…');
  try {
    // Refresh first: another tab could have changed the cookie owner.
    await refresh();if(scope()!==owner){message('The account changed. Pending results stayed with their original account.');return;}
    const generation=epoch;
    const currentScope=()=>epoch===generation?scope():null;
    const saveSnapshot=async value=>{
      const latest=await outbox.cache(owner,value);
      if(currentScope()===owner)snapshot=latest;
    };
    // The queue contains only batches approved with Confirm copy.
    await flushOutbox({outbox,scope:owner,currentScope,
      send:async event=>validateSnapshot(await request(progressPath,event,owner),owner,'accepted'),
      matches:(reply,event)=>canonical(reply.accepted_event)===canonical(event),
      saveSnapshot,
    });
    if(currentScope()!==owner)return;
    const value=validateSnapshot(await request(progressPath,undefined,owner),owner,'snapshot');
    if(currentScope()!==owner)return;
    await saveSnapshot(value);renderSnapshot();message('Shared results updated.');
  } catch(e){message(explanation(e));}finally{syncing=false;}
}
async function act(fn) {
  if(busy)return;busy=true;render();
  try{await fn();}catch(e){message(explanation(e));}finally{busy=false;render();}
}

$('account-open').hidden=false;
$('account-open').onclick=()=>{
  if(window.CarveGameStorage.running())return;
  $('account-dialog').showModal();act(async()=>{await refresh();message(scope()==='guest'?'':'Review local results to choose what to copy.');});
};
$('account-close').onclick=()=>$('account-dialog').close();
$('account-dialog').addEventListener('close',()=>{copyOffer=null;render();});
$('account-send').onclick=()=>act(async()=>{
  await request('/api/account',{action:'email',email:$('account-email').value.trim()});
  message('If delivery is available, your email will contain a sign-in code. Enter it below.');$('account-code').focus();
});
$('account-verify').onclick=()=>act(async()=>{
  await request('/api/account',{action:'verify',email:$('account-email').value.trim(),code:$('account-code').value.trim()});
  $('account-code').value='';await refresh();await synchronize();
});
for(const provider of ['apple','google'])$('account-'+provider).onclick=()=>act(async()=>{
  const result=await request('/api/account',{action:'oauth',provider});location.assign(result.url);
});
for(const provider of ['apple','google'])$('account-link-'+provider).onclick=()=>act(async()=>{
  const result=await request('/api/account',{action:'link-provider',provider},scope());location.assign(result.url);
});
$('account-link-send').onclick=()=>act(async()=>{
  await request('/api/account',{action:'link-email-send',email:$('account-link-email').value.trim()},scope());message('Enter the code sent to the email you want to connect.');
});
$('account-link-verify').onclick=()=>act(async()=>{
  await request('/api/account',{action:'link-email-verify',email:$('account-link-email').value.trim(),code:$('account-link-code').value.trim()},scope());
  $('account-link-code').value='';await refresh();message('Review the connection and confirm only if both sign-in methods are yours.');
});
$('account-link-confirm').onclick=()=>act(async()=>{
  await request('/api/account',{action:'confirm-link'},scope());await refresh();message('Sign-in method connected. Your CARVE account and progress stayed the same.');
});
$('account-link-cancel').onclick=()=>act(async()=>{
  await request('/api/account',{action:'cancel-link'},scope());await refresh();message('Connection cancelled. No sign-in method was added.');
});
$('account-signout').onclick=()=>act(async()=>{
  await request('/api/account',{action:'signout'});++epoch;session={...session,account:null,link_offer:null};snapshot=null;copyOffer=null;render();
  message('Signed out. Pending account results are kept separately; guest play is ready.');
});
$('account-sync').onclick=()=>act(synchronize);
$('account-import').onclick=()=>act(async()=>{
  await refresh();
  const owner=scope();if(owner==='guest')return;
  const events=window.CarveGameStorage.expeditionRecords().flatMap(record=>{
    try { const event=expeditionEvent(record,true);return event?[event]:[]; } catch { return []; }
  });
  copyOffer=events.length?{owner,events}:null;
  if(!copyOffer){message('No completed Expedition results are available to copy.');return;}
  $('account-import-copy').textContent=`Copy ${events.length} completed Expedition ${events.length===1?'result':'results'} to ${session.account.label}? Your original results, active climb, bounty and skills stay on this device.`;
});
$('account-import-cancel').onclick=()=>{copyOffer=null;render();};
$('account-import-confirm').onclick=()=>act(async()=>{
  const offer=copyOffer;if(!offer)return;
  await refresh();
  if(copyOffer!==offer||scope()!==offer.owner)throw new Error('account_changed');
  await outbox.putAll(offer.owner,offer.events);
  copyOffer=null;await synchronize();
});
window.addEventListener('online',()=>{synchronize();});
// A cookie can change in another tab; never keep another user's log visible.
window.addEventListener('focus',()=>{act(async()=>{await refresh();});});
refresh().then(()=>{
  const returned=new URLSearchParams(location.search).get('account');
  if(returned&&!window.CarveGameStorage.running()){
    $('account-dialog').showModal();message(returned==='provider-error'?'Sign-in was cancelled or could not be verified. Your previous account and saves are kept.':
      session.link_offer?'Review and confirm this new sign-in method.':'Signed in. Guest records remain local unless explicitly imported.');
  }
}).catch(e=>{render();message(explanation(e));});
}
