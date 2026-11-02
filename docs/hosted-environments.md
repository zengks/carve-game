# CARVE hosted environment setup

Status checked 2026-11-02. The owner selected Vercel Pro and Supabase Pro and
authorized isolated production/staging setup, coordinating with carve-mobile.
The live game must remain unchanged; payments and native download prompts remain
disabled. Existing accounts, hosted projects, simulators and saves are preserved.

## Current resources and billing

| Resource | Verified state | Next step |
| --- | --- | --- |
| Vercel team `zengksoutlookcoms-projects` | Pro, active; existing account | Review payment method/billing details; no upgrade needed |
| Live Vercel project `carve-game` | Existing deployment and settings untouched | No deployment, production environment or alias changes |
| New Vercel project `carve-staging` | Protected, Node 26, functions in `yul1`, no Git auto-deploy | Use its separate staging deployment for hosted acceptance |
| Supabase organization `ponydude` | Pro; portfolio/preview/ApplyIQ projects retained | Owner must select this organization or a new one |
| Proposed `carve-staging` Supabase project | Not created | Organization choice and actual project quote first |
| Proposed `carve-production` Supabase project | Not created | Same; prepare dormant without connecting live clients |

No subscription upgrade, payment-method change, hosted database or SMTP purchase
has been performed. The Stripe provisioning catalog was unavailable; existing
authenticated Vercel/Supabase connectors are the setup path. There is no need to
create a Stripe merchant/payout account to pay hosting bills.

Two additional Micro projects in the existing Pro organization are approximately
US$20/month extra before tax/usage. A separate Pro organization with two Micros
starts around US$35/month in total. The existing Vercel Pro platform fee starts
at US$20/month with one deploying seat; additional usage/seats cost extra. These
are estimates, not an executed order. Existing projects' compute/usage remains
part of the existing organization bill. A new organization is separately billed.

Owner billing actions: choose the organization; review subscription, payment
method, billing name/address and invoice details in each provider dashboard;
approve any actual new-project quote. Keep monthly plans and default cost controls
initially. Compute and some other charges are not a universal capped monthly fee.
Never provide card details or private credentials in chat.

## Deployment evidence

Staging project ID: `prj_zHwA5QqAGGMI1tWa6hdiHmM0lhAT`.
Stable staging alias:
https://carve-staging-zengksoutlookcoms-projects.vercel.app

Tested deployment: `dpl_FBgQuJPS8rsaBXkguamzQMfmDmyx`, Ready in `yul1`:
https://carve-staging-iapfbtdmb-zengksoutlookcoms-projects.vercel.app

It contains committed source `b6b25c6`, exported through `git archive` without
untracked files, local credentials or retained test artifacts. Browser inspection
shows the preview title, `noindex,nofollow` and disabled/unconfigured cloud sign-in.
Staging has zero configured project environment variables. Deployment protection
remains enabled; no bypass credential or share link was created.

The CLI classified the new project's first deployment as Production despite its
explicit preview flag. This affected only the new staging project. Its original
deployment remains protected and account APIs are disabled by the unchanged
production guard. A subsequent API deployment explicitly uses the documented
legacy `staging` target and staging alias; its rendered page verifies the preview
build. Do not infer deployment intent from a CLI flag alone. Verify actual target,
rendered build and project ID before wiring any environment values.

Live remains `dpl_FXTTkFE5TfmJ8M1NMUEiMzNuhmUg`, commit
`aa5911a9a71e2e4d2b4cfa86a17f3a4736c2980d`, on carve-game.vercel.app.
No live source, production variables, aliases, security settings or analytics
configuration were changed. The web setup branch is `codex/hosted-environments`;
earlier web/native PRs remain unmerged.

## Database isolation and setup sequence

1. Get the owner's explicit organization selection, then request a separate
   provider quote for each fresh `carve-staging`/`carve-production` project.
   Prefer specific Canada Central (`ca-central-1`) near the `yul1` staging runtime;
   primary placement does not guarantee every related service stays in Canada.
