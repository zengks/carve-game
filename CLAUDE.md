# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run check   # fast syntax gate — parse the <script> body only (no Node stubs needed)
npm test        # smoke.mjs (physics + 6000-step stress + reachability) then bot.mjs (end-to-end completability)
npm start       # serve at http://localhost:3000 for local play
npm run dev     # same but on port 5173
open src/carve.html   # open directly without a server (macOS)
```

Run a single test file:
```bash
node tests/smoke.mjs
node tests/bot.mjs
node tests/check-syntax.mjs
```

There is no build step. The game ships as a single self-contained HTML file.

## Architecture

The entire game lives in **`src/carve.html`** — one `<script>` block, no external dependencies, plain Canvas 2D + Web Audio. Everything is co-located intentionally (see `docs/design.md`).

### Key subsystems (all in the single script)

- **`T`** — constants object at the top of the script. All physics tuning values live here. Edit `T`, reload, done.
- **`Input`** — keyboard/touch state.
- **`Sfx`** — synthesized Web Audio (silently skipped in tests — `AudioContext` is not stubbed).
- **`Particles`** — pooled particle system.
- **`Cam`** — smoothed follow camera with speed-zoom and shake.
- **`Level`** — procedural level builder (`Level.build()`). Generates a zig-zag chimney of grip rungs. Layout constants are locals inside `build()`, not in `T`.
- **`Player`** — explicit state machine: `GROUND / AIR / CARVE / POLE / STUN`. Per-axis AABB collision against tagged blocks.
- **`Game`** — main loop, fixed-timestep sim at 1/120 s, render, UI.

### Coordinate system
World is **y-up** (`+vy` is upward, gravity subtracts from `vy`). The render transform flips Y and applies `devicePixelRatio`.

### Block types
`rock` (solid + grippable), `plain` (solid, no grip), `rail` (grippable top), `spike` (hazard), `check` (grippable + checkpoint), `goal`.

### Test harness
`tests/harness.mjs` extracts the `<script>` block from the HTML, installs minimal browser stubs (DOM, canvas 2D proxy, rAF, no AudioContext), and evals it in Node. This exposes `T`, `Level`, `Player`, `Game`, `Input` via `globalThis.__*` for the test files to drive.

`smoke.mjs` derives the reachability bound from the live `T` constants — if you tune `T.STEP` past what a non-perfect carve can clear, the test fails before anything ships.

## Tuning

After any change to `T` or `Level.build()`, run `npm test`. See `docs/mechanics.md` for the full constant reference.
