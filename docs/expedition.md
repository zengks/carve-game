# Endless Expedition experiment

Branch: `codex/endless-expedition`. Based on released main `137c184`.
This is a playable design experiment, not a production replacement. Do not merge
or promote it until the user reviews it. `src/carve.html` is unchanged. The branch
preview opens Expedition at `/`; the original summit game is at `/classic/`.

## The loop

Choose a name → climb any of six columns → collect gold shards and complete
contracts → unlock/equip movement skills → optionally enter a rift trial → keep
climbing or bank the expedition. There is no summit or finish trigger. Highest
altitude, not current altitude after a fall, drives the personal record.

World height is displayed in metres (10 physics units = 1 m). Three alternating
route pairs span six columns: a familiar central route, plus left and right routes
with richer shards, hazards and environmental lanes. The camera follows sideways
on small screens rather than shrinking all six columns to unreadable sizes.

Four regions cycle with altitude: Moss Cathedral, Storm Archive, Glass Orchard
and Ember Foundry. Coloured grips, gold-chevron springboards, upward lift lanes,
lateral wind corridors, one-way bridges, pendulum poles, spikes and checkpoint
beacons create route choices. The familiar central wall route stays available.

## Bounty and movement

Gold shards award 2 bounty on the centre route and 4 on outer routes. Contracts
repeat during a run: six shards (+12), three perfect releases (+15), and each
new 100 m (+20). Falling does not erase permanent bounty, unlocks or a height
record. Previously rewarded surfaces and pickups cannot pay again within a run.
New runs can earn their own bounty; this is a solo progression system.

| Skill | Unlock | Effect | Shared cooldown |
| --- | --- | --- | --- |
| Rocket Pulse | Free starter | Immediate upward launch, including in mid-air | 14 s |
| Windwing | 25 bounty | Upward launch plus eight seconds of lower gravity | 24 s |
| Skyhook | 50 bounty | Move to a safe higher ledge in range | 18 s |

One skill is equipped at a time, chosen in the menu or paused Workshop. Press C / L / Q
or use its on-screen button. Changing equipment does not reset an existing
cooldown. The ordinary Flow Surge remains a separate action. No purchases, ads,
authentication service, or third-party analytics were added.

## Optional rifts

A nearby compass and explicit Enter button / E key reveal the entrance. Rifts do
not capture a passing player automatically. The briefing states both outcomes
before the player accepts. Leaving the briefing costs nothing.

- **Pendulum Gate:** stop a moving light inside the visible gold band. The light
  cycles without a time limit; one attempt per accepted gate.
- **Echo Vault:** observe three symbols, then repeat them after they fade.

Winning grants 20 bounty and an approximately 90 m upward shortcut. Missing or
explicitly retreating sends the player to a safe ledge up to 46 m lower, capped
by their checkpoint. At the bottom there is no negative height penalty. Permanent
bounty and peak height remain safe. A gate resolves once; reloading its result
cannot repeat the payout. Trials pause the climb clock. Focus loss and reload
pause the trial too and require an explicit Continue. Return always leaves the
climb paused, so a teleport never resumes motion before the player is ready.

## Records and saving

The named top ten are **local, unverified records on this browser**. Skills and
portal shortcuts are included, and each record shows rifts cleared. The same run
updates one entry across refreshes. Banking ends the run by explicit confirmation.
This is not an online competitive leaderboard or proof against cheating. A shared
web/mobile leaderboard still needs authenticated server-side validation, abuse
controls, versioned rules and an agreed backend; no external player database was
provisioned for this experiment.

Expedition profile/wallet/records use `carve.expedition.profile.v1`; the active run
uses per-tab `carve.expedition.run.v1`. Classic records and active saves use their
original keys and are never imported or overwritten. Checkpoints, reward IDs,
seed, cooldowns, buffs and trial phase survive refresh. Blocked/cleared storage
cannot guarantee persistence. A course revision invalidates an incompatible active
preview run; the player chooses to begin again and the profile/records remain. Sequential updates from separate tabs reread the
profile before crediting, spending or recording; this is not a transactional
server economy.

## Endless performance

Rows are generated deterministically from the run seed, then streamed around the
player (five behind, ten ahead). Old geometry is removed; revisiting a checkpoint
reconstructs it. A reward high-water floor prevents farming old reconstructed
rows, while old reward IDs are discarded. Records are capped at ten. The world
has no authored roof; rendering and collision work stay bounded by nearby rows.
This does not establish real-device FPS, battery life or unlimited-duration
reliability. No mathematical claim of infinite numeric precision is intended.

