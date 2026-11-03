-- REVIEW ONLY until exact staging project/role/secret receiver approval.
-- Apply once after the shared foundation, staging or fresh isolated QA ONLY.
-- Does not alter any existing role, native transient record, player or save.
BEGIN;
CREATE SCHEMA carve_android_auth_v1;
REVOKE ALL ON SCHEMA carve_android_auth_v1 FROM PUBLIC;
CREATE TABLE carve_android_auth_v1.testers (
 issuer text NOT NULL CHECK(issuer='https://accounts.google.com'),
 subject text NOT NULL CHECK(length(subject) BETWEEN 1 AND 255),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL,
 enabled boolean NOT NULL DEFAULT true,
 PRIMARY KEY(issuer,subject),
 CHECK(expires_at>created_at AND expires_at<=created_at+interval '7 days')
);
CREATE TABLE carve_android_auth_v1.budget (
 id integer PRIMARY KEY CHECK(id=1),
 buckets jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(buckets)='object' AND octet_length(buckets::text)<=131072)
);
INSERT INTO carve_android_auth_v1.budget(id) VALUES(1);
CREATE TABLE carve_android_auth_v1.instances (
 client_id text NOT NULL CHECK(client_id='carve-staging-android-v1'),
 binding_hash text NOT NULL CHECK(binding_hash ~ '^[a-f0-9]{64}$'),
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object' AND octet_length(data::text)<=262144),
 expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '20 minutes',
 PRIMARY KEY(client_id,binding_hash)
);
CREATE INDEX android_auth_expiry ON carve_android_auth_v1.instances(expires_at);
CREATE TABLE carve_android_auth_v1.flow_index (
 id text PRIMARY KEY CHECK(id ~ '^[A-Za-z0-9_-]{43}$'),
 client_id text NOT NULL, binding_hash text NOT NULL,
 FOREIGN KEY(client_id,binding_hash) REFERENCES carve_android_auth_v1.instances(client_id,binding_hash) ON DELETE CASCADE
);
-- Definer can lock the admission row without granting runtime any ability to
-- enroll, enable, extend or remove testers. This function never creates players.
CREATE FUNCTION carve_android_auth_v1.admitted(text,text) RETURNS boolean
 LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT true FROM carve_android_auth_v1.testers
 WHERE issuer=$1 AND subject=$2 AND enabled AND expires_at>clock_timestamp()
 FOR SHARE
$$;
REVOKE ALL ON FUNCTION carve_android_auth_v1.admitted(text,text) FROM PUBLIC;
CREATE ROLE carve_android_auth NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 4;
ALTER ROLE carve_android_auth SET statement_timeout='3s';
ALTER ROLE carve_android_auth SET idle_in_transaction_session_timeout='5s';
GRANT USAGE ON SCHEMA carve_shared_v1,carve_android_auth_v1 TO carve_android_auth;
GRANT EXECUTE ON FUNCTION carve_android_auth_v1.admitted(text,text) TO carve_android_auth;
GRANT SELECT,INSERT ON carve_shared_v1.players,carve_shared_v1.identities TO carve_android_auth;
GRANT UPDATE(scope_key) ON carve_shared_v1.players TO carve_android_auth;
CREATE POLICY android_auth_select ON carve_shared_v1.players FOR SELECT TO carve_android_auth USING (true);
CREATE POLICY android_auth_insert ON carve_shared_v1.players FOR INSERT TO carve_android_auth WITH CHECK (true);
CREATE POLICY android_auth_scope ON carve_shared_v1.players FOR UPDATE TO carve_android_auth USING (true) WITH CHECK (true);
CREATE POLICY android_auth_select ON carve_shared_v1.identities FOR SELECT TO carve_android_auth USING (true);
CREATE POLICY android_auth_insert ON carve_shared_v1.identities FOR INSERT TO carve_android_auth WITH CHECK (true);
ALTER TABLE carve_android_auth_v1.testers ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_android_auth_v1.budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_android_auth_v1.instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_android_auth_v1.flow_index ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA carve_android_auth_v1 FROM PUBLIC;
GRANT SELECT,UPDATE ON carve_android_auth_v1.budget TO carve_android_auth;
GRANT SELECT,INSERT,UPDATE,DELETE ON carve_android_auth_v1.instances TO carve_android_auth;
GRANT SELECT,INSERT ON carve_android_auth_v1.flow_index TO carve_android_auth;
CREATE POLICY android_auth_budget ON carve_android_auth_v1.budget TO carve_android_auth USING (true) WITH CHECK (true);
CREATE POLICY android_auth_instances ON carve_android_auth_v1.instances TO carve_android_auth USING (true) WITH CHECK (true);
CREATE POLICY android_auth_index ON carve_android_auth_v1.flow_index TO carve_android_auth USING (true) WITH CHECK (true);
COMMIT;