2. Verify each new project's identity, organization, region and healthy state.
   Inspect schemas first. Apply only the reviewed CARVE schema migrations to the
   new projects, never portfolio, ApplyIQ or old native public schemas.
3. Apply `server/schema.sql`, `server/native-schema.sql` and
   `server/native-progress-schema.sql` as separately named tracked migrations.
   Create the restricted role using `runtimeRoleSQL('carve_runtime')` in
   `server/runtime-role.mjs`, as another tracked migration. The builder deliberately
   fails on an existing role rather than modifying an old account.
4. Verify all 11 private tables retain RLS; anonymous/authenticated clients have no
   grants. The server role gets only USAGE plus exact SELECT/INSERT/UPDATE grants
   and explicit role-specific policies, no bypass/global privileges, schema
   ownership/CREATE, DELETE/TRUNCATE or future-table defaults. Immutable result
   tables allow SELECT/INSERT only. API owner predicates remain required.
5. The role starts NOLOGIN. Keep production dormant with no credentials in live
   Vercel/client configuration. For staging only, provision an independent strong
   password through a secret-only path, use the project's verified pooler/TLS
   settings and install Secret variables only in the new staging project.
6. Remote DB connections use certificate/hostname verification. The shared
   `postgresOptions` helper rejects weaker/overriding URL TLS settings and avoids
   pg's URL parser silently replacing the SSL options or overriding a loopback host through query parameters. Supply the selected
   project's PEM CA through `CARVE_DATABASE_CA_CERT` if required; otherwise leave
   this optional variable unset, not empty. No TLS bypass is permitted.
7. Validate new-project migrations, exact privileges, TLS handshake, API reads,
   retries and isolation with disposable staging identities. Configure real IdPs,
   SMTP and exact callbacks only when their owner/provider prerequisites are ready.
   Verify backups and a restore drill before inviting real players.

Production preparation is not production activation. The account/native routes
still reject VERCEL_ENV=production. Do not remove that guard as part of setup or
copy staging secrets into the live project's Production environment. Guest play
continues, completed-result rules remain versioned, and unfinished climbs stay
device-local. No legacy wallet, bounty or purchase import is authorized here.

## Native coordination and remaining gates

Native owns dormant public environment descriptors, validation and future client
configuration. It needs only API origin, authorize/return URLs and public client
aliases. Never ship a database URL/password, Supabase secret/service key, session
secret or provider client secret in a native build.

Proposed aliases: `carve-staging-ios-v1`, `carve-staging-android-v1` and separate
`carve-production-ios-v1`/`carve-production-android-v1`. Proposed app returns are
`<confirmed-origin>/native/return/ios` and `/native/return/android`; authorize is
`<confirmed-origin>/native/authorize`. These are not registered operational links.
Provider callbacks `/api/native-broker/callback?provider=apple|google` are different
from app return URLs. Existing synthetic aliases/loopback tests remain separate.

Hosted native HTTPS configuration, OS system-auth browser routing, verified
AASA/App Links, real Apple/Google/email flows, production session refresh UX and
Steam authentication/ownership integration remain acceptance gates. Protected
staging currently prevents unauthenticated external OAuth callbacks; do not change
protection or embed a bypass token in the app. Review the public callback/domain
design before real-provider testing. No real-provider readiness is claimed.

## Local verification

`npm run build` passes. The full existing database suites pass, including 104 native
broker and 113 native-progress checks. New restricted-role acceptance adds 92 real
PostgreSQL assertions with actual LOGIN authority, exact grants, RLS, denied
escalation and web/native completed saves. These run only in fresh retained local
databases; runtime probe logins are disabled after testing and all pools close.
The original local QA container was independently restored to Stopped with zero
client consumers, the same volume/bindings and port 55532 closed. Nothing was
deleted. This verifies local SQL/configuration; hosted TLS and live-provider
acceptance are pending rather than inferred from local results.

References: [Vercel Pro](https://vercel.com/docs/plans/pro-plan),
[Supabase pricing](https://supabase.com/pricing),
[organization billing](https://supabase.com/docs/guides/platform/billing-on-supabase),
[connection/TLS settings](https://supabase.com/docs/guides/database/connecting-to-postgres).
