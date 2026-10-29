# Repair verification — 2026-10-28

Branch: `codex/game-repairs-and-observability`. Baseline: `cb3df71`.
Production is intentionally unchanged; repaired code is for branch preview review.

## Automated checks

- Syntax check, focused regression tests, seeded 6,000-step stress test, spacing guard.
- Bot must enter the goal; the old 92%-height success fallback was removed.
- Updated bot completed in 26.2 simulated seconds with 20 perfects and a 38-chain.
  Timing is simulation time, not a human speedrun or real-world performance metric.
- CI runs on Node 24 and 26. Vercel builds use Node 24 and run the same checks.
- Static output contains only the game, robots, sitemap, and search verification.

## Performance evidence

A matched 600-frame, 60-Hz synthetic idle run (10 simulated seconds) compared the
original source against the updated source using the same stubbed DOM/canvas:

| Measurement | Before | After |
| --- | ---: | ---: |
| HUD DOM/style writes | 9,600 | 100 |
| DOM element lookups during frames | 7,200 | 0 |

That is 98.96% fewer HUD mutations for this workload. It is not an FPS or Core Web
Vitals benchmark. HUD updates now run once per rendered frame and skip unchanged
values. Paused/menu screens redraw only when invalidated, rather than continuously.
The simulation remains at 120 Hz and active gameplay keeps its animations.

## Browser and deployment checks

- GitHub CI passed on Node 24 and Node 26 for `dc40058`.
- Vercel created a READY preview for that commit; production stayed at `cb3df71`.
- Preview start/pause worked without captured JavaScript warnings/errors.
- At 390×844, measured touch control and timer/toolbar rectangles do not overlap.
- Manual keyboard play with pauses for inspection reached 74%. This was not an
  uninterrupted human speedrun or a manual summit completion. The separate bot
  test confirms a full completion through the simulation.
- Missed jumps, catch rails, surge, perfect releases, Flow changes, and checkpoint
  recovery were exercised. Out-of-lane phone visibility and delayed respawn camera
  recovery found during playtesting were corrected afterward.
- Web Analytics is already enabled (dashboard offers "Disable Web Analytics").
  Included Speed Insights is available on the Hobby project; no paid Plus upgrade
  was enabled. Both deployed script endpoints return HTTP 200 with JavaScript.
- The in-app browser blocks the Analytics script with `ERR_BLOCKED_BY_CLIENT`;
  dashboard event ingestion / real-user vitals are therefore not confirmed.
  A visit in a normal browser without that content blocker is still needed.
- The legacy `/src/carve.html` route resolves to the game. `/package.json` returns
  404, confirming repository files are excluded from published output.

## Gameplay follow-ups from manual play

1. Make checkpoint activation unmistakable (a saved message / flag). Brushing a
   gold wall while chaining does not activate it; only a landing does.
2. Make the rail undersides easier to read or evaluate one-way platforms. Several
   apparently good launches hit a bridge overhead and lost their upward speed.
3. Teach approach, charge, release, and steering in a short playable introduction.
   The menu explains the controls, but timing feedback arrives during fast motion.
4. Reward new height or distinct surfaces, not only repeat carves. Score and chain
   kept rising while recovering around the same section.
5. Add more varied climbing sections after testing the core feel with players;
   the repeated left/right pattern dominates much of the level.

These are design suggestions, not claims of validated player demand.

## Gameplay update — 2026-10-29

Implemented all five follow-ups: checkpoint banner/flag and monotonic recovery,
one-way cyan bridges, action-driven opening coach, finite per-surface rewards,
and varied terrace/switchback spacing with an optional swing route.

- 18 regressions, syntax, seeded stress, spacing guard, and full bot completion pass.
- Updated bot reaches the goal trigger in 17.0 simulated seconds, score 15,441,
  15 perfects and a 30-chain. The trigger begins below the platform's top, so the
  height meter can be below 100% on the final simulation step.
- Browser keyboard attempt exercised tutorial progression, bridges, recovery
  launches and unchanged score on reused surfaces; reached 22%, then fell back.
  Full manual completion is still not verified. Pauses were used for inspection.
- Client code, timers, inputs and localStorage can be modified by a player.
  This single-player app has no authoritative server or competitive leaderboard.
  The farming fix prevents a normal-play exploit; it is not an anti-cheat system.
  A future competitive mode would need server-side run validation and abuse controls.
- Branch preview only; production is not promoted.

## Full manual summit and checkpoint recovery — 2026-10-29

A browser-only keyboard run reached the real SUMMIT REACHED / CLEAR screen on
the checkpoint patch: 6,077 points, 9 perfect carves, best chain 25, displayed
active time 33.9 seconds. Pauses between short keyboard sequences were used to
inspect screenshots and plan the next move. This was not an uninterrupted
speedrun. No game state, position, score, physics, or victory flags were injected.
The browser console reported no captured warnings or errors.

Before the patch, a separate attempt reached 72% but a fall reset to the start:
carving up checkpoint sides had not saved progress. Gold checkpoints now save
on a successful grip as well as landing, keeping continuous carving compatible
with recovery. A higher saved checkpoint cannot be overwritten by an older one.
The successful run visibly activated the first, middle, and final checkpoints.

19 regression tests, seeded stress, syntax, spacing and automated full completion
pass. No movement constants, goal position, or score eligibility were relaxed.
The change stays on the review branch; production is unchanged.
