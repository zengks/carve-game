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
