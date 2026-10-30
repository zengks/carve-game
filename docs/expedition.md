# Endless Expedition

## Cross-platform convergence plan — 2026-10-30

Status: planning only. The user wants one CARVE game and shared player data on
web, iOS/iPadOS and Android. This direction supersedes treating `carve-game` and
`carve-mobile` as unrelated products. It does not authorize implementing the
convergence, connecting the live web game to a backend, provisioning hosted
services, deploying mobile builds, changing phone profiles or merging runtime
code now. Keep the mobile download prompt and app handoff disabled until the
native releases and verified store links are ready.

Subsequent scope update: the user authorized a new web branch to implement
one-thumb controls, retaining the two-thumb option. Only that control prototype
is now being implemented on `codex/one-thumb-controls`; the wider cross-platform
runtime/data convergence remains planning-only. No production merge or native
implementation is authorized by this branch task.

The two development chats should remain separate by platform, with one shared
product/rules/data contract and mirrored planning notes. This section is the web
coordination record; the mobile chat should record the same direction in its
existing TASKS.md/decisions without overwriting its current work. Update both
records when a shared decision changes; chat history is not an automatic sync.

### Current differences and work to retain

| Area | Web, verified in this chat | Mobile, reviewed from its chat and repository |
| --- | --- | --- |
| Game | Released six-column endless ascent; Practice/unlimited recovery and Challenge/three lives; shared bounty/skills, separate mode bests; two rift games | Godot First Ascent, short tutorial/course, independent two-thumb controls, checkpoint/replay/next-target UI; this is a different course/ruleset today |
| Persistence | Browser-local profile and per-tab active recovery; no account/cloud connection | Local-first guest play, account-isolated durable files/queues, optional email-code accounts, local Supabase save/result sync |
| Import and identity | Display name is not an authenticated identity; browser records are unverified | Explicit reviewed guest-to-account copy, Keep separate default, immutable run IDs, duplicate/conflict protection, native credential storage and account deletion |
| Evidence | Web production at `e2f5146`, including removal of the old summit game; browser viewport checks do not establish physical mobile support | Local native device and emulator/simulator evidence with documented limits; no hosted production sync or store release; fresh Stage E observation profiles must be preserved |

Mobile PR #24 (`995480f`) contains the completed explicit-import work. A later
local retention/audit cleanup task is unfinished on `codex/local-retention-cleanup`;
its partial checkpoint and untracked files are not a completed integration.
Existing mobile evidence is historical and scoped to its documented builds; do
not claim it validates the web game or future unified gameplay.

### Priority 1: agree the shared contract before porting

- Target the same endless game and Practice/Challenge rules on all platforms:
  generation/seed, physics/timing, damage/lives/checkpoints, scoring, bounty,
  skills/cooldowns, both rifts and their outcomes. Keep controls and presentation
  appropriate to keyboard, phone and tablet. Reuse mobile's touch ownership,
  cancellation, interruption and fresh-press safety design where applicable.
- Treat mobile First Ascent as a candidate onboarding course, not a second
  unrelated game or automatic resurrection of the retired web classic. Decide
  its final role before replacing any authored content; preserve existing results
  under their original course/rules/tutorial versions and reserved phone builds.
- Choose one canonical ruleset and deterministic test fixtures. Compare the
  current Canvas and Godot simulations before choosing shared runtime code versus
  a versioned specification with implementations that pass the same fixtures.
  Do not assume GDScript and browser JavaScript can be merged directly.
  Known differences to resolve include web's climbing wall hold and separate
  jump versus native's stationary grip charge and CARVE ground launch. Decide
  the intended feel before equating scores or replacing either control model.
- Define versioned profile, tutorial flags, immutable completed-run events,
  per-mode/category bests, inventory/unlocks and currency transactions. Results
  must identify course/rules/tutorial version, mode, completion outcome and
  continuous/resumed category. Height and completion time are different metrics;
  incompatible old courses or assisted rules must not share rankings blindly.

### Approved control direction: one-thumb manual, with two-thumb option

User decision, 2026-10-30: prioritize one-thumb manual control while retaining
two-thumb controls as a selectable option. Portrait remains the primary mobile
orientation; landscape support does not replace this decision. This is a design
approval initially. The subsequent branch task authorizes the web implementation
described below, without implementing the separate native version or releasing
to production.

One-thumb input combines steering and CARVE in one reachable lower-screen area:

