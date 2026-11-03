# Selectable climbers — cosmetic preview

2026-11-02. Continuation on `codex/living-platforms`, draft PR22. The start menu's
**Choose climber** button opens six original vector characters. Select a portrait
and confirm **Use this climber**, or cancel without changing the selection.
All choices are free and available immediately; no entitlement/purchase claim.

| Stable ID | Character | Visual identity |
| --- | --- | --- |
| `aster` | Aster · The Wayfinder | Gold hood, dark face, turquoise scarf and climbing boots; new default |
| `sprig` | Sprig · The Wildheart | Seed body, leaf crown and branching root feet |
| `cinder` | Cinder · The Emberfox | Angular ears, cream muzzle, warm coat and bright tail |
| `prism` | Prism · The Shardwalker | Faceted head, floating shards and split crystal cloak |
| `orbit` | Orbit · The Surveyor | Octagonal lens housing, antenna, mechanical body and round boots |
| `wisp` | Wisp · The Skyfire | Curved comet silhouette, pale rim and violet inner flame |

Art/selection catalog version 1 is defined in `Avatars` in
`src/expedition.html`. Each portrait and gameplay sprite uses the same original
Canvas path code, not external art or a character library. IDs are allowlisted
with own-property checks. Names/titles are display labels, not ownership keys.
No performance, skill, reach, price or paid/unlocked variants are implied.

## Rules and persistence

- Physics/collision stays **34 × 46 world units** with the same origin, feet,
  wall anchors, camera, launch aim, charge feedback, scoring and movement.
  The renderer mirrors the character to face movement and uses its accent for
  the existing trail. It never changes simulation state. Cosmetics do not bump
  the course/rules version or invalidate historical results.
- Profile selection uses optional `avatar` metadata in the existing profile's
  namespace. Confirm reloads the current profile before saving instead of writing an
  opening-time snapshot, retaining other field edits already stored by then.
  This is ordinary localStorage, not a cross-tab transaction guarantee. It does not alter the unsaved nickname field.
- The visible menu selection determines the next start. An external tab's
  preference change cannot silently make Begin use a different portrait.
  A started climb binds `Journey.avatar`; profile changes cannot change it.
- Active-run snapshots, completed records and finished-result metadata carry
  that run ID. Missing/unknown legacy profile or run appearance displays Aster
  while keeping the valid climb, currency, unlocks and score provenance.
- Cancel/preview makes no profile write. A stale picker with a changed profile
  key cannot commit. Pending previous-progress import must be resolved before
  opening the picker, so choosing a cosmetic cannot create an empty destination
  profile that bypasses the existing explicit carry/separate decision.
- Blocked profile saving reports a session-only choice and still lets that
  appearance start; reload persistence is not promised in that case.
- Picker open/close/confirm clears gameplay input; no active-run selection is
  allowed. Both touch layouts retain fresh-input/pause safety.
- This main-based branch has no enabled hosted account integration. Appearance
  remains local metadata, not shared account ownership, an auth identity, or a
  purchase entitlement. A future account adapter must bind owner/generation
  before accepting preference updates and cannot reuse local keys as identity.
  Native art/selection convergence needs its own agreed mapping; no native port,
  shared unlock or cloud cosmetic sync is claimed.

## Verification

`tests/avatars.mjs` covers all six selections, persistence, cancel, unknown IDs,
legacy saves, immutable active-run selection, finished results, blocked storage,
concurrent wallet/preference changes, pending-import preservation, stale scope,
keyboard radio navigation, neutral input and render-only behavior. Existing
terrain/no-skill/physics/recovery suites still run in the full build.

Browser layout and deployed-preview evidence is recorded in PR22. Pointer-driven
browser checks are not physical-device touch/ergonomics or player appeal evidence.
No production deployment, mobile prompt, payment, SDK or service is part of this
cosmetic continuation. Original untracked auth/migration files remain untouched.


Local browser review covered 1280 × 720, 390 × 844, 320 × 568 and 844 × 390.
All six portraits rendered with distinct silhouettes; the start screen kept its
Begin/Controls buttons visible. On short phones, the portrait body scrolls while
Use/Keep actions stay pinned. Landscape uses a six-column portrait row.
Arrow-key preview moved Cinder → Prism; Keep current retained Cinder. A portrait
one-thumb Cinder opening reached 26 m and pause/reload retained 26 m / 4 bounty /
14.9 s / three lives; resuming visibly retained the fox. No browser console errors
were captured. This was an opening smoke check, not a full course playthrough.

The full local Node 26 build and 13 avatar checks pass. Node 24/26 push/PR CI and
Vercel Preview also passed at checkpoint `8830e28`; final catalog-version metadata
and this evidence record are a follow-up checkpoint. PR22 remains unmerged,
main/live unchanged. See the PR for the latest immutable preview URL.


## Authorized release continuation — 2026-11-02

The owner subsequently authorized release with Living Terrain. All six avatars
ship with the public course, still free and cosmetic-only. Explicit previous Flow
progress carry also retains a supported avatar ID; old missing/unknown IDs use
Aster. Production root/query/life/save behavior is covered by the compiled-artifact
checks in `tests/terrain-release.mjs`. No payment, native handoff prompt or hosted
account feature is enabled by this release. PR22 holds final deployment evidence.
