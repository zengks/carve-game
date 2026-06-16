# CARVE — a flow climber

A momentum-based vertical climber where the core mechanic is a reinterpreted
"drift": instead of redirecting a kart through a slide, you latch onto surfaces,
ride/charge them, and release at a timed sweet-spot to fling yourself higher.
Clean releases build **Flow**, which speeds up and warms the world and multiplies
score. Miss the window and you slip.

Single file, zero dependencies, plain Canvas 2D + Web Audio.

## Run

Open the game directly — no build step:

```bash
open src/carve.html        # macOS, opens in default browser
```

Or serve the folder (the root `index.html` redirects to the game):

```bash
npm start                  # npx serve .
```

## Controls

| Action            | Keys                    |
|-------------------|-------------------------|
| Move / steer      | `A` `D` or `←` `→`      |
| Jump / wall-jump  | `Space` / `W` / `↑`     |
| Carve (hold)      | `J` / `Shift`           |
| Surge (spend Flow)| `K`                     |
| Pause             | `P` / `Esc`             |

Touch controls appear automatically on coarse-pointer devices.

## Mechanics

- **Carve** — hold to latch the nearest grippable face. Walls climb upward, rails
  grind along the top, poles swing as a pendulum. A charge ring fills; release
  inside the gold window for a `PERFECT` (1.7x launch), too early for a weak pop,
  or past the slip threshold to lose grip and fall.
- **Flow** — the chain meter. Perfects/goods raise it; slips and ground-walking
  drain it. Higher tiers warm the palette (cyan → magenta), raise speed, and
  multiply score.
- **Surge** — spends Flow for a directional burst to clear gaps.
- **Two paths up** — safe wall-jumps (slow, low score) or carve-chains (fast,
  high Flow). Checkpoints and catch rails make misses recoverable.

## Project structure

```
carve game/
├── index.html          # redirect entry point -> src/carve.html
├── src/
│   └── carve.html       # the entire game (single self-contained file)
├── tests/
│   ├── harness.mjs      # extracts the script + headless browser stubs
│   ├── check-syntax.mjs # parses the script body (fast syntax gate)
│   ├── smoke.mjs        # physics states + 6000-step stress + reachability
│   └── bot.mjs          # greedy auto-player; proves the level is completable
├── docs/
│   ├── design.md        # why the game is shaped this way
│   └── mechanics.md     # full tunable reference for every constant
├── package.json
├── CHANGELOG.md
├── LICENSE
└── .gitignore
```

## Development

```bash
npm run check   # syntax-check the game's script body
npm test        # smoke (physics + stress + reachability invariant) then bot (end-to-end)
npm start       # serve the folder for local play
```

The game ships as one HTML file for zero-friction sharing. The `tests/` harness
extracts the `<script>` block and runs the pure simulation under stubbed
browser APIs (DOM, canvas 2d, Web Audio, rAF) in Node — so physics, level
reachability, and end-to-end completability stay verifiable without a browser.

`smoke.mjs` derives the reachability bound from the current `T` constants, so if
you retune the feel into an unwinnable level, `npm test` fails before you ship.

## Architecture (single file)

- Fixed-timestep simulation: `1/120s` accumulator, decoupled from render.
- World is **y-up**; the render transform flips Y and applies devicePixelRatio.
- All tuning lives in the `T` constants object at the top of the `<script>`.
- Player is an explicit state machine: `GROUND / AIR / CARVE / POLE / STUN`.
- Per-axis AABB collision against rectangular blocks tagged
  `rock | plain | rail | spike | check | goal`.
- Subsystems: `Input`, `Sfx` (synthesized Web Audio), `Particles` (pooled),
  `Cam` (smoothed follow + speed-zoom + shake), `Level` (procedural builder),
  `Player`, `Game` (loop / sim / render / UI).
- Time dilates to `0.78x` during a carve so the gold window stays readable.

See [`docs/mechanics.md`](docs/mechanics.md) to retune, and
[`docs/design.md`](docs/design.md) for the rationale.

## License

MIT — see [`LICENSE`](LICENSE).
