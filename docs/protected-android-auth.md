# Protected Android Google sign-in staging

Status: disabled auth-only Preview deployed on the explicitly approved separate
Vercel Pro project. The separately approved staging-only schema, restricted LOGIN
and Preview secrets are provisioned; see [the readiness receipt](android-auth-staging-db.json).
No public exception or Google/native/production activation.
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
environment variables are spoofed. The exact approved project and protected
canonical origin are now pinned. The independent Google client pin stays empty,
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

`server/android-auth-schema.sql` was reviewed, tested and applied only to the
existing CARVE **staging** database `ffxcsgtissldpkuxgxvo`, under separately verified
owner approval. It creates a new
private schema, bounded transient store, admission table and separate
`carve_android_auth` role (NOLOGIN in migration; separately provisioned staging
LOGIN afterward). It does not change the existing runtime role
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

## Initial protected deployment snapshot — 2026-11-02

The initial empty-environment/closed-origin snapshot below is retained as history.
The follow-up approved schema/credential setup is recorded in
[Google staging setup](android-google-staging-credentials.md) and
[the database readiness receipt](android-auth-staging-db.json). Current source
pins identify the existing stable alias as canonical, provider pin empty and
activation false; its updated disabled deployment is a separate verification step.

Existing Pro team: `team_54NtI2RGoT8a0ult0wItXPlF`.
New project: **`carve-android-auth-staging`** (separate from both existing projects),
ID `prj_avYmWC0QKUACNm6YrWbc4FsZnSxZ`.
Verified Preview: `dpl_Fex9YsTGTmVdSdphT5RhWFkZkCt2`, READY, API target `null`
(Preview), source CLI artifact from commit `10b8134b326d5fa32da02d9a1f9ad74253b4f867`.
[Open the protected Preview](https://carve-android-auth-staging-c3pdxgw9s-zengksoutlookcoms-projects.vercel.app/api/native-broker/v1).
Signed-in owners see the intentionally disabled handler, not a sign-in screen.

- Root `staging-auth`, source files outside root enabled, framework none.
- Install `npm ci --ignore-scripts`; build `npm run build`.
- Node 26, region `yul1`, 15s duration, basic build machine.
- Vercel Authentication on **all deployments**, including aliases/custom domains.
- No Git link/autodeploy, production domains, protection exceptions, bypass
  secrets, public source, analytics, log drain or source maps.
- Deployed disabled artifact with zero project variables, no `CARVE_` deployment
  environment variables and no provider/DB/session credentials.
- Source project/origin/Google-client pins remain empty. No canonical Android
  origin is assigned; this deployment does not activate or qualify native OAuth.
- No Production variables. Do not reuse any existing session key/DB login.

Initial automatic approval review rejected resource creation. On 2026-11-02 the
owner explicitly approved this exact project and disabled fully protected upload
in both chats. Creation then succeeded; no purchase or plan upgrade was made.

The first CLI 65.5.0 upload, despite explicit `--environment preview`, was assigned
the first-deployment Production label and generated an alias. It was always
disabled, credential-free and protected on all deployments. This historical
artifact `dpl_GMt3vzKrqujk1gmpUBhtBLSSHEmK` is retained. A second identical upload
is the verified Preview above. The new project's actual targets now contain
**only Preview**, `live:false`, no active Production target. A production-pause
request returned `invalid_deployment` because no active production existed; no
pause took effect. Do not claim that the first attempt never received that label.

CLI uploads reset automatic custom-domain assignment; it was explicitly set back
to **false after the final upload** and read back. Keep it false. Fixed basic
builds and the 15s/`yul1` function settings are verified. Disabling the provider's
default elastic build concurrency was denied by the connected API's role
permissions; it remains default true. There is no Git connection/automatic build
trigger, and no paid add-on was activated. Do not claim an aggregate cost cap.

CLI prebuilt upload requires output at the checkout root while validating the
project's `staging-auth` subdirectory. Upload used an isolated temporary directory
with the identical `.vercel/output` and an empty `staging-auth` directory, avoiding
the game's config/link/files. No root game project link was created or changed.

Verified on the new project:

- Vercel dashboard: Require Log In ON, **All Deployments**, protected sourcemaps.
- No bypass secret, share link, domain exception or OPTIONS allowlist. The
  platform's default same-project Trusted Sources entry was not expanded.
- 27 anonymous requests across Preview, first-upload URL and generated alias:
  GET on root/all five routes, plus API POST/OPTIONS/HEAD. All receive Vercel
  authentication 302/401; no redirects followed or credentials used.
- Authenticated browser GET on the Preview API visibly returns
  `{"contract_version":1,"error":"not_found"}`. With origin pin empty, the host
  policy rejects before configuration's 503; this is the expected disabled state.
- Actual in-function `VERCEL_ENV` and original URL/Host forwarding are still not
  qualified by this closed-pin request. Preview platform metadata alone is not
  direct runtime environment evidence; no debug endpoint was added.
- Existing game and staging project metadata/protection matched the baseline.
  Live production remains `dpl_FXTTkFE5TfmJ8M1NMUEiMzNuhmUg`, main `aa5911a`.

Public-only receipt: [android-auth-protected-deployment.json](android-auth-protected-deployment.json).

The separately approved schema/LOGIN/Preview receiver step is now complete.
Actual verified TLS login, exact privileges and unchanged old-record fingerprints
are recorded in the new readiness receipt. Credentials were generated anew;
no old Preview credential was copied. Actual Google Web-client credentials and
project/support contact remain owner prerequisites. Follow the exact
[Google owner instructions](android-google-staging-credentials.md).

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
