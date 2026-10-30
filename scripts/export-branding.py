"""Export the approved Grip raster master. Requires Pillow; not part of game builds."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
out = root / "assets/branding"
master = Image.open(out / "carve-grip-selected.png").convert("RGB")
for size, name in [(96, "favicon-96.png"), (180, "apple-touch-icon.png"),
                   (192, "icon-192.png"), (512, "icon-512.png")]:
    master.resize((size, size), Image.Resampling.LANCZOS).save(out / name, optimize=True)
master.resize((256, 256), Image.Resampling.LANCZOS).save(
    out / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
master.resize((320, 320), Image.Resampling.LANCZOS).save(
    out / "carve-logo.webp", quality=92, method=6)
share = Image.new("RGB", (1200, 630), "#080d20")
share.paste(master.resize((500, 500), Image.Resampling.LANCZOS), (40, 65))
draw = ImageDraw.Draw(share)
font_path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
font = ImageFont.truetype(font_path, 104)
sub = ImageFont.truetype(font_path, 26)
draw.text((570, 215), "CARVE", font=font, fill="#e2fff4")
draw.text((577, 350), "GRIP. CHARGE. LAUNCH.", font=sub, fill="#38f0e0")
share.save(out / "social-card.png", optimize=True)
print("Brand exports saved to", out)
