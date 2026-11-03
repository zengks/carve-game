// Explicit TLS avoids connection-string flags silently replacing pg's ssl object.
// This configures a connection; it never applies migrations or chooses a project.
export function postgresOptions(connectionString,{max,ca=process.env.CARVE_DATABASE_CA_CERT,projectRef=process.env.CARVE_EXPECTED_PROJECT_REF,runtimeRole='carve_runtime'}={}){
 const fail=()=>{throw Error('invalid_database_configuration');};
 if(!['carve_runtime','carve_android_auth'].includes(runtimeRole))fail();
 let url;try{url=new URL(connectionString);}catch{fail();}
 if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||url.hash)fail();
 const local=['127.0.0.1','localhost','[::1]'].includes(url.hostname);
 const base={max,connectionTimeoutMillis:5000,idleTimeoutMillis:10000,statement_timeout:5000};
 // pg also accepts host/user/etc query overrides. In particular, a loopback URL
 // must never become a remote plaintext connection after pg parses its query.
 for(const [key]of url.searchParams)if(!['sslmode','application_name'].includes(key))fail();
 for(const key of ['sslmode','application_name'])if(url.searchParams.getAll(key).length>1)fail();
 if(local){if(projectRef!==undefined)fail();return {...base,connectionString};}
 if(!url.username||!url.password)fail();
 if(projectRef!==undefined){
  if(!/^[a-z]{20}$/.test(projectRef)||url.pathname!=='/postgres')fail();
  const direct=url.hostname===`db.${projectRef}.supabase.co`&&url.username===runtimeRole&&['','5432','6543'].includes(url.port);
  const pooled=/^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname)&&url.username===`${runtimeRole}.${projectRef}`&&['5432','6543'].includes(url.port);
  if(!direct&&!pooled)fail();
 }
 // Only verify-full can be specified. Other TLS URL options can override ssl.
 for(const [key,value]of url.searchParams){
  if(key==='sslmode'){if(value!=='verify-full')fail();}
 }
 url.searchParams.delete('sslmode');
 if(ca!==undefined&&(typeof ca!=='string'||!ca.includes('-----BEGIN CERTIFICATE-----')||ca.includes('PRIVATE KEY')))fail();
 return {...base,connectionString:url.href,ssl:{rejectUnauthorized:true,...(ca?{ca}:{})}};
}