| State/action | Planned behavior |
| --- | --- |
| Press while grounded | Begin ground charge; release deliberately to launch |
| Press while airborne | Prepare a catch; holding in empty air does not accumulate charge |
| Reach an eligible wall while holding | Catch and begin the agreed wall-charge behavior |
| Drag horizontally during the same contact | Manual proportional steering in flight, or launch-direction adjustment while charging |
| Release a ground/wall charge | Launch at its current timing quality |
| Release in free flight | Cancel catch preparation and steering input; retain momentum, with no extra launch |
| Next catch | Requires a fresh press after the previous launch |

The starting touch fixes that gesture's neutral point. Use a small dead zone and
bounded steering; lifting the thumb stops steering acceleration, not momentum.
Support left- and right-hand layouts. Display charge quality and the intended
launch direction clearly; neutral uses a visible authored default. Exact reach,
dead zone, sensitivity and timing values remain to be tested, not assumed.
This is manual control: no automatic next-wall selection, hidden target seeking
or automatic launch at charge expiry. Resolve the existing web/native wall-hold
and ground-launch differences in the common rules contract before implementation.

Keep two-thumb input as an option: independent left steering and right CARVE,
retaining touch ownership and fresh-input safety. It should map to the same
gameplay actions and agreed physics as one-thumb input, without different reward
or life rules. Do not delete the existing two-thumb implementation. Keyboard
controls remain supported on desktop.

Offer an understandable control choice before a run and retain the preference
locally for the device; do not force every device signed into an account to use
the same handedness/layout. A mid-run control change must pause, consume the
menu gesture, clear contacts/charge and require fresh input after explicit
resume. Record the scheme/rules version as metadata for later comparison; do
not promise equivalent difficulty or competitive fairness without evidence.

For the first trial, avoid swipe/double-tap command combinations. Plan separate
reachable skill/Surge buttons between launches, explicit portal entry and an
accessible Pause action. UI touches must not become CARVE presses or synthetic
launch releases. Final skill/Surge placement and whether both fit comfortably
remain design questions; this decision does not remove either game mechanic.
Cancellation, focus loss, resize, pause and recovery must clear stale contacts
and follow the agreed interruption rules without an unintended launch.

Future acceptance checks: deliberate ground launch; three catches; manual
column changes; weak/good/perfect/expired releases; steering dead zone and
momentum; skill/portal use; checkpoint and Challenge-life recovery; cancelled or
extra touches; mode switching; reload/background/resume. Check both handedness
layouts and both control schemes on web and native, including physical phones
and tablets before claiming comfort or compatibility. Use isolated synthetic
profiles and builds; preserve reserved Stage E phones/profiles and earlier saves.
No installed native build or live configuration changes are part of this work.

#### Web prototype on `codex/one-thumb-controls`

- Controls dialog available from Menu and Pause. First use on a coarse-pointer
  device selects One thumb; desktop defaults to Keyboard. One thumb, Two thumbs,
  Keyboard and left/right handedness are device-local preferences. Existing
  active saves retain their layout through reload; terminal Challenge summaries
  retain it even if preference storage fails.
- One owned pad contact combines CARVE and proportional steering. Horizontal
  displacement has a 10 CSS-pixel dead zone and reaches full steering after a
  further 65 pixels. The neutral origin never drifts. Additional contacts cannot
  steal ownership. Leaving the pad retains capture; normal release ends it.
- Both touch layouts use explicit ground-charge/release and stationary manual
  wall charging. Touch wall launches use base lift 840 plus charge × quality ×
  420, compensating for the removed automatic wall climb. Good releases can
  clear the ordinary route. Keyboard controls retain the existing wall-riding
  behavior; full native/keyboard physics convergence is not claimed by this
  prototype. This is a material control/rules difference requiring review.
- Launch arrows and the character charge ring show direction/timing; the pad
  also reports steering and charge. Extra skill/Surge taps are accepted between
  holds. Portals and pause remain explicit. One-thumb camera framing reserves
  space above the lower controls, with mirrored actions for left-handed use.
- Cancelling a CARVE gesture pauses without a launch. Resize/focus loss also
  pause. Manual grip charge resets on interruption while retaining the grip;
  resuming needs a fresh hold. Falls clear held touch input in both Practice and
  Challenge. Layout changes leave the game paused for explicit Resume.
- Legacy saves remain readable. Ground charge/contact ownership are transient;
  active manual grips recover safely without a synthetic release. Records add
  selected control-layout history and a `manual-touch-v1` or `web-v2` rules tag.
  Existing mode bests remain local and unverified; tags do not prove fair
  competitive comparability. No backend or native save contract is changed.