The original single-file game was copied into a separate experimental HTML file
so its physics, interface and save format remain untouched. Shared build tooling
publishes both files with separate hashed scripts/styles. Consolidating duplicated
engine code can follow a decision to keep this mode; premature changes to the
released game's engine would defeat this experiment's isolation.

## Verification — 2026-10-30

- All existing classic regression/recovery checks, seeded 6,000-step stress test,
  original summit bot and cache-build checks pass.
- 28 expedition checks cover generation/reconstruction, bounded object counts,
  reward claims, purchases and shared cooldowns, all three skills, voluntary portal
  entry, both minigames, success/failure/retreat semantics, paused/reloaded trials,
  high-altitude save restore, duplicate payout prevention, local named records,
  separate-tab sequential profile updates, blocked storage and dual build output.
- Input-only bots climb approximately 9,993 m on the central route and beyond
  890 m on both outer routes. These are synthetic simulated runs, not human scores.
- Manual browser play reached 312 m, 664 points and one cleared Echo Vault,
  crossing into Storm Archive. Rocket Pulse and Windwing were used, both upgrades
  were earned/unlocked, and Skyhook was separately activated from a safe start.
  The Pendulum Gate failure path was exercised. The named 312 m record was banked.
  Pauses were used for inspection; this was not an uninterrupted speedrun.
- Refreshes preserved bounty, equipment, highest/current altitude and the completed
  vault result. Menu buttons fit at 320×568, 390×844 and 844×390. At 390×844 the
  touch controls, skill button, rift prompt, coaching and HUD did not overlap.
  A landscape status/Flow overlap and phone prompt obscuring the player were fixed.
- The outer-route pitch was constrained after a random layout caused a CI bot
  failure. A sweep of 80 seeds on both outer routes then passed all 160 runs;
  eight fixed seeds per side now include those former failure cases in CI.
- Physical iOS/Android multi-touch, long sessions and player fun/retention have not
  been validated. More mechanics are not evidence that the game is commercially
  successful or that every optional route feels equally good.

## Next decisions after playing this preview

Tune reward/cooldown pacing from actual play, choose whether the six-column world
should widen further, and decide whether portal rewards need more variety. Future
candidates include timed chase rooms, relic loadouts, route-specific contracts,
a daily seeded expedition and server-verified seasonal records. None is required
to understand or play this first experiment.

## Keyboard comfort

The default arrow layout uses the right hand for ←/→ and the left hand for
Z (hold/release Carve), X (Flow Surge), C (equipped skill), and Space (jump).
A/D + J/K/L is an alternative. Shift and Q remain compatible; E opens a nearby
rift, P/Esc pauses. Inputs no longer intercept names, editable fields, menu
navigation or modal controls. Holding P does not repeatedly toggle pause.

## Extended manual review — 2026-10-30

A new UI-only browser run banked **1,013 m, 2,535 points, three rifts cleared**,
under the name Quest Explorer (151.2 seconds on the climb clock, plus inspection
pauses and trial time). It used Rocket Pulse, Windwing and Skyhook, Z with arrows,
X Flow Surge, normal carves, the right outer route/lift lane and all four biomes.
Both Echo Vault (observed △ △ ○) and Pendulum Gate were won. A first Pendulum
attempt failed safely. A mid-climb reload and a completed trial result reload
preserved the expedition. This was manual keyboard/mouse input, without setting
player position, rewards, seed or trial results. Previously earned local unlocks
were available at the start; this does not re-prove the initial unlock economy.

Fixed name-field/global shortcut interference, pause-key autorepeat, keyboard
ergonomics, missing Windwing float-time feedback, and silent low-Flow surge
attempts. The float countdown lives on the skill button, keeping the phone
status and contract lines from overlapping; narrow phones also use a compact
status font. Core movement difficulty was left unchanged: the run reached all four
regions; tool-paced play alone is not a reason to retune human reaction windows.
The central input-only endurance test now climbs through repeated biome cycles
to about 10 km, retaining bounded geometry, reward sets and a small save snapshot.

Mobile app handoff remains entirely inactive; see [its release preparation](mobile-handoff.md).
Physical-device app opening, real multi-touch ergonomics, retention and fun still
need real-device/player validation.
