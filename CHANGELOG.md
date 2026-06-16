# Changelog

All notable changes to CARVE are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/);
this project adheres to [Semantic Versioning](https://semver.org/).

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
