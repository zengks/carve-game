-- Initial baseline for NEW approved CARVE projects only. No credentials or player data.

-- Source: server/schema.sql
-- Apply only to a new, explicitly approved CARVE database (hosted or isolated QA).
-- No edits to native public tables, auth settings, identities or owner saves.

CREATE SCHEMA IF NOT EXISTS carve_shared_v1;
REVOKE ALL ON SCHEMA carve_shared_v1 FROM PUBLIC;
CREATE TABLE IF NOT EXISTS carve_shared_v1.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_key text UNIQUE CHECK(length(scope_key)=64)
);
ALTER TABLE carve_shared_v1.players ADD COLUMN IF NOT EXISTS scope_key text;
CREATE UNIQUE INDEX IF NOT EXISTS player_scope_unique ON carve_shared_v1.players(scope_key);
CREATE TABLE IF NOT EXISTS carve_shared_v1.identities (
  issuer text NOT NULL,
  subject text NOT NULL CHECK(length(subject) BETWEEN 1 AND 255),
  player_id uuid NOT NULL REFERENCES carve_shared_v1.players(id),
  PRIMARY KEY (issuer, subject)
);
ALTER TABLE carve_shared_v1.identities ALTER COLUMN subject TYPE text USING subject::text;
CREATE TABLE IF NOT EXISTS carve_shared_v1.broker_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), issuer text NOT NULL, subject text NOT NULL,
  label text NOT NULL, authenticated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '1 day', revoked boolean NOT NULL DEFAULT false,
  FOREIGN KEY(issuer,subject) REFERENCES carve_shared_v1.identities(issuer,subject)
);
CREATE TABLE IF NOT EXISTS carve_shared_v1.auth_flows (
  id text PRIMARY KEY, browser_hash text NOT NULL, data jsonb NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes', consumed boolean NOT NULL DEFAULT false
);
ALTER TABLE carve_shared_v1.auth_flows ADD COLUMN IF NOT EXISTS cancelled boolean NOT NULL DEFAULT false;
ALTER TABLE carve_shared_v1.auth_flows ADD COLUMN IF NOT EXISTS result_session_id uuid;
CREATE TABLE IF NOT EXISTS carve_shared_v1.link_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), target_issuer text NOT NULL, target_subject text NOT NULL,
  binding_hash text NOT NULL, proof jsonb NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes', consumed boolean NOT NULL DEFAULT false,
  confirmed boolean NOT NULL DEFAULT false
);
ALTER TABLE carve_shared_v1.link_offers ADD COLUMN IF NOT EXISTS confirmed boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS carve_shared_v1.completed_results (
  player_id uuid NOT NULL REFERENCES carve_shared_v1.players(id),
  event_id text NOT NULL CHECK(length(event_id) BETWEEN 1 AND 160),
  payload_hash text NOT NULL CHECK(length(payload_hash)=64),
  event jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(player_id,event_id)
);
CREATE TABLE IF NOT EXISTS carve_shared_v1.course_progress (
  player_id uuid NOT NULL REFERENCES carve_shared_v1.players(id),
  course_id text NOT NULL, rules_version text NOT NULL, mode text NOT NULL,
  testing boolean NOT NULL, best_height bigint NOT NULL,
  unlocks text[] NOT NULL, lessons text[] NOT NULL,
  PRIMARY KEY(player_id,course_id,rules_version,mode,testing)
);
-- This schema is server-only and not exposed through the Supabase Data API.
-- No anon/authenticated privileges or client mutations. The separately reviewed
-- runtime-role policies grant only server access; authenticated owner predicates
-- remain required on every API query. Runtime code never applies migrations.
ALTER TABLE carve_shared_v1.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_shared_v1.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_shared_v1.completed_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_shared_v1.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_shared_v1.broker_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_shared_v1.auth_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_shared_v1.link_offers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA carve_shared_v1 FROM PUBLIC;

-- Source: server/native-schema.sql
-- Apply only to the approved isolated database; not automatically migrated at runtime.

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

