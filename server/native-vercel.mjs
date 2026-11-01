import {createNativeBrokerHandler} from './native-broker.mjs';

// Vercel's Web Fetch entrypoint preserves raw JSON, unlike parsed req.body helpers.
// The same core handler is used by local HTTP and deployed Fetch functions.
export function createNativeFetchHandler(handler=createNativeBrokerHandler()){
 return async request=>{
  const req={method:request.method,url:request.url,headers:Object.fromEntries(request.headers),
   async *[Symbol.asyncIterator](){
    if(!request.body)return;
    const reader=request.body.getReader();
    try{while(true){const {done,value}=await reader.read();if(done)return;yield value;}}
    finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   }};
  const values=new Map();let body=null,status=200;
  const res={statusCode:200,
   setHeader:(name,value)=>values.set(name.toLowerCase(),value),
   getHeader:name=>values.get(name.toLowerCase()),
   writeHead(code,headers={}){this.statusCode=code;for(const [k,v]of Object.entries(headers))this.setHeader(k,v);return this;},
   end(value){status=this.statusCode;body=value??null;}
  };
  await handler(req,res);
  const headers=new Headers();for(const [k,v]of values)for(const item of Array.isArray(v)?v:[v])headers.append(k,String(item));
  return new Response(request.method==='HEAD'?null:body,{status,headers});
 };
}
