# CARVE — a flow climber

> **Endless Expedition**
>
> `npm start` opens the six-column endless game. Production and previews serve it
> at `/`; the unchanged original game is available at `/classic/`. Bounty,
> unlockable movement skills, two optional secret-room minigames, four regions,
> wind/lift lanes, springboards and named local highest-climb records are included.
> See [the design and verification notes](docs/expedition.md).
> Production release was approved on 2026-10-30. The mobile app download prompt
> remains disabled, excluded from deployment, and separate from the mobile repository.

A momentum-based vertical climber where the core mechanic is a reinterpreted
"drift": instead of redirecting a kart through a slide, you latch onto surfaces,
ride/charge them, and release at a timed sweet-spot to fling yourself higher.
Clean releases build **Flow**, which speeds up and warms the world and multiplies
score. Miss the window and you slip.

Single file, zero dependencies, plain Canvas 2D + Web Audio.

## Run

Open the game directly — no build step:

```bash
open src/expedition.html   # endless game, opens in default browser
open src/carve.html        # original summit course
```

Or serve the game at `http://127.0.0.1:5173` using Node.js 24 or 26:

```bash
npm start                  # built-in Node HTTP server; no install/download needed
```

## Controls

Expedition also uses **C / L / Q** for the equipped skill, **E** for a nearby
secret rift, and **P / Esc** to pause. The original course retains its original keys.

| Action            | Keys                    |
|-------------------|-------------------------|
| Move / steer      | `A` `D` or `←` `→`      |
| Jump / wall-jump  | `Space` / `W` / `↑`     |
| Carve (hold)      | `Z` / `J` / `Shift`           |
| Surge (spend Flow)| `X` or `K`                     |
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
carve-game/
├── src/
│   └── carve.html       # the entire game (single self-contained file)
├── scripts/            # dependency-free local server + static build
├── tests/
│   ├── regression.mjs   # momentum, Flow, slips, input, checkpoints, UI lifecycle
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
npm start       # serve the game for local play
npm run build   # checks + tests, then publishable files in dist/
```

The game ships as one HTML file for zero-friction sharing. The `tests/` harness
extracts the `<script>` block and runs the pure simulation under stubbed
browser APIs (DOM, canvas 2d, Web Audio, rAF) in Node — so physics, level
reachability, and end-to-end completability stay verifiable without a browser.

The smoke test checks a vertical spacing bound; it does not prove every route is
reachable. The bot must enter the actual goal to pass (near-top is a failure).
Neither replaces browser playtesting. Stress inputs use a fixed seed.

## Architecture (single file)

- Fixed-timestep simulation: `1/120s` accumulator, decoupled from render.
- World is **y-up**; the render transform flips Y and applies devicePixelRatio.
- All tuning lives in the `T` constants object at the top of the `<script>`.
- Player is an explicit state machine: `GROUND / AIR / CARVE / POLE` (stun is a cooldown).
- Per-axis AABB collision against rectangular blocks tagged
  `rock | plain | rail | spike | check | goal`.
- Subsystems: `Input`, `Sfx` (synthesized Web Audio), `Particles` (pooled),
  `Cam` (smoothed follow + speed-zoom + shake), `Level` (procedural builder),
  `Player`, `Game` (loop / sim / render / UI).
- Time dilates to `0.78x` during a carve so the gold window stays readable.

See [`docs/mechanics.md`](docs/mechanics.md) to retune, and
[`docs/design.md`](docs/design.md) for the rationale.

## Deployment and monitoring

The selected Grip logo master and committed browser/home-screen/social exports
live in `assets/branding/`. Export instructions and provenance are documented
there. The build publishes only the optimized exports, favicon and web manifest.
Logo images are external assets; core gameplay still works when opening the source
HTML directly, with the repository's relative asset paths intact.

Vercel builds `dist/` with `npm run build`; failures stop the deployment. The build
extracts the source CSS and game script into content-hashed files under
`/assets/cache/`, alongside hashed logos and icons. Only those immutable files get
one-year browser caching. HTML, the manifest, root favicon and stable branding
aliases revalidate, so new releases and logo changes remain discoverable. The
source HTML still runs directly without a build. Repository files are not published.
`/src/carve.html` permanently redirects to `/`. Branch pushes create previews;
production remains on `main`. CI runs on Node 24 and 26 with pinned Actions.
Node 24 is the Vercel build runtime; Canvas and Web Audio are browser APIs with
no application package version to upgrade.

The build adds Vercel-hosted Web Analytics and Speed Insights scripts. The source
HTML remains fully offline playable and the local server does not send telemetry.
Dashboard configuration and deployed script/event delivery must both be verified;
loading a script alone does not establish real visitor metrics. No custom gameplay
events or paid Plus features are enabled. Vercel custom events require Pro or
Enterprise, so the free setup cannot measure tutorial or summit completion. A
separate analytics service would need to be chosen and configured for that. See
`docs/verification.md` for evidence.

Best scores and the sound preference are saved locally in the player's browser.
An active run is saved in per-tab session storage once per second and on pause,
page hiding and reload. Refreshing returns to a paused run with position, momentum,
time, score, checkpoints, tutorial progress and already claimed rewards intact.
Resume continues that run; Restart asks for confirmation. A restored wall/pole grip
waits for a fresh CARVE hold. Separate tabs have separate runs. Closing a tab,
clearing site data or changing origins is not a cloud save; abrupt browser/process
termination can lose up to the last autosave interval. Saves from incompatible
course/physics versions or corrupt storage are ignored without auto-starting a run.
Blocked storage does not prevent play; the browser's leave-page warning is used
when recovery cannot be saved. Browsers may suppress that warning, especially on
mobile, so preservation cannot be guaranteed when tab storage is unavailable.
Focus loss pauses the game. The menu can
turn on touch controls on hybrid devices; narrow screens fit the climbing lane.

## License

MIT — see [`LICENSE`](LICENSE).
