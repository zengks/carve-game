# CARVE — design notes

## Origin

The brief was to extract the *transferable core* of the drift mechanic from
Crazyracing KartRider / KartRider: Drift and rebuild it in a non-racing genre.

Drift, stripped of the kart and the track, is:

- **momentum redirection through timing** — the payoff comes from *when* you act,
  not just *whether* you act;
- **chained micro-decisions** — each opportunity is a yes/no, and chains compound;
- **risk/reward compression** — tighter execution = bigger payoff; one beat late
  breaks the chain;
- **a tight audio-visual feedback loop** that teaches the rhythm in real time.

CARVE maps that onto climbing: drift becomes *grip*. You ride a surface, charge,
and release at the sweet-spot to launch.

## Pillars

1. **One verb, deep skill.** Carve is a single hold-and-release input. Mastery is
   timing the release and steering the launch, not memorizing combos.
2. **Two ways up.** Wall-jumps are the safe, slow, low-score path; carve-chains are
   the fast, expressive, high-score path. This mirrors drift-vs-grip: you can finish
   without drifting, but drifting is faster and rewards skill.
3. **The world reacts.** Flow warms the palette and speeds the world, so the screen
   itself broadcasts how well you're doing.

## The carve, precisely

While airborne and holding Carve near a grippable face, the player latches:

- **Wall** — climb the face upward; vertical speed ramps with charge.
- **Rail** (top face) — grind along it in the travel direction.
- **Pole** — attach and swing as a gravity pendulum; holding Carve pumps the swing.

A charge value fills over `CHARGE_TIME`. Release maps to a quality tier:

| Charge band                         | Tier     | Launch multiplier |
|-------------------------------------|----------|-------------------|
| `< ZONE_GOOD`                       | weak     | 0.55x             |
| `ZONE_GOOD .. ZONE_PERFECT_LO`      | good     | 1.0x              |
| `ZONE_PERFECT_LO .. ZONE_PERFECT_HI`| perfect  | 1.7x              |
| `> ZONE_PERFECT_HI` (pre-slip)      | late     | 0.85x             |
| `>= SLIP_AT`                        | slip     | grip lost, fall   |

Launch = a pop along the surface normal + lift scaled by `charge * multiplier`,
bent by the steer input at the moment of release. Time dilates to `TIME_DILATION`
during a carve so the gold window is readable at speed.

## Flow

`flow` is 0..`FLOW_MAX`. Perfects/goods add, slips subtract, passive decay plus a
larger ground-walking drain pull it down. Tier = `floor(flow / 20)` (0..5), and
tier drives speed multiplier, palette warmth, score multiplier, and trail color.

## Level

`Level.build()` generates a uniform-spacing zig-zag chimney of grip "rungs"
alternating left/right, plus rails, sparse spikes, checkpoints, an optional pole
flourish, a short final tower, and a generous summit goal zone. Spacing
(`STEP`) is held below the reach of a *good* (non-perfect) carve so the climb is
always completable; perfects simply feel better and score more. See
[`mechanics.md`](./mechanics.md) for the tunable reference.

## Why a single HTML file

Zero build step, instant to open and to share, and trivial to embed. The cost is
that everything lives in one file; the `tests/` harness extracts the script body
to exercise the simulation headlessly in Node, which keeps it verifiable despite
the packaging.
