# CARVE — mechanics & tuning reference

Every value that shapes the feel lives in the `T` constants object at the top of
the `<script>` in [`../src/expedition.html`](../src/expedition.html). World units are
pixels, time is seconds, and the world is **y-up** (so `+vy` is upward and gravity
subtracts from `vy`). Edit `T`, reload, retune — nothing else needs to change.

## Physics

| Key               | Default | Meaning |
|-------------------|---------|---------|
| `GRAVITY`         | 1850    | Downward accel applied to `vy` each second while airborne. |
| `MOVE_ACCEL`      | 3200    | Horizontal accel from input while grounded. |
| `AIR_ACCEL`       | 2200    | Horizontal accel from input while airborne. |
| `MAX_RUN`         | 360     | Horizontal speed cap from input. |
| `GROUND_FRICTION` | 3000    | Decel toward 0 when grounded with no input. |
| `AIR_DRAG`        | 0.6     | Decay of launch velocity above the steering cap. |
| `FLOW_SPEED`     | 0.05    | Adds 5% steering speed and acceleration per Flow tier. |
| `JUMP_V`          | 700     | Upward velocity of a ground jump. |
| `COYOTE`          | 0.10    | Grace window (s) to still jump just after leaving ground. |
| `JUMP_BUFFER`     | 0.10    | Window (s) a pressed jump is remembered before landing. |

## Wall interaction (the safe path)

| Key              | Default | Meaning |
|------------------|---------|---------|
| `WALL_SLIDE_MAX` | 220     | Max downward slide speed while hugging a wall. |
| `WALLJUMP_OUT`   | 430     | Horizontal push away from the wall on a wall-jump. |
| `WALLJUMP_UP`    | 700     | Upward velocity of a wall-jump. |

## Carve (the core mechanic)

| Key               | Default | Meaning |
|-------------------|---------|---------|
| `CARVE_REACH`     | 40      | Max distance (px) to a face to latch onto it. |
| `CARVE_CLIMB`     | 300     | Upward slide speed while carving a wall (ramps with charge). |
| `CHARGE_TIME`     | 0.50    | Seconds for the charge ring to fill to 1.0. |
| `ZONE_GOOD`       | 0.34    | Charge at/above this is at least a *good* release. |
| `ZONE_PERFECT_LO` | 0.62    | Lower edge of the gold (perfect) window. |
| `ZONE_PERFECT_HI` | 0.92    | Upper edge of the gold window. |
| `SLIP_AT`         | 1.12    | Charge beyond this loses grip (slip + fall). |
| `WALL_POP`        | 380     | Sideways launch off a wall face. |
| `WALL_LIFT_BASE`  | 560     | Base upward launch off a wall. |
| `WALL_LIFT_GAIN`  | 540     | Extra upward launch, scaled by `charge * qualityMul`. |
| `RAIL_FWD`        | 470     | Forward launch off a rail (top face). |
| `RAIL_LIFT_BASE`  | 480     | Base upward launch off a rail. |
| `RAIL_LIFT_GAIN`  | 460     | Extra upward launch off a rail, scaled by charge/quality. |
| `STEER`           | 230     | How much A/D bends the launch at the moment of release. |
| `TIME_DILATION`   | 0.78    | Sim speed multiplier while carving (readability slow-mo). |

**Quality tiers** (from `Player.quality(charge)`):

| Band                                  | Tier    | `mul` | flow |
|---------------------------------------|---------|-------|------|
| `charge < ZONE_GOOD`                  | weak    | 0.55  | `FLOW_WEAK` |
| `ZONE_GOOD .. ZONE_PERFECT_LO`        | good    | 1.0   | `FLOW_GOOD` |
| `ZONE_PERFECT_LO .. ZONE_PERFECT_HI`  | perfect | 1.7   | `FLOW_PERFECT` |
| `ZONE_PERFECT_HI .. SLIP_AT`          | late    | 0.85  | `FLOW_GOOD - 3` |

