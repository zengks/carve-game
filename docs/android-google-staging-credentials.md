# Google credentials for protected Android staging

Web owns the broker/cloud credentials; mobile owns its disabled app descriptor
and signed artifacts. Production, native activation and public access stay off.
No purchases, domain registration or Google billing activation are part of this
milestone. Existing PR20/web and PR46/mobile remain draft/unmerged.

## Exact client to prepare

Open [Google Auth Platform Clients](https://console.cloud.google.com/auth/clients)
in an owner-controlled Google Cloud project dedicated to CARVE staging. Record
its project ID and intended support/developer contact. Configure branding as
CARVE Staging and audience External / Testing; do not publish the consent app.
Use only `openid email` for this broker. Do not add Drive/Gmail/offline scopes.

Create an OAuth client of type **Web application**, named for example
`CARVE Android staging broker`. Although the player uses Android, this reviewed
implementation exchanges Google's authorization code on a confidential server.
This is the Web client described by
[Google's server-flow registration](https://developers.google.com/identity/protocols/oauth2/web-server).
An Android SDK client, API key or service-account key cannot substitute for it.
The secret never belongs in the APK. A future Credential Manager/native SDK
integration would require its own Android client/audience qualification.

The protected server origin is:

```text
https://carve-android-auth-staging-zengksoutlookcoms-projects.vercel.app
```

Register exactly this **Authorized redirect URI**, including query and no final
slash, wildcard or additional path:

```text
https://carve-android-auth-staging-zengksoutlookcoms-projects.vercel.app/api/native-broker/callback?provider=google
```

This is Google's callback into the server. `/native/return/android` is the later
one-use app handoff; do not register it as Google's redirect. Do not use the game
preview, `/api/account`, Supabase `/auth/v1/callback` or a per-deployment hostname.
The server uses redirects, not a browser Google JavaScript SDK; leave Authorized
JavaScript origins empty. If Google requires domain ownership/consent-page fields
or rejects the shared-host HTTPS URI, pause registration and report the exact
requirement. Do not buy a domain, invent ownership or expose staging to pass it.
Google Console acceptance remains unverified until the owner completes creation.

## What the owner provides

| Item | Destination |
| --- | --- |
| Google Cloud project ID and OAuth **Web** client ID (`…apps.googleusercontent.com`) | Non-secret; can be shared in chat for exact reviewed audience pinning |
| Matching OAuth **Web client secret** | Enter directly in the exact Vercel project's Preview Secret field; never chat/source/APK |

In [the auth project's environment settings](https://vercel.com/zengksoutlookcoms-projects/carve-android-auth-staging/settings/environment-variables),
use **Preview only**, no branch override, and **Secret** type for:

- `CARVE_GOOGLE_CLIENT_ID`: the Web client ID.
- `CARVE_GOOGLE_CLIENT_SECRET`: its matching secret.

Keep `CARVE_ANDROID_AUTH_ENABLED=false`; creating these values does not authorize
activation. Do not install credentials in the live game, other staging project,
Supabase provider settings, Production/Development or any mobile build.
Do not upload the credentials JSON into the repository or attach it to chat.
Google now documents that a newly created secret is shown only once; copy it
directly into this scoped Secret receiver and retain it in the owner's password
manager. See [Google's secret handling instructions](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred).
Notify the web chat when the Preview values are saved, and share only the public
project/client ID. No Google password, API key, service-account JSON or Android
signing/private key is needed from the owner for this server flow.

## What remains protected

Google Testing's basic sign-in scopes are exempt from test-user-list restrictions
and seven-day authorization expiry. The tester list is not our access boundary;
see [Google's documented exception](https://support.google.com/cloud/answer/15549945?hl=en).
CARVE's verified `(issuer,sub)` admission, Vercel all-deployment authentication,
empty provider pin and explicit activation flag remain independent gates.
No hosted tester is enrolled. A controlled admission process still needs review.

With public access off, this milestone can prepare credentials, validate secret
scope and check disabled routes. It cannot prove the ordinary Android system
browser/native POST/App-Link flow through Vercel login protection. A future access
decision and actual signed playable artifact are separate gates; no bypass/share
secret is to be embedded in an app or created merely to make this test pass.

## Separately approved database work

On 2026-11-02 the owner explicitly approved the reviewed auth schema, dedicated
restricted staging DB LOGIN and sensitive Preview secret receiver in mobile chat;
web directly verified that human message. Scope is staging ref
`ffxcsgtissldpkuxgxvo` and only project `prj_avYmWC0QKUACNm6YrWbc4FsZnSxZ`.
No old credentials are copied. The role starts NOLOGIN in the schema; independent
credential provisioning and actual TLS/login/privilege checks have passed. The
metadata transaction was read-only; the fixed admission helper ran separately
under a lock-only transaction and rollback, with no player/session creation.
Google secrets, enrollment, production/native activation and public access are
not supplied or enabled by this database work.

Five Preview variables are installed: explicit activation `false`, expected
staging reference, public CA, new restricted DB URL and independent session key.
The latter two are Secret type, with no Production/Development receiver or
branch override. All 11 old table counts/fingerprints and the old runtime role,
grants and policies remained unchanged. No hosted tester was enrolled. The sole
security-advisor INFO item is the intentionally policy-free deny-by-default tester
table; no permissive policy was added to silence it.
See [the public-only receipt](android-auth-staging-db.json).

The CLI-generated SQL lives under `staging-auth/supabase/migrations`, separately
from the shared production foundation. It still uses the **same hosted migration
history table on staging** when applied there. Do not repair/delete history or
blindly run a root `db push`/`db pull` to reconcile the two local file sets. Use
explicit staging project IDs and named reviewed source parity checks. Production
must never receive this staging-only migration; reconcile deployment tooling
explicitly before introducing automated schema deployment.