- `tests/one-thumb.mjs` covers 21 checks, including ownership, steering, ground
  and wall releases, expiry, cancellation, scheme changes, interruption/reload,
  preference-storage failure, action gating, camera clearance and pointer-only
  Challenge climbs beyond 1,000 m with good and perfect releases and all lives.
  Local UI checks include a three-release chain reaching 73 m, 320×568 and
  390×844 layouts, and reload/handedness settings. Browser simulation is not
  evidence of physical one-thumb comfort or native iOS/Android behavior.

### Priority 2: reuse mobile's data foundation on the web

- Carry over local play without an account; optional email-code sign-in selects
  the same authenticated player across platforms. A nickname alone must not
  grant access to another player's saves. Keep guest/account scopes isolated.
- Review and adapt the existing mobile Supabase API/schema rather than building
  an independent web database. Extend it for endless modes, bounty and skills
  only after the common contract is agreed. Never expose server credentials.
  Hosting/region/mail/budget/privacy decisions and live integration need separate
  authorization; no production service is being provisioned by this plan.
- Sync completed results, tutorial progress, comparable bests and supported
  profile/unlocks across devices. Preserve offline play and durable pending
  uploads. Deduplicate by stable event/run IDs, reject conflicting contents,
  merge progress transactionally and derive bests; avoid whole-profile or
  device-clock last-write-wins overwrites.
- Use unique reward/purchase transactions and a server-confirmed currency ledger
  to prevent duplicate credits or double spending across devices. Define how
  provisional offline earnings and purchases reconcile before exposing a shared
  wallet. Existing browser totals must not simply be added on each sign-in.
- Offer an explicit review before importing legacy browser or mobile guest data;
  retain source copies and active runs. Preserve provenance: unverified client
  records do not become trusted competitive results because they were uploaded.
- Reuse account-switch isolation, failed-request retry, visible sync status,
  sign-out, deletion/recovery and retention concepts. Browser session storage
  needs a separately reviewed browser strategy; native Keychain/Keystore
  implementations are not a web session implementation.
- First sync milestone keeps active expeditions local to their current device,
  matching mobile's present contract. Full cross-device continuation of an
  unfinished climb needs a later versioned checkpoint and ownership/lease design,
  including remaining lives, seed, rewards, cooldowns and conflicts. Do not
  promise active-run handoff before that work and its tests exist.

### Priority 3: demonstrate parity and cross-platform synchronization

Use disposable synthetic profiles and isolated builds first. Verify web → native
and native → web results/progress, same-account identity, separate Practice and
Challenge bests, offline/restart/retry, duplicate/conflicting events, concurrent
currency updates, account switching/deletion and legacy import consent. Add
shared gameplay fixtures for charge/release, movement, life loss, rifts and
rewards. Then qualify actual iOS/Android hardware and tablet behavior; never use
or reset the reserved Stage E observation profiles for these checks. Review a
web branch preview before authorizing production integration; mobile store and
download/deep-link activation remain separate release gates.

Next planning action: reconcile the two existing save/result contracts and the
two gameplay rulesets into a small parity matrix with agreed version IDs. No
implementation, runtime merge or live data connection has begun under this plan.

Developed on `codex/endless-expedition`, based on main `137c184`. The user
approved merge and production release on 2026-10-30 after preview verification.
Expedition is the only published game, served at `/`. The retired `/classic/`
address redirects to `/`. Practice and Challenge keep separate records. The mobile download prompt stays
disabled and is not included in deployment output.

Production builds (`VERCEL_ENV=production`) remove the preview title/badge and
allow indexing. Preview/local builds remain labeled experimental and noindex.
The production and preview game scripts are identical; release metadata does
not alter gameplay.

## The loop

Choose a name → climb any of six columns → collect gold shards and complete
contracts → unlock/equip movement skills → optionally enter a rift trial → keep
climbing or bank the expedition. There is no summit or finish trigger. Highest
altitude, not current altitude after a fall, drives the personal record.

World height is displayed in metres (10 physics units = 1 m). Three alternating
route pairs span six columns: a familiar central route, plus left and right routes
with richer shards, hazards and environmental lanes. The camera follows sideways
on small screens rather than shrinking all six columns to unreadable sizes.

