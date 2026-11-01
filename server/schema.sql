-- Only apply to a new isolated test database for this preview milestone.
-- No edits to native public tables, auth settings, identities or owner saves.
BEGIN;
CREATE SCHEMA IF NOT EXISTS carve_shared_v1;
REVOKE ALL ON SCHEMA carve_shared_v1 FROM PUBLIC;
CREATE TABLE IF NOT EXISTS carve_shared_v1.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
CREATE TABLE IF NOT EXISTS carve_shared_v1.identities (
  issuer text NOT NULL,
  subject uuid NOT NULL,
  player_id uuid NOT NULL REFERENCES carve_shared_v1.players(id),
  PRIMARY KEY (issuer, subject)
);
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
REVOKE ALL ON ALL TABLES IN SCHEMA carve_shared_v1 FROM PUBLIC;
COMMIT;
