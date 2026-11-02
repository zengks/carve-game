# CARVE music audition milestone — 2026-11-01

Branch: codex/shared-storage-foundation (existing preview branch, not main).
Listen at /music-demos/ on the branch preview. Game loading never requests these
assets. The production builder omits the audition page and all audio files.

| Demo | Mood | BPM | Seconds | Decoded LUFS | True peak dBTP |
| --- | --- | ---: | ---: | ---: | ---: |
| Skyward | warm electronic adventure | 96 | 43.000 | -18.45 | -6.39 |
| Ancient Gardens | organic mystery | 88 | 35.727 | -18.45 | -4.34 |
| Neon Momentum | electronic arcade groove | 118 | 43.678 | -18.44 | -6.87 |

Numerical checks use FFmpeg on the decoded MP3s; all have headroom. Browser UI
checks started all three players without a media error and confirmed selecting
one pauses the other. At 390 × 844 the page had no horizontal overflow and the
native audio controls remained within their cards. These checks establish loading,
playback state and layout, not a subjective listening review or physical phone QA.
Full npm run build passed, including new artifact hashes and production exclusion.

Compositions are explicitly AI-assisted. There are no source recordings, samples,
soundfonts, vocals, reference songs, external music-generation services or artist
imitation. See assets/music/demos/RIGHTS.md, provenance.json and manifest.json for
tools, scope, limitations and rights. No legal clearance or uniqueness claim is made.
The repository's MIT source-code license does not grant public reuse of new music.

Selection comes before longer arrangements, seamless loops, adaptive layers and
any web/native runtime integration. No production deployment is authorized here.
