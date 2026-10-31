# Flow and encounter rework

This is a branch-preview milestone after release `bfc7bff`. Open `/?flow=1`
for the new course. The root course also receives the camera, reading and rift
flow repairs when this branch is eventually released. Production has not been
changed by this milestone. Use `?flow=1&relics=1` only to compare relic effects;
the existing relic offer vectors remain version 1 and do not certify Flow rules.

## Camera contract

One responsive world scale is used throughout a run: `min(1, width/1000,
height/700)`. Velocity, Flow tier, catches and section boundaries do not zoom the
view. Horizontal camera position continuously follows a 160-world-unit central
dead zone with exponential smoothing at rate 12/second; the renderer never
switches between a fixed lane center and a following center. Vertical following
uses real frame time, independent of the slowed charge simulation. Impact camera
shake is removed; particles still communicate release quality. Camera position
is saved with a run. Resizing intentionally changes the responsive scale and
pauses play, as before.

Numeric tests cover section/lateral boundaries, changing speed, maximum pan step,
fast-player framing and 60/120 Hz convergence. These support removal of the two
identified discontinuities; they are not physical-device frame-time or user
comfort measurements.

## Secret trials and return

The new course lets a player choose timing or memory at a doorway before entry.
The timing gate needs two seals in alternating gold windows. The memory vault
uses four glyphs; alternating later vaults show a mirror pattern that must be
entered backwards. Instructions remain visible before accepting. Choice locks
once the trial starts; a miss or retreat applies the stated setback.

Resolution applies reward/warp once and leaves the climb frozen behind a result
card. The receipt states success/failure, actual bounty including height-contract
bonuses, source/destination height, signed height change and unchanged lives.
A checkpoint-clamped setback explicitly says no height was lost. The player
chooses one Return action after reading. A one-second eased camera journey and
landing explanation then return directly to play, without Resume/Start over.
Controls are retired before travel and fresh input controls the next launch.
Skyhook in the new course uses a 0.6-second explained, frozen anchor transfer
through the same travel layer; its camera also eases instead of cutting.
Nonterminal life loss in this course uses a frozen 0.8-second eased checkpoint
return with the remaining life count, instead of snapping the camera.

A result restores with its receipt after refresh. Reloading during travel keeps
the saved destination paused, without another payout or warp. Background/focus
loss cancels automatic resume; focus restoration alone never resumes. Older
already-settled snapshots without receipts retain their prior safe recovery.
The new-course reward ledger also prevents a stale pre-result snapshot claiming
another payout or upward warp.

## Learning and decisions

First use of each skill pauses for its explanation and an explicit Use or Keep
climbing action. Successful consent is kept per profile. Workshop descriptions
remain available later. Reading/cancelling from a grip waits for fresh grip input.
The paused Journal explains bounty, Flow, lives and recharge and retains the last
12 event notices. Current contract progress and recent events come first; the
reference rules expand only when requested. Ordinary rescue/checkpoint notices
cannot immediately erase a contract payout. Its camp planner previews the next choices without permitting
remote purchases. Bodies can scroll deliberately; action footers stay reachable.

Flow skills recharge through movement, not idle cooldown waiting:

- PERFECT catch on a fresh rewarded surface: 3 points; GOOD: 2; other release: 1.
- New shard: 1 point. A directional ring: 4 points plus 6 bounty and 12 Flow.
- Pulse needs 14 points after use, Windwing 24 and Skyhook 18. Equipment shares
  the existing meter. Repeated recovery catches cannot farm recharge.
- Legacy/root course cooldowns remain in seconds; the trial uses separate rules.

Directional rings require crossing in the displayed arrow direction at at least
120 world units/second. They do not automatically fling or steer the player.
Flow shows spendable points out of 100. The touch Surge button states its
26-point cost and enables only when ready.

Every six floors a safe resting camp offers two contracts from a rotating pair:

| Contract | Deposit | Goal before next camp | Total payout | Extra |
| --- | --- | --- | --- | --- |
| Courier | 6 bounty | 3 different gold shards | 18 bounty | Skill ready |
| Precision relay | 6 bounty | 3 PERFECT releases on different surfaces | 26 bounty | One Overdrive activation |
| Recovery specialist | 6 bounty | A fresh descending rescue catch | 20 bounty | One life, capped at 3 |

The payout includes the deposit; it is not an additional refund. A fall, spike or
passing the next camp ends an unfinished contract with only its already-paid
6-bounty stake lost. One contract can be accepted per camp. Overdrive bypasses
one skill recharge only after a valid activation; a missing Skyhook target never
consumes it. A camp can restore one life for 18 bounty once, capped at 3. Camp
transactions require the actual safe ledge and successful local storage. Near a
beacon (within 320 world units), an explicit Stop at camp action eases the player
onto that ledge over 0.6 seconds, then opens the paused choices. It is also
available from Pause, so it needs no reaction-time race. It never interrupts a
held grip or captures the player automatically. An overlapping rift stays
reachable from an explicit Explore nearby rift action inside the camp.

