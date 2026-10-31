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

## Mobile/tablet usability — 2026-10-29

Browser viewport checks covered 320×568, 390×844, 844×390, 768×1024,
1024×768, and 1920×1080. Measured touch buttons, coach, Flow, toolbar, and
timer had no pairwise overlaps or offscreen bounds in these configurations.
Portrait phone/tablet and landscape phone screens were visually inspected.
On-screen pointer clicks/holds exercised jump and a scored carve at phone and
tablet sizes. This is browser emulation, not physical iOS/Android multi-touch
or a complete touch-only summit run. Real-device frame rate, safe-area values,
thumb ergonomics, audio unlock and OS interruptions still need device testing.

Fixes: landscape camera scale now considers height as well as width; tutorial
uses thumb/button instructions in touch mode; tablet targets are enlarged with
separation; control offsets include safe-area insets; menu overlays allow vertical
touch scrolling; clearing input also clears held pointer IDs so a pause cannot
leave a new gesture stuck. No movement physics or desktop scoring changes.

24 regressions pass, including simultaneous steer/carve, steer/jump, cancellation,
pause with an unreleased old contact, touch coaching and landscape camera bounds.
Syntax, stress, spacing, full bot completion and static build also pass.

## Full on-screen-control summit — 2026-10-29

A fresh 390×844 browser run reached SUMMIT REACHED / CLEAR using only the
visible Jump, steering, Carve, Pause and Resume controls. Result: 2,179 points,
8 perfect carves, best chain 15, 60.2 seconds of displayed active time. Falls
and recovery occurred within the run; inspection pauses were used between input
sequences. No keyboard gameplay, injected state or scripted simulation drove
this manual run. No captured browser warnings or errors were reported.

This verifies the on-screen control path with a single browser pointer, not
physical simultaneous multi-touch or an uninterrupted mobile speedrun. Hardware
ergonomics, iOS/Android interruptions and device performance remain unverified.

Issues found and fixed: deep falls now recover relative to the saved checkpoint
or level start even when the camera follows down; respawns face into the course;
column-top catches default inward unless the player explicitly steers. Ordinary
rail direction, launch strengths and score eligibility remain unchanged.

27 regressions pass, including checkpoint-relative falls, inward respawn facing,
and column-top direction with explicit steering. Syntax, seeded stress, spacing,
automated full completion and static build pass. Branch preview only.

## Cache and reload-recovery preview — 2026-10-30

Review branch: `codex/cache-and-run-recovery`. No production promotion is authorized.

- Built CSS, game JavaScript, logo and browser/manifest icons use SHA-256 content
  filenames. Only `/assets/cache/` receives one-year immutable caching. Entry HTML,
  manifest and stable branding aliases revalidate. Build output is cleaned first;
  source HTML remains self-contained and directly playable.
- Per-tab session snapshots restore active runs paused after browser reload. The
  saved data includes velocity, score/Flow, clock, tutorial, checkpoint, cooldowns,
  wall/pole attachment and the set of already rewarded surfaces. Inputs are cleared;
  attached grips wait for the player to hold CARVE again. Restart is an explicit
  modal choice with Keep my run focused by default.
- Snapshot validation checks schema, finite fields, course/physics compatibility
  and surface references. This is local recovery, not anti-cheat or a cloud save.
  Storage errors are handled; a browser warning is requested when reload cannot be
  saved. It cannot guarantee protection if browser storage is blocked or cleared.
- Automated coverage: existing 27 regressions plus 9 recovery cases and built-asset
  integrity/cache-policy checks; seeded 6,000-step stress test and actual-goal bot
  completion. Snapshot writes are throttled and stay outside physics steps.
- Browser check on built output: touch movement/jump/carve earned 39 points at 4%
  height, 4.6 seconds. Reload restored the same displayed values, paused, with touch
  controls enabled. Repeated reload preserved them; Escape canceled the restart
  dialog while the run remained paused. These are browser checks, not physical
  iOS/Android or a fresh complete manual summit run.
- Vercel Advanced page successfully rechecked: directory listing disabled; Skew
  Protection disabled (Pro feature); bulk redirects 0, no paid allocation. No
  dashboard setting changes were needed.
- Vercel free page-view Analytics and Speed Insights remain enabled. Official
  custom-event documentation restricts gameplay events to Pro/Enterprise:
  https://vercel.com/docs/analytics/custom-events . No plan upgrade, additional
  analytics provider, fake page views or paid custom events were configured.

## One-thumb timing feedback — 2026-10-30

The pad now shows a charge marker and GOOD/PERFECT bands derived from the actual
release thresholds. One-thumb coaching names the visible pad, including saved
grip recovery. Physics, rewards, course/save versions and mobile handoff stay
unchanged. Marker/attribute updates skip unchanged values.

The full build passes, with 25 one-thumb checks covering actual charged pointer
holds through GOOD/PERFECT/LATE/expiry, pause and reload recovery, scheme wording
and unchanged-frame DOM writes. Existing pointer-only good/perfect bots still
reach 1,000 m. These are scripted checks, not new human acceptance.

Local browser checks exercised a real held pointer on the pad (GOOD feedback
observed during the hold, marker and bands visible), then measured child bounds
and page overflow at 320×568, 390×844, 844×390 and 768×1024, including left-hand
320×568. All pad contents fit, including a live PERFECT hold in left-hand landscape. Physical thumb ergonomics remain unverified.
