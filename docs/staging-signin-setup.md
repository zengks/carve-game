# Staging sign-in preparation without a custom domain

Checked 2026-11-02. The owner has no custom domain yet and is not buying one in
this milestone. Continue useful preview preparation; leave live/main, production
storage, payments and mobile download prompts unchanged. Coordinate directly with
native PR46. This milestone does not establish real-provider sign-in acceptance.

## What is prepared now

- New branch `codex/staging-signin-setup`, based on unmerged hosted setup PR18.
- Browser email sign-in has an explicit server-side gate:
  `CARVE_EMAIL_SIGN_IN_ENABLED` must equal the string `true`. Default is disabled.
  Sending/verifying codes for sign-in or linking all reject before
  opening the Auth client when disabled. Google/Apple readiness remains separate.
- Staging Supabase URL and the existing modern publishable key are configured
  only in the isolated Vercel staging project's Preview environment. Email is
  explicitly false. No service-role/API secret, provider credential or native
  client registry was installed. Keys are not embedded in built browser assets.
- Supabase staging sign-in and first-signup templates now use `{{ .Token }}`
  instead of a confirmation link; both templates are versioned in
  `supabase/templates/`. This matches CARVE's code-entry UI. No email was sent.
- The built-in SMTP service remains active and unqualified. It is limited to
  existing project-team addresses and currently two messages per hour. Do not
  invite extra people to the Supabase organization just to test email.
- UI copy lists the actually enabled methods and does not claim email is ready
  merely because the backend URL/key exists. Guest play remains available.

Vercel rejected branch-specific variables because this staging project intentionally
has no connected Git repository. The three new variables are therefore scoped to
this isolated project's Preview environment; Git auto-deploy remains disconnected.
Only manually deploy the guarded sign-in checkpoint or newer here. Do not redeploy
older account code with these settings or copy them into another project.

## Stable callback values

Current origin:
`https://carve-staging-zengksoutlookcoms-projects.vercel.app`

These are exact candidate registrations derived from the implemented routes, not
claims that Google/Apple have accepted or enabled them:

| Purpose | HTTPS path on the current origin |
| --- | --- |
| Google browser/server OAuth callback | `/api/account?provider_return=google` |
| Apple browser/server OAuth callback (form POST) | `/api/account?provider_return=apple` |
| Google native browser-broker callback | `/api/native-broker/callback?provider=google` |
| Apple native browser-broker callback (form POST) | `/api/native-broker/callback?provider=apple` |
| Native system-browser authorization | `/native/authorize` |
| Proposed iOS HTTPS app return | `/native/return/ios` |
| Proposed Android HTTPS app return | `/native/return/android` |

Provider callbacks and app-return links are different. Do not register the app
return as the provider redirect. Do not use a Supabase social callback:
Apple/Google proofs are verified directly by CARVE to preserve explicit linking.
An identical email never joins two existing players. No wildcard callback hosts,
immutable deployment URLs, arbitrary return destinations or production redirects.

## Owner actions that can happen without buying a domain

### Google first

For the current **Android broker** milestone, follow
[the dedicated protected auth-project instructions](android-google-staging-credentials.md).
Those exact redirect/receiver settings supersede the browser-only preparation
below; do not put Android credentials in the game staging project.

Read-only console inspection found a signed-in Google account but no CARVE-named
resource in its project search. No existing project/client was changed. This is
not an inventory of other accounts or proof no differently named client exists.

1. Use a Google account you control to create/select a CARVE staging Google Cloud
   project. Configure Google Auth Platform branding/contact and an External
   audience in Testing and record the intended testers. Do not publish consent
   or accept agreements on the owner's behalf. Testing is not an access boundary
   for this flow: Google's basic `openid email` sign-in is exempt from its
   test-user-list restriction and seven-day authorization expiry.
2. Create an OAuth **Web application** client for the server/browser broker.
   Supply the exact Google browser callback above; reserve the native broker
   callback for its qualification. The current protocol uses a server redirect,
   not an in-browser Google JavaScript SDK. No wildcard JavaScript origins needed.
3. Store Client ID and Client secret as `CARVE_GOOGLE_CLIENT_ID` and
   `CARVE_GOOGLE_CLIENT_SECRET` only in this staging project's Preview secrets.
   Do not paste the secret into chat or source. Use provider/hosting dashboards
   or a scoped secret-entry handoff. No native/desktop binary receives the secret.
4. Confirm the Google Console accepts the stable Vercel HTTPS URL. Owned-domain
   verification and consent-page requirements must be satisfied if requested;
   Testing is not the same as public verification or launch readiness.

