# Shared storage foundation preview

Checkpoint date: 2026-11-01. Branch: `codex/shared-storage-foundation`.
This starts the [agreed plan](shared-storage.md), without changing production.

## Implemented slice

- Optional menu account dialog with Apple, Google and email entry points. Guest
  play remains immediate; no registration prompt interrupts an active climb.
- Email code adapter using pinned Supabase JS on the server. Access/refresh
  tokens stay in encrypted, HttpOnly, SameSite=Lax cookies, Secure with __Host-
  names on HTTPS. Browser storage contains no provider/session tokens.
- Same-origin POST checks, body limits, generic auth errors, session expiry and
  refresh, local-session sign-out and outage recovery without discarding cookies.
- Immutable completed Flow result envelopes, stored in IndexedDB before upload.
  Retries survive restart; accepted receipts prevent local requeue. Account
  changes stop pending callbacks. Server verifies identity and the expected
  account scope on each read/write, including another tab's cookie changes.
- A climb's account scope is pinned at its start and preserved through local
  reload recovery. Older unscoped runs remain guest. Guest imports require
  review/confirmation and retain the source; no wallet/current-run import.
- Separate private PostgreSQL schema with internal player IDs, issuer/subject
  mapping, immutable result/hash conflict checks and transactional, monotone
  progress per course/rules/mode/testing category. All results and unlock claims
  remain client-reported and unverified. No wallet or paid authority is accepted.
- Browser modules are content-addressed assets. Server code, credentials and SQL
  are absent from the static output. Main remains unchanged.

## Deliberately not enabled

Apple/Google adapters have PKCE groundwork but **OAuth is hard code-gated off**.
Supabase's automatic same-email identity joining still conflicts with our consent
contract; neither an env flag nor manual-link enablement solves it. Mobile's
pinned source review also found provider-linking domains still allow same-provider
email matching. A separately reviewed direct OIDC broker or Auth strategy is
required before real provider activation. No live provider login is claimed.

The hosted preview has no configured shared backend and says so. It supports
guest play and UI review, not real cloud sign-in. Production is independently
disabled by `VERCEL_ENV=production`. No hosted resources, OAuth credentials,
email sender, secrets or provider settings were created/changed by this work.

Native's current isolated trial remains local-only. Native preview
[PR46](https://github.com/zengks/carve-mobile/pull/46) adds request-scope guards and
matching synthetic contract validation; it does not connect the installed game.
Only `web.flow-v1`/`flow-v1` completed runs are accepted in this wire version.
Native First Ascent chain/time/falls metrics need a separate reviewed payload;
they must not be converted into equivalent heights or mixed with web records.

Cloud results/progress are shown in the account log. They do not overwrite the
local gameplay profile, bounty, equipped skills or unfinished run. Existing local
wallets remain device-local while offline-spending/import policies are open.
Account recovery/deletion, provider linking/unlinking and hosted privacy/retention
are release gates, not completed features. Bounty and purchase fields report
`not_connected`/`not_implemented`; **no payments or purchase grants exist**.

## Setup boundary

The preview adapter recognizes server-only variables:

| Variable | Meaning |
| --- | --- |
| `CARVE_APP_ORIGIN` | Exact approved HTTPS origin; loopback HTTP for isolated tests only |
| `CARVE_SUPABASE_URL` | Reviewed Auth origin, without a path |
| `CARVE_SUPABASE_PUBLISHABLE_KEY` | Public Auth client key used server-side; no service-role client key |
| `CARVE_SESSION_SECRET` | Independent random 32-byte hex cookie encryption key |
| `CARVE_SHARED_DATABASE_URL` | Server-only connection to the isolated shared-schema database |

No variables were added to Vercel. Do not point this preview at retained native
Stage D or production. `server/schema.sql` is a local test fixture, not a reviewed
hosted migration. Apply it only to a newly isolated `carve_shared_test_*` database
for this checkpoint. The schema is private, not exposed through Supabase REST;
it grants no anon/authenticated access. RLS denies ordinary clients, while the
trusted server DB owner bypasses RLS and scopes every query using verified identity.
Before hosted use, define a dedicated least-privilege server role, connection
pooling/TLS policy, approved migrations and deployment credentials.

Configure both signup confirmation and magic-link email templates to contain
`{{ .Token }}`; reference `server/templates/email-code.html`. Defaults send a
link, which does not match this code-entry UI. Verify delivery, sender, rate limits
and expiry in an isolated environment before exposing email sign-in publicly.

## Evidence and limits

- `npm run build`: existing game suites plus contract, IndexedDB queue and account
  API checks. `npm run test:database` requires an explicitly isolated test DB.
  Node 24/26 CI runs both with disposable job-local PostgreSQL.
- Isolated local PostgreSQL: concurrent first-account/replayed-result requests,
  conflicting payload rollback, monotone progress, owner/issuer separation and
  denied ordinary-role access. Synthetic rows are retained.
- `tests/account-integration.mjs`: actual Supabase Auth 2.197.0, captured emailed
  OTP, encrypted session, PostgreSQL read/write, retry, account swap rejection
  and stable re-login. Requires `CARVE_TEST_DATABASE_URL` and an isolated
  `CARVE_TEST_AUTH_SECRET`; uses only the new local ports below. Never run against
  the retained mobile stack or real players.
- Browser UI: actual locally emailed code login; manual short keyboard climb
  banked at 13 m and visible in account log; sign-out retained guest gameplay
  progress. Responsive account/menu inspected at phone and short landscape sizes.
- Mobile matched 86 synthetic contract cases to the web validator and passed
  20 request-scope checks. These checks do not establish native/browser cloud sync,
  physical-device ergonomics or live Apple/Google readiness.

New synthetic local services use names `carve-shared-*-20261101`, separate Docker
network/volume, database port 55532, Auth 55521, mail capture 55524 and temporary
local SDK proxy 55523. Published ports bind only to 127.0.0.1; the template helper
has no host-published port. The initial new Auth process is retained stopped;
its code-template-enabled replacement uses the same new synthetic DB. Every
retained native service, simulator, owner profile/save and Stage E identity was
left untouched. Private local QA credentials stay outside the repository.

## Next slice

Resolve the explicit-link broker/auth design, define the native event payload and
identity mapping together, review hosted configuration/recovery/deletion, then
connect isolated web/native test builds to the same approved backend. Classify
earned bounty and offline spending before introducing a common ledger. Payments
remain a separate later milestone.
