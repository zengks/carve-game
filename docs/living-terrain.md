# Living Terrain preview

2026-11-02. Branch `codex/living-platforms`, entry `/?terrain=1`.
Built from released `main`, keeping shared-storage/auth/commerce PRs separate.
The release continuation below makes Terrain the production default at `/`.
Source/testing previews still opt in with `?terrain=1`. Public URL parameters
cannot disable Terrain or enable testing Practice.
Mobile download/deep-link prompts remain disabled. No assets were copied from
other games, no new dependency/service, and no payments were added.

## Reference research and design

Official [Tropical Freeze world descriptions](https://www.nintendo.com/en-gb/games/oms/dkc-tf/world.html)
show biome-specific movement/hazards; [Astro Bot's abilities](https://www.playstation.com/en-us/games/astro-bot/)
show encounters built around movement tools. [Celeste](https://www.celestegame.com/)
emphasizes authored climbing. Our design inference: alternate readable movement
problems, recovery and optional mastery, with silhouettes that communicate an
object's role. These are references, not assets/templates or evidence of CARVE
retention. All new art is original Canvas path code.

## Visual and mechanical contract

| Element | Change | Contact rule |
| --- | --- | --- |
| Root-covered garden monuments | Presentation | Existing solid top and vertical grip frame; inset vegetation is scenery |
| Wind-kite structures | Presentation | Same solid frame; sail and ropes are scenery |
| Crystal outcrops | Presentation | Same frame; crystal facets have no additional collision |
| Spiral cisterns | Presentation | Same frame; rings are scenery, not holes |
| Observatory drums | Presentation | Same frame; gear/clock ornamentation is scenery |
| Root bridges and suspended sail decks | Presentation | Existing one-way rails; glowing flat edge marks actual landing surface |
| Mushroom spring caps | Presentation | Existing automatic spring/shortcut rules, labelled upward or leftward boost |
| Camp gondolas | Presentation | Existing stable broad rest rails and camp action; ropes are scenery |
| Cloud ferry | New mechanic | Optional one-way 150-unit deck, x = homeX + sin(time × 0.65 + row × 1.7) × 70; carries standing and rail-charging players; no momentum bonus |
| Cracked shelf | New mechanic | Optional one-way 155-unit deck; first landing/catch starts 1.8 active simulation seconds, then absent for 5 seconds; repeats after regrowth |
| Crystal bell | New mechanic | First PERFECT wall catch or top launch on marked wall gives +12 Flow and restores 4 recharge points; never bounty/lives/height; GOOD releases still work |

Stable original walls, checkpoints, camps, rescue wall and shortcuts retain their
geometry and semantics. New ferry rows are `row % 6 == 1`, ID `r:row:3`;
cracked shelves are `row % 6 == 4`, ID `r:row:3`; bell walls are the main wall at
`row % 6 == 2`. They repeat beyond the opening. No new mandatory gesture, skill,
perfect release or paid upgrade. One-thumb manual remains the mobile default;
two-thumb/keyboard stay available. Three-life incidents and eased return camera
remain unchanged. The main course still spans five opening sections.

The glowing flat landing edges and dashed vertical grip markers remain the collision authority. Shaped
bodies/ornaments are deliberately distinct from these grip surfaces. Shelves
show an amber countdown bar; absent shelves neither collide nor accept catches.
Collapse clears standing/charged/latched state and requires fresh input. The
ferry explicitly moves a rail attachment in world space. The one-thumb gesture
neutral remains its original screen-space press position; deck direction or speed
adds no release impulse and never changes final steering. The ferry uses climb-clock time, so pause, backgrounding and reading freeze it.
Reload restores phase and rider offset. Existing camera follows the player with
no mechanic-driven zoom or snap.

Menu copy, nearby coach cues, object labels, and Pause → Journal explain the
objects. The Journal pauses play and holds a complete readable field guide.
Warnings/rewards remain in the journal; they do not open interrupting modals.

## Versioning and preservation

Numeric course IDs 8 (terrain), 9 (terrain + relic comparison). Course/rules
records are `terrain-v1` / `terrain-relic-v1` and `terrain-v1`, respectively.
Physics/charge constants are unchanged, but added surfaces/recharge mean outcome
and generator compatibility differs from Flow. No shared ranking/wallet mapping
is claimed; mobile First Ascent remains independent.

Profiles: `carve.terrain.profile.v1` / `carve.terrain-relic.profile.v1`.
Testing runs: `carve.terrain.run.v1` / `carve.terrain-relic.run.v1`.
Public runs: `carve.public-terrain.run.v1` / `carve.public-terrain-relic.run.v1`.
Controls/audio: `carve.terrain.controls.v1` / `carve.terrain.audio.v1`.
No automatic previous-profile import or writes to earlier Flow keys. Public
returning players explicitly choose Carry or Start separate; see release notes below.

Run schema adds a versioned `terrain.cracks` list of `{id, at}` climb-clock
contact times, bounded to 64 and checked for duplicate/invalid surface IDs,
nonfinite/future/expired timestamps. Active history survives streaming/reload;
expired entries retire after regrowth. Bell claims use collected ID `t:row:10`,
pruned under the existing finite reward horizon. Reload never grants the same
bell twice; claims pruned below the reward horizon remain ineligible by row. Finished results retain the distinct numeric course ID.

## Verification and limits

`tests/terrain.mjs` covers released-geometry preservation, namespace/provenance
isolation, public-course selection, 60/120 Hz ferry carry, one-way collision,
reload/paused phase, crumble timings/restore/invalid input/charge detachment,
bell idempotence, three-life Game Over, themed rendering and six seeded
one-thumb scripted climbs to 1,000 m with GOOD/PERFECT releases and no skills.
These establish scripted reachability, not manual completion or fun.

Browser checks used a new ordinary gameplay tab on local port 5198 and a separate
local-only QA fixture on port 5199. The fixture chooses positions, so its upper
heights and bounty are synthetic evidence, not a manual completion. No fixture
controls are committed or deployed. Ordinary opening one-thumb UI play reached
31 m; it was not a full playthrough.

At 390 × 844, browser input verified a ferry ride/one-thumb launch, an amber shelf
warning/collapse followed by one fall and 2 remaining lives, a perfect bell top
launch with a visible reward, pause and reload recovery. At 844 × 390, two-thumb
CARVE launched from a ferry and layout controls stayed accessible. At 1280 × 720,
all five theme silhouettes and clear landing/grip markers
were inspected. These are pointer-driven browser checks, not physical touch.

Mobile reviewed the rule boundaries read-only: no blocking planning mismatch;
it correctly flagged moving-world attachment versus screen-space aiming and
bell claim pruning. Regression coverage now includes ferry reversal/final aim,
GOOD-before-PERFECT, top launches in both touch layouts, actual capped reward
receipts and an ineligible pruned bell after reload. There are 22 new terrain
checks. The full local Node 26 build passed; final CI/preview status is recorded
in the PR. Physical-device touch comfort, full manual course completion and
player retention remain unqualified. Native geometry still needs its own
physics/OS-input qualification; no native port is implied by this preview.


Code checkpoint `490506bd6c603e7d470ba99c2a0d67b0a64b7853` passed both
push/PR Node 24 and 26 matrices. Vercel deployment
`dpl_CcmR66Uegi2VVKso2Qn56TgztcSx` is Ready, Preview only:
[play Living Terrain](https://carve-game-7gu5lracw-zengksoutlookcoms-projects.vercel.app/?terrain=1).
The deployed page rendered the new art and field guide on desktop. Its portrait
one-thumb opening reached 25 m, then pause/reload retained 25 m / 2 bounty / 4.2 s
and three lives with no browser console errors. This is an opening smoke check,
not a full manual climb. The dedicated local fixture separately covers upper
scenes and the new mechanic interactions described above.

Draft [PR22](https://github.com/zengks/carve-game/pull/22) remains unmerged.
Released main stays `aa5911a9a71e2e4d2b4cfa86a17f3a4736c2980d`.
Native reviewed the contract; no native game, simulator, shared storage, Stripe,
merchant/payout or mobile download prompt setting was changed.


## Production release continuation — 2026-11-02

The user authorized merge/deployment of platforms and avatars after passing checks.
Pre-release inspection found Terrain was still testing-only. Production now always
selects course 8 (or isolated relic comparison 9), new artwork and avatars at `/`.
Testing previews remain opt-in; query strings cannot turn off public Terrain or
turn on unlimited lives. Public copy no longer calls the course a preview.

A current Flow profile/run is the preferred previous-progress source; an earlier
Variety profile is used only when no Flow source exists. Confirming Carry copies
name, bounty, supported skills and avatar, with old scores/bests and active geometry
kept separate. Existing Terrain wallets and another tab's completed choice win;
wallets are never summed. Avatar/Workshop/Begin cannot bypass an unresolved import
choice. Failed saving retains the original and choice; separate temporary play
remains possible. Old Flow active snapshots cannot resume on the changed route,
and stay untouched in their original key with that limitation explained.

`tests/terrain-release.mjs` builds and executes the actual production JavaScript
artifact, covering default geometry/avatars/lives, query immunity, Flow-first
migration, no silent import/bypass, existing/stale wallets, blocked saving, old
active-run preservation, exact Terrain/appearance recovery and testing-save
isolation. Nine compiled production checks pass, alongside the full local Node
26 build and all prior suites. Browser inspection of this exact compiled build
at isolated local port 5197 confirms the flag-free new course, avatar selection,
new platforms, clean public labels and the Challenge-only picker.

Final CI, merge SHA and production verification are recorded in PR22. Prior
preview hashes/URLs above are historical evidence, not the current release URL.
