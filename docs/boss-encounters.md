# Optional boss encounters

Browser and native CARVE unlock optional encounters at completed milestones.
The first is the Bellkeeper after a Lantern Reach win. Players enter from the
result screen, keep their completed climb, and can return from a boss pause or
receipt. Frost Warden and Echo Climber remain later design candidates.

## Bellkeeper first preview

One-thumb hold, aim, release and catch use the shared Lantern movement rules.
Three golden ropes sit beside safe outer-wall shelves. The bell warns, sweeps
across the middle of the shaft, then rests. Only the current rope can be secured,
and only during rest. Each secured rope advances the encounter and shortens the
next warning. Three ropes finish the challenge.

The reference is `shared/common-bellkeeper-v1.json` and
`shared/bellkeeper-rules.mjs`. At 120 Hz the warning lasts 180, 156 and 132 ticks,
the sweep 180 and rest 540. The bell crosses x100–290 at 60 units above the current rope,
with radius 18. Ropes use a 42-unit collection radius. Warnings use text, motion
and a line as well as color. The camera follows the existing smooth vertical
movement, and touch ownership/cancellation follows the normal game.

Three boss lives belong to each attempt. A hit returns the player to the
entrance with secured ropes retained and an explicit continuation receipt.
A new attempt resets the boss. Return saves the boss separately and restores the
Lantern result. Active reload resumes paused with fresh input required. The
boss uses `common.bellkeeper-v1` / `bellkeeper-rules-2`, isolated local saves,
bounded 20-result history and durable best-time/golden-bell ownership.

The golden bell is an earned cosmetic recognition. It adds no paid benefit or
wallet transaction. Shared cloud ownership follows the existing storage plan.

## Delivery and acceptance

- Web owns canonical rules/course and input-only parity fixtures.
- Mobile mirrors rules and owns native integration and virtual-device testing.
- Verify a complete input-only victory, hit/fall recovery, three-life failure,
  pause/reload, reward/result deduplication and preserved original climb.
- Verify actual browser UI and native exported UI with one-thumb controls.
- Keep previews private, PRs unmerged, and mobile download prompts disabled.
- Aim for 30–60 seconds for a learned clear, then tune with first-time players.
  The initial rules-1 reference route cleared in about 27 seconds without losing
  a life; the tuned rules-2 reference clears in about 19 seconds.

## One-thumb playthrough tuning — 2026-11-14

The browser attempt secured the first rope with three lives, then lost a life
at the second shelf. The original sweep intersected the advertised waiting
area. Rules 2 moves the sweep 60 units overhead and extends REST to 4.5 seconds,
so normal GOOD releases can reach the next shelf without requiring PERFECT
timing. All three shelves are tested for safety across a complete cycle;
airborne contact with the higher sweep still costs one life.

The browser now names the next rope's side and height and explains letting go
to land, waiting for REST and dragging away from a shelf. Recovery wording
refers to ropes rather than lanterns. Short desktop pause screens use compact
spacing. The new `carve.common.bellkeeper.v2` slot leaves rules-1 saves, results
and rewards intact; best times are not combined across the two balance versions.
The full input-only reference and browser adapter clear three ropes with three
lives in 2,274 ticks. These automated traces alone are not hands-on playthrough proof.

The deployed `dca0427` browser preview was then completed through adaptive
one-pad mouse holds and drags: **42.4 seconds active time, three ropes, three
lives, zero falls**. Pauses were used to inspect the route. No state injection
or hidden-state controller drove this run. The victory, golden bell and best
time survived reload; Return retained the parent Lantern result (147 m,
two lanterns, three lives, 18.3 seconds). Desktop pause/result buttons fit
after the spacing adjustment. A lingering post-victory WARNING cue was fixed
and covered by the browser adapter test. This remains pointer-driven browser
evidence, separate from native OS touch and physical-device ergonomics.

## Browser verification — 2026-11-13

- Full build and Node 24/26 CI passed at `2761326`; PR25 remains draft/open.
- The input-only reference secures all three ropes in 3,236 ticks with three
  lives. Browser input tests verify the same finish, one recorded result,
  reload deduplication, persistent reward and unchanged Lantern save/results.
- In the protected browser preview, one-pad mouse presses completed Lantern
  Reach at 147 m with two lanterns and three lives. The result unlocked
  Bellkeeper. A bell hit used one boss life; reload retained recovery, and
  Return restored the original summit result with all three climb lives.
- This is browser pointer evidence, not a physical touchscreen playthrough or
  proof that a first-time player will find the boss comfortable or fun.
- Follow-up `0882361` passed the full build and both Node CI runtimes. The
  390 × 844 preview completed Lantern Reach and opened Bellkeeper, with no
  horizontal or vertical overflow. Boss header, accessible description, action
  labels, movement and pause were checked; viewport settings were restored.

## Native verification

The native plan is `carve-mobile/docs/bellkeeper-preview.md`. Native revisions
`bc277b1` and `e4aad20` mirror the canonical course and fixture byte-for-byte,
pass 59 headless and 68 scene checks, and verify the same three-rope finish.
Android API 36 OS input completed Lantern Reach, reloaded its result, opened
Bellkeeper, paused, returned to the unchanged summit and reopened the saved
boss attempt. The Android target was shut down with its apps and data retained.
The full boss win is input-fixture evidence, separate from the OS entry/return
checks. iOS 26.5 also passed all 68 exported scene checks and completed the
Lantern climb and cold reload through OS touch input, followed by boss entry,
warning, pause, return to the same summit result and saved boss reentry.
Full hands-on boss clears and newcomer warning/difficulty tuning remain open.
