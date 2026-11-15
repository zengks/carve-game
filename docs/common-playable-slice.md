# Lantern Reach shared playable section

Browser and mobile implement the same finite course
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

The browser entry is `/lantern/`, released by authorized PR26 at `853d876` on
2026-11-14. Native remains a preview; the existing Expedition and native First
Ascent saves remain separate. Subsequent coaching changes stay on preview
branches until separately authorized for release.
The reference tests cover charge boundaries, input cancellation, rescue,
checkpoint recovery, terminal lives, corrupted snapshots and complete GOOD
and PERFECT input-only routes. Native verifies the same state vectors within
1e-5 numeric tolerance. Browser/device UI checks qualify the adapter separately.
Player comfort and replay interest still need observation with newcomers.

### First-climb coaching contract — 2026-11-14

`lantern-coaching-1` is presentation only. Its canonical selector is
`shared/lantern-coaching.mjs`, with 26 scenarios in
`shared/fixtures/lantern-coaching-v1.json`. It derives `{id, action, objective}`
from existing run state, charge thresholds, control scheme and current held
input. It never writes the run, adds tutorial save flags, or changes the frozen
course, physics, lives, scoring, parity fixture or Bellkeeper rules.

Priority: terminal/ready/pause/recovery; a held input that needs lifting;
airborne catch/aim; supported hold; fresh catch; EARLY charge; GOOD/PERFECT
release; LATE urgent release. The held input comes from the adapter's active
pad/keyboard owner, not a stale notice. This distinguishes an expired held
contact from a resumed run with no contact. Native may substitute the visible
CARVE/STEER button names; meaning, cue IDs and objectives stay aligned.

The immediate action appears beside the charge meter. A secondary objective
explains camp, the rescue shelf or the summit without replacing catch/release
timing. Initial instructions explain that lanterns are optional. Pause repeats
three control steps with the selected steering scheme. Recovery identifies the
return point, remaining lives and retained height/lanterns. Bellkeeper keeps
its existing separate instructions.

Acceptance: test charge boundaries and retired touches, both control schemes,
fresh entry, full one-thumb summit, pause/reload, fall/recovery and separate
boss return. Preserve every prior save and virtual device. Browser pointer
checks, scripted adapter routes and emulator/simulator OS-touch checks are
separate evidence; newcomer understanding and physical comfort remain open.

Browser checkpoint `f400932` passed the full local build and Node 24/26 push
and PR checks. Draft PR27's protected preview is
<https://carve-game-d6g65t82t-zengksoutlookcoms-projects.vercel.app/lantern/>.
At a 390 × 844 viewport, real pointer holds completed the summit at 147 m,
two lanterns, three lives, zero falls and 18.3 active seconds. Reload retained
the result. A separate replay with two-thumb/left-hand controls deliberately
fell: the recovery panel showed the start destination and two lives remaining,
and reload preserved both the receipt and control preferences. Desktop pause
help and keyboard input were checked; no browser console errors were captured.
Local checks also covered overholding, paused reload and a compact 320 × 568
layout. Screenshots remain under `.local/first-climb-guidance/` (not published).
These are browser pointer/viewport checks, not physical-phone or newcomer tests.

Native checkpoint `edd6fce` on `codex/lantern-first-climb-coaching` retains
gameplay checkpoint `2163353`. Its 26-case coaching fixture matches the browser
byte-for-byte (SHA256 `4faf3a876caecfe0267aeab88e0acabc427c62f4b520d5ed5be9ac10b7a4fc41`).
Both isolated builds passed 104 exported checks. Automated OS-delivered touches
then completed Lantern Reach with camp, two lanterns and two lives after a
deliberate fall: iOS 24.2 seconds, Android 22.1 seconds. Both retained recovery
and winning receipts after cold launch, won Bellkeeper with three lives,
retained its reward through retry/return, and replayed without losing the win.

Independent report reads confirmed completion and cleanup at mobile paths
`.local/broker-os/sliceq1794715146258/ios-run-1794715558715/report.json` and
`.local/broker-os/sliceq1794715618894/android-run-1794715875815/report.json`.
The first Android attempt lacked its offline touch driver; its app/save were
retained, preflight was repaired, and a fresh target passed. Mobile reports all
three owned targets stopped with data retained, 160 prior identities/states and
110 data digests matching (one protected OS cache metadata-only), plus 39 stable
PosterBoard samples and a clean delayed crash scan. These are virtual-device
automation results; physical-phone/tablet comfort and newcomer understanding
remain unverified. Web PR27, mobile PR46 and the new native preview branch stay
unmerged; production remains browser commit `853d876` with downloads disabled.

The user subsequently authorized browser publication on 2026-11-14. PR27 merged
at `e57a065`; live one-pad summit and reload/fall recovery passed. Desktop
verification exposed a first-frame Space press being rejected by the fresh-input
gate. The follow-up recognizes a new Space keydown, like a new pad contact, while
ignoring auto-repeat without a current key owner. Regression cases cover the
first resumed frame, stale repeats after resume, and repeats after overholding.
The native release boundary and mobile download prompt remain unchanged.

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

The integrated test then passed from an empty save on another isolated iOS
26.5 simulator, at mobile checkpoint `a0e0588`. It passed 51 embedded checks,
deliberate fall and cold recovery, 32 adaptive digitizer events, camp activation,
and the bell at 147 m with two lanterns, 14 catches and two lives. Cold win
reload and fresh replay retained exactly one completed result. The report at
`carve-mobile/.local/broker-os/sliceq1794601189509/ios-run-1794601331984/report.json`
records completion and cleanup success with XCTest exit zero. The mobile chat
reported 35 PosterBoard samples with one PID, exit zero and no attributed crash.
The final native preservation audit matched all 155 retained simulator
identities/states and 97 scoped app/vault/emulator digests; one protected cache
was metadata-only. All iOS simulators were stopped after verification.
