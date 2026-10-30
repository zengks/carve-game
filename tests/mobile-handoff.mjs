import assert from 'node:assert/strict';
import {mobileRelease,mobilePlatform,handoffLinks,prepareMobilePrompt} from '../future/mobile-handoff.mjs';
assert.equal(mobileRelease.enabled,false);
assert.equal(prepareMobilePrompt(),null); // no DOM/storage access while disabled
assert.equal(mobilePlatform({userAgent:'iPhone'}),'ios');
assert.equal(mobilePlatform({userAgent:'Macintosh',maxTouchPoints:5}),'ios');
assert.equal(mobilePlatform({userAgent:'Macintosh',maxTouchPoints:0}),null);
assert.equal(mobilePlatform({userAgent:'Android'}),'android');
const config={enabled:true,ios:{published:true,linksVerified:true,storeUrl:'https://apps.apple.com/us/app/test/id123456789',openUrl:'https://links.example.com/open',verifiedHosts:['links.example.com']},android:{published:true,linksVerified:true,storeUrl:'https://play.google.com/store/apps/details?id=com.example.carve',openUrl:'https://links.example.com/open',verifiedHosts:['links.example.com']}};
for(const platform of ['ios','android']) {
 assert(handoffLinks(config,platform));
 for(const bad of [{published:false},{linksVerified:false},{storeUrl:'https://evil.example/app/id123'},{openUrl:'carve://open'},{openUrl:'https://evil.example/open'},{openUrl:'https://links.example.com/open?score=999'},{openUrl:'https://user:secret@links.example.com/open'}]) {
  assert.equal(handoffLinks({...config,[platform]:{...config[platform],...bad}},platform),null);
 }
}
const saved=new Map(),nodes=[];
function node(tag) {return {tag,children:[],listeners:{},setAttribute(){},append(...children){this.children.push(...children);},addEventListener(event,fn){this.listeners[event]=fn;},showModal(){this.open=true;},close(){this.open=false;},remove(){this.removed=true;},focus(){this.focused=true;}};}
const env={atMenu:true,navigator:{userAgent:'iPhone'},storage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)},document:{createElement:node,body:{append:n=>nodes.push(n)}},onContinue(){env.continued=true;}};
assert.equal(prepareMobilePrompt(config,{...env,atMenu:false}),null);
assert.equal(prepareMobilePrompt(config,{...env,navigator:{userAgent:'desktop'}}),null);
assert.equal(prepareMobilePrompt(config,{...env,storage:{getItem(){throw Error('blocked');}}}),null);
const prompt=prepareMobilePrompt(config,env);assert(prompt);assert.equal(nodes.length,0); // preparation causes no popup
assert(prompt.show());assert(!prompt.show());
const dialog=nodes[0],keep=dialog.children.find(c=>c.tag==='button');assert(keep.focused);assert.equal(keep.textContent,'Continue in browser');
assert.equal(dialog.children.filter(c=>c.tag==='a').length,2);
keep.onclick();assert(!dialog.open);assert(dialog.removed);assert(env.continued);assert.equal(prepareMobilePrompt(config,env),null);
saved.clear();const again=prepareMobilePrompt(config,env);again.show();let prevented=false;nodes[1].listeners.cancel({preventDefault(){prevented=true;}});assert(prevented);assert(!nodes[1].open);
console.log('PASS future mobile handoff: disabled by default, platform/store verification, explicit links, browser choice, dismissal and no active-run interruption');
