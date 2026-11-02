# CARVE hosted environment setup

Verified 2026-11-02. The owner authorized isolated Vercel Pro / Supabase Pro
production and staging setup, then explicitly approved the restricted staging
login and Vercel Preview secret storage in the mobile chat. Keep the live game,
main branches and existing apps/data unchanged. Payments and native download
prompts remain disabled; web PR17/PR18 and mobile PR46 remain unmerged.

Follow-up: [sign-in preparation without a custom domain](staging-signin-setup.md)
adds staging-only public Auth configuration and an explicit disabled email gate.
The deployment/env inventory below describes the original provisioning snapshot.

## Resource inventory and billing

| Resource | Verified state |
| --- | --- |
| Vercel team `zengksoutlookcoms-projects` | Existing Pro account, active |
| Live Vercel project `carve-game` | Existing deployment/settings/configuration unchanged |
| New Vercel project `carve-staging` | Protected, Node 26, functions in `yul1`, Git auto-deploy disconnected |
| Supabase organization `ponydude` | Existing Pro organization; unrelated projects preserved |
| New Supabase `carve-staging` | `ffxcsgtissldpkuxgxvo`, Canada Central, healthy, Micro |
| New Supabase `carve-production` | `zeosjsyugyxqeeacpkpx`, Canada Central, healthy, Micro, dormant |

Public environment bindings are versioned in `config/hosted-projects.json`.
Canada Central database placement does not guarantee every related service stays
in Canada. Both new projects report PostgreSQL `17.11.0.011`.

Two additional Micro projects in the existing Pro organization are approximately
US$20/month extra before tax/usage. Existing projects and usage remain on the
organization's bill. No plan upgrade, payment-method change, SMTP subscription,
IPv4 add-on, domain purchase or Stripe merchant/payout setup was performed.

Owner billing actions: review payment method, billing name/address, invoices and
usage alerts in the existing Vercel and Supabase dashboards. There is no further
hosting subscription to buy for this milestone. Compute and usage are not a
universal capped monthly fee. Never send card details or credentials in chat.

## Database provisioning and access

Both projects were verified fresh before applying the reviewed canonical migration
`supabase/migrations/20261102205254_carve_shared_foundation.sql`.
Its source hash is
`f192d323a54ded034479dd76db927116ed0ab7f6841ffdf746a465dc0b4aec34`.
The provider recorded migration versions `20261102205337` in staging and
`20261102205406` in production. Do not reapply this baseline or reset either project.
`node scripts/hosted-migration.mjs --check` detects drift from the reviewed sources.

Actual hosted metadata checks confirm:

- Eleven private `carve_shared_v1` tables in each project, all with RLS enabled.
- No table grants to anonymous, authenticated or service-role API clients.
- The server role has schema USAGE and an exact SELECT/INSERT/UPDATE allowlist;
  immutable results/identity records have narrower grants. No schema CREATE,
  DELETE/TRUNCATE, superuser, role/database creation, inherited memberships,
  replication or RLS bypass. Connection limit is twelve.
- Both projects' security advisors returned no lints. This is a point-in-time
  configuration check, not complete production qualification.
- Both have zero player, web-result and native-result records. No owner data or
  legacy wallets were imported.

Production `carve_runtime` remains NOLOGIN and has no runtime credentials in the
live Vercel project. Only staging received a new independent restricted login
following the owner's explicit approval. It is unrelated to the database admin
password and is never shipped to browsers/native apps or stored in Git.

Staging uses the dashboard-confirmed shared transaction pooler
`aws-1-ca-central-1.pooler.supabase.com:6543`, database `postgres`, username
`carve_runtime.ffxcsgtissldpkuxgxvo`. Remote connections require certificate and
hostname verification using the dashboard's Supabase Root 2021 CA. No TLS bypass,
OS trust change, service-role key or database-admin credential is used.

`server/postgres.mjs` also pins the expected project/role/database and rejects
connection-string overrides that could replace its TLS or host settings. Runtime
code never applies migrations.

## Staging deployment and acceptance

Project: `prj_zHwA5QqAGGMI1tWa6hdiHmM0lhAT`.
Stable origin: https://carve-staging-zengksoutlookcoms-projects.vercel.app

Tested runtime: `b14f4e2e11b18f934bb635c6fe326025dbae9012`, deployment
`dpl_6kfPUdpKJbgHwmDQa49VvJVvnfHB`, Ready, target `staging`:
https://carve-staging-a3pixu0uy-zengksoutlookcoms-projects.vercel.app

