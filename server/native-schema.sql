-- Apply only to the approved isolated database; not automatically migrated at runtime.
BEGIN;
CREATE TABLE IF NOT EXISTS carve_shared_v1.native_instances (
 client_id text NOT NULL, binding_hash text NOT NULL CHECK(length(binding_hash)=64),
 data jsonb NOT NULL, PRIMARY KEY(client_id,binding_hash)
);
CREATE TABLE IF NOT EXISTS carve_shared_v1.native_flow_index (
 id text PRIMARY KEY CHECK(length(id)=43), client_id text NOT NULL, binding_hash text NOT NULL,
 FOREIGN KEY(client_id,binding_hash) REFERENCES carve_shared_v1.native_instances(client_id,binding_hash)
);
ALTER TABLE carve_shared_v1.native_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_shared_v1.native_flow_index ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON carve_shared_v1.native_instances,carve_shared_v1.native_flow_index FROM PUBLIC;
COMMIT;
