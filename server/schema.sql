-- Only apply to a new isolated test database for this preview milestone.
-- No edits to native public tables, auth settings, identities or owner saves.
BEGIN;
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
-- No anon/authenticated privileges or client mutations. The trusted server DB
-- owner bypasses RLS and must use authenticated owner predicates on every query.
ALTER TABLE carve_shared_v1.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_shared_v1.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_shared_v1.completed_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_shared_v1.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_shared_v1.broker_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_shared_v1.auth_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE carve_shared_v1.link_offers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA carve_shared_v1 FROM PUBLIC;
COMMIT;