At this original provisioning snapshot, six sensitive variables were scoped only to this new project's Preview
environment: `CARVE_APP_ORIGIN`, `CARVE_SHARED_DATABASE_URL`,
`CARVE_DATABASE_CA_CERT`, `CARVE_EXPECTED_PROJECT_REF`, `CARVE_SESSION_SECRET`,
`CARVE_STORAGE_HEALTH_ENABLED`. No Production variables were added. The CA and
origin are public metadata but remain server configuration. Environment inventory
was checked without decrypting values.

The actual local readiness handler connected to hosted staging using the restricted
login and returned HTTP 200. The signed-in browser then verified the deployed
`/api/storage-health` response reports database/TLS/schema/role ready and
`production_enabled:false`. This endpoint reads catalog metadata only and cannot
activate login, query player records or write data. Its tests verify no-store,
noindex and sanitized failures; hosted response headers were not independently
measured because the automated short-lived-token path returned
`TRUSTED_SOURCES_ENVIRONMENT_MISMATCH`. Protection/trust rules were not broadened,
and no bypass credential/share link was created. Browser account/native routes
remain unconfigured pending providers; this is database readiness, not a successful
real-player sign-in or cross-device save test.

The first configured deployment exposed synthetic config tests inheriting hosted
environment defaults. The test was isolated and environment-default regressions
added; the subsequent hosted build passed. Local full build passed. CI Node 24/26,
including the actual PostgreSQL suites, passed on tested runtime `b14f4e2`.

The native CLI shim also misrouted one read-only verification command into creating
an isolated probe project containing only probe source (no secrets/player data).
That task-created probe project was removed immediately. Use the CLI JavaScript
entry point for further commands; inspect actual results rather than trusting a
flag. An earlier first staging deployment was classified Production despite an
explicit preview flag; it was limited to this separate project and remains
protected/unconfigured. Subsequent deployments explicitly use the legacy
`staging` API target and verify actual project/target/build.

Live remains `dpl_FXTTkFE5TfmJ8M1NMUEiMzNuhmUg`, commit
`aa5911a9a71e2e4d2b4cfa86a17f3a4736c2980d`, on carve-game.vercel.app.
No live deployment, variables, aliases, security settings or analytics changed.

## Remaining sign-in and launch requirements

1. Configure owner-controlled Apple/Google credentials and exact callback domains.
   Email sign-in needs a verified sender domain and production SMTP service;
   Supabase's default email service is not being advertised as player-ready.
   Browser Supabase URL/publishable key were initially unset; the follow-up now
   prepares them on isolated staging with email explicitly disabled. Native client
   registries remain unset.
2. Agree the public callback/domain design. Protected staging currently prevents
   ordinary external OAuth/system-auth callbacks. Do not weaken deployment
   protection or put a bypass secret in a native build. A runtime health response
   does not prove actual provider login, account-linking or browser-to-app return.
3. Complete real-provider collision/link/recovery testing and hosted completed-save
   retries/isolation with clearly marked staging identities. Unfinished climbs stay
   device-local; incompatible web/native course records and wallets stay separate.
4. Verify backup configuration and perform a retained isolated restore drill;
   qualify retention/deletion, abuse limits, observability and recovery before
   inviting real players. Production activation is a separate reviewed release.

Native owns dormant public environment descriptors. Proposed public aliases are
`carve-staging-ios-v1` / `carve-staging-android-v1`, with different production
aliases. Authorize is `<origin>/native/authorize`; proposed app returns are
`<origin>/native/return/ios` and `/native/return/android`. These are not registered
operational links. Provider callbacks
`/api/native-broker/callback?provider=apple|google` are different. Signed native
AASA/App Links, system-auth routing and Steam integration remain separate gates.
No database/session/provider secret belongs in the mobile or Steam client.

Web/native production account guards remain enabled. Guest play continues. No
payments, ad activation, shared-bounty/purchase imports or production login are
included in this provisioning milestone.

References: [Vercel Pro](https://vercel.com/docs/plans/pro-plan),
[Supabase pricing](https://supabase.com/pricing),
[organization billing](https://supabase.com/docs/guides/platform/billing-on-supabase),
[connection/TLS settings](https://supabase.com/docs/guides/database/connecting-to-postgres).
