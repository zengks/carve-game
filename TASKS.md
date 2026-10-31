# CARVE continuous improvement

The user requests continued useful work without routine approval prompts. Keep
meaningful checkpoints, coordinate directly with the mobile chat and continue to
the next evidence-based task rather than treating a checkpoint as a new decision
for the user. Preserve all existing data and virtual devices. Device testing is
Android-emulator/iOS-simulator only; do not require phone unlocks or user input.

## Active web milestone: camera, reading flow and route decisions

Branch `codex/flow-and-encounters`, preview entry `/?flow=1`. See
[Flow course design and verification](docs/flow-course.md).

- [x] Remove camera center switching, speed/section zoom and impact shake.
- [x] Add readable settled rift receipts and guarded eased return travel.
- [x] Add skill consent, Journal and read-only camp planning.
- [x] Enforce public three-life play; keep unlimited lives in test builds only.
- [x] Add movement recharge, directional rings, camp contracts/repairs and
  repeating encounter families; preserve released course records and saves.
- [x] Cover invariants and 1,000 m reachability in simulation; complete both
  mini-games through browser UI and inspect the compiled public life gate.
- [x] Complete extended one-thumb browser UI play: 1,523 m, all skills/Surge,
  all three contracts, repairs, mirror vault and reload; preserve the paused run.
- [x] Repair camp access, overlapping rifts, reward readability, upper-route
  pickups, Overdrive touch activation and checkpoint camera travel.
- [ ] Qualify device frame times and continuous charged aiming; evaluate route
  balance and return intent with players.
- [ ] Review the new preview before production; keep download prompts disabled.

## Released prior milestone: optional relic comparison

- [x] Keep the released varied route as the comparison baseline.
- [x] Define a small preview-only trial with separate browser profile/run records.
- [x] Add three optional safe-rest caches with deterministic three-choice offers,
  max three distinct passive relics and a visible equipped-effects summary.
- [x] Add bounded collection/skill/exploration effects without changing movement,
  charge/Flow/life rules or requiring a relic for ordinary progress.
- [x] Preserve saved offers, selected effects and one-time reward claims through
  refresh/recovery; bank/Game Over starts a fresh loadout only on a new run.
- [x] Verify both control layouts, safe offer input/clock handling, both rifts,
  skill/reward idempotency, data isolation and good-release route reachability.
- [x] Publish only a branch preview and perform browser interaction checks. Keep
  it separate from the live game; record player-fun/retention evidence as open.

Checkpoint: draft PR #14, gameplay commit `7105f5b`; all Node 24/26 push and PR
checks pass, and its Vercel preview is Ready. Deployed touch play reached the
143 m cache, preserved choices through refresh and returned directly on Skip.
Local UI testing separately verified equipping Resonance and both control schemes.
See `docs/relic-trial.md` for limits and the result contract.
The later deployed touch run reached the third cache at 419 m, equipped Rescue
Seal, traversed all five sections with normally unlocked skills and reached
714 m. Refresh retained 714 m / 120 bounty / 225.1 s and the relic. The second
cache and a no-skill manual route were still open at that checkpoint; the Skyhook
cooldown-wait route is a concrete repetition concern for the next comparison.
Follow-up local UI play has now visited all three caches in the same run, using
one- and two-thumb layouts plus normally earned skills. The second offer survived
refresh and excluded Resonance; the third excluded both owned relics. Collector
and Springfinder completed a three-item loadout that survived refresh at 419 m.
All three skills have now been used in this UI run. At that checkpoint, the
exclusively one-thumb wide Wind Gap crossing and a no-skill manual route remained
open. A subsequent one-thumb-only run has reached the 281 m cache using normal
skills: previously unlocked Skyhook reached the left 279 m ledge, then a charged
jump followed by delayed Rocket Pulse landed on the cache. No relic, keyboard
or two-thumb control was used in that focused run. This closes a skill-assisted
one-thumb access case, not the no-skill CARVE route or physical ergonomics gate.
The same run subsequently banked a highest 813 m with all three relics, two
cleared rifts and 170 bounty; menu recovery and Records retained it. The spring
bonus was hard to distinguish and could be hidden by a simultaneous contract.
Preview feedback now names the granted relic payout and retains that explanation
while still paying contracts; 22 relic checks and the full build pass locally.

The mobile chat reports its First Ascent tablet/window/local-save milestone
merged in mobile PR #38, main `785ddfad10298ad75f5f68a3bcc5b698328bda9a`:
127 Android tablet assertions, 119 iPad/iOS 26.5 assertions, 94 engine assertions
and 19 host checks. This is reported simulator/emulator evidence, not physical
device qualification or a web-gameplay change. All prior devices/data are kept.
OS-delivered one-thumb gesture verification is now reported merged in mobile
PR #39, main `3242cf6aa80a57def30d820f49ca0a50df92b17b`: Android shell and public
XCTest coordinate gestures verified outside-pad release, pause, exact saved
run/clock recovery in a new OS process and fresh input. Physical p95, ergonomics
and multi-pointer qualification remain open. The mobile chat now owns a bounded
interruption/cancellation follow-up on its task targets with separate app IDs.
Web does not operate those shared virtual devices.
Android cancellation is subsequently reported merged in mobile PR #40, main
`75b6b7c36dcd9424c80f1a9f5e1afcfe5fb9e1bb`: a delivered OS CANCEL cleared charge
and ownership, paused without a launch and retained the saved 400 ms clock;
fresh input after Resume launched once. This does not close iOS cancellation
or physical-device gates. No native gameplay rules changed.
Shared native endless/relic implementation remains a later task. Portable fixed
offer/provenance vectors now live in `tests/fixtures/relic-trial-v1.json`; native
consumption is deferred, with no shared leaderboard or wallet compatibility claim.
The income-capability roadmap remains in `docs/expedition.md`; no live billing or
advertising is included in this gameplay trial.

## Queued after this milestone

1. Review the completed no-skill one-thumb Practice opening: the retained UI run
   caught Observatory's final rest rail, crossed into Endless Frontier and is
   preserved near 748 m. This used pauses, ordinary springs and checkpoint/fresh
   catches; uninterrupted/Challenge/physical-device qualification remains open.
   Fixed stale expiry, silent Practice recovery and unclear opening-completion
   feedback; see `docs/relic-trial.md` for the route and input-delivery limits.
   One-thumb skill access to the cache was separately verified and the mixed-touch
   route visited all three caches.
   The 1,000 m automated climbs establish reachability only. Review whether
   choices create interesting route decisions before adding bounty-only effects.
2. Review trial findings and the mirrored native compatibility evidence; fix
   concrete usability or correctness failures before expanding content.
3. Extend the agreed relic offer/result fixtures into a minimal shared movement
   contract when both repos adopt the same course. Preserve existing provenance;
   First Ascent and the web relic trial remain separate rulesets.
   In particular, resolve direction semantics: web ground release reverses with
   negative horizontal drag; qualified native First Ascent bends aim while
   keeping the initial launch facing right. Do not silently copy tuning numbers
   or mix records until this product-rule difference is deliberately reconciled.
4. Develop the next local gameplay comparison based on what the trial reveals.
