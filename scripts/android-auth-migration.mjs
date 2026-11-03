import {readFile,readdir,writeFile,realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
export async function androidAuthMigrationSQL(){
 const raw=await readFile(new URL('../server/android-auth-schema.sql',import.meta.url),'utf8');
 if(raw.match(/^BEGIN;$/gm)?.length!==1||raw.match(/^COMMIT;$/gm)?.length!==1)throw Error('auth_schema_transaction_boundary_changed');
 return '-- STAGING AUTH ONLY: ffxcsgtissldpkuxgxvo. Never apply to production.\n-- Separate staging-auth migration stream; LOGIN/passwords are not part of this file.\n'+raw.replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,'').trim()+'\n';
}
if(process.argv[1]&&await realpath(process.argv[1])===fileURLToPath(import.meta.url)){
 const dir=new URL('../staging-auth/supabase/migrations/',import.meta.url);
 const files=(await readdir(dir)).filter(n=>/^\d{14}_carve_android_auth_staging\.sql$/.test(n));
 if(files.length!==1)throw Error('one_cli_generated_auth_migration_required');
 const path=new URL(files[0],dir),expected=await androidAuthMigrationSQL();
 if(process.argv[2]==='--write')await writeFile(path,expected);
 else if(process.argv[2]!=='--check'||await readFile(path,'utf8')!==expected)throw Error('auth_migration_source_drift');
 console.log('PASS isolated staging-only auth migration matches reviewed schema; role remains NOLOGIN');
}
