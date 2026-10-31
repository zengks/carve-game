# Optional relic comparison

Status: branch experiment, 2026-10-30. Enter with `/?relics=1`; omit the query for
the baseline on the same preview. Production remains on main. The mobile download
prompt stays disabled. No monetization SDK, backend or native port is included.

## Player flow

Rest rails at rows 5, 11 and 17 (about 143, 281 and 419 m) show a relic-cache marker.
Standing still on the rail with the touch contact lifted reveals **Relic cache**
in the existing rift-action slot. Desktop uses E. Nothing opens automatically.
Inspecting pauses the clock and offers three deterministic, distinct choices.
Equip one or skip to resume directly with fresh input. Skipping consumes that
cache. The inventory caps at three; owned relics cannot be offered again.

Pending choices survive refresh, without rerolling. Background selection keeps
the climb paused. Escape cannot silently consume an offer. Pause → Relics shows
equipped effects. Beginning another run resets the loadout; reloading an active
run keeps it. Terminal Challenge results retain their loadout and never resurrect
the run or refill lives. No relic is required to climb the ordinary route.

| ID | Name | Effect |
| --- | --- | --- |
| collector | Collector | Shard collection radius 43 → 68 world units |
| prospector | Prospector | +1 bounty per unique shard |
| resonance | Resonance | New skill activations use 85% of ordinary cooldown |
| gatekeeper | Gatekeeper | +8 bounty per unique secret-game success |
| spring | Springfinder | +5 bounty on first use of each spring |
| rescue | Rescue Seal | +6 bounty on first genuine descending catch of each marked rescue wall |

Resonance does not change an already running cooldown, including after recovery.
None of the relics changes geometry, gravity, steering, Flow, charge windows,
spring launch velocity or Challenge lives. Flow-altering relics remain deferred.

## Shared contract and continuity

- Numeric course 5; record course `relic-trial-v1`; rules `relic-v1`;
  `assisted: true`; relic metadata `{version: 1, owned: [id, ...]}`.
- Trial-only keys: `carve.relic-trial.profile.v1`,
  `carve.relic-trial.run.v1`, `carve.relic-trial.controls.v1`,
  `carve.relic-trial.muted`. No legacy wallet import. Baseline keys are preserved.
- Run state stores ordered owned IDs, consumed cache rows, pending offer and
  bounded exploration claims. Offers are derived from run seed + row + owned IDs.
- Wallet reward IDs include rules version, numeric course, immutable run ID,
  reward kind and immutable generated block/shard/rift ID. Marker and wallet are
  written in the same profile JSON; per-run contract high-water totals are also
  written with their wallet change. An older session snapshot cannot replay a
  committed reward while its marker is retained.
- The ledger retains 4,096 reward IDs and 64 runs of contract totals. In-memory
  exploration claims prune below the existing regeneration floor. These are
  bounded local recovery protections, not authoritative anti-cheat or a guarantee
  of concurrent-tab transactions. Browser storage can be edited or blocked.
- Mobile has reviewed the contract. Native implementation remains deferred; its
  current First Ascent course and results must not be ranked against this trial.

The portable [fixed vectors](../tests/fixtures/relic-trial-v1.json) pin six offer
examples, including the maximum allowed seed, owned-relic exclusions and an
assisted Challenge record's provenance. `tests/relics.mjs` checks the actual web
implementation against them. A future native implementation can consume the
same JSON without running browser JavaScript. These fixtures do not assert that
native First Ascent currently supports relics or shares this course's movement.

To reproduce offers in another language, preserve the pool order in the fixture.
For each non-owned pool index `i`, compute `n = imul32(seed XOR (row + 1),
1597334677) XOR imul32(i + 81, 3812015801)`, then `rank = unsigned32(n XOR
logicalRightShift(n, 16))`. Sort by ascending unsigned rank and take three.
`imul32` retains the low 32 bits; a language's ordinary unbounded multiply or
signed right shift is not equivalent. A pool/order/hash change needs a new rules
version and an explicit saved-offer migration; do not regenerate these fixed
expectations merely to make a changed implementation pass.

## Verification

`npm run build` passes with 22 added relic checks plus all existing suites. Tests
exercise safe cache gating, clock/input lifecycle, deterministic offers, skip/cap,
all six effects, both secret games, payout replay, malformed snapshots, result
provenance, terminal Challenge recovery and data isolation. A deterministic
15-second trace with no relics matches baseline position, velocity, Flow, score
and bounty. Two input-driven simulated climbs exceed 1,000 m with complementary
three-relic loadouts and good/perfect releases, retaining three lives.

UI-driven local browser testing used the one-thumb pad, starter Rocket Pulse and
a completed Pendulum Gate to reach the first cache at 143 m (peak 177 m). Refresh
kept the same three pending choices. Choosing Resonance returned directly to the
same rest; Pause showed its effect. Switching to two thumbs kept the game paused,
and Resume + Jump worked. No browser game state or outcome was injected. Choice
layouts were checked at 320×568, 390×844, 844×390 and 768×1024. Small-phone and
landscape clipping were corrected so all three choices and Skip remain visible.

