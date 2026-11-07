#!/opt/homebrew/bin/python3
"""Compose a cover: the illustration above a title panel (book-jacket proportions).

  scripts/make_cover.py [new-nature|the-strange-forest]   (default new-nature)

The sources are too small for print, so these are web covers only; a print cover
needs a higher-resolution source (see images/index.json).
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent.parent / "images" / "cover"
W = 1600
COVERS = {
    "new-nature": dict(
        src="new-nature-cover-art-1024x768.png", out="new-nature-cover-web-1600x1850.jpg", title="New Nature", title_size=168,
        subtitle=["How artificial intelligence and computational", "hardness are rewilding the planet"],
        panel=(36, 58, 54), panel_h=650),
    # No subtitle yet, so a shorter panel. The art is used whole: nothing is cropped.
    "the-strange-forest": dict(
        src="the-strange-forest-cover-art-1536x1024.png", out="the-strange-forest-cover-web-1600x1567.jpg", title="The Strange Forest", title_size=150,
        subtitle=[], panel=(20, 36, 52), panel_h=500),
}
c = COVERS[sys.argv[1] if len(sys.argv) > 1 else "new-nature"]
SRC, OUT = HERE / c["src"], HERE / c["out"]
TITLE, AUTHOR = c["title"], "VENKATESH RAO"
SUBTITLE, PANEL = c["subtitle"], c["panel"]
INK, SOFT = (246, 240, 226), (196, 206, 192)
IOWAN = "/System/Library/Fonts/Supplemental/Iowan Old Style.ttc"  # faces: 0 Roman, 2 Italic (6 Titling is caps-only)


def font(index: int, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(IOWAN, size, index=index)


def centred(d, y, text, f, fill, tracking=0):
    if tracking:
        widths = [d.textlength(c, font=f) for c in text]
        x = (W - (sum(widths) + tracking * (len(text) - 1))) / 2
        for c, w in zip(text, widths):
            d.text((x, y), c, font=f, fill=fill)
            x += w + tracking
    else:
        d.text(((W - d.textlength(text, font=f)) / 2, y), text, font=f, fill=fill)


art = Image.open(SRC).convert("RGB")
art = art.resize((W, round(art.height * W / art.width)), Image.LANCZOS)
panel_h = c["panel_h"]
cover = Image.new("RGB", (W, art.height + panel_h), PANEL)
cover.paste(art, (0, 0))
d = ImageDraw.Draw(cover)
d.line([(0, art.height), (W, art.height)], fill=(200, 184, 150), width=4)
y = art.height + 90
centred(d, y, TITLE, font(0, c["title_size"]), INK); y += 230
for line in SUBTITLE:
    centred(d, y, line, font(2, 54), SOFT); y += 72
d.line([(W / 2 - 50, y + 40), (W / 2 + 50, y + 40)], fill=SOFT, width=2)
centred(d, y + 85, AUTHOR, font(0, 40), INK, tracking=9)
cover.save(OUT, quality=88, optimize=True, progressive=True)
print(OUT, cover.size)