A failed deposit/repair write leaves funds and lives unchanged. A completed
contract whose reward write fails retains its goal and retries once per second
while playing; it cannot lose that earned goal to an expiry/fall or pay again
from a stale snapshot. Recovery rewards distinguish an actual +1 life from
already-full lives. Choices and their effects are local game
currency, not real-money purchases.

Hollow high-line shards sit 200 units above central ledges, toward the route
center. They pay 1 bounty and count for Courier/recharge, providing a collection
choice for clean upper launches alongside the original 2/4-bounty wall shards.
A normal charged-launch regression covers the first high-line pickup. No shard
changes velocity or steers the player. The streamed token budget is at most 72.

Camp, shortcut, rescue and encounter families continue beyond the first five
sections. The safe spine remains optional-skill reachable. GOOD and PERFECT
scripted one-thumb routes reach 1,000 m with three lives and no skills; this is
reachability evidence, not manual comfort or proof of retention. After the opening,
the HUD identifies the current numbered trail and next camp instead of repeating
a completed five-section checklist. Active contract progress remains visible
while other notices are shown.

## Public lives and continuity

A compile-time `TESTING` flag is false in the production artifact. Public runs
always start with 3 lives, cannot select Practice, and cannot restore an unlimited
run. URL parameters cannot turn testing on. Unlimited Practice is available only
in source/preview test builds. The new preview course defaults to Challenge too.
Earlier unrestricted run keys remain untouched; public runs use separate keys.

Flow course IDs are 6/7. Profiles, runs, controls and records are separate from
released course 4/5, preserving earlier 748 m and 813 m evidence and wallets.
This preview does not migrate old scores into a changed ruleset or alter the
native First Ascent rules. The mobile download/deep-link prompt remains disabled.

## Verification and remaining work

`npm run build` includes all prior suites plus 49 focused Flow tests. Coverage
includes continuous camera transforms, receipt persistence/transition/focus
handling, both trial rules, public three-life enforcement, isolated data, directed
collection, contract expiry and distinct goals, bounded repairs, recharge,
Overdrive, skill consent and failed storage writes.

Browser UI checks completed both mini-games without state injection. The gate
was timed from the rendered cursor; the vault used the displayed glyphs. The
success receipt showed +20 bounty and 0 → 93 m, survived reload, and its Return
showed the travel layer before continuing at 93 m. Journal, first-skill reading,
read-only camp planning and a compiled public build with no Practice option were
checked at phone sizes. Result actions fit at 320×568, 390×844, 844×390 and
1366×768.

The extended browser run on 2026-10-31 cleared all five opening sections and
continued to **1,523 m / 10,547 points / 2 rifts**, using only the one-thumb UI
and game menus. It used normally earned Skyhook, Rocket Pulse, Windwing,
Overdrive and Surge; no keyboard, currency seeding or game-state injection.
It completed Precision relay (+26/Overdrive), Recovery specialist (+20, already
at the three-life cap), and Courier (+18/skill refresh). Earlier Courier attempts
also verified a fall losing only the deposit and expiry at the next camp.
The full-section Courier attempt completed after high-line pickups were added.

Camp acceptance and paid repairs were exercised at actual docked camps. A
purposeful missed landing exercised life loss/return; repair at the next camp
cost 18 once and disabled its repeat purchase. A later mirror vault displayed
`○ □ □ □`; entering `□ □ □ ○` cleared it, paid +20 and returned 971 → 1,059 m.
The record explicitly shows `1 thumb`. Final active run is paused at the
1,523 m camp with **3 lives and 523 bounty**; reload retained it and the paid
Courier state. Prior 142 m Challenge record remains in Records.

This was a browser UI run with pauses, reloads, skill shortcuts, two paid life
repairs and a deliberate miss test. Its 159-second game clock includes idle time;
it is not an uninterrupted speed run, a no-skill run, or physical touch evidence.
The input driver supports short drags and held pad presses separately; continuous
held aiming and physical comfort remain unqualified. Camera paths, recovery
freeze/focus handling and storage-write failures have additional automated
coverage; browser UI cannot establish physical frame-time percentiles or fun.

Next verification: physical-device charged aiming and frame times, broader
contract/route balance with players, and whether the new choices improve fun and
return intent. Native coordination shares this design and the limits; porting,
movement reconciliation and shared user data remain separate.