Four regions cycle with altitude: Moss Cathedral, Storm Archive, Glass Orchard
and Ember Foundry. Coloured grips, gold-chevron springboards, upward lift lanes,
lateral wind corridors, one-way bridges, pendulum poles, spikes and checkpoint
beacons create route choices. The familiar central wall route stays available.

## Bounty and movement

Gold shards award 2 bounty on the centre route and 4 on outer routes. Contracts
repeat during a run: six shards (+12), three perfect releases (+15), and each
new 100 m (+20). Falling does not erase permanent bounty, unlocks or a height
record. Previously rewarded surfaces and pickups cannot pay again within a run.
New runs can earn their own bounty; this is a solo progression system.

| Skill | Unlock | Effect | Shared cooldown |
| --- | --- | --- | --- |
| Rocket Pulse | Free starter | Immediate upward launch, including in mid-air | 14 s |
| Windwing | 25 bounty | Upward launch plus eight seconds of lower gravity | 24 s |
| Skyhook | 50 bounty | Move to a safe higher ledge in range | 18 s |

One skill is equipped at a time, chosen in the menu or paused Workshop. Press C / L / Q
or use its on-screen button. Changing equipment does not reset an existing
cooldown. The ordinary Flow Surge remains a separate action. No purchases, ads,
authentication service, or third-party analytics were added.

## Optional rifts

A nearby compass and explicit Enter button / E key reveal the entrance. Rifts do
not capture a passing player automatically. The briefing states both outcomes
before the player accepts. Leaving the briefing costs nothing.

- **Pendulum Gate:** stop a moving light inside the visible gold band. The light
  cycles without a time limit; one attempt per accepted gate.
- **Echo Vault:** observe three symbols, then repeat them after they fade.

Winning grants 20 bounty and an approximately 90 m upward shortcut. Missing or
explicitly retreating sends the player to a safe ledge up to 46 m lower, capped
by their checkpoint. At the bottom there is no negative height penalty. Permanent
bounty and peak height remain safe. A gate resolves once; reloading its result
cannot repeat the payout. Trials pause the climb clock. Focus loss and reload
pause the trial too and require an explicit Continue. Return always leaves the
climb paused, so a teleport never resumes motion before the player is ready.

## Records and saving

The named top ten are **local, unverified records on this browser**. Skills and
portal shortcuts are included, and each record shows rifts cleared. The same run
updates one entry across refreshes. Banking ends the run by explicit confirmation.
This is not an online competitive leaderboard or proof against cheating. A shared
web/mobile leaderboard still needs authenticated server-side validation, abuse
controls, versioned rules and an agreed backend; no external player database was
provisioned for this experiment.

Expedition profile/wallet/records use `carve.expedition.profile.v1`; the active run
uses per-tab `carve.expedition.run.v1`. Classic records and active saves use their
original keys and are never imported or overwritten. Checkpoints, reward IDs,
seed, cooldowns, buffs and trial phase survive refresh. Blocked/cleared storage
cannot guarantee persistence. A course revision invalidates an incompatible active
preview run; the player chooses to begin again and the profile/records remain. Sequential updates from separate tabs reread the
profile before crediting, spending or recording; this is not a transactional
server economy.

## Endless performance

Rows are generated deterministically from the run seed, then streamed around the
player (five behind, ten ahead). Old geometry is removed; revisiting a checkpoint
reconstructs it. A reward high-water floor prevents farming old reconstructed
rows, while old reward IDs are discarded. Records are capped at ten. The world
has no authored roof; rendering and collision work stay bounded by nearby rows.
This does not establish real-device FPS, battery life or unlimited-duration
reliability. No mathematical claim of infinite numeric precision is intended.

The original single-file game was copied into a separate experimental HTML file
so its physics, interface and save format remain untouched. Shared build tooling
publishes both files with separate hashed scripts/styles. Consolidating duplicated
engine code can follow a decision to keep this mode; premature changes to the
released game's engine would defeat this experiment's isolation.

## Verification — 2026-10-30

- All existing classic regression/recovery checks, seeded 6,000-step stress test,
  original summit bot and cache-build checks pass.
- 29 expedition checks cover generation/reconstruction, bounded object counts,
  reward claims, purchases and shared cooldowns, all three skills, voluntary portal
  entry, both minigames, success/failure/retreat semantics, paused/reloaded trials,
  high-altitude save restore, duplicate payout prevention, local named records,
  separate-tab sequential profile updates, blocked storage and dual build output.