This is not a full manual relic climb or physical-device validation. Fun,
retention, demand, sustainable revenue and native parity remain unproven. Keep
the experiment on preview while pursuing longer real-input runs and reviewing
whether choices create interesting route decisions rather than only extra bounty.

The gameplay checkpoint `7105f5b` is published in draft
[PR #14](https://github.com/zengks/carve-game/pull/14), with passing Node 24/26
push and PR checks. Its
[Vercel preview](https://carve-game-ogdtuhqdq-zengksoutlookcoms-projects.vercel.app/?relics=1)
is Ready. A separate deployed touch attempt missed the first timing gate and
returned seamlessly to a lower ledge; a fresh test attempt then cleared it using
input timed from the rendered cursor. Pulse plus a leftward pad drag reached the
143 m cache (peak 172 m). Its three choices survived refresh at 320×568, and Skip
returned directly with no equipped relic or repeated cache. Desktop inventory
was checked at 1366×768; no browser console errors occurred during these checks.
Production remains Ready on main `37bd5f0` with no trial deployment promoted.

The deployed real-input touch attempt continued using normally earned bounty:
50 bounty unlocked Skyhook, which reached 233, 323 and 415 m. A 700 ms hold expired
with the expected lift/retry hint; a subsequent 470 ms one-thumb charged jump
landed on the third cache at 419 m (peak 434 m). It offered Rescue Seal,
Springfinder and Prospector; choosing Rescue Seal resumed immediately. Further
charged jumps, an ordinary spring and Skyhook traversed Second Chance and
Observatory, reaching **714 m / Endless Frontier / 120 bounty / 225.1 active
seconds**. Refresh restored that exact paused state, one equipped relic and the
remaining cooldown. There was no keyboard movement or injected game state.

This is a **skill-assisted UI touch traversal of all five sections**, not a
no-skill manual CARVE completion, all-cache completion, or proof of the seal's
marked-wall payout in UI play (the payout has a simulation regression check).
The second cache was bypassed by the assisted route. The timing-gate input used
the rendered cursor position rather than an injected outcome.

The route exposed a design concern rather than a correctness failure: after
unlocking Skyhook, waiting on a safe checkpoint for its cooldown can become the
dominant low-risk route. More bounty-only passives would not resolve that
repetition. The next comparison should reward active route choices and clean
play, and compare skill-assisted versus ordinary routes before changing shared
skill/economy rules. No unreviewed balance change is included here.

## Same-run cache and skill follow-up

The retained local UI run subsequently completed Echo Vault by entering its
displayed three-symbol pattern, returning directly to 256 m. Short one-thumb
drag attempts did not complete the broad Wind Gap crossing. The alternate
two-thumb layout reached the second cache at 281 m by steering off the checkpoint
before triggering Pulse, clearing the overhang. It offered Collector, Prospector
and Gatekeeper, excluding the equipped Resonance. Refresh retained that exact
offer; choosing Collector continued immediately and Pause showed both effects.

With normally earned bounty, the same run used Skyhook to 369 m and unlocked
Windwing for 25 bounty. Returning to one-thumb mode and activating Windwing after
the shared cooldown reached the third cache at 419 m (peak 427 m). Its choices
were Gatekeeper, Prospector and Springfinder, excluding both owned relics.
Choosing Springfinder produced a three-item loadout. Refresh retained 419 m,
53 bounty, the three effects and the remaining cooldown. All three caches are
therefore UI-verified in the same run using a mixture of the two supported touch
layouts and normal skills. An exclusively one-thumb Wind Gap crossing remains
open; the input-driven simulations do not close that manual test gap.

Further real UI play exposed unclear spring-relic feedback: the ordinary spring
hint did not name the bonus, and a simultaneous shard contract could overwrite
it. Spring and marked-wall rescue notices now append **RELIC +5/+6 bounty** only
when that unique reward is granted. A recent relic explanation remains visible
when a contract pays; wallet transactions and contract totals still advance.
Repeat contacts show the normal action hint, without another reward claim. The
regression covers a spring, shard contract and two height contracts in one frame,
including the next normal contract after the relic explanation expires.

The updated local UI run reached a fresh Observatory/frontier spring and visibly
showed **SPRINGBOARD · lift, then press to catch · RELIC +5 bounty** while the
wallet also received other earned rewards. It then deliberately banked at a
highest climb of **813 m / 170 bounty / two cleared rifts**, with Resonance,
Collector and Springfinder listed together in Records. Reload returned to the
menu with that best and wallet, rather than resurrecting the ended Practice run.
No browser console errors occurred. The record's control list denotes layouts
configured during the run (including its initial keyboard configuration), not
an OS input trace; movement in this UI follow-up used the touch controls.