Before any public staging exposure, CARVE therefore needs independent, server-owned
tester admission using verified canonical `(issuer, sub)` identities, checked
before creating a player or granting a session. Unknown identities must fail
closed. Core native admission checks and durable quotas are now implemented and
the private staging schema is installed; the separately bounded operator
enrollment process remains unqualified and no hosted tester is enrolled.
Never use matching emails to join players, trust a
client-supplied subject, or add unrelated OAuth scopes merely to make Testing
restrict access. Pre-OAuth requests also need durable abuse quotas; admission
after token verification does not prevent pending-flow/database flooding.

Native currently opens this same server flow with PKCE-bound one-use app handoff;
separate iOS/Android Google SDK clients are not a substitute for its web audience.
If a direct native Google SDK is adopted later, its platform credentials/audience
contract needs its own review and signed-artifact tests.

### Apple preparation

Confirm the intended Apple Developer team, membership and primary native App ID
before creating credentials. Do not enroll or choose a personal/company owner
implicitly. Apple's web documentation requires a Services ID associated with a
Sign in with Apple-enabled primary App ID; its environment guide also documents
an existing App Store app using Sign in with Apple as a web-service prerequisite.
Verify eligibility in the actual owner account rather than promising Apple web
sign-in will work before publication.

Needed server configuration: Services ID (`CARVE_APPLE_SERVICE_ID`), Team ID,
Sign in with Apple Key ID and the corresponding `.p8` private key. Register the
exact HTTPS host/Apple return URLs above under the correct primary App ID. Keep
staging and production registrations distinct and plan team-transfer identity
migration before any later ownership change. `.p8` material stays server-side;
never ship it to the mobile app or commit it. No Apple keys were created here.

### Limited email testing

No new email domain is required for a private test to an existing Supabase team
address. The owner must identify the intended recipient and authorize the test
before an actual code is sent. Keep the delivery flag off until that bounded test
is scheduled. The built-in SMTP service is unsuitable for public players even
though the project is on Pro. Do not use an administrator-generated Auth link as
proof of real inbox delivery or broaden access to obtain a test address.

## What the later domain step needs

One owner-controlled studio domain can support several products. For example,
use a CARVE-specific staging subdomain for callbacks and a separate transactional
mail subdomain/sender for codes. These are examples, not purchased domains.
Different games still keep separate databases, credentials and sender identities.

For public email, choose a transactional SMTP provider, verify its requested
SPF/DKIM records and plan DMARC without overwriting existing DNS/mail records.
Provide SMTP host, TLS port, username/password and verified From address to the
Supabase staging SMTP settings. SMTP credentials belong there, not in native or
web bundles. A paid employee mailbox suite is not required solely to send codes;
a support/reply inbox is a separate decision. Apple private-relay mail additionally
needs its sender registration/authentication requirements met. No provider,
mailbox, domain, subscription or DNS change is authorized by this document.

## Native return links and protection gates

Native proposes `com.carve.preview.staging` for both platforms; it is not yet a
confirmed registered/signed identity. Wait for the actual iOS Team/App ID and
associated-domain entitlement, plus Android signing certificate SHA-256, before
publishing AASA/assetlinks. No invented fingerprints, broad wildcard links,
custom-scheme credential fallback or bypass secret in an app.

Existing protected staging remains protected. Real provider callbacks and OS
association fetches need unauthenticated, redirect-free access to the required
URLs. A signed-in owner's browser check does not establish external access.
Agree a narrowly scoped public auth/association surface and its access controls
before enabling native registrations. Do not disable whole-project protection
or create share/bypass credentials to make a native test pass. Production stays
dormant and native compiled activation stays off until signed artifact/provider/
external return acceptance is complete.

## Verification record

Runtime checkpoint `258bcd5`: focused account API guard tests and full local build
pass. Node 24/26 CI including actual database suites passed. The protected staging
deployment `dpl_2aJSLa1XLVHN1Ms4K4td4mcgUpXD` is Ready at
https://carve-staging-o9p2jx61x-zengksoutlookcoms-projects.vercel.app .
Signed-in browser inspection confirms `configured:true` with all three provider
flags false and the guest account screen says sign-in is being prepared. Both
code templates persisted after reload. Guard cases cover disabled/missing/misspelled flags, all four email actions,
no client creation/session writes/cookies, and independent Google readiness.
Provider and SMTP credentials are absent; no real Apple/Google login, email inbox
receipt, cloud native save, OS link association or physical-device claim follows.
Hosted deployment and final CI results are recorded in the draft PR.

References checked:
- [Google OIDC registration](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google Testing audience exceptions](https://support.google.com/cloud/answer/15549945?hl=en)
- [Apple web configuration](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/)
- [Apple environment requirements](https://developer.apple.com/documentation/signinwithapple/configuring-your-environment-for-sign-in-with-apple)
- [Supabase email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase SMTP limits/setup](https://supabase.com/docs/guides/auth/auth-smtp)
