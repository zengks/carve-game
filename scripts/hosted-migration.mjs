import {readFile,writeFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {runtimeRoleSQL} from '../server/runtime-role.mjs';
export async function hostedMigrationSQL(){
 const sections=['-- Initial baseline for NEW approved CARVE projects only. No credentials or player data.'];
 for(const name of ['schema.sql','native-schema.sql','native-progress-schema.sql']){
  const raw=await readFile(new URL('../server/'+name,import.meta.url),'utf8');
  if(raw.match(/^BEGIN;$/gm)?.length!==1||raw.match(/^COMMIT;$/gm)?.length!==1)throw Error('schema_transaction_boundary_changed');
  sections.push('-- Source: server/'+name+'\n'+raw.replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,'').trim());
 }
 sections.push('-- Source: runtimeRoleSQL(carve_runtime); password/login remains a separate secret-only operation.\n'+runtimeRoleSQL('carve_runtime'));
 return sections.join('\n\n')+'\n';
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const files=(await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(n=>/^\d{14}_carve_shared_foundation\.sql$/.test(n));
 if(files.length!==1)throw Error('one_cli_generated_foundation_migration_required');
 const path=new URL('../supabase/migrations/'+files[0],import.meta.url),sql=await hostedMigrationSQL();
 if(process.argv[2]==='--write'){await writeFile(path,sql);console.log('Wrote reviewed hosted baseline '+files[0]);}
 else if(process.argv[2]==='--check'){if(await readFile(path,'utf8')!==sql)throw Error('hosted_migration_source_drift');console.log('PASS hosted migration matches reviewed schema and restricted-role sources');}
 else throw Error('Use --write after CLI migration new, or --check for drift verification');
}
