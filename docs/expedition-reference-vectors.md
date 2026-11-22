# Expedition reference vectors

The source is the production course at web commit `c4dffb6`. The vectors run
the released JavaScript through the existing headless browser stubs. They can
be used from either repository without a browser, a device, or player data.

Run `node tests/expedition-reference.mjs` to check the fixture against the
source. Run it with `--write` to regenerate the JSON after an intentional
revision. Keep the fixture out of production exports.

`shared/fixtures/expedition-reference-v1.json` contains:

- Eight layout windows at seeds 1, 44, and 76, from spawn past 23,000 m. Each
  window gives the seed, world Y, active game time, generated row and complete
  block, pole, token, portal, zone and landmark arrays. Ferry `x` is evaluated
  at the given time. `homeX` is the static origin. The generator also checks
  that returning from nearby and far higher windows reconstructs the same IDs
  and geometry.
- Eight fixed-step traces for neutral ground release and a fresh air hold, ground
  launch and steering, GOOD and PERFECT
  catches and releases, overhold expiry, a checkpoint fall, the Courier stake
  and Rocket Pulse, and an input-only climb from ground to Bellkeeper eligibility.
  The wall, fall and camp cases start from deliberately placed states. The
  ground-start trace uses only pad input and stops on a solid ledge at 397 m.
- Four frame-clock vectors for 60 and 120 Hz display cadence. Physics advances
  in 120 Hz ticks. The browser accumulates 78% of real elapsed time while
  gripping a wall or pole. Fresh ground charge uses normal time.

For each trace, load `initial` with the given seed and use the recorded actions
before the next physics tick. Event triples are `[tick, name, optional value]`.
`down` assigns a fresh pointer at X=200, `move` records horizontal pixels relative
to that origin, and `up` uses the last aim. `camp_open`, `contract`, `camp_close`
and `pulse` are semantic actions. `return` advances the transition clock by the
given seconds without stepping physics. `after_actions` is the count of events
already applied when the sample was taken, including events at the same tick.
Data uses the browser's y-up coordinates. Compare integer fields, IDs, states
and Booleans exactly, and allow for floating point differences on decimal fields.

These are simulation comparisons. The shared Bellkeeper outcome fixture covers
settlement semantics. One-thumb delivery, reload through the app lifecycle,
boss completion and return still need device-level tests on the native build.

`shared/fixtures/expedition-rifts-v1.json` records the released first portal
(`v:0`, seed 1). It covers free briefing dismissal and reopening, two Pendulum
seals, a Pendulum miss, all four Echo glyphs, and cold restarts mid-game and at
the result. Samples include the unadvanced climb clock, wallet, lives, travel,
and the confirmation transition. Run `node tests/expedition-rift-reference.mjs`
to verify it, or add `--write` to regenerate it.
