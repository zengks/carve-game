# Protected Android Google sign-in staging

Status: implementation branch only; no new hosted project, no deployed auth
artifact, no hosted schema/role/secret changes, no public exception or activation.
Production, native activation and the mobile download prompt remain disabled.
Existing PRs stay unmerged. No purchases.

Canonical access/security plan is owned by mobile:
`carve-mobile/docs/android-public-staging-access-plan.md`, plan commit
`419f02b381b1adb5b67026922bb5f19cb5ddd5fa`.
This document records the web implementation and exact remaining approval gates.

## Reviewable artifact

`staging-auth` is a separate project root with its own pinned lockfile. Run:

```sh
npm ci --ignore-scripts --prefix staging-auth
npm run build --prefix staging-auth
```

Output is `staging-auth/.vercel/output` (ignored). The Build Output API routes
only five exact, case-sensitive paths into one Node 26 function, then terminates
with 404. There is no filesystem/static fallback, game, account/email UI,
progress API, health/debug endpoint, analytics or source map. Server modules
needed by the existing broker are bundled as private function dependencies;
their presence does not export additional routes.

Allowed routes:

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/native-broker/v1` | POST | begin/exchange/session/cancel/signout only |
| `/native/authorize` | GET | one-use Google launch |
| `/api/native-broker/callback` | GET | verified Google callback only |
| `/native/return/android` | GET | inert fallback; never reflects code/state |
| `/.well-known/assetlinks.json` | GET | exact inspected Android signer metadata |

Only `carve-staging-android-v1`, Google, signin and the pinned same-origin Android
return are accepted. Apple, email, iOS, linking, progress, cookies/Origin on POST,
duplicate/unknown fields and alternate paths fail closed. Request/reply limits
are 8/16 KiB. Browser replies are no-store/no-referrer/noindex, with restrictive
CSP. If the OS does not intercept the return link, the static page instructs the
tester to cancel/retry in the app; it never publishes a credential-bearing link.

Activation requires actual `VERCEL=1` and `VERCEL_ENV=preview`, source-reviewed
project/origin/database/Google-Web-client/package/certificate pins, a matching restricted staging
DB URL, Google credentials and an independent 32-byte session key. It is never
possible to enable this handler in an actual Production deployment. No system
environment variables are spoofed. Project/origin pins are currently empty,
so even a mistakenly set activation variable cannot enable this artifact.
The Google Web client ID must match the independently reviewed public source pin;
changing only an environment credential to a different client is rejected. That
pin is also currently empty pending owner provider setup.

The inspected public signing identity is `com.carve.preview.staging`, signer
`52:AA:73:50:0E:3C:A2:D8:27:C2:B1:F1:30:66:4E:28:D0:22:23:BE:B4:04:49:48:BF:BC:03:06:F0:C5:05:2F`.
It comes from mobile's actual inert Release APK SHA256
`120a06b93c04390d5f9e8f4b3e4afbadb5ac2596daec0d13486a23cc083f5e9b`.
Web independently verified APK signature, manifest/package, matching retained
public DER certificate and 11 original build input hashes. It has no Internet
permission or App-Link filter and was not installed. A future playable export
must be inspected again; this is not OS/App-Link/provider qualification.

## Tester admission and abuse controls

Google's basic `openid email profile` sign-in is exempt from Testing's test-user
restriction. Google Testing is therefore **not** the access boundary. See
[Google's documented exception](https://support.google.com/cloud/answer/15549945?hl=en).

`server/android-auth-schema.sql` is a review-only, unapplied schema proposal for
the existing CARVE **staging** database `ffxcsgtissldpkuxgxvo`. It creates a new
private schema, bounded transient store, admission table and separate
`carve_android_auth` NOLOGIN role. It does not change the existing runtime role
or grant access to old sessions, results, progress, bounty or purchase records.
The shared players/identities grants only support verified principal creation.
No runtime migration, public enrollment or admin HTTP endpoint exists.

Admission is keyed by verified canonical Google issuer and subject, never email
or a client-supplied identity. Operator-controlled rows expire within seven days.
The runtime cannot read or modify the tester table. A fixed-search-path definer
function checks and locks admission without granting enrollment privileges.
Unknown subjects fail before player/session creation. Admission is checked at
callback, again in the final grant transaction after the inter-transaction wait,
and after principal resolution. Existing bearer reads recheck it and persist
revocation if the tester is removed. Row locks serialize removal against grants.

Enrollment remains gated: an operator must obtain `(issuer,sub)` from a verified
Google proof through a separately approved controlled process. Do not enroll by
email, accept a client claim, enable public discovery or add extra OAuth scopes.
No tester has been enrolled on hosted staging.

Durable fixed-window budgets are serialized in one bounded database row across
function instances/restarts. Only keyed hashes of the platform IP and binding
are retained; no raw IP is stored. The function accepts only a single valid
Vercel-supplied `x-vercel-forwarded-for`, with no arbitrary proxy-header fallback.
This trust applies only behind the pinned Vercel function; see
[Vercel request headers](https://vercel.com/docs/headers/request-headers).

| Budget | Broker requests/min | Begin/min | Begin/hour |
| --- | ---: | ---: | ---: |
| Global | 240 | 60 | 600 |
| Platform IP | 60 | 12 | 60 |
| Native binding | 24 | 4 | 12 |

At most 512 active budget keys, 128 native instances and 64 flows per binding.
Unknown cancel/signout never creates an instance. Aggregate creation is locked;
expired new instances and cascading flow indexes are removed on admitted quota
checks. New instances expire after 20 minutes, handoffs after two, sessions after
five. Cleanup never deletes shared players, identities, results, old native state
or audit records. RLS is on all new tables; runtime DELETE applies only to new
transient instances. One pool connection per function, role connection limit 4,
3s statement/750ms lock timeout and 15s function duration are proposed. Actual
Supavisor role/aggregate connection and platform load limits still need hosted
qualification before any exposure; local tests do not prove a public cost cap.

## Proposed protected deployment — not yet created

Existing Pro team: `team_54NtI2RGoT8a0ult0wItXPlF`.
New project: **`carve-android-auth-staging`** (separate from both existing projects).

- Root `staging-auth`, source files outside root enabled, framework none.
- Install `npm ci --ignore-scripts`; build `npm run build`.
- Node 26, region `yul1`, 15s duration, basic build machine.
- Vercel Authentication on **all deployments**, including aliases/custom domains.
- No Git link/autodeploy, production domains, protection exceptions, bypass
  secrets, public source, analytics, log drain or source maps.
- First deployment: disabled artifact with no runtime/provider/DB secrets.
  Inspect actual project settings/protection and Preview environment before pins.
- No Production variables. Do not reuse any existing session key/DB login.

Automatic approval review rejected creation of this persistent new resource
because of potential usage charges and the repository's explicit approval gate
for new hosted services. No project was created. Do not retry via another tool,
existing project or temporary public host. Owner approval for this exact project
and disabled protected deployment is still required.

Only after that approval: separately review/apply the new schema to staging,
approve its new restricted role's LOGIN credential and exact Preview receiver,
generate an independent session secret securely, and add actual staging Google
client credentials through a secret entry path. Nothing is copied from existing
Preview secrets. Google project/client/support contact remain owner prerequisites.

Keep `CARVE_ANDROID_AUTH_ENABLED=false` until all protected checks pass. Public
Android system-browser sign-in/App-Link verification will require a **separate**
future access decision. A protected deployment cannot demonstrate that flow.
No domain purchase is needed for the disabled protected milestone.

Before eventual public access: verify provider configuration, controlled tester
enrollment, secret receiver scope, actual role/pooler limits, signed playable
APK/browser return handling, and platform request/query/header/body/cookie log
redaction. Application code emits no request/credential logs, but this does not
establish platform log redaction. Do not create a share link or weaken the game
preview protection. Rollback disables only this new activation/project and its
new role/session credentials; preserve all older apps, records and QA evidence.

## Verification evidence and limits

- `node tests/android-auth.mjs`: exact-route/body/config gates, no allocation on
  unknown signout/cancel, static non-reflective return, IP boundary, disabled
  Production, exact Google Web-client pin, executable minimal artifact import
  and a standalone build without any root game/dev dependency installation.
- `node tests/android-auth-database.mjs`: actual restricted-role SQL and Fetch
  adapter with **synthetic provider proof**, admitted/unknown identities, removal
  during held exchange, persistent bearer revocation, cross-adapter budgets,
  parallel instance cap and scoped retention in a fresh retained QA database.
- All QA uses a separate loopback-only local PostgreSQL container/volume
  `carve-android-auth-qa-20261102`; no existing QA or hosted database is reset.
- Full game/auth builds passed locally on Node 24.22.1 and 26.10.0; all broader
  database regressions passed on the new local QA service. Initial checkpoint
  `598ce12` and peer-review correction `8482f37` passed both GitHub CI runtimes,
  including all actual database suites. Final code run:
  [CI 41553412857](https://github.com/zengks/carve-game/actions/runs/41553412857).
- The identical static fallback HTML was checked in a temporary local browser
  rendering probe on desktop and 390×844: readable text, content width 390px,
  no horizontal overflow, script, links, buttons or form. This is layout evidence
  only, not an actual provider return. The probe tab/viewport were cleaned up.

These checks do not prove real Google OAuth, email delivery, hosted pooler
behavior, Android App Links, OS/browser interaction or physical-device readiness.
