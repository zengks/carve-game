# CARVE commerce coordination and purchase-ownership plan

Revision 1 — 2026-11-02. **Planning only. No payment implementation or activation.**

The owner explicitly authorized direct, two-way CARVE Stripe coordination between
the existing Stripe Manage, web and mobile chats. Both CARVE apps use the same
existing Stripe account context. Its verified **sandbox**, not a live-account
identifier or a second mobile account, is `acct_1UXW0ID7ADbS69LH`.

Stripe Manage independently reconfirmed `livemode=false` and exhausted scoped
catalog/event-destination pagination: zero products, zero active or inactive
prices, zero v1 webhook endpoints and zero v2 event destinations. These are its
read-only findings, not a second web audit. Inline prices, Checkout Session,
customer and payment history were not audited. No CARVE live context was exposed
by those checks; do not infer that a merchant account does not exist or create
another account. No secret or customer/financial record belongs in this document.

## Responsibility and documentation ownership

| Owner | Responsibility | Boundary |
| --- | --- | --- |
| Human owner | Commercial offer, contents, price/currency, launch markets, legal owner/publisher, merchant/tax/payout decisions and releases | Chat agreement cannot approve these decisions or financial actions |
| Stripe Manage: **Plan Stripe account management**, `01a161e2-d2b2-7f01-b0a7-0d79cf8fd264`, host `local` | Single coordinator for authorized Stripe account, catalog/price, event-destination, key/secret settings and merchant/payout gates | No parallel Stripe configuration by web or mobile; separate approval before any mutation or payment test |
| CARVE web: `01a18660-65a5-78b1-949f-d7c826a4d449`, host `local` | Canonical application/backend contract, catalog mappings, authenticated order binding, verified source grants and derived shared entitlements | Future server work only after agreement and explicit implementation scope; never expand the current auth-only DB role implicitly |
| CARVE mobile: `01a186c0-3882-7453-be13-a4502baf2f22`, host `local` | Native/store policy annex, client/store adapters, verification/notification/restore design and device qualification | App clients never grant ownership themselves or configure a competing Stripe account/catalog |

