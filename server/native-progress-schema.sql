-- New, explicitly approved CARVE databases only; runtime never applies migrations.
BEGIN;
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
COMMIT;
