# Bellkeeper inside Expedition

Preview branch: `codex/expedition-bellkeeper`, based on released `8a5c261`.
This supersedes the separate Lantern menu direction. No production release is
authorized by this milestone. Mobile download prompts and payments remain off.

## Player flow and shared rules

At **current height 300 m or higher**, stop on a stationary solid ledge. The
contextual action offers Bellkeeper; Pause can reopen it after dismissal. Moving
ferries, crumbling surfaces, springs, airborne grips and held input cannot enter.
The briefing explains the rules before acceptance. Dismissing costs nothing.

Accepting commits the one attempt for this Expedition before opening the arena.
Bellkeeper retains `common.bellkeeper-v1`, rules 2, and three independent encounter
lives. One-thumb is default; two-thumb/handedness remain available. The parent's
position, camera, height, time, Flow, skill charges, inventory, camp contract and
Expedition lives are frozen throughout the encounter.

- Win: +30 bounty once per run and milestone.
- Lose all encounter lives: deduct one Challenge life. Zero remaining triggers
  normal Game Over and banking after the receipt is confirmed.
- Testing Practice: no life debit. Production still has Challenge only.
- Withdraw after acceptance: no reward/debit; the attempt is consumed. A
  confirmation explains this. There is no retry/farming of that milestone.
- Win/loss shows a readable receipt, then explicit Return. The transition takes
  the player to the exact captured ledge, with fresh input required. No generic
  fall, relocation, contract-failure or skill recharge side effects apply.

`shared/fixtures/expedition-bellkeeper-v1.json` is the canonical outcome contract.
It is consumed by web tests and handed to mobile for its parity port.

## Persistence and boundaries

The arena is an embedded same-origin page at `/encounters/bellkeeper/`. It only
plays when the active Expedition connects its own mounted frame. Direct visits
explain how to enter from Expedition. `/lantern` and old subpaths redirect to `/`.
Legacy Lantern/Bellkeeper localStorage keys are never changed or deleted.

One parent session save contains the frozen Expedition plus encounter snapshot.
Reload restores the encounter paused or its terminal receipt. Parent resume
cannot run behind it. A stale/disconnected frame cannot settle a result.
The camp wallet's atomic bounty+claim ledger deduplicates `run:bellkeeper:300`.
If the wallet write succeeds but the parent write fails, retry reuses the claim.
A failed life write rolls back. A committed final-life envelope remains readable
if writing the normal Game Over receipt subsequently fails.

These are browser-local gameplay protections, not authoritative anti-cheat or
purchase grants. No shared live database, billing or account state is changed.

## Native scope

Mobile plan `codex/expedition-native-parity-plan` at `ec370bb` records this product
correction. Native currently has finite First Ascent/Lantern QA courses and the
rules-2 boss, but no Expedition world, wallet, lives mode, skills or contracts.
Port those real systems before exposing this flow. Do not relabel the finite
course or mix its scores with Expedition. Preserve all apps, simulators and data.

## Verification

Automated checks cover safe/current-height entry, dismissal, frozen state,
full input-only boss completion, inherited controls, direct-entry refusal,
accepted-run and receipt reload, blocked saves, reward deduplication, loss,
withdrawal, final-life Game Over, and unchanged historical saves. The full
one-thumb boss win is driven through pointer handlers using the canonical
fixture; it is not a manual/physical-device completion claim.

Browser verification used isolated, visibly labeled synthetic 300 m checkpoints
on localhost; no existing save was overwritten. At desktop and 390×844 sizes:
briefing/acceptance, inherited one-thumb controls, manual hold/release jump,
encounter reload, withdrawal confirmation, win/loss receipts, exact-ledge return,
and final-life Game Over/reload were checked. Fixed return focus, retained
encounter preferences, and retired the hidden arena render loop after returning.
The current terrain/relic tests also preserve an active camp contract and Overdrive.

Hosted preview `8635b32` passed desktop keyboard and phone-size one-pad input,
reload recovery, menu removal and direct-arena refusal. Both GitHub Node 24/26
push and PR checks passed. A follow-up checkpoint tightens the current-course
regressions and removes the loading-state Lantern labels; final preview evidence
is maintained on PR29. Native mirrored fixture checkpoint is `ec370bb`.

### Manual hosted round trip — 2026-11-14

Preview gameplay commit `45074af`, `/?terrain=1`, 390×844 browser viewport:

- Started a fresh Challenge run at ground level. Used only the visible one-thumb
  pad for movement, with normal Rocket Pulse, Surge and camp actions. No seeded
  save, fixture policy or game-state injection was used.
- Passed 300 m with all three lives. Entry correctly stayed unavailable on the
  moving ferry. Reached a 417 m peak, then entered from a solid ledge at 392 m.
- Cleared all three Bellkeeper ropes in 27.4 seconds of encounter time, with two
  falls and one encounter life remaining. The first rope was secured by landing
  and waiting; subsequent fresh wall catches reached ropes two and three.
- The readable win receipt stated +30 bounty and the 392 m return. Confirming it
  showed the return transition, restored the 392 m ledge, score 1,877 and all three
  Expedition lives. The journal retained the Courier contract's completed/paid
  state (it finished before boss entry), and recorded the boss reward. The
  resulting displayed wallet was 165 bounty.
- A fresh one-thumb hold/release then jumped from the return ledge to 417 m.
  The continuing run was left paused and preserved in its preview tab.

The playthrough used pauses between observations and browser-delivered pointer
gestures. Early/mistimed releases caused failed approaches; later fresh holds
succeeded without changing physics. No reproducible gameplay defect was found
that justified retuning the shared rules in this pass. Automated checks remain
the evidence for exact skill/contract freezing, reward deduplication and failure
paths; the manual run does not replace those checks.

Results and limits were sent directly to carve-mobile. Native reported separate
one-thumb OS-touch boss wins on its iOS simulator and Android emulator; that is
not an integrated native Expedition round trip. The native Expedition port
remains unimplemented, all native PRs remain unmerged, and physical-device comfort
and uninterrupted first-time-player difficulty remain unverified.