This file is canonical for the shared process/backend plan. Stripe Manage keeps
its account/settings record in `STRIPE_SETUP_PLAN.md`; mobile keeps
[the native policy/restore annex, revision 1](https://github.com/zengks/carve-mobile/blob/eb9ab98d4cf142c7d1a5b4a50539d347169953a8/docs/payment-coordination.md).
Cross-link and reconcile revisions rather
than maintain different commercial terms in three places. Share public catalog
IDs, scope, status and redacted evidence; never exchange secrets or raw customer,
receipt, payment or financial logs between chats.

Before a shared-resource change, identify its single owner, exact account and
environment, approved resource IDs, intended change and verification/rollback.
The other chats request or review that change rather than repeat it. This
coordination permission does not authorize configuration, key issuance, purchases,
sandbox charges, payment activation, new accounts or expanded security access.

## Offer and catalog status

The compatible first candidate is an **optional, one-time, durable cosmetic
Supporter bundle**. It is a proposal, not an adopted product or approved price.
Do not promise specific assets that have not been designed and reviewed.

The candidate adds no speed, lives, skills, score advantage, earned bounty,
cash-equivalent currency, paid randomness or subscription. Keep guest play and
the free core game intact; no purchase prompt triggered by a frustrating fall.
This is a commercial hypothesis, not evidence of demand or profitability.

| Decision | Current status |
| --- | --- |
| Exact paid offer and included cosmetics/content | Owner selection pending |
| Review/audience priority | Owner clarified Canada-first review, BC-first audience; wider North America is an aspiration, not an approved US/Mexico rollout |
| Price, currency and tax/discount treatment | Unselected; BC residence/review priority does not choose merchant identity, tax treatment or payout currency |
| Canonical product/entitlement keys and catalog revision | To be assigned to the approved offer; no invented IDs presented as registered |
| Stripe product/price IDs | None found in scoped sandbox catalog inventory; no creation authorized |
| Apple/Google/Steam product IDs and mappings | Unselected/unverified in this plan; store catalog registration inventory not audited |
| Per-product, target-platform and storefront portability | Unapproved until native/platform policy review |

After approval, one versioned canonical catalog maps each internal offer and
entitlement to provider SKU/price, environment and merchant/app scope, quantity,
benefit type, compatible game/content version and allowed target storefronts.
Keep historical revisions for already sold benefits. A mapping entry must not
silently change the meaning of a previous purchase. Sandbox and production IDs,
orders, events and grants must never confer access across environments. Scope
this catalog and its grants to CARVE; a shared account does not merge other games'
data, wallets or purchase rights.

## Verified grant contract

These are agreed technical planning constraints, not an implemented service:

1. Preserve immediate guest play. The proposed first **Stripe web checkout**
   requires a stable authenticated CARVE `player_id`. Mandatory CARVE sign-in for
   native-store purchase/restore is not selected: guest/store-local ownership,
   restore and optional explicit account linking need separate owner/platform UX
   review. Cross-platform sharing needs a verified stable CARVE claim. A nickname, matching email, Google or
   Apple sign-in, Stripe Customer ID or device identity alone proves no purchase.
2. Bind the initiating player, approved catalog revision, provider/environment,
   expected line items/quantity and price/currency/tax/discount snapshot in a
   server-created order. Client metadata, redirect parameters and uploaded
   receipts are lookup inputs, never authority to assign ownership or price.
3. Verify authoritative provider state and approved product mapping before a
   grant. For future Stripe Checkout, use signed events with raw-body signature
   verification and retrieve the session/line items/payment state server-side.
   A completed Checkout page/event can precede settled payment; pending or failed
   payment grants nothing. Approved free promotions need an explicit catalog rule.
   See [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment?ui=checkout-form).
4. Deduplicate event deliveries and source grants separately. Planned event keys
   include provider, environment, merchant/app scope and event ID. Source-grant
   keys additionally identify the authoritative transaction and purchased item;
   they must also collapse separate event types describing the same purchase.
   Exact provider-specific key fields are a pre-implementation review gate.
5. Apply verification, unique source claim and ownership update transactionally.
   Repeated/concurrent completion, asynchronous success and restoration cannot
   duplicate grants. A source transaction stays bound to its original CARVE
   player; account switching, email matches or repeated restore cannot transfer it.
6. Derive effective access from **eligible active verified source grants**, not a
   single client `paid` boolean. Multiple independent eligible purchases may
   support one durable entitlement only after the requested product, target
   client/platform and storefront pass their approved eligibility mapping. There
   is no global OR across every provider purchase. Revoking one grant must not remove another
   valid grant, earned progress, bounty or unrelated purchases.
7. Reconcile duplicate, delayed and out-of-order notifications against current
   authoritative provider state. An old completion must not resurrect the same
   refunded/revoked transaction. A genuine new purchase is a new source, and
   legitimate reinstatement requires distinct authoritative provider evidence.
8. Preserve minimal audit evidence: provider/environment/account, source IDs,
   catalog revision, player binding, verification/state transitions and reason.
   No card data or unrestricted raw webhook/receipt bodies in game storage,
   analytics or shared chat documentation. Retention/deletion policy remains gated.
9. Restore authenticated eligible ownership without charging again or moving a
   store transaction to a different account. Native guest restore and Family
   Sharing need their own verified ownership/beneficiary model before selection;
   do not mistake a legitimate sharing right for an arbitrary account transfer
   or claim compatibility before that model exists. Provider outage is not revocation.
   Account-scoped offline caching/grace and expiry behavior remain undecided;
   local flags cannot create a new verified purchase or bypass account isolation.

The event allowlist, API/SDK version, payload format, signature policy, retry and
reconciliation design, endpoint ownership/route, permissions and secret receiver
must be agreed with Stripe Manage before creating anything. Stripe events can be
duplicated or reordered; see [webhook guidance](https://docs.stripe.com/webhooks).
An inbound webhook cannot assume Vercel login access. Do not add a public route,
share/bypass secret or purchase endpoint to the current protected Android auth
artifact to solve that later deployment problem.

## Refund, dispute and duplicate-purchase review policy

The chats accept these as conservative **planning proposals**. Exact triggers,
timing, customer notices, allocation and support procedures still need owner and
platform review before implementation. Entitlement updates never initiate money
refunds automatically. Stripe Manage coordinates separately authorized Stripe
financial actions; store financial actions remain their approved store process.

| Authoritative condition | Proposed entitlement behavior |
| --- | --- |
| Successful full refund/revocation of a source purchase | Revoke only that source grant; retain other eligible active grants and earned progress |
| Refund pending/failed, payment pending or provider outage | Do not invent a final revocation or successful new grant |
| Partial refund of an indivisible durable bundle | Require audited allocation/review; no guessed proportional revocation or automatic money refund |
| Verified dispute | Possible suspension of only the implicated grant under the future approved policy; authoritative final outcome governs revoke/reinstate |
| Late/replayed completion after refund/revocation | Reconcile; do not reactivate from the stale completion |
| Reinstall/restore on same CARVE account | Revalidate source ownership and target eligibility; no new purchase or transaction transfer |
| Existing eligible durable ownership before checkout | Detect before offering purchase; also reconcile cross-provider/concurrent races server-side |
| Duplicate purchase still occurs | Approved operator/store remediation; no automatic refund or invented compensation currency |

## Platform ownership and billing boundaries

One CARVE identity/catalog/entitlement service and one shared Stripe account do
not mean one billing method in every client. Cross-platform ownership, checkout
availability and in-app links/promotions are distinct decisions. No store
transaction, purchased currency, Stripe balance or earnings wallet is transferred
between providers by this plan.

| Channel | Planning boundary |
| --- | --- |
| Browser | Existing Stripe sandbox is the selected planning context; live checkout still needs all merchant/release gates and approved offer/catalog |
| iOS/App Store | Plan around StoreKit/IAP with current storefront-specific rules; do not assume a Stripe button/webview or ownership from another store is permitted |
| Android/Google Play | Plan around Play Billing with current market/program rules; Google sign-in and Google Play billing are separate systems |
| Steam, if selected | Separate Steamworks billing/distribution review and SKU/entitlement mapping; no assumption that Stripe can replace Steam Wallet |

The owner's BC-first audience priority means Canadian storefront rules are the
first policy review; BC is not a separate Apple/Google country storefront.
Broader North American markets still require explicit selection and review.
Apple's multiplatform-access conditions, Google Play payment/linking rules and
Steam's in-game purchase requirements must be reviewed for the actual selected
storefronts before flow or portability selection. The native policy annex owns
that review; shared login alone does not approve cross-platform access. Sources:
[Apple 3.1](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase),
[Google Play payments](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en),
[Steam microtransactions](https://partner.steamgames.com/doc/features/microtransactions).

## Implementation and release gates

Before any payment implementation, all three chats must review one revision with:

- Owner-approved offer/contents, price/currency and launch markets/storefronts.
- Versioned canonical catalog, source IDs, verification keys and exact supported
  cross-platform eligibility. No competing catalog or secret/resource owner.
- Exact refund/dispute/partial-refund, duplicate-purchase, restore, offline-cache,
  native guest-purchase/linking, Family Sharing, account recovery/deletion,
  retention and support rules.
- Approved test scope and event/route/credentials plan, plus server permission and
  data migration review. The current auth-only DB role is not a purchase-service role.

Merchant/legal-owner, personal-versus-company, publisher/tax, suitable bank/payout,
paid store agreements/signing, privacy, publication and production release gates
remain unchanged. Do not configure a company, bank, payout, tax collection or
merchant identity implicitly. Later sandbox implementation/testing and later live
activation each need their own explicit approval. Native store billing and any
regional alternative program need their own qualification, not a Stripe assumption.

Future acceptance cases include forged proof, wrong environment/account/app/SKU,
price/quantity mismatch, account change, duplicate concurrent events, payment
pending/failure, refund-before-completion, partial refund, dispute resolution,
independent second active grant, reinstall/restore, provider outage and offline
cache expiry. These are required future checks, **not tests performed now**.

## Coordination record

- User supplied the shared sandbox and explicitly authorized the existing chats
  to coordinate directly; no new Stripe account is requested.
- Stripe Manage confirmed its scoped sandbox inventory and accepted the ownership
  split and conservative technical proposals, with commercial decisions gated.
- Mobile confirmed no final offer/price are approved and accepted the
  invariants with native guest-purchase and target-eligibility qualifications;
  it owns `docs/payment-coordination.md` and keeps every store/payment change gated.
- The owner then clarified in mobile chat: prioritize BC/Canada first, with
  broader North America tentative. Web verified that direct human reply and
  records Canada-first policy review, not expanded release or billing approval.
- Web records the canonical backend/process plan here. No SDK, schema, catalog,
  webhook, key, checkout, payment, refund or release change is part of this work.

Stripe Manage and mobile both peer-reviewed this plan for consistency. Stripe
Manage's store-inventory wording correction and mobile's guest/restore and
eligibility qualifications are incorporated. Web also reviewed the native policy
annex. This agreement approves the coordination and technical planning boundaries,
not a final offer, commercial refund policy, store certification or implementation.
The native planning checkpoint is `eb9ab98d4cf142c7d1a5b4a50539d347169953a8`;
the initial web planning checkpoint is `8448ed298eeb809e442bc0c559bbd23e791077ad`.
Checks were documentation links/diff review; no purchase or runtime tests occurred.

See the [shared ownership plan](shared-storage.md#purchase-ownership-without-payment-implementation)
and [revenue roadmap](expedition.md#post-launch-revenue-capability--2026-10-30).