-- Source: server/native-progress-schema.sql
-- New, explicitly approved CARVE databases only; runtime never applies migrations.

CREATE TABLE IF NOT EXISTS carve_shared_v1.native_completed_results (
 player_id uuid NOT NULL REFERENCES carve_shared_v1.players(id),
 event_id text NOT NULL CHECK(length(event_id)<=80),
 course_id text NOT NULL CHECK(course_id='native.first-ascent-v1'),
 rules_version text NOT NULL CHECK(rules_version='native-fa-rules-1'),
 testing boolean NOT NULL, mode text NOT NULL CHECK(mode IN ('guided','replay')),
 resumed boolean NOT NULL, active_ms integer NOT NULL CHECK(active_ms BETWEEN 1 AND 86400000),
 best_chain smallint NOT NULL CHECK(best_chain BETWEEN 0 AND 10),
 falls integer NOT NULL CHECK(falls BETWEEN 0 AND 10000),
 tutorial_mask smallint NOT NULL CHECK(tutorial_mask BETWEEN 16 AND 31),
 payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'), event jsonb NOT NULL,
 received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(player_id,event_id)
);
CREATE INDEX IF NOT EXISTS native_results_recent ON carve_shared_v1.native_completed_results
 (player_id,course_id,rules_version,testing,received_at DESC,event_id DESC);
CREATE TABLE IF NOT EXISTS carve_shared_v1.native_course_progress (
 player_id uuid NOT NULL REFERENCES carve_shared_v1.players(id),
 course_id text NOT NULL CHECK(course_id='native.first-ascent-v1'),
 rules_version text NOT NULL CHECK(rules_version='native-fa-rules-1'),
 testing boolean NOT NULL, tutorial_mask smallint NOT NULL DEFAULT 0 CHECK(tutorial_mask BETWEEN 0 AND 31),
 completed boolean NOT NULL DEFAULT false,
 revision bigint NOT NULL DEFAULT 0 CHECK(revision BETWEEN 0 AND 9007199254740991),
 PRIMARY KEY(player_id,course_id,rules_version,testing)
);
ALTER TABLE carve_shared_v1.native_completed_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_shared_v1.native_course_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON carve_shared_v1.native_completed_results,carve_shared_v1.native_course_progress FROM PUBLIC;

