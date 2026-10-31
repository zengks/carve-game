# Endless Expedition

## Combined gameplay roadmap — 2026-10-30

This consolidates the latest mobile-chat planning turn (mobile documentation
PR #27, main `93a6918`) with the web review that climbing feels repetitive despite
the visuals, and the subsequent web proposal for a varied three-minute opening.
The mobile roguelite/discovery section was already mirrored locally below; this
roadmap preserves it and supplies a common order of work. Planning only: this
update changes no game code, builds, installed devices, backend, deployment or
implementation authorization. It does not merge the existing one-thumb preview.

### Product direction and current evidence

- One CARVE game across web, iOS/iPadOS and Android: endless Practice/unlimited
  recovery and Challenge/three lives, one-thumb manual as the intended primary
  mobile scheme, selectable two-thumb controls and desktop keyboard support.
- The intended loop is **read a route → choose an approach → charge/launch →
  recover deliberately if needed → reach a landmark → choose a bounded passive
  relic at selected safe checkpoints → adapt the next route**. Preserve the
  readable climb when testing a version without relics.
- Combine the web proposal's different encounter types, route decisions,
  section objectives, useful skill choices and tension/relief rhythm with the
  mobile plan's visible height, discovery, manual rescues and small relic pool.
  More columns, higher numbers and more reward menus are not acceptance criteria
  for reducing repetition.
- The reported repetition is player feedback, not a measured prevalence or a
  retention result. A central route that can be repeated with nearly identical
  actions is the current design concern. Scripted long climbs prove a route is
  traversable, not interesting. Five launches without drag steering in the web
  preview demonstrate accessibility of that route, not that all routes lack depth.
- The web one-thumb prototype is on `codex/one-thumb-controls`, commit `6275d43`,
  draft PR #9; it is separate from released web revision `e2f5146`. Its touch
  layouts already use proportional one-thumb steering, stationary wall charge,
  CARVE ground launch and safe cancellation. Keyboard wall riding, independent
  jump/wall-jump actions, Flow-dependent steering, grip slow motion, timing,
  catch rules and clocks still differ from the proposed shared native baseline.
  The earlier mobile physics comparison described the older web behavior; do
  not treat all of its web differences as still absent from this preview.
- Native one-thumb/endless/relic work is still planned, not implemented or
  validated by the older two-thumb First Ascent device tests. Preserve the
  authored course, original record categories, installed observation builds,
  both fresh Stage E profiles, earlier human saves and unfinished retention work.

### Proposed sequence and review gates

The following is the combined recommendation, not a grant to implement it. The
technical Priority 1–3 sections below describe contracts; they do not require
building a shared backend before evaluating gameplay variety.

| Step | Deliverable after separate authorization | Review gate |
| --- | --- | --- |
| 0. Shared movement contract | Agree stationary charge, explicit ground/wall release, final aim capture, fresh catches, surface/chain/life rules and clock definitions; version fixtures across inputs | A main route works with good releases, stable handling, deliberate recovery and safe interruption; distinguish existing web prototype behavior from the proposed contract |
| 1. Varied opening, no relic layer | One approximately three-minute authored sequence with distinct sections, an optional shortcut, one visible rescue opportunity, landmarks and broad resting ledges | Players can read targets, recognize the route choice and explain a miss/rescue; ordinary progress needs no perfect, skill unlock or lucky roll |
| 2. Small relic comparison | The same climb with a six-relic passive pool, three choices per offer and at most three equipped; compare against Step 1 | Players understand effects, make different route/skill choices and choose to retry; offers do not obscure the climb or corrupt recovery |
| 3. Endless section assembly | Seeded combinations of validated sections and recognizable regional landmarks, with controlled encounter cadence | Variety survives different seeds; required transitions remain reachable, risks visible, recovery bounded and rewards non-repeatable |
| 4. Platform and data convergence | Qualify the chosen runtime and adapt mobile's existing identity/save foundation for common versioned results/progress | Bidirectional web/native sync, offline/retry/account isolation and legacy import consent pass before an independently authorized hosted release |

Runtime evaluation and contract design can inform the early steps; replacing the
live renderer is not a prerequisite for every design discussion. The mobile
chat recommends a shared Godot gameplay implementation for web/native, conditional
on a browser loading/performance/lifecycle evaluation. Keep Canvas plus matching
fixtures as the fallback. This is a recommendation to evaluate, not an approved
engine migration. One runtime also does not by itself establish exact replays
or trustworthy competitive scores.

### Proposed first three minutes

These timings describe an intended pacing sketch, not a countdown, required
completion time or claim about actual newcomer behavior. Replays should avoid
repeating full explanations. First Ascent's final onboarding role remains a
separate content/versioning decision; do not silently reclassify its old results.

| Approximate stage | Climbing encounter | Player decision / payoff |
| --- | --- | --- |
| 0:00–0:30: establish rhythm | Broad launch ledge and three readable catches; no teaching spikes | Learn hold/drag/release and read the launch arrow; success comes from deliberate input |
| 0:30–1:05: vary the line | An offset target followed by a short lateral crossing and safe ledge | Adjust direction rather than repeat an identical zig-zag; one clear local beacon provides a destination |
| 1:05–1:40: choose a route | A forgiving checkpoint route beside an exposed optional shortcut with a visible landing and reward | Choose safety or a faster/richer line; the risk and benefit are visible before launch |
| 1:40–2:15: recovery opportunity | A lower marked grip/shelf under the optional line, above the defined damage boundary | A deliberate fresh catch can rescue a miss without spending a life; ordinary checkpoint recovery remains available |
| 2:15–3:00: relief and discovery | A controlled faster-climbing section into a broad landmark ledge, revealing the next region | Feel progress, inspect the route and choose a next target; selected safe ledges may host offers only in the relic variant |

Each section should have one readable purpose, such as reaching a beacon,
crossing to another column or collecting an optional marked cluster. Avoid
multiple simultaneous HUD chores. Existing skills should solve visible optional
problems: Windwing can help a lateral crossing, Skyhook can bypass a hard stretch,
and Surge/Pulse can support an exposed ascent. Their availability must not gate
the main route. Retain opt-in secret games, but additional minigames are not the
first remedy for repetitive climbing.

Moving anchors/platforms, timed gates, crumbling surfaces and new barrier
interactions from the web brainstorming remain later encounter candidates.
Introduce them separately after the basic route-choice/recovery trial, with
explicit contact/charge behavior and reachability checks. They are not all
required for the first opening, and the planning approval does not implement them.

### Relic and recovery constraints carried forward

Keep the mobile plan's six passive relic candidates, three-choice offers and
three-slot limit, with no duplicate/stacked effects, new currency or purchases.
Collector, Flow Keeper and Resonance are example candidates; all six identities,
effect bounds and offer cadence still need design review. Do not present the
examples or the remaining three open slots as final balance. Decide skip/cap
behavior before implementation; the simplest first trial would stop new offers
at the cap instead of introducing a replacement inventory system.

Preserve gravity, steering, catch tolerance and charge windows across relic
builds. In particular, resolve Flow-dependent steering before a Flow Keeper
trial: slower Flow decay must not silently change base handling under the new
contract. Let relics change collection, scoring/Flow spending or explicit skill
opportunities. Keep perfect-release bonuses optional, with a good-release route
always available. Safe offers pause simulation and the active climb clock,
consume UI contacts and require explicit resume with fresh input. Seeded offer
IDs and saved choices prevent rerolling/duplicate rewards after refresh or retry.

Recovery is a fresh player-controlled catch, not automatic target selection.
Use one world-space incident boundary and bounded rescue area, independent of
camera/screen size. Current web fall detection includes a camera-relative term;
that must be reconciled before calling the proposed boundary implemented or
equivalent across platforms. One qualifying fall/spike incident costs exactly
one Challenge life. A successful rescue before the boundary costs none;
checkpoints and relic offers never heal. Keep Practice unlimited, explicit bank,
terminal-run non-resurrection and safe saves. Relics persist during an active
run's recovery and reset only on a new run after banking/Game Over.

### Observation and decisions still open

Compare matching content without/with relic offers so section design and
upgrades can be assessed separately. Record where repetition/frustration begins,
whether players notice a shortcut and rescue target, what route they choose and
why, whether an effect changes their next decision, and voluntary retries.
Observe unprompted actions as well as comments; technical completion, positive
graphics feedback or one player's opinion does not establish retention or fun.

Before implementation, settle the common timing bands, launch strengths,
Flow/steering relationship, catch/rail/pole rules, chain semantics and clocks.
The mobile recommendation of its timing bands, fixed strength per quality band,
no grip slow motion and an initially evaluated 120 Hz simulation remains a
candidate contract, not an approved replacement for current web tuning. Settle
recovery boundaries/checkpoint spacing, concrete section geometry/objectives,
skill/rift placement, relic definitions/cadence and comparable result categories.
Shared results must preserve version IDs, control-layout history and relic
IDs/effect versions; do not relabel old course scores or sum legacy wallets.
Active-run handoff, hosted accounts, store release and mobile download/deep-link
activation remain separate later work.

Exact next planning action: agree the minimal shared movement/life/clock
contract, then draw and review the opening's main route, one shortcut and its
recovery shelf against that contract. After those decisions, seek authorization
for an isolated baseline trial before the relic variant.

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

### Approved gameplay direction: roguelite choices and vertical discovery

Approved for planning on 2026-10-30. Combine CARVE's manual climbing with a light
roguelite layer and the height, discovery and recovery ideas discussed from the
original 2023 Only Up! This updates the shared product direction only; it does
not authorize gameplay implementation, native builds/device tests, backend or
schema changes, deployments, new USB sessions or resumed retention work. Existing
separately authorized platform tasks retain their own scope. One-thumb manual
remains the planned default, two-thumb remains optional, and desktop keyboard
support remains. Numerical tuning and common physics/runtime selection are still
unsettled; the earlier Godot-for-web recommendation needs a separate evaluation.

The intended loop is: readable climb -> optional risky shortcut -> possible
manual recovery -> safe landmark/checkpoint -> relic choice -> next region.
Endless ascent remains the main target. First Ascent is the recommended onboarding
role, with its existing authored course/results/builds retained until a separately
approved migration settles that role. This is not a new summit or a return of the
retired web classic.

#### Height, route discovery and recovery

- Make height tangible with background parallax, distant ground and recognizable
  landmarks below. Tease the next region with a readable silhouette or local
  destination; an endless world can have memorable milestones without a final roof.
- Arrange tested authored climbing sections through seeded generation. Preserve a
  main route reachable with good releases and no required relic/skill/perfect.
  Mix exposed sequences with broad resting ledges so players can read the next
  target before charging. New geometry must be checked against the agreed physics;
  reusing the existing web dimensions does not establish native reachability.
- Offer optional shortcuts with visible landing targets, benefits and risks. No
  hidden mandatory trick or surprise penalty is needed for the first trial.
- Place occasional lower shelves/marked walls within the allowed recovery area.
  A missed launch can be rescued by a deliberate fresh catch before a defined
  damaging-fall boundary. The camera must show the recovery opportunity without
  hiding the next target or putting it behind the control area. No automatic
  targeting, snap-to-save or synthetic catch is added.
- Keep Practice unlimited and Challenge at three lives. A successful rescue
  before the damage boundary costs no life. A qualifying fall or spike incident
  costs exactly one life and returns to the checkpoint if lives remain; the third
  loss ends the run. Checkpoints and relic offers do not heal or reset lives.
  Define a world-space incident boundary, bounded recovery space and immunity/reset handling
  so collision axes or prolonged falling cannot charge multiple lives. The exact
  boundary and checkpoint spacing remain design decisions; camera framing and
  screen size must not change what counts as a damaging fall.
- Retain saves, explicit pause/resume and interruption safety. No no-save rule,
  mandatory long fall animation, extra camera-control gesture or manual slow-motion
  button is proposed. The first trial should communicate risk through geometry
  and presentation while keeping movement reliable.

#### Small roguelite trial

After the common movement baseline is settled and separately authorized, first
evaluate height presentation, one recovery opportunity and one optional shortcut.
Then compare a small relic trial with an otherwise matching climb:

- Plan a pool of six passive relics, three choices per offer and at most three
  equipped per run, without duplicates or stacking in this first trial. The full
  pool, effect bounds, offer cadence and descriptions still need design review.
- Offer at selected safe checkpoints, with simulation/charge/active climb clock
  paused. Require a released gameplay contact before opening; selection/skip and
  resume touches are consumed. Resume explicitly with fresh input. No swipes,
  double taps, additional held buttons or auto-selected reward are introduced.
- Candidate effects: Collector increases shard collection reach; Flow Keeper
  reduces passive Flow decay; Resonance lets a perfect release reduce the equipped
  skill cooldown by a bounded amount. These are examples, not implemented effects
  or finalized balance. The remaining three candidates are still open.
- Keep gravity, steering response, catch tolerance and charge windows consistent
  across relic builds in this trial. Offer strategic variety through collection,
  Flow and skill interactions. Do not require a lucky roll to complete the main
  route or change the three-life rule.
- Relics persist through ordinary recovery while that run remains active. They
  reset on a new run after banking/Game Over; pause, reload, scheme changes and
  account operations do not reroll offers or reset a damaged run. Keep account
  scopes isolated; changing accounts must never attach that run to a new owner.
- Give each offer a stable identity and fixed choices derived from a versioned
  relic pool and seed, independent of cosmetic randomness. Persist the selection
  once; reconnect/reload/revisited checkpoints cannot duplicate or reroll it.
  The future result contract records relic IDs/effect versions and control-layout
  history alongside course/generator/physics/scoring versions and mode. This is a
  planning requirement, not an implemented save-schema extension or active-run
  cross-device handoff.
- Add no new currency or purchases. Retain existing earned bounty/unlocks under
  their versioned rules. Prefer future cosmetics and unlocked options over
  permanent base-stat increases initially; the exact persistent reward policy
  remains open. Do not automatically convert or sum legacy browser/account totals.

Both control schemes use the same agreed physics, relic pool/effects, life rules
and rewards. Skill/Surge actions remain explicit between CARVE holds and portals
remain opt-in. Preserve fixed gesture neutral, visible aim/charge, release aim
captured before steering clears, and safe cancellation/scheme switching. Equivalent
rules are not evidence of equal difficulty; legacy and assisted/build categories
must not be silently pooled into a trusted leaderboard.

#### Future evidence and source boundaries

Use isolated synthetic profiles/builds for reachability, manual rescue versus
fall classification, one-life damage, safe offer/skip/resume, seeded offer
reconstruction, no duplicate rewards, saved relics after restart, terminal-run
non-resurrection, account switching and both control schemes/handedness layouts.
Keep the two reserved Stage E profiles, installed builds, earlier human saves and
unfinished retention branch/scripts untouched. Existing Stage E observations stay
about their actual First Ascent builds, not these future features.

Later player observation should record whether players see the shortcut risk,
notice recovery targets, understand their relic choice, change route/strategy and
voluntarily retry; also record frustration and perceived unfairness. Compare
matching content with/without relic offers so height/recovery and relic effects
can be assessed separately. No test here has established retention, enjoyment,
competitive fairness, physical one-thumb comfort or commercial demand.

Research informs the design; it does not demonstrate CARVE outcomes. References:
[Spelunky's developer description](https://spelunkyworld.com/whatis.html),
[Hades developer FAQ](https://www.supergiantgames.com/blog/hades-faq/), and the
contemporary [Only Up! gameplay review](https://www.gamereactor.eu/only-up-1284463/)
and [mechanics/critique](https://www.dexerto.com/reviews/only-up-review-2193932/).
The Only Up! assessment used documented gameplay/reviews, not hands-on play in
this task. Borrow the design lessons with original CARVE content and presentation.

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

Next planning action follows the combined roadmap above: agree a minimal
movement/life/clock contract and opening route, while reconciling save/result
version IDs for later parity. No new gameplay implementation, runtime merge or
live data connection is authorized by this planning consolidation.

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

## Ascent variety implementation trial — 2026-10-30

The user subsequently authorized a new branch to try the combined plan.
`codex/ascent-variety-trial` starts from `6275d43` on the unmerged one-thumb
branch (PR #9). This authorization covers the web baseline experiment and its
preview only. It does not authorize a production merge, engine migration,
relic system, shared backend, native implementation or store handoff activation.
The earlier planning-only statements still apply to those remaining stages.

### First playable slice

Rows 0–29 form five authored sections before the existing endless generator:
Launch Garden, Wind Gap, The Fork, Second Chance and Observatory. Each has one
section hint, a broad resting ledge and a named landmark. The final landmark is
around 700 m; the proposed three-minute pace remains a hypothesis, not a measured
new-player completion time. There is no countdown or terminal roof.

Wind Gap moves the two main columns to x=20/640. Deliberate steering reaches the
opposite target with good releases; an identical neutral touch release falls
short. A central rail at its checkpoint provides a viable recovery departure.
The keyboard wall-lift base is 760 for this trial (previously 560); touch remains
840/420. Keyboard wall riding, slow motion and other existing input differences
remain. These are trial values, not an agreed cross-platform physics contract.

The Fork has an optional violet spring at x=700, row 13, with an eight-bounty
shard. Landing launches upward/left toward a higher main wall, with a release
and fresh catch required after departure. The row-16 wall is offset to leave a
clear trajectory. The ordinary route requires neither the shortcut nor a skill.
Second Chance has a marked lower grip at row 20. A deliberate descending manual
catch can save a miss without losing a life or awarding extra bounty. Rescue
count is descriptive, not a repeatable reward. Poles are absent from rows 6–29
to prevent an unhelpful repeated pendulum catch; later procedural poles remain.

The phone camera shows a wider lane for Wind Gap and The Fork, keeping both
crossing walls and the shortcut pad visible. Landmark labels and distant
silhouettes give location/height cues. The HUD shows one section destination or,
while falling, remaining distance to the fall boundary. Existing opt-in rifts
and all three skills remain available; no new minigames or relic offers are added.

### Recovery and data boundaries

Life loss now uses `max(startY - 200, checkpointY - 600, fallAnchor - 1000)` in
world units, independent of camera position and viewport size. `fallAnchor` is
the highest y since the latest actual respawn or intentional warp. Those events
reset the anchor, preserving the historical peak. Challenge still loses exactly
one life per qualifying fall/spike incident; Practice remains unlimited.

The isolated profile key is `carve.variety.profile.v1`, active/terminal run key
`carve.variety.run.v1`, and course revision is 3. Saves include anchor and rescue
count; records include `course: variety-v1` plus control-layout history. Existing
released and one-thumb preview wallets, runs and records are not imported or
overwritten. No cloud synchronization is claimed. Preview host changes still
have separate browser origins. Mobile app download/deep-link prompts stay disabled.

### Next review steps

1. Play the baseline on the branch preview, including both routes and deliberate
   misses. Ask where repetition or confusion begins, whether the shortcut and
   rescue target are noticed, and whether the player voluntarily retries.
2. Tune section geometry, readability and pacing from those observations. Verify
   physical iOS/Android comfort, lifecycle, safe areas, audio and performance;
   browser viewport and pointer tests do not establish physical-device behavior.
3. Define six bounded passive relics, three-choice offers and a three-slot cap.
   Compare the same route without/with relic offers only after separate approval.
4. Assemble validated sections into seeded endless sequences, then evaluate the
   shared runtime and versioned web/native progress contract. Hosted accounts,
   score trust, consented imports and store handoff are separate later milestones.

### Trial verification

Full `npm run build` passes on local Node 26. The 17 new checks cover authored
section reconstruction/bounds, a steered good-release crossing versus a neutral
miss, actual spring landing and upper-wall catch, eight-bounty deduplication,
manual rescue versus one-life loss, camera-independent boundaries, intentional
warp recovery, HUD cues, isolated/versioned saves and fresh input after springs.
Keyboard good-release input traverses all five sections and reaches 1,000 m
without a perfect or skill, retaining three lives. Existing pointer-only good
and perfect routes also reach 1,000 m with all three lives. The keyboard endurance
route continues to roughly 10 km with bounded geometry/save size; both outer
routes pass the existing eight-seed checks. These are simulated results.

Manual browser testing reached 192 m during the one-thumb crossing review and
confirmed paused reload recovery. It exposed the offscreen target and overlapping
landmark label, both corrected. This is not a completed manual five-section run
or a physical-device test. The baseline is ready for branch review and further
human playtesting, not established fun/retention evidence.

## Manual touch review and second trial revision — 2026-10-30

A UI-only browser run traversed all five opening sections, reached **717 m** by
ordinary movement after earlier skill assistance, then used Skyhook to continue
to **784 m / 7,050 points / 82.3 active seconds**. It used One thumb followed by
Two thumbs, two Rocket Pulse activations and three Skyhook activations, with
inspection pauses. No keyboard gameplay, player-state injection or autoplay was
used. The banked Practice record lists both touch layouts and zero rift clears.
This is browser pointer testing, not physical multi-touch or a no-skill run.

The marked rescue wall was approached while descending with separate touch
steering, then a fresh CARVE contact launched the player back upward. A separate
three-life run physically landed on the shortcut but hit an overhang and fell;
the miss cost exactly one life and restored the checkpoint with two remaining.
That exposed a geometry problem missed by the original ideal-position test.

The second trial revision repairs the spring corridor: the pad is x=740–880,
its shard is at x=810, row 15's main wall moves to x=300, and row 16's to x=740.
The right outer pair shifts together by 90 units across rows 11–17 to preserve
its alternating rhythm and clear the spring's overhead exit. The spring is a
landing-only surface; held CARVE cannot latch its edge and interrupt the boost.
This keeps the normal good-release route and both outer routes traversable.

Skyhook now selects main/resting ledges and excludes springboards, rather than
silently putting players on an optional spring or exposed outer ledge. A missing
safe target leaves the cooldown untouched. Second Chance and Observatory use a
wider, centered main-lane view; an actual outer overshoot still follows the player.
A falling rescue direction/distance cue remains available outside the centered
view. The marked wall has its own rescue notice. The two-thumb rift action moves
beside the lower controls instead of covering the next landmark. Passing the
opening remains acknowledged when returning below the final landmark.

Geometry revision is now **course 4**, with records marked **variety-v2** (Trial 2
in Records). Profile/run keys remain unchanged. Older trial records and wallet
are retained, with trial labels; local bests include both unverified trial
revisions. A course-3 active snapshot is retained but not resumed into mismatched
geometry: the menu explains the revision and waits for an explicit Begin action
before replacing it. Released-game storage remains separate and untouched.

Full build passes, including all prior regression/recovery/challenge/input,
endurance, outer-route, cache and disabled-handoff checks. There are 23 variety
checks; the expanded physical spring test covers eight fixed seeds, five landing
positions spanning the pad and three incoming horizontal speeds (120 cases),
requiring a fresh upper main-wall catch without losing a Challenge life. Added
checks cover safe Skyhook landings/refusal, late-section camera/overshoot/rescue
cues, completion after reload and the explicit older-course restart boundary.
