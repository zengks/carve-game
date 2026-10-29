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

Results will be recorded after the final branch preview is verified. Web Analytics
and included Speed Insights are available in the existing Hobby project; no paid
Plus upgrade or custom-event feature is required. Source HTML/local serving omit
monitoring; the deployment build injects the hosted scripts.
