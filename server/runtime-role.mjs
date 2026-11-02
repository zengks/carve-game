// For a new, explicitly selected CARVE database after the three schema migrations.
// Deliberately fails if the role/policies already exist. Never rotates an old role.
export const runtimePrivileges={
 players:['SELECT','INSERT','UPDATE'],identities:['SELECT','INSERT'],
 broker_sessions:['SELECT','INSERT','UPDATE'],auth_flows:['SELECT','INSERT','UPDATE'],
 link_offers:['SELECT','INSERT','UPDATE'],completed_results:['SELECT','INSERT'],
 course_progress:['SELECT','INSERT','UPDATE'],native_instances:['SELECT','INSERT','UPDATE'],
 native_flow_index:['SELECT','INSERT'],native_completed_results:['SELECT','INSERT'],
 native_course_progress:['SELECT','INSERT','UPDATE']
};
export function runtimeRoleSQL(role){
 if(typeof role!=='string'||!/^carve_runtime(?:_[a-f0-9]{8,32})?$/.test(role))throw Error('invalid_runtime_role');
 const sql=[`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 12;`,`GRANT USAGE ON SCHEMA carve_shared_v1 TO ${role};`];
 for(const [table,operations]of Object.entries(runtimePrivileges)){
  sql.push(`GRANT ${operations.join(',')} ON carve_shared_v1.${table} TO ${role};`);
  for(const op of operations){
   const predicate=op==='SELECT'?'USING (true)':op==='INSERT'?'WITH CHECK (true)':'USING (true) WITH CHECK (true)';
   sql.push(`CREATE POLICY carve_runtime_${op.toLowerCase()} ON carve_shared_v1.${table} FOR ${op} TO ${role} ${predicate};`);
  }
 }
 // No schema ownership/CREATE, DELETE, TRUNCATE, future-table defaults or grants
 // to anon/authenticated. Owner predicates remain the trusted server's job.
 // LOGIN/password provisioning is a separate secret-only operation per project.
 return sql.join('\n');
}
