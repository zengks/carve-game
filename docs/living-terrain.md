# Living Terrain preview

2026-11-02. Branch `codex/living-platforms`, entry `/?terrain=1`.
Built from released `main`, keeping shared-storage/auth/commerce PRs separate.
Preview only: the flag requires the testing build. Production builds ignore it.
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
| Crystal bell | New mechanic | First PERFECT release on marked wall gives +12 Flow and restores 4 recharge points; never bounty/lives/height; GOOD releases still work |

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
ferry uses climb-clock time, so pause, backgrounding and reading freeze it.
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
Runs: `carve.terrain.run.v1` / `carve.terrain-relic.run.v1`.
Controls/audio: `carve.terrain.controls.v1` / `carve.terrain.audio.v1`.
No automatic previous-profile import or writes to released Flow keys.

Run schema adds a versioned `terrain.cracks` list of `{id, at}` climb-clock
contact times, bounded to 64 and checked for duplicate/invalid surface IDs,
nonfinite/future/expired timestamps. Active history survives streaming/reload;
expired entries retire after regrowth. Bell claims use collected ID `t:row:10`,
pruned under the existing finite reward horizon. Reload never grants the same
bell twice. Finished results retain the distinct numeric course ID.

## Verification and limits

`tests/terrain.mjs` covers released-geometry preservation, namespace/provenance
isolation, production flag rejection, 60/120 Hz ferry carry, one-way collision,
reload/paused phase, crumble timings/restore/invalid input/charge detachment,
bell idempotence, three-life Game Over, themed rendering and six seeded
one-thumb scripted climbs to 1,000 m with GOOD/PERFECT releases and no skills.
These establish scripted reachability, not manual completion or fun.

Browser visual/input findings and final preview verification will be recorded
below after inspection. Physical-device touch comfort and player retention
remain unqualified; native geometry needs its own physics/OS-input qualification.