Wall launch: `vx = ±WALL_POP + steer`, `vy = WALL_LIFT_BASE + charge*mul*WALL_LIFT_GAIN`.
Rail launch: `vx = dir*RAIL_FWD + steer`, `vy = RAIL_LIFT_BASE + charge*mul*RAIL_LIFT_GAIN`.

## Pole swing

| Key         | Default | Meaning |
|-------------|---------|---------|
| `POLE_GRAB` | 70      | Grab radius (px) around a pole. |
| `POLE_PUMP` | 2.6     | Angular accel added while Carve is held (pumping the swing). |
| `POLE_FLING`| 1.18    | Tangential speed multiplier applied on release. |

Modeled as a gravity pendulum: `angVel += -GRAVITY*cos(ang)/r * dt`; release flings
along the tangent with speed `|angVel| * r * POLE_FLING * (0.7 + 0.5*mul)`.

## Flow & scoring

| Key            | Default | Meaning |
|----------------|---------|---------|
| `FLOW_MAX`     | 100     | Cap. Tier = `floor(flow / 20)`, clamped 0..5. |
| `FLOW_PERFECT` | 15      | Flow gained on a perfect carve. |
| `FLOW_GOOD`    | 8       | Flow gained on a good carve. |
| `FLOW_WEAK`    | 3       | Flow gained on a weak carve. |
| `FLOW_SLIP`    | -26     | Flow change on a slip. |
| `FLOW_DECAY`   | 5       | Passive drain per second. |
| `FLOW_GROUND`  | 22      | Extra drain per second while running on the ground. |
| `SURGE_COST`   | 26      | Flow spent per surge. |
| `SURGE_V`      | 560     | Surge burst velocity. |
| `SURGE_CD`     | 0.7     | Surge cooldown (s). |

**Score per carve:** `round((40 + combo*6) * mul * (1 + tier*0.6))`.
Tier also sets steering speed and acceleration multiplier, palette warmth (cyan→gold→magenta), and trail color.

## Level builder (`Level.build()`)

`Level.ensure()` reconstructs the current sixteen-row neighborhood from the
run seed and row IDs. Six column X positions are `[-460, -160, 140, 520, 820,
1120]`; each row has a central route block plus two outer blocks. Rungs are
150×160 units, spaced 230 units vertically; every fifth row is a checkpoint.
There is no roof or goal zone. Optional rails, spikes, poles, shards, rifts and
wind/lift lanes vary by row and region.

The smoke test checks a coarse grip-spacing bound. Input-only bots in
`tests/expedition.mjs` climb roughly 10 km centrally and check multiple seeded
outer routes; `tests/challenge.mjs` also climbs beyond 1,990 m with three lives.
These do not prove every route is usable or replace human playtesting.

Block kinds: `rock` (solid + grippable), `plain` (solid, no grip), `rail`
(grippable top), `spike` (hazard), `check` (grippable + checkpoint).

## Workflow

```bash
npm run check   # parse the script body (fast syntax gate)
npm test        # physics, recovery, stress, streaming, skills, rifts, lives and bots
npm start       # serve and open in a browser
```

After any change to `T` or level generation, run `npm test` — it checks physics,
streaming and sustained bot climbs. Also playtest
changes in a browser; the bot does not prove every intended route is usable.

## Gameplay revision (2026-10-29)

Cyan rails are one-way: upward and side movement pass through; downward movement
from above lands on the grippable top. Gold checkpoints save on a successful grip or landing, announce activation, and
show a lit flag. An older checkpoint cannot replace a higher saved checkpoint.

Contextual opening prompts advance through movement, grip, charging, release,
and steering. They disappear after releases from two different surfaces.

Each block or pole awards score, Flow, perfect count, and chain only on its first
successful release per run. Repeated recovery releases retain their full launch
physics but award nothing, even after a fall. Restart resets eligibility.
Practice and Challenge bests and unlocks use `carve.expedition.profile.v1`;
per-tab active runs use `carve.expedition.run.v1`. Legacy browser storage is left
untouched, but the old course is no longer shipped. These local records are not
tamper-proof. See `challenge.md` for life and save rules.
