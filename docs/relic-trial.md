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
open at that checkpoint; the input-driven simulations do not close a manual gap.

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

## Focused one-thumb Wind Gap access

A subsequent local UI run kept one-thumb mode from Begin through the Wind Gap
cache. The previous 813 m banked record, wallet and earned skill unlocks were
preserved. The new run started with zero equipped relics. Three ordinary Skyhook
activations reached 93, 187 and the left 279 m ledge, observing normal cooldowns.
The Workshop changed the equipped skill to Rocket Pulse without resetting its
remaining cooldown.

At that ledge, a roughly 470 ms pad hold/release followed by a delayed Pulse
activation (approximately 800 ms later) cleared the lip and landed on the central
281 m rest. The UI showed the one-thumb pad and enabled Relic cache action; the
cache opened with three choices and Equipped 0/3. It remains paused there for
follow-up, with no keyboard movement, two-thumb mode or game-state injection used.

This verifies a skill-assisted one-thumb access route to the Wind Gap cache. The
setup used previously earned Skyhook unlocks and bypassed the first cache. It does
not establish a new-player/no-skill CARVE route, a full one-thumb-only course
completion or physical-device comfort. No movement or difficulty changes were
needed for this successful attempt. The future comparison should still address
the safe cooldown-wait loop rather than treat this access result as retention
evidence.

## No-skill one-thumb route follow-up

A separate Practice run started at zero altitude in a 390×844 browser viewport,
preserving the earlier profile and 813 m skill-assisted record. All movement used
the one-thumb pad. No active skill, Surge, relic choice, rift or Workshop upgrade
was used. Ordinary authored springs and saved checkpoints remained available.
This is UI-delivered input with pauses for inspection and actual fall recoveries,
not an uninterrupted run or physical-device ergonomics evidence.

The run reached the 143 m rest, crossed Wind Gap via its first shifted walls,
saved the 233 m gold checkpoint, traversed The Fork and entered Second Chance
at 439 m. A fresh descending catch on cyan wall `b:20:9` showed
`RESCUE WALL · fresh catch · no life lost`; its release reconnected with the
main row-20 wall and reached 477 m. Ordinary walls and rails then reached
Observatory. The highest directly observed altitude was 670 m; a source reload
retained 670 m / 3,689 points / 135.3 s and the empty relic loadout. The inherited
813 m profile best is a different, earlier run. The present run remains saved
and paused after a further recovery near 635 m. Full five-section completion,
an uninterrupted no-skill climb and physical comfort remain open.

Two concrete feedback defects were fixed without changing movement, timing,
geometry, scoring or lives. Accepted fresh touch input now dismisses the resolved
`CHARGE EXPIRED` instruction; rejected/extra contacts cannot dismiss it and fall
or reward notices are preserved. Practice falls and spike hits now explain the
checkpoint return and unlimited lives, instead of silently changing height.
Actual UI falls restored the 233 m and 346 m checkpoints with the new message.
Five new regressions cover these cases, including real simulated hazards and
saved-run recovery; their scripted evidence is separate from the UI route.

A temporary read-only console probe identified contacted surfaces; it was removed
before delivery. A separate pointer-event probe showed that this browser tool
serializes long presses and subsequent drags into separate contacts. A requested
hold-plus-drag therefore does not establish a continuous charged aim gesture.
No physics changes were made to compensate for that tool limitation. The next
route task is to finish the Observatory recovery and final landmark with the
same no-skill restrictions; continuous charged steering still needs suitable
input-delivery or physical-device evidence.

## Observatory completion from the retained no-skill run

The next UI session resumed the same saved run near 635 m, with zero relics and
the same one-thumb-only/no-skill restrictions. Ordinary outer and main row-26
tops led to a perfect row-27 left-wall release and the broad central row-28 rail.
An initial rightward launch hit the next solid column's underside; an ordinary
outer-wall recovery returned to row 28. No difficulty or physics adjustment was
needed. From that rail, an approximately 350 ms ground charge followed by two
short rightward pad drags caught and released the final rest rail `r:29:2`
at world y=7018. The run crossed y=7050 and the UI showed Endless Frontier.
A fresh row-30 wall catch continued beyond the opening. It was saved at 733 m /
7,242 points / 143.5 s, then restored on clean source and preserved at about
748 m / 7,242 points / 144.0 s with `5/5 CLEARED · ENDLESS FRONTIER` visible.
The old 813 m profile best is still the earlier skill-assisted run.

This closes traversal of the five-section opening in the retained no-skill
one-thumb Practice run. It includes pauses, ordinary authored springs and
checkpoint/fresh-catch recoveries from earlier play; it is not a no-fall,
uninterrupted, new-profile Challenge or physical-device qualification. No skill,
Surge, relic, rift or upgrade input was used. UI actions used the actual pad;
temporary read-only surface logs were removed before delivery. The browser's
continuous charged-drag delivery limitation remains open.

Completion previously changed only the route-status text, making the achieved
goal easy to miss. Crossing the existing y=7050 boundary now shows a four-second
nonblocking Observatory-cleared notice and the Frontier status explicitly says
`5/5 CLEARED`. Existing persisted peak height prevents replay on a lower revisit
or reload; an unfinished notice restores only its saved remaining duration.
Routine notices cannot replace it immediately, while hazard recovery and unique
relic payout explanations retain priority. There is no modal, reward, movement,
course, score, life or save-schema change. Already-cleared saves get the clearer
status without replaying the celebration. Three new regressions cover physical
simulation crossing/continuation, remaining-time persistence/revisit behavior and
feedback priority. The persistent label and retained run were also checked in
the 390×844 browser UI; the new first-crossing notice is covered by simulation,
not retroactively claimed as visible in the previously completed UI crossing.

## Release verification

PR #14 was merged as `2e96d5c6ecf11cbf3ac96f5835d1bc1071734a84` after the full
build, Node 24/26 push/PR checks and preview checks passed. Production desktop
keyboard play and mobile-size one-thumb launch/catch passed. Reload retained
desktop 3 m / 0 points / 0.5 s and mobile 27 m / 46 points / 8.8 s, paused for
deliberate Resume. Existing profiles and the completed local run were preserved.
Relics remain opt-in at `?relics=1`; mobile download/deep-link code stays excluded.

Live landscape verification found the long reload message pushed lower pause
actions below the initial viewport. The compact pause layout now reduces logo,
heading and spacing while retaining the full message and 44 px action targets.
The reload menu with all seven actions, including Relics, fits without scrolling
at 844×390, 568×320, 320×568, 390×844 and 1366×768 in browser UI checks. The CSS
change does not alter gameplay, input, saves or the disabled mobile handoff.
These are browser-size checks, not new physical iOS/Android qualification.
