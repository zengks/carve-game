# Changelog

All notable changes to CARVE are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/);
this project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0] — 2026-10-28

- Preserve carve and surge momentum while steering; apply gradual excess-speed drag.
- Apply the documented Flow boost to steering acceleration and maximum speed.
- Penalize pole overholds instead of awarding them as normal releases.
- Separate HUD and toolbar; prevent phone control overlap and fit the climbing lane.
- Keep off-lane launches visible on phones and snap the camera to respawns.
- Use pointer capture and cancellation, clear stale inputs, pause on focus loss,
  stop simulation at victory, and reset transient state on restart.
- Add a sound toggle, locally saved best scores, and a touch-control menu toggle.
- Cache HUD nodes and update changed values once per rendered frame.
- Add deterministic regression checks and require actual bot victory.
- Update CI Actions, test Node 24/26, and replace unpinned `npx serve` with a local
  Node server. Build only public game files and add Vercel monitoring scripts.

## [1.0.0] — 2025

### Added
- Core **carve** mechanic: latch a grippable face, ride/charge it, release in the
  gold window to launch. Quality tiers: weak / good / perfect / late.
- **Flow** chain meter (0–100, six tiers) driving speed, score multiplier, and a
  palette that warms from cyan toward magenta as you climb.
- **Surge** — spends Flow for a directional burst to clear gaps.
- Surface types: wall carve, rail grind (top face), and pendulum **pole swing**.
- Safe fallback path: wall-slide + wall-jump for players not chaining carves.
- Procedural zig-zag chimney level with checkpoints, catch rails, spike strips,
  an optional pole flourish, a final tower sprint, and a generous summit zone.
- Synthesized Web Audio SFX (no asset files), pooled particles, smoothed camera
  with speed-zoom and shake, time dilation (0.78x) during a carve for readability.
- Keyboard + touch controls; responsive down to mobile.

### Engineering
- Fixed-timestep simulation (1/120s accumulator), decoupled from render.
- y-up world space; render transform flips Y and applies devicePixelRatio.
- Explicit player state machine: GROUND / AIR / CARVE / POLE / STUN.
- All tuning centralized in the `T` constants object.

### Fixed (pre-release validation)
- Double-`releaseCarve` null crash when riding off a wall top while releasing.
- Unreachable opening rung; reworked into a jump-reachable first rung.
- Loosened carve latch reach (26→40px) and made grip spacing uniform so a
  non-perfect carve always clears the next rung (no soft-locks).

### Gameplay improvements — 2026-10-29
- Add checkpoint save feedback, one-way bridges and contextual opening coaching.
- Prevent repeated-surface score/Flow farming and separate revised personal bests.
- Vary middle/upper route spacing and add an optional swing shortcut.
- Cover new rules with regression tests and retain full automated completion.

### Checkpoint recovery — 2026-10-29
- Save gold checkpoints when gripped as well as landed on, avoiding start resets
  after long continuous climbs. Cover grip, respawn and checkpoint ordering.
- Complete a full browser keyboard playthrough with pauses for inspection.

### Mobile and tablet usability — 2026-10-29
- Improve landscape framing, touch-specific coaching and tablet target spacing.
- Respect safe-area insets and allow touch scrolling on menu overlays.
- Clear pointer ownership across pauses to prevent stuck gestures.
- Add simultaneous input, pause, coaching and camera regressions.
