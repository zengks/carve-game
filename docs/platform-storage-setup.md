# Shared backend platform and owner setup

Recommendation, 2026-11-01; not a purchase or provisioning record. Paid storage is
acceptable to the owner, but no subscription, company, bank or payout setup has
been selected/created. Payment-receiving work remains explicitly deferred.

## One provider, isolated products

Use Supabase as the common backend platform and one organization for products
with the same owner, budget and operational access. CARVE web, iOS and Android
should share the **same CARVE production backend**, with a separate CARVE staging
backend for previews. Keep unrelated future apps in separate production projects
and give each its own staging environment, secrets, migrations and backup policy.
Do not put portfolio, unrelated app and CARVE player data into one general-purpose
database just because the provider account is shared. Existing projects stay intact.

This is an architecture recommendation: isolated restores, credentials and usage
reduce accidental cross-app access and operational coupling. A new app can reuse
the broker/storage code and contracts without inheriting another game's rows.
If products later share a deliberate studio-wide account, design a dedicated
identity service with app-specific grants and local player IDs. Shared billing,
Google/Apple login buttons or a Supabase organization do not automatically provide
cross-project SSO or permission to combine customer data, bounty or purchases.

## What CARVE needs

| Component | Purpose and initial approach |
| --- | --- |
| Postgres | Private identity map, app sessions/flows, completed results and versioned progress; later reviewed bounty/entitlement ledgers |
| Auth/email | Supabase email OTP; direct Apple/Google broker for explicit identity linking |
| Object storage | Optional private avatars or user uploads later; not needed for initial score/progress sync |
| Static assets | Continue on Vercel/CDN; don't store large game assets in relational result rows |
| Transactional email | Custom SMTP with a domain-controlled sender and verified DNS; code templates for signup and later sign-ins |
| Recovery/operations | Daily DB backups, independent exports/restore drills, retention/deletion and access/budget monitoring |

No Redis, document database or separate file-storage vendor is needed for the
first CARVE milestone. Supabase Storage objects need their own protection/backup:
the database backup contains their metadata, not the uploaded files themselves.

Canada Central (`ca-central-1`) is available for primary data placement. Choose
the region deliberately before creation; this does not guarantee all provider,
email, identity and monitoring data stays in Canada. Keep runtime/database
latency in mind and verify platform privacy/backup requirements before release.

## Budget, before any subscription

Official Supabase pricing checked 2026-11-01: Pro starts at **US$25/month**, with
the first Micro project covered by included compute credit. Additional Micro
projects start around **US$10/month**. A new Pro organization with CARVE production
and staging on two Micro instances is therefore approximately **US$35/month**
before tax, overages and other services. Included quotas are not unlimited, and
compute/branching, egress, log retention and backup add-ons can change the bill.

The connected organization currently reports Free; no CARVE hosted project was
present in the read-only inventory. Upgrading an existing organization can make
its other projects billable too. Review the **whole organization** estimate before
an upgrade; US$35 is the two-project example, not a quote for all existing projects.
Separate organizations can be appropriate for different owners, budgets or teams;
do not mix another legal entity's projects to save a small monthly amount.

Pro currently lists 8 GB DB disk per project, 100 GB file-storage allowance and
100,000 monthly active Auth users, plus seven days of daily DB backups. We should
measure CARVE's actual use instead of buying capacity for hypothetical player
counts. SMTP/domain and Vercel hosting are separate costs; only select an email
provider after reviewing needs and its current offer. No email vendor is chosen.

## Owner actions and what can be automated

1. **Approve the backend scope and budget**: one organization, isolated CARVE
   staging/production projects, intended owner/team and primary region. Confirm
   whether to upgrade the existing Free organization or use a separate one after
   reviewing the effect on existing projects. Complete billing/terms yourself
   when a concrete purchase is approved; willingness to pay is not a signed order.
2. **Pick a stable CARVE domain/staging address and sender domain**. Approve any
   domain purchase separately. The owner must authorize DNS and email-domain
   verification; an existing controlled domain can be used if appropriate.
3. **Google**: use the intended Google Cloud owner/project, complete branding and
   consent information, create the web/server OAuth client and register exact
   callbacks. Native needs separate iOS/Android registration tied to bundle,
   package and signing identities. Login/MFA/identity confirmations stay with owner.
4. **Apple**: confirm the intended Developer team/membership, primary App ID and
   Services ID grouping, authorize Sign in with Apple and domain/return URLs, and
   create the signing key. Choose team ownership deliberately even though payments
   are deferred; later team changes may require user-identifier migration.
5. **Use secure configuration**, never paste keys/passwords in chat. The owner
   completes provider verification and supplies access through approved connectors
   or secret stores; implementation can then install least-privilege DB credentials,
   cookie keys, provider secrets and SMTP settings in the correct environments.
6. **Review privacy/support/recovery/deletion** before inviting real players to
   save cloud data. Preview and synthetic profiles remain separate from production.

After the owner-only approvals, engineering can create the approved empty projects,
install reviewed migrations and a restricted server role with verified TLS/pooling,
wire staging-only Vercel variables, configure templates/callbacks and run real
provider tests. Release/production enabling remains a separate review. Provider
callbacks and staging protections should not be changed implicitly: the registered
provider callback must be reachable without a Vercel team-login interstitial,
using an explicitly approved staging domain/protection design. No deployment
protection bypass was created or disabled by this checkpoint. No app-store
paid agreements, merchant/payout account or bank connection is required for this
development checkpoint, and none should be activated as a side effect.

References:

- [Current pricing](https://supabase.com/pricing)
- [Regions and data placement](https://supabase.com/docs/guides/platform/regions)
- [Database backup scope](https://supabase.com/docs/guides/platform/backups)
- [Custom SMTP requirement](https://supabase.com/docs/guides/auth/auth-smtp)
- [Google OIDC setup](https://developers.google.com/identity/openid-connect/openid-connect)
- [Apple web configuration](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/)
