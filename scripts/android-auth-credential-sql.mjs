// OPERATOR ONLY. Send only to the explicitly approved staging project's SQL API.
// Generates NEW credentials; never reads/copies an old password. Result is
// sensitive and must go directly to exact sensitive Preview receivers in memory.
// No literal credential is present in this SQL or a migration file.
export const androidAuthCredentialSQL=`
CREATE FUNCTION pg_temp.carve_android_credentials_once() RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $credential$
DECLARE r record; pwd text; session_key text;
BEGIN
 IF current_user<>'postgres' OR to_regnamespace('carve_android_auth_v1') IS NULL THEN
  RAISE EXCEPTION 'wrong_staging_operator_or_schema';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('carve_android_auth_new_credentials_v1',0));
 SELECT * INTO r FROM pg_roles WHERE rolname='carve_android_auth';
 IF NOT FOUND OR r.rolcanlogin OR r.rolsuper OR r.rolinherit OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls OR r.rolconnlimit<>4 THEN
  RAISE EXCEPTION 'fresh_restricted_nologin_role_required';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid) THEN RAISE EXCEPTION 'unexpected_role_membership'; END IF;
 IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='carve_android_auth_v1' AND c.relkind='r' AND c.relrowsecurity)<>4 THEN
  RAISE EXCEPTION 'private_auth_schema_required';
 END IF;
 pwd:=encode(extensions.gen_random_bytes(32),'hex');
 session_key:=encode(extensions.gen_random_bytes(32),'hex');
 EXECUTE format('ALTER ROLE carve_android_auth LOGIN PASSWORD %L',pwd);
 RETURN jsonb_build_object('role','carve_android_auth','database_password',pwd,'session_secret',session_key);
END $credential$;
SELECT pg_temp.carve_android_credentials_once() AS credential;
`;
