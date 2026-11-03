# Skybound Supporter Pack: isolated artwork/showroom study

Authorized 2026-11-02. Branch `codex/supporter-showroom`; enter `/?showroom=1`
on its Vercel preview or local server. This is an art direction and playable
cosmetic study, not an approved commercial offer. Keep the PR unmerged.

## Original artwork, revision 1

All art is drawn in the existing Canvas 2D system in `src/expedition.html`,
`Showroom.draw`, `ribbon`, `stars` and `stage`. No downloaded art, reference
characters, fonts, sound recordings or generation service is used. This describes
asset provenance; it is not a trademark search or legal ownership opinion.

| Demo concept ID | Name | Visual identity |
| --- | --- | --- |
| `concept-stormbound-aster-r1` | Stormbound Aster | Silver angular hood, folded cobalt cloak, mint scarf, compass clasp |
| `concept-solar-cinder-r1` | Solar Cinder | Sun-ray fox ears, cream blaze, layered mantle, comet tail |
| `concept-astral-ribbon-r1` | Astral Ribbon | Two restrained mint/violet flight strands |
| `concept-skyburst-r1` | Skyburst | Quiet constellation at a banked result boundary |

These are documentation/demo IDs, not store SKUs or entitlement mappings. The six
existing avatars remain free and unchanged outside this route. No price, sale
contents, ownership rules or store eligibility are approved by this study.

## Player flow

Choose either outfit, compare its original free appearance, toggle trail and
celebration, optionally reduce effects, then try it on the actual Living Terrain
course. Physics and 34x46 player dimensions, feet, catch reach, charge/aim cues,
camera and rewards are unchanged. One-thumb and optional two-thumb/keyboard
controls use existing mechanics. Demo runs use three lives; bank from Pause to
see Skyburst, or preview it directly in the showroom. Every result action remains
available during the effect; nothing waits for an animation.

Pause → Cosmetic showroom lets players inspect a different look without changing
their active run. Resume preserves its frozen appearance; starting a new demo
requires explicit confirmation. Closing/cancelling leaves the current run paused
with cleared input. Changes affect the next demo only. Reload recovers the same
run paused, including its appearance; missing/invalid appearance safely defaults
without invalidating otherwise valid gameplay data. Banked-result reload displays
static artwork, without replaying the animation or awarding anything again.

The ribbon consumes at most 16 existing trail samples, two strokes (one at lower
opacity with reduced effects), no new particle pool. Skyburst draws exactly 18
deterministic stars, expands once for at most 1.8 seconds, then remains static.
No flashes, random gameplay effects or extra simulation timers. Showroom art uses
the existing frame loop at <=30fps during animation and <=2fps while static; no
new animation loop. OS reduced motion forces static stars and the quieter trail.

## Save and release boundary

- Compile-time `TESTING` and `?showroom=1` must both be enabled. Production query
  strings cannot enable the route; compiled production tests cover that case.
- Separate `carve.showroom.{profile,run,selection,controls,audio,best}.v1`
  namespaces. No Flow/Variety/Terrain imports, score merging, wallet transfer,
  shared-save or account calls. Existing profiles/runs are retained.
- Demo course ID `10`; records say `course: showroom-demo-v1`, `demo: true`,
  retain `rules: terrain-v1` only to describe the underlying physics. These local
  unverified demo records are ineligible for shared production leaderboards.
- Separate draft selection and per-run snapshot, revision 1. These preferences
  are not proof of purchase and may never authorize a paid grant.
- No checkout, payment SDK, ads, Stripe/store catalog calls, purchase grants or
  provider credentials. Mobile app download/deep-link prompt remains disabled.
- No production deployment, main merge, native port, shared simulator operation,
  provider setup or existing app/data mutation is part of this task.

## Coordination and verification

Web owns this code. Before implementation, carve-mobile reviewed the proposed
hitbox/anchor parity, isolation, input and accessibility requirements. It then
performed a limited static source/contract review at `7f4f451` and found no
blocking issue in the inspected paths. Actual rendering/input evidence below is
web browser QA, not native verification; no native port was performed.
Stripe Manage was informed that this is a no-sale visual study; its shared
resource ownership and merchant/payout gates remain intact. The verified shared
sandbox remains unchanged; this branch makes no Stripe requests.

`tests/showroom.mjs` covers gating, free avatar baseline, namespaces, records,
draft/current identity, confirmation/cancel, blocked storage, result recovery,
both touch layouts, deterministic simulation parity, bounded drawing and reduced
motion. `tests/terrain-release.mjs` also loads the actual compiled production
artifact with a showroom query to verify that it stays disabled. Run the full
`npm run build`; Node 24/26 remain required.

### Verified preview receipt — 2026-11-02

- Playable code checkpoint: `7f4f451114c6434a0fc2edfad871198ff0dc08b3`.
- Draft [PR23](https://github.com/zengks/carve-game/pull/23), intentionally unmerged.
- [Tested Vercel preview](https://carve-game-nsnj80rmf-zengksoutlookcoms-projects.vercel.app/?showroom=1),
  deployment `dpl_2DA3q5KeSBJq52bDeA9UoRiMKVx7`, READY, preview target.
- Full local Node 26 build passes (282 PASS lines); GitHub Node 24 and 26 PR/push
  checks pass at the code checkpoint, including actual compiled production gate.
- Local/deployed desktop browser and 390x844 phone viewport: both outfit choices,
  original comparison, trail/celebration toggles and reduced effects. Desktop
  Space/Z play reached 66 m peak before pausing; reload retained Stormbound Aster,
  score and best, with explicit paused recovery. This was a short smoke run.
- Local one-thumb hold/release reached 17 m; reload retained Solar Cinder paused.
  Opening another outfit and cancelling replacement preserved that run. Banking
  showed the constellation with three lives; reload kept the result/static art.
- Local 844x390 landscape: optional two-thumb Jump/CARVE produced a release,
  altitude and score; pause remained available. No simultaneous real finger input
  or physical phone ergonomics was tested by those browser actions.
- Deployed 390x844: explicit new-demo switch to Solar Cinder/reduced effects,
  one-thumb launch, paused reload with correct name, and banked result all work.
  Narrow 320x568 and 844x390 modal layout keeps footer actions reachable while
  content scrolls. A distorted mobile canvas was found and corrected; current art
  uses uniform scale and matches the displayed canvas aspect ratio.
- Deployed browser console: no error entries during these checks. The preview
  remained under existing Vercel protection; no bypass/share access was created.
- GitHub main remains `21cff4d35a35813e91af4e9c5e020d5642982442`; latest production
  remains `dpl_51jDKVveytxeR43hgeFFRpiUBBN2` at that same SHA. No production action.

These are short browser interaction checks and synthetic regressions, not a full
manual course completion, physical-device comfort/performance qualification,
retention, demand or commercial readiness evidence. Frame pacing was not profiled.
