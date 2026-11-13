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
the sweep 180 and rest 360. The bell crosses x100–290 at the current rope height,
with radius 18. Ropes use a 42-unit collection radius. Warnings use text, motion
and a line as well as color. The camera follows the existing smooth vertical
movement, and touch ownership/cancellation follows the normal game.

Three boss lives belong to each attempt. A hit returns the player to the
entrance with secured ropes retained and an explicit continuation receipt.
A new attempt resets the boss. Return saves the boss separately and restores the
Lantern result. Active reload resumes paused with fresh input required. The
boss uses `common.bellkeeper-v1` / `bellkeeper-rules-1`, isolated local saves,
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
  The initial reference route clears in about 27 seconds without losing a life.

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
