# Shared CARVE identity, progress and ownership plan

Updated 2026-10-31. This is a planning document, not an implemented service.
It supersedes older email-only recommendations and the earlier undecided scope
for shared bounty and purchase ownership in the web/mobile roadmaps.

Implementation began on 2026-11-01 in a separate preview branch. See the
[foundation checkpoint and remaining gates](shared-storage-foundation.md): email
OTP/result syncing is tested only against isolated local services; Apple/Google activation,
hosted sync, bounty and purchases are not enabled. The scope below remains the
target, not a description of complete cross-platform functionality.

## Agreed scope

- Offer **Sign in with Apple, Google and email**, while retaining immediate
  guest play. Signing in and creating an account use the same entry flow.
- Share completed results, progress, eligible unlocks, bounty and purchase
  ownership between browser, iOS and Android under one CARVE player account.
- Keep unfinished climbs on their current device in the first milestone.
- Plan purchase ownership now; **do not implement payments yet**.
- Keep the mobile download/deep-link prompt disabled until verified store
  releases are available. This planning change does not alter the live game.

## Identity and guest experience

Use a stable internal `player_id`, independent of nicknames, provider email
addresses, devices and stores. Apple/Google provider subject IDs and a verified
email identity attach to that account. Provider login is not a purchase receipt.
Retain mobile's existing email one-time-code flow as the proposed shared baseline;
the user selected email sign-in, not a switch to magic links. Reconcile web/native
delivery, sender and abuse controls before implementation.

Guest players can start and continue locally without registration. Offer an
optional account when saving across devices or viewing account features, without
interrupting a charged jump or active encounter. Explain that guest-only data
can be lost if browser/app storage is cleared. An account provides sync, not
protection for an unfinished climb that has never left its device.

Linking another provider requires authentication to the current account and
proof of the new identity. Never merge accounts just because names or email
strings match; Apple relay addresses may differ from another provider's email.
If a provider already belongs to a different CARVE account, preserve both and
use an explicit recovery/support flow instead of silently moving ownership.

