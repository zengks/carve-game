# Native broker — isolated implementation checkpoint

Preview branch codex/shared-storage-foundation, 2026-11-01. Both PR17 and native
PR46 remain draft/unmerged. No hosted configuration, real providers, app-link
association, installed apps, saves, payments or production activation changed.

## Protocol and boundaries

Implements the jointly reviewed native contract in carve-mobile's
contracts/native-broker-v1.md. POST /api/native-broker/v1 accepts exact flat v1
JSON only, rejects duplicate fields and invalid UTF-8, limits request/response
bytes, requires a registered client alias plus per-instance random binding and
uses purpose-separated opaque native bearers. Any Cookie/Origin header rejects.
Native tokens, binding secrets and exchange codes are stored only as hashes.
Browser account cookies are not native credentials. Sessions remain memory-only
in the native client; the 300-second lifetime is integration scaffolding.

A private persistent native instance row serializes generations, grants,
signout/cancel and explicit linking. An independent native flow index enables
system-browser launch, without reusing browser accounts. The two new tables
have RLS enabled and no PUBLIC grants, in the existing private schema. Schema
files are not applied automatically: test fixtures apply them only in a new
unique QA database. Existing databases and native Auth/schema remain unchanged.
Identity resolution shares the existing verified issuer/subject player map.
Same display email never establishes ownership or merges players.

GET /native/authorize launches a registered browser flow. Independent provider
state/nonce and a purpose-bound HttpOnly browser secret protect the callback.
Google uses its existing S256 exchange; Apple form_post first stages a bounded
callback, then finalizes after a 303 GET that can receive the original Lax cookie.
Completion returns only opaque code + state to the registry's exact HTTPS return.
The native app exchanges with its S256 verifier. Linking stages a bounded readable
hint/offer and changes identity ownership only after explicit confirmation.
Provider authorization gets 600 seconds; the separate return code and offer get
120 seconds each. Signout, a new intent or cancellation rejects late grants;
stale cancellation does not invalidate a later flow/offer.

Freshness here means immutable, signature-verified, nonce-bound token issuance
(iat), not proof of the IdP's auth_time, password entry or MFA reauthentication.
Native linking requires issuance no more than 300 seconds old at proof/exchange
and confirmation. Session introspection never refreshes it. Browser policy is
unchanged. Any stronger interactive provider reauthentication needs separate
provider configuration and tests.

## Runtime and configuration

New functions use Vercel's supported Web Fetch entrypoint, adapted to the same
core handler used locally. This preserves raw JSON for duplicate-key checks.
No browser CORS or token URL transport is enabled. Responses are no-store with
no-referrer and noindex headers. Hosted logging must redact flow/code/state
query parameters before activation; no logging integration is configured here.

Configuration requires CARVE_APP_ORIGIN, CARVE_SESSION_SECRET,
CARVE_SHARED_DATABASE_URL, existing direct OIDC credentials and the new server-only
CARVE_NATIVE_CLIENTS JSON map. Its aliases map exactly to redirect_uri and
broker_url (HTTPS, no query/fragment/userinfo/alternate port). The broker URL is
CARVE_APP_ORIGIN + /native/authorize. No caller audience/issuer/key/return URL is
trusted. Production independently returns not_configured; hosted preview remains
unconfigured. No environment secrets or registry entries were provisioned.

Sources: [Vercel raw request bodies](https://vercel.com/kb/guide/how-do-i-get-the-raw-body-of-a-serverless-function),
[Vercel Fetch handler support](https://github.com/vercel/vercel/blob/main/packages/node/src/serverless-functions/serverless-handler.mts),
[OAuth native external-browser guidance](https://datatracker.ietf.org/doc/html/rfc8252),
[S256 proof-key specification](https://datatracker.ietf.org/doc/html/rfc7636).

## Isolated verification

The existing web-only QA PostgreSQL container was restarted. Every test fixture
creates a new carve_shared_test_native_<random> database; all previous databases,
volumes and retained native services remain untouched. New synthetic databases
are retained too. Fixture control lives on a different loopback listener with a
random private capability, never on the production router. It performs real
launch + signed synthetic token exchange + Google/Apple callback processing;
it never inserts a proof or session directly into the database.

The actual Fetch handler/database suite passes 104 assertions: platform/instance
isolation, consent and collision, retry/replay, independent clocks, held exchange
versus signout/cancel/new intent, persistence through a new database pool, and
RLS/unprivileged denial. Separate readiness tests cover production/unconfigured
routes. Existing browser/game/account/OIDC checks remain required. Native owns
an independent headless Godot integration runner against this exact fixture;
its receipt and frozen source hashes are a separate acceptance gate.

## Open release work

Real Apple/Google credentials and callbacks, verified HTTPS domains/app links,
physical lifecycle/ergonomics, useful player-session persistence/refresh,
rate limiting across app instances, bounded retention/cleanup/recovery/deletion,
logging redaction and a hosted database migration/recovery plan remain open.
The scaffolding caps a binding at 64 intents and retains their audit state; this
is not a final production retention/rate policy. Completed native gameplay data,
shared bounty, entitlements and purchases are still outside this milestone.
No fixture result establishes live OAuth, native SDK or production readiness.
