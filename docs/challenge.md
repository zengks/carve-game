# Three-life Challenge

Developed on `codex/three-life-challenge`; production release approved on
2026-10-30 after preview verification and passing Node 24/26 CI.
The current game includes Practice and Challenge. The retired `/classic/`
address redirects here; mobile app links remain disabled.

## Rules and presentation

- Practice is the default, preserving the existing unlimited-recovery expedition.
- Challenge starts with three lives. A void fall or spike impact costs one life,
  followed by the existing checkpoint recovery and Flow penalty. The existing
  damage cooldown prevents one impact from charging twice.
- The third loss stops simulation and opens Game Over with highest altitude,
  score, time and rifts cleared. No pickups or rewards run after the fatal hit.
- Checkpoints, skills, pausing, grip slips and rift penalties do not refill or
  independently consume lives. A slip only costs a life if it causes a void fall
  or spike impact. Failed rifts keep their existing capped height penalty.
- Mode selection is locked for the run. Pause → Bank run ends it voluntarily;
  Challenge uses a distinct Banked summary with remaining lives.
- Retry creates a new run ID, resets score/height and restores three lives.
  Bounty and unlocked skills carry across modes; there is no extra-life purchase.
- A persistent in-game badge shows remaining hearts, with a text accessibility
  label. Life-loss messages take priority over bounty notices for four seconds.
  Touch input clears on damage to prevent a held direction causing another fall.
- Each mode keeps its own best and top ten. Records are local and unverified,
  include skill/rift boosts and can be changed by a player controlling storage.
  These are not competitive, authenticated or global leaderboard results.

## Compatibility and recovery

The existing version-one profile and course-two session formats are extended
without discarding old progress. A saved run or record lacking both mode and
life fields is Practice. Challenge active saves require one to three integer
lives; incompatible or malformed combinations are rejected.

Life losses save immediately after recovery. Remaining lives, mode and paused
recovery survive refresh. A terminal summary replaces the active snapshot and
survives refresh without restoring a living run, crediting bounty or adding a
duplicate record. Retry and dismissal clear it. Touch preference also survives
result reload and Retry. Removing the active snapshot before storing the summary
prevents a full storage quota from leaving a one-life run behind. Unavailable
browser storage still cannot guarantee persistence; closing a tab or changing
preview origins does not create a cloud save.

## Verification

`tests/challenge.mjs` covers real simulated void and spike collisions, duplicate
damage, stopping on the third loss, banking, retry, legacy migration, invalid
saves, repeated reloads, record separation, shared unlocks, storage quota failure
and an input-only climb beyond 1,990 m with all three lives intact.

Local UI testing completed a three-fall Challenge (56 m peak), including reload
with two lives and reload after Game Over. Practice survived repeated falls and
reload with unlimited recovery. Mode selection, banked summaries, records tabs,
touch persistence and Retry were checked through the interface. Layout checks
cover 320×568 portrait and 844×390 landscape; summary content scrolls while its
actions remain visible. These are desktop-browser viewport checks, not physical
iOS or Android device verification.
