# Images

Every image in the book is registered in **`index.json`**: its files, its credit and rights, and
where it appears on the blyg. The local files here are the masters. The blyg holds uploaded copies.

**Naming:** `images/<section>/<book>-<subject>-<variant>-<W>x<H>.<ext>`, for example
`new-nature-cover-web-1600x1850.jpg`. Variants: `art` or `source` (as supplied), `web` (what is
uploaded to the blyg), `print` (production resolution).

| Folder | What | Git |
|---|---|---|
| `cover/` | Cover art and composed covers | tracked |
| `fig/` | Figures, by chapter: `fig-1-1-…` | tracked (web) |
| `print/` | Print-resolution files | **Dropbox only** (gitignored, large) |

**Adding an image:**
1. Put the files here, named as above.
2. Add an `index.json` entry with credit and rights.
3. Upload the web file into an image-record fragment in the studio (see `../AUTHORING.md`). Put
   the same credit and rights in its markers, then record its media URL and item id here.