-- Source: runtimeRoleSQL(carve_runtime); password/login remains a separate secret-only operation.
CREATE ROLE carve_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 12;
GRANT USAGE ON SCHEMA carve_shared_v1 TO carve_runtime;
GRANT SELECT,INSERT,UPDATE ON carve_shared_v1.players TO carve_runtime;
CREATE POLICY carve_runtime_select ON carve_shared_v1.players FOR SELECT TO carve_runtime USING (true);
CREATE POLICY carve_runtime_insert ON carve_shared_v1.players FOR INSERT TO carve_runtime WITH CHECK (true);
CREATE POLICY carve_runtime_update ON carve_shared_v1.players FOR UPDATE TO carve_runtime USING (true) WITH CHECK (true);
GRANT SELECT,INSERT ON carve_shared_v1.identities TO carve_runtime;
CREATE POLICY carve_runtime_select ON carve_shared_v1.identities FOR SELECT TO carve_runtime USING (true);
CREATE POLICY carve_runtime_insert ON carve_shared_v1.identities FOR INSERT TO carve_runtime WITH CHECK (true);
GRANT SELECT,INSERT,UPDATE ON carve_shared_v1.broker_sessions TO carve_runtime;
CREATE POLICY carve_runtime_select ON carve_shared_v1.broker_sessions FOR SELECT TO carve_runtime USING (true);
CREATE POLICY carve_runtime_insert ON carve_shared_v1.broker_sessions FOR INSERT TO carve_runtime WITH CHECK (true);
CREATE POLICY carve_runtime_update ON carve_shared_v1.broker_sessions FOR UPDATE TO carve_runtime USING (true) WITH CHECK (true);
GRANT SELECT,INSERT,UPDATE ON carve_shared_v1.auth_flows TO carve_runtime;
CREATE POLICY carve_runtime_select ON carve_shared_v1.auth_flows FOR SELECT TO carve_runtime USING (true);
CREATE POLICY carve_runtime_insert ON carve_shared_v1.auth_flows FOR INSERT TO carve_runtime WITH CHECK (true);
CREATE POLICY carve_runtime_update ON carve_shared_v1.auth_flows FOR UPDATE TO carve_runtime USING (true) WITH CHECK (true);
GRANT SELECT,INSERT,UPDATE ON carve_shared_v1.link_offers TO carve_runtime;
CREATE POLICY carve_runtime_select ON carve_shared_v1.link_offers FOR SELECT TO carve_runtime USING (true);
CREATE POLICY carve_runtime_insert ON carve_shared_v1.link_offers FOR INSERT TO carve_runtime WITH CHECK (true);
CREATE POLICY carve_runtime_update ON carve_shared_v1.link_offers FOR UPDATE TO carve_runtime USING (true) WITH CHECK (true);
GRANT SELECT,INSERT ON carve_shared_v1.completed_results TO carve_runtime;
CREATE POLICY carve_runtime_select ON carve_shared_v1.completed_results FOR SELECT TO carve_runtime USING (true);
CREATE POLICY carve_runtime_insert ON carve_shared_v1.completed_results FOR INSERT TO carve_runtime WITH CHECK (true);
GRANT SELECT,INSERT,UPDATE ON carve_shared_v1.course_progress TO carve_runtime;
CREATE POLICY carve_runtime_select ON carve_shared_v1.course_progress FOR SELECT TO carve_runtime USING (true);
CREATE POLICY carve_runtime_insert ON carve_shared_v1.course_progress FOR INSERT TO carve_runtime WITH CHECK (true);
CREATE POLICY carve_runtime_update ON carve_shared_v1.course_progress FOR UPDATE TO carve_runtime USING (true) WITH CHECK (true);
GRANT SELECT,INSERT,UPDATE ON carve_shared_v1.native_instances TO carve_runtime;
CREATE POLICY carve_runtime_select ON carve_shared_v1.native_instances FOR SELECT TO carve_runtime USING (true);
CREATE POLICY carve_runtime_insert ON carve_shared_v1.native_instances FOR INSERT TO carve_runtime WITH CHECK (true);
CREATE POLICY carve_runtime_update ON carve_shared_v1.native_instances FOR UPDATE TO carve_runtime USING (true) WITH CHECK (true);
GRANT SELECT,INSERT ON carve_shared_v1.native_flow_index TO carve_runtime;
CREATE POLICY carve_runtime_select ON carve_shared_v1.native_flow_index FOR SELECT TO carve_runtime USING (true);
CREATE POLICY carve_runtime_insert ON carve_shared_v1.native_flow_index FOR INSERT TO carve_runtime WITH CHECK (true);
GRANT SELECT,INSERT ON carve_shared_v1.native_completed_results TO carve_runtime;
CREATE POLICY carve_runtime_select ON carve_shared_v1.native_completed_results FOR SELECT TO carve_runtime USING (true);
CREATE POLICY carve_runtime_insert ON carve_shared_v1.native_completed_results FOR INSERT TO carve_runtime WITH CHECK (true);
GRANT SELECT,INSERT,UPDATE ON carve_shared_v1.native_course_progress TO carve_runtime;
CREATE POLICY carve_runtime_select ON carve_shared_v1.native_course_progress FOR SELECT TO carve_runtime USING (true);
CREATE POLICY carve_runtime_insert ON carve_shared_v1.native_course_progress FOR INSERT TO carve_runtime WITH CHECK (true);
CREATE POLICY carve_runtime_update ON carve_shared_v1.native_course_progress FOR UPDATE TO carve_runtime USING (true) WITH CHECK (true);
