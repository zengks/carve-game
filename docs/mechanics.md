# CARVE — mechanics & tuning reference

Every value that shapes the feel lives in the `T` constants object at the top of
the `<script>` in [`../src/carve.html`](../src/carve.html). World units are
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
| `AIR_DRAG`        | 0.6     | Reserved horizontal air damping factor. |
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
Tier also sets speed multiplier, palette warmth (cyan→gold→magenta), and trail color.

## Level builder (`Level.build()`)

Not in `T` — these are locals inside `build()`. The climb is a uniform zig-zag
"chimney" of grip rungs alternating left/right.

| Local     | Default | Meaning |
|-----------|---------|---------|
| `LEFT_X`  | 140     | X of left-column rungs. |
| `RIGHT_X` | 520     | X of right-column rungs. |
| `RUNG_W`  | 150     | Rung width. |
| `RUNG_H`  | 160     | Rung height. |
| `STEP`    | 230     | Vertical gap between consecutive rungs. |
| `stops`   | 18      | Number of rungs in the main ascent. |

**Reachability invariant** (enforced by `tests/smoke.mjs`): `STEP` must stay below
the height a *non-perfect* carve clears — base arc `WALL_LIFT_BASE²/(2*GRAVITY)`
plus the wall-climb gained during the carve. Raise `STEP` past that and the climb
can soft-lock; the smoke test will fail before you ship it.

Block kinds: `rock` (solid + grippable), `plain` (solid, no grip), `rail`
(grippable top), `spike` (hazard), `check` (grippable + checkpoint), `goal`.

## Workflow

```bash
npm run check   # parse the script body (fast syntax gate)
npm test        # smoke (physics + stress + reachability) then bot (end-to-end)
npm start       # serve and open in a browser
```

After any change to `T` or `Level.build()`, run `npm test` — it re-derives the
reachability bound from your new constants, so it catches an unwinnable level
automatically.
