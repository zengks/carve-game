# CARVE Grip identity

Selected by Steven on 2026-10-30: text-free Grip option 1, with cyan/mint walls,
a gold player and curved launch trail. `carve-grip-selected.png` is the original
1254px AI-generated raster master. Preserve it for future platform exports.

Generated with the built-in image-generation tool, then refined from the approved
two-wall concept: tighter composition, larger player and thicker trail, no lettering.
This selection does not establish trademark clearance or exclusive copyright.

Run `python3 scripts/export-branding.py` from the repository root with Pillow
installed to regenerate the exports. The social-card text uses macOS Arial Bold;
game builds use committed exports and require neither Python nor Pillow.

- `carve-logo.webp`: lightweight in-game logo, 320px.
- `favicon.ico`: 16/32/48/64px browser variants.
- `favicon-96.png`: square search/browser icon with a stable public URL.
- `apple-touch-icon.png`: 180px home-screen icon.
- `icon-192.png`, `icon-512.png`: manifest icons with `purpose: any`.
- `social-card.png`: 1200×630 link preview.

The public build copies only the exports; the master and this document stay in GitHub.
The logo appears in menu/pause/results overlays, leaving the gameplay view clear.
The manifest provides home-screen metadata; it does not add offline caching.