Implementation gate: [Supabase's documented identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
automatically joins OAuth identities with matching emails. Our explicit-linking
requirement is now implemented through a [direct OIDC broker](identity-broker.md)
with provider issuer/subject identities and explicit confirmation, without enabling
Supabase social OAuth. Signed synthetic collision/race tests pass; real provider
configuration and hosted acceptance remain gates. A manual-link flag or separate
player ID alone must never be assumed to disable Supabase automatic linking.

On first sign-in, show which local guest results, progress and eligible rewards
could be imported. Require an explicit choice; retain the source and current
climb. Imports use a one-time source/grant ID, not repeated balance addition.
Existing unverified local balances need an eligibility/cap policy before import;
do not call arbitrary client data verified merely because it reached the server.
Guest purchases are deferred: the proposed first purchase flow requires a CARVE
account so ownership can be recovered and linked consistently.

## Data boundaries and proposed records

| Data | Shared contract | Conflict / ownership rule |
| --- | --- | --- |
| Account and linked identities | Stable player ID; verified provider identities | Explicit linking; server-derived owner, never a client-selected owner |
| Completed results | Immutable run ID, course/rules version, mode, source and validation status | Same ID/same payload retries once; same ID/different payload is rejected |
| Progress and earned unlocks | Versioned milestone and catalog IDs with supporting events | Merge eligible accomplishments transactionally; derive compatible bests |
| Bounty | Append-only credits, debits and reversals with unique event IDs | Server-confirmed balance; atomic insufficient-funds checks and idempotent settlement |
| Purchase ownership | Canonical product, platform product/transaction IDs, verification and entitlement status | Verified grants only; unique source transactions; explicit restore/revoke rules |
| Current climb | Device-local run/checkpoint, remaining lives and temporary effects | No cross-device continuation or checkpoint merging in this milestone |
| Controls and accessibility preferences | Local defaults, optionally exportable later | Keep handedness/layout suitable for each device |

Keep tutorial, course and leaderboard records versioned. Web and native rules
are not yet interchangeable: sharing an account must not combine incompatible
height records, modes or trial progress. Define catalog mappings for each build;
an unsupported unlock remains owned but is not applied to incompatible gameplay.
Client-reported results remain unverified unless a separate validation design
establishes stronger evidence. This plan does not solve competitive cheating.

## Shared bounty

Define bounty as an **earned game resource**, separate from real-money purchase
ownership. This plan does not approve selling bounty. Store each reward, spend
and reversal with its source run/event, amount, reason, rules/catalog version and
idempotency key. Derive balance from the ledger; cached client totals are only
display estimates. Retry and simultaneous requests cannot grant or spend twice.

Offline play remains available. Queue completed outcomes durably; show pending
earnings separately from confirmed shared bounty. A disconnect must not erase
rewards or introduce a network modal during a jump, rift return or contract.
Do not promise spendable offline shared funds until the double-spend policy is
chosen. Evaluate a device-reserved allowance versus online confirmation at safe
camp/account screens. Reserve costs before the next run if necessary so an
already accepted gameplay action never waits on a payment/network request.

Before implementation, classify every current bounty reward, contract, repair,
skill cost and refund. Decide what is run-local versus account-wide, how much
unverified offline earning is eligible, and how legacy wallets import. Preserve
old wallets while that migration is unapproved; never pool them automatically.

## Purchase ownership, without payment implementation

User decision — 2026-11-01: defer receiving-payment setup until the owner decides
whether to publish/operate personally (including a sole proprietorship) or through
an incorporated company. Do not open/configure merchant or payout accounts, accept
paid store agreements, connect a bank or activate payments in either project.
First settle the app/IP owner, publisher/merchant identity, tax setup and suitable
payout beneficiary/account. No company structure or bank (including TD) is selected.
This gate does not block authorized account/progress development without payments.

Use one canonical catalog with separate Apple, Google Play and possible web
product mappings. Keep earned unlocks, durable purchases, consumables and any
future time-limited benefits distinct. No product, price, subscription or paid
currency is selected by this plan. A browser checkout provider is not selected.

Plan native digital purchases around Apple In-App Purchase and Google Play
Billing, with regional exceptions reviewed at release. Browser checkout would
be a separate integration. A player's sign-in provider does not select their
payment processor. Check current [Apple guidelines](https://developer.apple.com/app-store/review/guidelines/)
and [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)
before defining each product's availability and cross-platform behavior.

The future server must validate store transactions/payment events before granting
ownership, record their canonical source once, and handle restore, pending or
failed purchases, refunds, revocations and account changes. A client `paid` flag
or uploaded receipt alone grants nothing. Restoring on another platform retrieves
eligible CARVE entitlements; it does not transfer a store transaction or promise
that every product/consumable is portable. Map eligibility explicitly and explain
unsupported content. Do not reassign an already claimed store transaction to a
different CARVE account during sign-in or restore.

Keep any later payment adapters and credentials isolated from game clients.
Store the transaction references and verification evidence needed for ownership,
not card numbers. Account deletion, restore and legally required financial-record
retention need an explicit policy before real transactions begin.

## Delivery sequence and acceptance gates

1. **Contract first:** review the existing mobile identity/sync foundation, then
   agree schema versions, catalog/rules compatibility, email flow, import limits,
   offline bounty spending and account deletion/recovery. The current isolated
   native trial is local-only; older sync infrastructure is reference material.
   Its current player IDs reference Auth users, progress is keyed only by player,
   and guest import handles retained results/teaching rather than wallet or paid
   ownership. Design explicit identity mapping, versioned multi-course progress
   and new ledger/entitlement records; do not assume the old schema covers them.
2. **Identity and completed progress:** add isolated guest/account stores and
   provider adapters, explicit linking/import and durable result/progress queues.
   No active-run handoff. Choose hosting, region, mail, privacy and budget before
   any hosted provisioning or production connection.
3. **Bounty:** introduce the common ledger after reward/spend classification and
   offline policy are agreed. Reconcile pending events at safe boundaries; keep
   existing balances and source saves recoverable during migration.
4. **Ownership contract:** test a fake/sandbox entitlement adapter and product
   mappings when that implementation is authorized. Real payments, SDKs, store
   configuration and financial agreements remain a separate later milestone.
5. **Release review:** verify a web branch preview and isolated native builds
   before authorizing production integration. Preserve every existing save,
   profile and simulator. Keep download prompts disabled independently.

Acceptance must cover all three providers, account linking/collision/recovery,
guest import replay, account switching and sign-out isolation, interrupted
uploads, offline restart, duplicate/conflicting events, simultaneous bounty
spends and reward grants, rejected or unsupported imports, compatible bests,
purchase restore/replay/revocation, and deletion/retention behavior. Use disposable
test identities and synthetic records, not owner saves or real charges. Verify
web to native and native to web; emulator/browser evidence does not establish
physical-device readiness. Client access must be restricted to the authenticated
owner, with server-only mutations for wallet and verified ownership.

## Coordination

Web owns this plan; carve-mobile mirrors the selected scope in its decisions and
milestone documents. Share contract changes before either implementation. Both
projects should agree schema/event/catalog versions and shared fixtures before
turning on sync. No game code, hosted service, account data or payment flow is
changed by this document.
