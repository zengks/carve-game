# Lantern Reach shared playable section

Browser and mobile implement the same finite preview course
`common.lantern-reach-v1`, with rules `lantern-rules-1`. The numeric source is
`shared/common-lantern-reach-v1.json`; the reference simulation is
`shared/lantern-rules.mjs`. Native mirrors these in GDScript and runs the
same `shared/fixtures/lantern-parity-v1.json` inputs and expected states.

## Rules

World coordinates use a 390-unit width, positive-up vertical axis and a
20-by-24 AABB player. The simulation runs at 120 fixed ticks per second.
Gravity is 880 units/s², fall speed is capped at 680, steering acceleration
is 600 and horizontal speed is capped at 380. Drag aim adds up to 100 to
the release's horizontal impulse.

Ground and wall holds charge from zero. Charge windows use integer ticks,
with exclusive upper bounds. EARLY is 0–31, GOOD 32–83, PERFECT 84–110 and
LATE 111–146. Tick 147 expires. Zero-charge release does nothing. Horizontal/
vertical release speeds are 185/300, 320/480, 345/530 and 230/350 respectively.
Ground launch multiplies these by .72/.98 before aim. Wall launch always
points away from that wall and clamps horizontal magnitude to 180–380.

Collision resolves horizontal movement first, then vertical movement, with the
surface array as the tie-break order. Blue and gold grip walls have full box
collision. Other surfaces are one-way tops. A held airborne player can catch
only an actual side collision, resets charge and remains stationary. The same
wall stays excluded until the player leaves its contact zone. Expiry slips,
and a lift is required before another hold can count. Cancellation wins the
tick, pauses and clears charge. Resume requires fresh input.

## Route and result

Blue walls form the steady route. Entering the visible blue camp beacon lights
the checkpoint, including an airborne arrival. The lower rescue shelf catches
misses without spending a life. The narrow gold pillar offers a shorter
crossing with an optional lantern. Four lanterns can each be collected once.

Each run starts with three lives. Falling more than 180 units below the saved
spawn or leaving the horizontal world costs one life and holds a recovery
receipt. Continue explicitly resumes at the saved shelf. At zero lives the
run ends once. The summit completes on landing or entering the bell's goal
zone. Results report peak metres, active time, falls and lanterns.

The local namespace is `carve.common.lantern-reach.v1`. Active reload recovery
is paused, with charge cleared and fresh-input gating. Replay creates a new
run only after an explicit action. No old course records or wallets are
reclassified. The section has no account, cloud upload, spending or paid effect.

## Verification and release boundary

The browser entry is `/lantern/`, included in preview builds only.
The current released browser game and native First Ascent remain preserved.
The reference tests cover charge boundaries, input cancellation, rescue,
checkpoint recovery, terminal lives, corrupted snapshots and complete GOOD
and PERFECT input-only routes. Native verifies the same state vectors within
1e-5 numeric tolerance. Browser/device UI checks qualify the adapter separately.
Player comfort and replay interest still need observation with newcomers.
