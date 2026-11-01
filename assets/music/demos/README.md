# Music auditions — preview only

1. **Skyward**: warm electronic adventure, 96 BPM.
2. **Ancient Gardens**: organic mystery, 88 BPM.
3. **Neon Momentum**: stronger electronic arcade groove, 118 BPM.

Listen at `/music-demos/` on a development/branch preview, or open the MP3 files.
No track is selected, connected to gameplay, or included in production builds.
All excerpts have a short ending; adaptive layers and seamless loops come after
selection. MIDI preserves notes/timing, not the custom synthesizer's exact sounds.

Offline regeneration (Python 3.14 and FFmpeg 9 used originally):

```sh
python3 -m venv /tmp/carve-music-venv
/tmp/carve-music-venv/bin/pip install -r scripts/music-requirements.txt
/tmp/carve-music-venv/bin/python scripts/render-music-demos.py
```

FFmpeg with libmp3lame must be on PATH. Rendering is offline and not required for
CI or game builds. MP3 files, scores and manifest are checked in; uncompressed WAV
masters are local ignored build artifacts. The renderer targets -18 LUFS and
-1.5 dBTP before lossy encoding; manifest measurements are from decoded MP3s.
Exact encoder bytes can vary by platform/version. See [RIGHTS.md](RIGHTS.md).
