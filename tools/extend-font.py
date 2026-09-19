"""Complete ObelixPro's French coverage from shapes the font already contains.

    python3 tools/extend-font.py <source.ttf> <output.ttf>

Requires fonttools.

The font ships no accented Latin letters at all, so every é/è/à/ç in a subtitle
fell back to Arial Black. It does however contain the accent shapes, drawn by
the author inside other glyphs: the acute strokes inside the double acute, the
caron inside Š (a circumflex once flipped), the dots inside Ÿ, the cedilla
inside Ş. Those are lifted out into standalone accent glyphs, then recombined
with the base letters as composites.

The font is unicase — a/A, e/E … are byte-identical — so one accented glyph
serves both cases, and both code points are mapped to it.
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.misc.transform import Transform

SRC, DST = sys.argv[1], sys.argv[2]
font = TTFont(SRC)
glyf, hmtx, cmap_best = font["glyf"], font["hmtx"], font.getBestCmap()
glyphset = font.getGlyphSet()


def contours(glyph_name):
    """Recorded drawing commands, split one list per closed contour."""
    pen = RecordingPen()
    glyphset[glyph_name].draw(pen)
    out, current = [], []
    for op, args in pen.value:
        current.append((op, args))
        if op in ("closePath", "endPath"):
            out.append(current)
            current = []
    return out


def bounds_of(commands):
    pen = BoundsPen(None)
    for op, args in commands:
        getattr(pen, op)(*args)
    return pen.bounds


def add_glyph(name, commands, transform=None, advance=None):
    pen = TTGlyphPen(None)
    sink = TransformPen(pen, transform) if transform else pen
    for op, args in commands:
        getattr(sink, op)(*args)
    glyph = pen.glyph()
    glyf[name] = glyph
    glyph.recalcBounds(glyf)
    hmtx[name] = (advance if advance is not None else int(glyph.xMax), 0)
    return (glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax)


# --- 1. lift the accent shapes out of the glyphs that carry them -------------
flat = lambda groups: [cmd for g in groups for cmd in g]

acute_src = contours("hungarumlaut")[0]          # one of the two strokes
caron_src = contours("Scaron")[1]                # the wedge over the S
dots_src = flat(contours("Ydieresis")[1:3])      # the two dots over the Y
cedilla_src = contours("Scedilla")[1]            # the tail under the S
tilde_src = contours("tilde")[0]

ab = bounds_of(acute_src)
cb = bounds_of(caron_src)

ACCENTS = {
    "acuteX": (acute_src, None),
    # A grave is an acute mirrored across its own vertical centre.
    "graveX": (acute_src, Transform().translate(ab[0] + ab[2], 0).scale(-1, 1)),
    # The caron flipped vertically is exactly this font's circumflex.
    "circumflexX": (caron_src, Transform().translate(0, cb[1] + cb[3]).scale(1, -1)),
    "dieresisX": (dots_src, None),
    "cedillaX": (cedilla_src, None),
    "tildeX": (tilde_src, None),
}
accent_bounds = {name: add_glyph(name, cmds, tf) for name, (cmds, tf) in ACCENTS.items()}


# --- 2. recombine base letter + accent ---------------------------------------
# Every letter tops out around y=663, and the author's own accented glyphs
# (Ÿ, Š, Ё) sit at y≈630-830, so the lifted accents keep their native height
# and only need centring horizontally over the base.
# How wide an accent may be relative to the letter it sits on.
ACCENT_WIDTH_RATIO = 1.15

# The cedilla was lifted from Ş, where the author hung it at y=-241 — far past
# this font's -97 descender, and detached from the letter. Raising it attaches
# it to the C and keeps it from colliding with the line below.
ACCENT_RAISE = {"cedillaX": 70}

ACCENTED = {
    "acuteX":      [("E", "É", "é"), ("A", "Á", "á"), ("I", "Í", "í"), ("O", "Ó", "ó"), ("U", "Ú", "ú")],
    "graveX":      [("A", "À", "à"), ("E", "È", "è"), ("I", "Ì", "ì"), ("O", "Ò", "ò"), ("U", "Ù", "ù")],
    "circumflexX": [("A", "Â", "â"), ("E", "Ê", "ê"), ("I", "Î", "î"), ("O", "Ô", "ô"), ("U", "Û", "û")],
    "dieresisX":   [("A", "Ä", "ä"), ("E", "Ë", "ë"), ("I", "Ï", "ï"), ("O", "Ö", "ö"), ("U", "Ü", "ü")],
    "tildeX":      [("N", "Ñ", "ñ"), ("A", "Ã", "ã"), ("O", "Õ", "õ")],
    "cedillaX":    [("C", "Ç", "ç")],
}

new_cmap = {}
made = []
for accent, rows in ACCENTED.items():
    ax0, ay0, ax1, ay1 = accent_bounds[accent]
    for base, upper, lower in rows:
        base_glyph = cmap_best[ord(base)]
        bx0, by0, bx1, by1 = bounds_of(flat(contours(base_glyph)))

        # The accents were drawn for wide letters (Y, S), so over a narrow one
        # like I they overhang far enough to collide with its neighbours. Shrink
        # them to the base letter's width in that case — never enlarge — pivoting
        # on the accent's bottom edge so it keeps the height the author drew it at.
        base_ink, accent_ink = bx1 - bx0, ax1 - ax0
        scale = min(1.0, (base_ink * ACCENT_WIDTH_RATIO) / accent_ink)
        # x' = scale·x + dx, chosen so the scaled accent centres on the letter;
        # y' = scale·y + ay0(1−scale), which pins the accent's bottom edge to the
        # height the author drew it at whatever the scale.
        dx = round((bx0 + bx1) / 2 - scale * (ax0 + ax1) / 2)
        dy = round(ay0 * (1 - scale)) + ACCENT_RAISE.get(accent, 0)

        name = f"{base}_{accent}"
        pen = TTGlyphPen(glyf.glyphs)
        pen.addComponent(base_glyph, Transform())
        pen.addComponent(accent, Transform(scale, 0, 0, scale, dx, dy))
        glyf[name] = pen.glyph()
        hmtx[name] = hmtx[base_glyph]
        new_cmap[ord(upper)] = name
        new_cmap[ord(lower)] = name     # unicase: one shape, both code points
        made.append(upper)

# --- 3. ligatures and the remaining punctuation ------------------------------
def side_by_side(name, left, right, overlap, codepoints):
    lg, rg = cmap_best[ord(left)], cmap_best[ord(right)]
    lb = bounds_of(flat(contours(lg)))
    rb = bounds_of(flat(contours(rg)))
    dx = round(lb[2] - overlap - rb[0])
    pen = TTGlyphPen(glyf.glyphs)
    pen.addComponent(lg, Transform())
    pen.addComponent(rg, Transform().translate(dx, 0))
    glyf[name] = pen.glyph()
    hmtx[name] = (int(dx + hmtx[rg][0]), hmtx[lg][1])
    for cp in codepoints:
        new_cmap[cp] = name

side_by_side("OE_lig", "O", "E", 95, [0x0152, 0x0153])   # Œ œ
side_by_side("AE_lig", "A", "E", 130, [0x00C6, 0x00E6])  # Æ æ

# French guillemets: the font has the single-angle pair, so double them up.
for name, single, cp in (("guillemotleft", "guilsinglleft", 0x00AB),
                         ("guillemotright", "guilsinglright", 0x00BB)):
    src = flat(contours(single))
    sb = bounds_of(src)
    step = round((sb[2] - sb[0]) * 0.85)
    pen = TTGlyphPen(None)
    sink_a = TransformPen(pen, Transform())
    sink_b = TransformPen(pen, Transform().translate(step, 0))
    for sink in (sink_a, sink_b):
        for op, args in src:
            getattr(sink, op)(*args)
    glyf[name] = pen.glyph()
    hmtx[name] = (int(hmtx[single][0] + step), hmtx[single][1])
    new_cmap[cp] = name

# Degree sign: the o, shrunk and raised.
o_glyph = cmap_best[ord("O")]
ob = bounds_of(flat(contours(o_glyph)))
pen = TTGlyphPen(glyf.glyphs)
pen.addComponent(o_glyph, Transform().translate(0, 380).scale(0.45, 0.45))
glyf["degreeX"] = pen.glyph()
hmtx["degreeX"] = (int(round((ob[2] - ob[0]) * 0.45)) + 40, 0)
new_cmap[0x00B0] = "degreeX"

# The font already draws Ÿ and Ş but only maps their uppercase code points;
# being unicase, the lowercase ones belong on the very same glyphs.
for upper_cp, lower_cp in ((0x0178, 0x00FF), (0x015E, 0x015F)):
    if upper_cp in cmap_best:
        new_cmap[lower_cp] = cmap_best[upper_cp]

# --- 4. register the new code points -----------------------------------------
for table in font["cmap"].tables:
    if table.isUnicode():
        table.cmap.update(new_cmap)

# Composites have no bounds until their components are resolved, and maxp
# reads them.
for glyph_name in glyf.keys():
    glyf[glyph_name].recalcBounds(glyf)

font["maxp"].recalc(font)
font.save(DST)

print(f"accents fabriqués : {', '.join(ACCENTS)}")
print(f"lettres accentuées : {len(made)} ({''.join(made)})")
print(f"points de code ajoutés : {len(new_cmap)}")
