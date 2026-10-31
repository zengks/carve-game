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

## Verification

`npm run build` passes with 20 added relic checks plus all existing suites. Tests
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
