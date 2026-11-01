# Explicit sign-in identity broker

Preview implementation, 2026-11-01. Supersedes the earlier Supabase-OAuth blocker
in the [foundation checkpoint](shared-storage-foundation.md). Payments/payouts,
production activation and real provider provisioning remain deferred.

## Chosen approach

Keep Supabase for Postgres and verified email-code delivery. Verify Apple/Google
OIDC proofs directly on the server, with pinned JOSE and fixed provider metadata.
Do not enable Supabase social OAuth or rely on its email-based identity joining.
An identity is `(verified issuer, verified sub)`, never a display name or email.
Matching emails, including Apple relay addresses, confer no ownership relationship.

The private CARVE identity map selects one internal player and persistent scope.
New email/Google/Apple sign-ins create revocable, expiring app sessions. Browser
cookies contain only an encrypted app-session reference, not provider tokens.
The original preview's email cookies remain readable for continuity but are not
fresh enough for linking. Player scopes created before linking remain stable,
so previously queued account results keep their original owner. Linking does
not pool wallets, import guest data or merge two existing players.

## Browser protocol

1. A same-origin POST starts `oauth` or `link-provider` for Apple/Google. Links
   require `X-Carve-Account`, a current account and authentication within 5 minutes.
2. The server stores a 10-minute one-use intent: random state, provider, exact
   client/audience, nonce, redirect, browser-secret hash, initiator scope/session
   binding and intent. Google also uses provider S256 PKCE. Apple's current
   discovery does not advertise PKCE; do not claim it supports our Google flow.
3. Google returns to GET `/api/account?provider_return=google`. Apple returns an
   `application/x-www-form-urlencoded` POST to
   `/api/account?provider_return=apple`. The narrow Apple POST only seals bounded
   code/state in a 2-minute HttpOnly callback cookie, then redirects with 303 to
   `/api/account?provider_finalize=apple`. It does not grant a session or link.
   Original SameSite=Lax browser/session cookies are checked on the subsequent
   same-origin GET. Missing originals, duplicate parameters and route mixups fail.
4. Finalize atomically consumes the DB flow, checks the initiating account/session
   generation, then exchanges the code. Only fixed issuer/JWKS endpoints are used.
   ID tokens require RS256 signature, exact scalar audience, applicable `azp`,
   bounded ASCII subject, expiry/issued time and the stored raw nonce. Apple
   developer client secrets use ES256; that is separate from ID-token RS256.
5. Sign-in selects the proved identity's player and creates an app session. A
   linking callback only stages a 5-minute one-use connection offer, bound to the
   same fresh account session. The UI names both sides and asks for confirmation.
6. `confirm-link` requires fresh same-account/session proof and an explicit click.
   In one DB transaction it locks the offer and current session, rechecks expiry,
   freshness and revocation, and enforces unique issuer/subject ownership. An
   already-owned identity is refused; a same-owner confirmed offer is retryable.
   Cancelled/expired offers cannot be confirmed. Logout serializes against linking.

Verified email connection uses `link-email-send` and `link-email-verify`, followed
by the same offer/confirmation. Supabase's verified user email and confirmation
timestamp are required. Temporary Auth tokens are not the CARVE app session.
Session refresh or a new login never invents freshness for an older link intent.
Guest→account and A→B→A changes invalidate a pending sign-in as well as a link.

## Setup and evidence boundary

Server-only Google variables: `CARVE_GOOGLE_CLIENT_ID` (web/server client) and
`CARVE_GOOGLE_CLIENT_SECRET`. Apple variables: `CARVE_APPLE_SERVICE_ID`,
`CARVE_APPLE_TEAM_ID`, `CARVE_APPLE_KEY_ID`, `CARVE_APPLE_PRIVATE_KEY`. Readiness
requires those credentials; no legacy override flag can enable Supabase linking.
No credentials or real provider settings were created or configured in this work.
The hosted preview still has no shared test backend and keeps sign-in disabled.
Production remains independently disabled by `VERCEL_ENV=production`.

Apple needs the intended primary App ID/team, related Services ID, verified domain
and exact registered HTTPS return URL. Use a stable staging origin instead of
registering every immutable Vercel hostname. Future Apple ownership/team transfer
needs identity migration planning; email or unreviewed app grouping is no shortcut.
Google needs a consent/branding setup and exact web callback; native clients have
separate platform registrations and presenter/audience requirements.

`tests/oidc.mjs` uses real cryptographic signatures with synthetic keys to exercise
issuer, subject, algorithm, audience/azp, time, nonce, PKCE and Apple client-secret
rules. `tests/broker-database.mjs` uses real isolated Postgres and HTTP handlers for
explicit consent, same-email separation, connected-result access, email linking,
collision/replay/cancellation/expiry/generation tests and a deterministic
revocation-versus-confirmation row-lock race. Real local email delivery is tested
separately. None establishes a successful live Apple/Google authorization.

Local browser verification used a clearly labelled synthetic connection offer
from a private QA helper (not shipped): Cancel left connected methods unchanged;
Confirm added the test method while preserving the account scope. The existing
13 m local gameplay profile remained intact. Phone-sized linking controls and
the fixed Back action were inspected; this is browser emulation, not a physical
phone or a live Google login.

A separate local two-site browser probe (127.0.0.1 versus localhost) verified
that the cross-site POST omitted the original Lax flow/session cookies and the
303 final GET included both originals plus the staged callback cookie. Only
presence booleans were recorded; the probe granted no session or provider proof.
Real HTTPS Apple callbacks must still be tested with the registered provider.

## Native coordination

Native PR46 owns pure intent/request guards and fixtures. The current installed
trial remains local-only. Native code must retain exact provider/intent/audience,
raw-versus-hashed nonce representation, expiry and account generation. Browser
flow nonces are raw random strings and compared exactly once. Native Apple may
use a different explicit nonce convention; do not hash twice or accept both.
Native Google server audience and allowed presenter need a separate stored flow.

A future native broker handoff should return only an opaque short-lived one-use
code plus state to a fixed registered destination, then exchange over HTTPS using
an app-held S256 verifier. No provider/app token belongs in a deep-link URL. That
endpoint, native proof adapter, App/Universal Link association and real SDK tests
are not implemented by this browser checkpoint. Unlinking, account recovery,
deletion/retention and provider revocation-notification handling remain release gates.

Primary references checked 2026-11-01:

- [Supabase identity-linking behavior](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Google OIDC validation and registration](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google discovery](https://accounts.google.com/.well-known/openid-configuration)
- [Apple discovery](https://appleid.apple.com/.well-known/openid-configuration)
- [Apple web configuration](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/)
