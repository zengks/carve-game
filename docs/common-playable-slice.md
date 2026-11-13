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

### Browser checkpoint — 2026-11-13

`3344e16` passes the full `npm run build` suite and Node 24/26 CI. The actual
browser module's DOM input harness completes the GOOD reference route using
one-pad pointer handlers, retains three lives and writes one winning result.
This is scripted adapter evidence, separate from human playtesting.

The deployed preview was checked at
<https://carve-game-re2xgg6st-zengksoutlookcoms-projects.vercel.app/lantern/>.
Continuous mouse holds reached 30 m with three lives; pause and reload retained
height, lives and elapsed time. No browser console errors were observed.
The preceding identical gameplay build also retained a fall receipt and
two-thumb/left-hand preferences across reload, with no document overflow in
portrait emulation. These checks do not establish a full manual browser finish
or physical-touch comfort. Vercel project authentication remains enabled for
all deployments except custom domains; no access settings were changed.

Subsequently, the documentation checkpoint's deployed build at
<https://carve-game-q1thhyikh-zengksoutlookcoms-projects.vercel.app/lantern/>
completed through actual one-pad mouse holds: 147 m, two lanterns, three lives,
18.3 active seconds and zero falls. The summit result survived reload. This
supersedes the partial browser completion limit above, while physical-touch
comfort and newcomer replay interest remain unverified.

### Native checkpoint — 2026-11-13

Mobile draft PR46 at `47ed448` includes isolated iOS/Android previews and
matching course/fixture bytes. Native timing was corrected to advance the
fixed-step simulation from bounded elapsed time under slow rendering.

Android API 36 completed via 15 OS-delivered one-thumb holds (30 verified
touch events): 147 m, two lanterns, two lives and one deliberate fall. Cold
recovery, terminal relaunch, and replay/result deduplication passed.

iOS 26.5 passed 51 in-app checks, ordinary OS tap/hold input, deliberate fall,
exact cold recovery and explicit continuation. Its timed XCTest sequence was
acknowledged twice but caused no additional launches, even after checking the
pad point and target PID. The iOS OS-touch finish, terminal reload and replay
remain unverified. PosterBoard remained healthy during the checked interval.

Native evidence is retained under
`carve-mobile/.local/broker-os/sliceq1794596740606/`; both owned test targets
were stopped. The native preservation audit matched 154 prior simulator
states and 94 scoped data digests, with one protected cache checked by metadata
only. Existing apps and saves were retained. Both PRs remain open drafts.

### iOS touch completion — 2026-11-13

The previous iOS finish blocker is resolved for simulator testing. Desktop
automation introduced gaps between holds; the successful test delivered
simulator digitizer touches directly and observed the game's actual state.
The run reached 147 m with the shortcut lantern, 14 catches, one fall and two
lives remaining. This shortcut route did not activate camp.

`ios-devicehub-1794600454868/verified-finish.json` under the native evidence
directory above records 32 matched winning-run touches. A cold app launch
retained the same winning run ID and receipt. An actual replay tap created a
fresh run ID with three lives and retained both recorded results, including
the earlier unsuccessful attempt. No game-state injection was used. This is
OS-input simulator evidence; physical-device comfort remains unverified.
