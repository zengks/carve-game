import {readFile,writeFile,mkdir,rm,cp,readdir,realpath} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authRoutes} from '../server/android-auth-routes.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function buildAndroidAuth(output=join(root,'staging-auth/.vercel/output')){
 const func=join(output,'functions/auth-router.func');
 await rm(output,{recursive:true,force:true});await mkdir(func,{recursive:true});
 const sourceFiles=new Set();
 async function source(name){
  if(sourceFiles.has(name))return;
  if(!/^(server|shared)\/[a-z0-9-]+\.mjs$/.test(name))throw Error('unexpected_auth_dependency');
  sourceFiles.add(name);const raw=await readFile(join(root,name),'utf8');
  for(const match of raw.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){
   if(match[1].startsWith('.'))await source(relative(root,join(root,dirname(name),match[1])));
  }
  await mkdir(dirname(join(func,name)),{recursive:true});await writeFile(join(func,name),raw);
 }
 await source('server/android-auth.mjs');
 const packageSource=join(root,'staging-auth/package.json'),resolve=createRequire(packageSource);
 const installed=new Map();
 async function dependency(name,from=resolve){
  const entry=from.resolve(name),find=async()=>{let dir=dirname(await realpath(entry));while(true){try{const pkg=JSON.parse(await readFile(join(dir,'package.json'),'utf8'));if(pkg.name===name)return {dir,pkg};}catch{}const next=dirname(dir);if(next===dir)throw Error('missing_auth_dependency');dir=next;}};
  const {dir,pkg}=await find();
  if(installed.has(name)){if(installed.get(name)!==pkg.version)throw Error('nested_dependency_version_requires_review');return;}
  installed.set(name,pkg.version);
  const target=join(func,'node_modules',name);await mkdir(dirname(target),{recursive:true});
  await cp(dir,target,{recursive:true,filter:path=>!relative(dir,path).split('/').includes('node_modules')&&!path.endsWith('.map')});
  const next=createRequire(join(dir,'package.json'));
  for(const child of Object.keys(pkg.dependencies??{}))await dependency(child,next);
 }
 const pkg=JSON.parse(await readFile(packageSource,'utf8'));
 for(const [name,version]of Object.entries(pkg.dependencies)){await dependency(name);if(installed.get(name)!==version)throw Error('auth_dependency_version_mismatch');}
 const pins=JSON.parse(await readFile(join(root,'staging-auth/pins.json'),'utf8'));
 await writeFile(join(func,'pins.json'),JSON.stringify(pins,null,2)+'\n');
 await writeFile(join(func,'package.json'),JSON.stringify({private:true,type:'module'}));
 await writeFile(join(func,'index.mjs'),"import {readFileSync} from 'node:fs';\nimport {createAndroidAuthHandler} from './server/android-auth.mjs';\nconst pins=JSON.parse(readFileSync(new URL('./pins.json',import.meta.url),'utf8'));\nexport default createAndroidAuthHandler({pins});\n");
 await writeFile(join(func,'.vc-config.json'),JSON.stringify({runtime:'nodejs26.x',handler:'index.mjs',launcherType:'Nodejs',maxDuration:15,shouldAddHelpers:false,shouldAddSourcemapSupport:false,regions:['yul1']},null,2)+'\n');
 const routes=authRoutes.map(r=>({src:'^'+r.path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$',dest:'/auth-router',caseSensitive:true}));
 routes.push({src:'^/.*$',status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
 await writeFile(join(output,'config.json'),JSON.stringify({version:3,routes},null,2)+'\n');
 return {sourceFiles:[...sourceFiles].sort(),dependencies:Object.fromEntries([...installed].sort()),files:await readdir(output)};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const result=await buildAndroidAuth();console.log('Built protected Android auth-only output; '+result.sourceFiles.length+' server/contract sources, '+Object.keys(result.dependencies).length+' pinned runtime packages.');
}