- Input-only bots climb approximately 9,993 m on the central route and beyond
  890 m on both outer routes. These are synthetic simulated runs, not human scores.
- Manual browser play reached 312 m, 664 points and one cleared Echo Vault,
  crossing into Storm Archive. Rocket Pulse and Windwing were used, both upgrades
  were earned/unlocked, and Skyhook was separately activated from a safe start.
  The Pendulum Gate failure path was exercised. The named 312 m record was banked.
  Pauses were used for inspection; this was not an uninterrupted speedrun.
- Refreshes preserved bounty, equipment, highest/current altitude and the completed
  vault result. Menu buttons fit at 320×568, 390×844 and 844×390. At 390×844 the
  touch controls, skill button, rift prompt, coaching and HUD did not overlap.
  A landscape status/Flow overlap and phone prompt obscuring the player were fixed.
- The outer-route pitch was constrained after a random layout caused a CI bot
  failure. A sweep of 80 seeds on both outer routes then passed all 160 runs;
  eight fixed seeds per side now include those former failure cases in CI.
- Physical iOS/Android multi-touch, long sessions and player fun/retention have not
  been validated. More mechanics are not evidence that the game is commercially
  successful or that every optional route feels equally good.

## Next decisions after playing this preview

Tune reward/cooldown pacing from actual play, choose whether the six-column world
should widen further, and decide whether portal rewards need more variety. Future
candidates include timed chase rooms, relic loadouts, route-specific contracts,
a daily seeded expedition and server-verified seasonal records. None is required
to understand or play this first experiment.

## Keyboard comfort

The default arrow layout uses the right hand for ←/→ and the left hand for
Z (hold/release Carve), X (Flow Surge), C (equipped skill), and Space (jump).
A/D + J/K/L is an alternative. Shift and Q remain compatible; E opens a nearby
rift, P/Esc pauses. Inputs no longer intercept names, editable fields, menu
navigation or modal controls. Holding P does not repeatedly toggle pause.

## Extended manual review — 2026-10-30

A new UI-only browser run banked **1,013 m, 2,535 points, three rifts cleared**,
under the name Quest Explorer (151.2 seconds on the climb clock, plus inspection
pauses and trial time). It used Rocket Pulse, Windwing and Skyhook, Z with arrows,
X Flow Surge, normal carves, the right outer route/lift lane and all four biomes.
Both Echo Vault (observed △ △ ○) and Pendulum Gate were won. A first Pendulum
attempt failed safely. A mid-climb reload and a completed trial result reload
preserved the expedition. This was manual keyboard/mouse input, without setting
player position, rewards, seed or trial results. Previously earned local unlocks
were available at the start; this does not re-prove the initial unlock economy.

Fixed name-field/global shortcut interference, pause-key autorepeat, keyboard
ergonomics, missing Windwing float-time feedback, and silent low-Flow surge
attempts. The float countdown lives on the skill button, keeping the phone
status and contract lines from overlapping; narrow phones also use a compact
status font. Core movement difficulty was left unchanged: the run reached all four
regions; tool-paced play alone is not a reason to retune human reaction windows.
The central input-only endurance test now climbs through repeated biome cycles
to about 10 km, retaining bounded geometry, reward sets and a small save snapshot.

Mobile app handoff remains entirely inactive; see [its release preparation](mobile-handoff.md).
Physical-device app opening, real multi-touch ergonomics, retention and fun still
need real-device/player validation.

## Follow-up preview verification — 2026-10-30

The remaining Node 26 jobs and both PR/push Node 24 jobs for `71cec22` all
completed successfully. Desktop verification of that deployed preview exercised
name entry, Space/Z/arrow jumping and a perfect carve, X feedback, C skill use,
and reload recovery of 63 m / 78 points, bounty and the active cooldown.

Small-phone inspection exposed a clipped Leave button in the secret-rift briefing
at 320×568. Rift text/track now scroll separately from fixed action controls.
Accept, Seal, glyphs and Leave/Retreat remain visible; Seal is shown only for an
active, unpaused timing trial. A regression test covers briefing, playing, focus
loss, result and memory-room control visibility. Full local build and 29 expedition
checks pass.

Browser checks of the repair cover 320×568 and 390×844 portrait plus 844×390
landscape. Both trials were completed through on-screen buttons, and a resolved
trial survived reload. These are browser viewport/pointer checks, not physical
iOS/Android multi-touch, safe-area, audio or performance certification. The future
mobile app handoff stays disabled and outside the deployment output.
