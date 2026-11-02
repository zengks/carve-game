// Syntax validation plus duplicate decoded-key detection at every object depth.
// JSON.parse alone silently discards earlier duplicate keys.
export function parseStrictJSON(raw,{maxDepth=8}={}){
 const invalid=()=>{throw Object.assign(Error('invalid_request'),{status:400});};
 let result;try{result=JSON.parse(raw);}catch{invalid();}
 const stack=[];
 for(let i=0;i<raw.length;i++){
  const char=raw[i];
  if(char==='{'||char==='['){stack.push(char==='{'?new Set():null);if(stack.length>maxDepth)invalid();}
  else if(char==='}'||char===']')stack.pop();
  else if(char==='"'){
   const start=i++;
   while(i<raw.length){if(raw[i]==='\\'){i+=2;continue;}if(raw[i]==='"')break;i++;}
   let next=i+1;while(next<raw.length&&/\s/.test(raw[next]))next++;
   if(raw[next]===':'){
    const key=JSON.parse(raw.slice(start,i+1)),keys=stack.at(-1);
    if(!keys||keys.has(key))invalid();keys.add(key);
   }
  }
 }
 return result;
}
