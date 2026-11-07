#!/opt/homebrew/bin/python3
"""Read-only: snapshot the live book and record what blykker.py sync would write for it and for
synthetic variations of it. Writes to the given file, which holds drafts, so keep it out of the repo.

  snapshot.py <out.json>
"""
import contextlib, copy, io, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT.parents[1] / "blygger-protocol/blykker/tools"))
import blykker

book, pw = blykker.load_book(ROOT / "book.json")
live = blykker.Blyg(book["blyg"], pw)
cache = {}
missing = set()


def read(id):
    if id not in cache:
        cache[id] = live.item(id)
    return cache[id]


class Recorder:
    """A Blyg whose reads come from a dict and whose writes land in memory."""
    def __init__(self, items):
        self.items, self.writes, self.settings = items, {}, None

    def item(self, id):
        if id not in self.items:
            self.items[id] = copy.deepcopy(read(id))
        return self.items[id]

    def write(self, item, text, publish, note):
        self.writes[item["id"]] = {"text": text, "publish": publish}

    def api(self, method, path, body=None):
        assert (method, path) == ("PATCH", "/settings")
        self.settings = body


def fragment(id, text):
    return {"id": id, "kind": "fragment", "status": "public", "revision": 1, "dirty": False, "contentMd": text,
            "published": {"contentMd": text}, "media": [], "publishedMedia": [], "stubOf": None}


s = {k: v["id"] for k, v in book["sections"].items() if v.get("id")}
OOZE = "42x3h0t42qprq2qrshamhrd97x"
NOTE, NOTE2, REF, IMG = ("1" * 25 + c for c in "abcd")


def clean(items, id, text):
    items[id].update(contentMd=text, dirty=False, published={**(items[id]["published"] or {}), "contentMd": text})


def base():
    return {id: copy.deepcopy(read(id)) for id in [*s.values(), OOZE]}


def reordered(items):
    t = items[s["toc"]]["contentMd"]
    a, b = f"[[{s['ch1']} | Chapter 1: Introduction]]", f"[[{OOZE} | Chapter: Ooze and Hardness]]"
    assert a in t and b in t
    clean(items, s["toc"], t.replace(a, "\0").replace(b, a).replace("\0", b))


def apparatus(items):
    items[NOTE] = fragment(NOTE, "[blykker-note]: #\n\nA first note.")
    items[NOTE2] = fragment(NOTE2, "[blykker-note]: #\n\nA second note.")
    items[REF] = fragment(REF, "[blykker-ref]: #\n\nAaron, A. *First in the list*. 2026.")
    items[IMG] = fragment(IMG, "[blykker-image]: #\n\n![alt](x.png)\n\n[rights: CC]: #")
    text = items[OOZE]["contentMd"].replace(
        "[blykker-nav-bottom]: #",
        f"A claim.[[{NOTE2} | 9]] Another.[[{NOTE} | 9]] Again.[[{NOTE2}]] See [[{REF} | Aaron 2026]].\n\n"
        f"[index: ossification]: #\n\n[index: protocols; hardness of]: #\n\n[index: hardness 2]: #\n\n![[{IMG}]]\n\n[blykker-nav-bottom]: #")
    clean(items, OOZE, text)


def bare(items):
    for id in s.values():
        if id != s["about"]:
            clean(items, id, blykker.strip_nav(items[id]["contentMd"]) + "\n\n\n")
    clean(items, OOZE, blykker.strip_nav(items[OOZE]["contentMd"]))


def stale_cover(items):
    clean(items, s["cover"], items[s["cover"]]["contentMd"].replace(s["preface"], s["title"]))


def dirty_chapter(items):
    reordered(items)
    i = items[s["ch1"]]
    i.update(dirty=True, contentMd=i["contentMd"].replace("[blykker-nav-bottom]: #", "Draft.\n\n[index: SECRET]: #\n\n[blykker-nav-bottom]: #"))


def plain_draft(items):
    reordered(items)
    items[OOZE].update(status="draft", published=None, version=0)


SCENARIOS = {"live": None, "reordered": reordered, "apparatus": apparatus, "bare": bare, "stale_cover": stale_cover,
             "dirty_chapter": dirty_chapter, "plain_draft": plain_draft}
# The same book once its structure is declared in its Contents, as on a shelf.
MARKERS = "\n\n" + "\n".join(
    [f"[book-{r}]: /t/{s[r]}/" for r in ("cover", "title", "references", "index")]
    + [f"[book-ref {r['id']}]: #" for r in book.get("references", []) if r.get("id")]
    + [f"[book-term: {t}]: #" for t in book.get("index", {}).get("terms", [])])


def with_markers(change):
    def apply(items):
        if change:
            change(items)
        def marked(text):
            bottom = "[blykker-nav-bottom]: #"
            return text.replace(bottom, f"{MARKERS.strip()}\n\n{bottom}") if bottom in text else f"{text.rstrip()}{MARKERS}"

        i = items[s["toc"]]
        i["contentMd"] = marked(i["contentMd"])
        if i["published"]:
            i["published"]["contentMd"] = marked(i["published"]["contentMd"])
    return apply


SCENARIOS |= {f"{name}+markers": with_markers(change) for name, change in list(SCENARIOS.items())}
out = {"book": {
    "blyg": book["blyg"], "notes": book.get("notes", "chapter"),
    "sections": {k: {"role": v["role"], "title": v["title"], **({"id": v["id"]} if v.get("id") else {})} for k, v in book["sections"].items()},
    "references": [r["id"] for r in book.get("references", []) if r.get("id")],
    "indexTerms": book.get("index", {}).get("terms", []), "menu": book.get("menu")}, "scenarios": {}}
for name, change in SCENARIOS.items():
    items = base()
    if change:
        change(items)
    before = copy.deepcopy(items)
    rec = Recorder(items)
    log = io.StringIO()
    with contextlib.redirect_stdout(log):
        blykker.sync(ROOT / "book.json", book, rec, dry=False)
    out["scenarios"][name] = {"items": list(items.values()), "writes": rec.writes, "settings": rec.settings, "log": log.getvalue(), "before": list(before.values())}
Path(sys.argv[1]).write_text(json.dumps(out, ensure_ascii=False), "utf-8")
print({k: len(v["writes"]) for k, v in out["scenarios"].items()})
