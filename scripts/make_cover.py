#!/opt/homebrew/bin/python3
"""Compose the cover: the illustration above a title panel (book-jacket proportions).

  scripts/make_cover.py   -> images/cover/cover-web.jpg (1600 px wide)

The source illustration is 1024x768, so this is a web cover only; a print cover
needs a higher-resolution source (see images/cover/README.md).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent.parent / "images" / "cover"
SRC, OUT = HERE / "newnaturecover-original.png", HERE / "cover-web.jpg"
W = 1600
TITLE, AUTHOR = "New Nature", "VENKATESH RAO"
SUBTITLE = ["How artificial intelligence and computational", "hardness are rewilding the planet"]
PANEL, INK, SOFT = (36, 58, 54), (246, 240, 226), (196, 206, 192)
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
panel_h = 650
cover = Image.new("RGB", (W, art.height + panel_h), PANEL)
cover.paste(art, (0, 0))
d = ImageDraw.Draw(cover)
d.line([(0, art.height), (W, art.height)], fill=(200, 184, 150), width=4)
y = art.height + 90
centred(d, y, TITLE, font(0, 168), INK); y += 230
for line in SUBTITLE:
    centred(d, y, line, font(2, 54), SOFT); y += 72
d.line([(W / 2 - 50, y + 40), (W / 2 + 50, y + 40)], fill=SOFT, width=2)
centred(d, y + 85, AUTHOR, font(0, 40), INK, tracking=9)
cover.save(OUT, quality=88, optimize=True, progressive=True)
print(OUT, cover.size)
