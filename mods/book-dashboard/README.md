# book-dashboard

New Nature's private project page, and the prototype for the same thing in blykker. New Nature only for
now. Book config is generated from `book.json`; nothing is generalized yet.

It's a Studio extension at `/studio/ext/book-dashboard`, linked from the top of the main menu and from the
Contents entry in the Studio's reading view. Everything goes through the owner's session, so its one
server route is an owner read (reference lookup), and public pages and feeds are unaffected.

## What the page shows

From the top:

1. **Status:** "Rebuild needed: N items" or "Up to date", with a small Check again. The plan runs when the
   page loads and when its tab regains focus, and only reads. If it can't run, the page shows an error,
   never "Up to date". A held section with nothing left to write isn't counted, since only publishing it can
   settle it.
2. **The button**, only when there's something to do. It says what it will do: "Rebuild and publish 3
   sections", or "Update 1 draft (nothing gets published)". It's a port of `blykker.py sync`. It re-reads
   each section first, and stops if one changed since the plan.
3. **Pending changes** in plain words ("Next link → Pinched vs. Warped", "Index: 2 entries added"), noting
   where a draft stays private, with the raw diff behind a disclosure.
4. **The last rebuild's report:** what changed in each section, with a link to its public page and its editor,
   and any section held and why. It stays until dismissed or replaced, in this browser only.
5. **The sections:** Contents order, state, word counts (author text only), and which need a rebuild.

The links to the page don't show the status: a link would have to read every section on each Studio page
load, and an extension can't change core labels such as the one under More.

## The main menu

The page asks for the main-menu entry with `page.mainMenu: { icon, zone: 'top' }` (zones: studio 0.59.0+, PR #143),
so Dashboard sits at the top of the menu, above reading. The studio decides: if another page takes `top`, Dashboard
moves down a zone. Before zones (0.57.0–0.58.x, PR #133) it sat above compose; the temporary patch from before 0.57.0
was removed at the 0.58.1 upgrade (2026-11-09).

## Chapter navigation in the editor

The extension also fills `editorRegions` (studio 0.59.0+, PR #144): the two nav blocks a rebuild writes (the nav
line and `[blykker-nav-top]: #` under the heading, `[blykker-nav-bottom]: #` and the nav line at the end) are held
out of the full editor's text box. The draft, preview and publish keep the whole text. "chapter navigation hidden ·
show" beside the counts shows them, read-only. `extension/ui/regions.ts` holds the ranges; it is pure.

## Adding a reference

**+REF**, a boxed button beside the counts (composer and full editor), opens a sheet. Paste a URL, DOI or ISBN, or type a rough
citation ("polanyi tacit dimension"). The extension's one server route, `GET /api/ext/book-dashboard/lookup?q=`
(owner read), finds the source: a page's citation, Open Graph and JSON-LD metadata; Crossref, then DataCite, for a
DOI; Open Library for an ISBN; Crossref and Open Library searched for a rough citation (pick one of up to six). Only
public http(s) addresses are fetched.

**Asking the model.** A rough citation that no keyword hit matches (under 70% of its words in any hit's title and
authors) is a description, so the sheet asks the model once on its own; after any rough search, "ask the model" asks
by hand. The route (`ask=1`) calls the studio's own `complete()` with the blyg's **TK generation model** (Settings;
`claude-sonnet-5-5` here), so it uses the blyg's key and counts against the daily AI budget (`AI_DAILY_CALL_LIMIT`).
The model only suggests works; each suggestion is kept only if Crossref, DataCite, Open Library or the page itself
confirms it (most title words and the first author), and the entry is written from the registry's record. Suggestions
nothing confirms are named in a note. If the model confirms nothing, the keyword hits stay.

The sheet writes the entry in the book's style (Chicago, as the first six references were written; five of them come
back identical from their URLs) and a label ("Polanyi 1966", "LeCun et al. 2015"), both editable. If the book already
has the source (same DOI, address or title), it says so and offers that one's citation. **Add and publish reference**
creates the `[blykker-ref]: #` fragment, publishes it (a draft reference would be a dead link for readers; each one is
a feed item), and copies `[[id | label]]` to the clipboard to paste. The slot can't insert at the cursor. References
lists it after the next rebuild. The sheet also lists the book's references, filterable, each with **cite**.

## Books on the shelf

If the front page carries `[blykker-shelf]: #`, the page reads the books from it live, shows a Bookshelf dropdown
(remembered per browser) and works on the selected book only. If two books claim one section it shows an error
and offers no rebuild. Otherwise it falls back to the one book compiled in from `book.json`. `extension/ui/shelf.ts`
has the marker forms, and `shelf/setup.mts` is the ordered change to a shelf, which only runs on a local studio for
now.

## Files

| Path | What it is |
|---|---|
| `extension/ui/plan.ts` | The port: what a rebuild would change. Pure. |
| `extension/ui/apply.ts` | Applies a plan, including the swap for sections with drafts. |
| `extension/ui/shelf.ts` | Reads the shelf and each book from their markers. |
| `extension/ui/quickadd.tsx`, `refs.ts` | "+REF": the sheet; formatting, labels and matching (pure). |
| `extension/lookup.ts`, `server.ts`, `contract.ts` | The lookup route (`lookup.ts` is pure apart from the `fetch` it is given). |
| `extension/ui/regions.ts` | The nav blocks held out of the full editor (`editorRegions`). Pure. |
| `extension/ui/index.tsx`, `dashboard.css` | The page. |
| `install.sh` | Vendors this into a studio tree and generates `book.ts` from `book.json`. |
| `test/` | Parity with `blykker.py`, and draft safety against a local studio. |

## Sections with drafts

Publish sends the whole working copy, so a section with unpublished edits is rebuilt like this: copy the
draft to this browser's storage, set the working copy to the published text plus new nav, publish, then put
the draft back with its own new nav, and read it back. If a step fails, the draft goes back. If it can't go
back, the dashboard offers the saved copy until you restore or delete it. A newer edit from elsewhere is
never overwritten.

A section is held, with only its draft updated, if republishing would also publish something else or lose
something: generated text in the published version (its disclosure would go), a changed stub, or a new
attachment.

## Build and deploy

Build from a separate worktree at the version the node runs. `install.sh` edits `extensions/catalog.ts` and
`extensions.local.json`, which apply to every node a tree builds, so never run it in the shared checkout.

```bash
cd ../../blygger-protocol/blygger-studio
git worktree add --detach /tmp/studio-dash v<live version>       # read it from blyg.json's generator
cp wrangler.private.jsonc /tmp/studio-dash/
cd /tmp/studio-dash && npm ci
<this folder>/install.sh /tmp/studio-dash
npm run build
env -u CLOUDFLARE_API_TOKEN npx wrangler deploy --config wrangler.private.jsonc --env newnature
```

Then turn it on in Settings → extensions (it stays on across deploys).

**A deploy that doesn't vendor this drops the page.** That includes `npm run deploy:all` from the studio
checkout. Nothing is lost when that happens: re-run the steps above. Saved draft copies stay in the browser.

## Tests

From the studio worktree, after `install.sh`:

```bash
# Parity: snapshot the live book (read-only; holds drafts, so keep it out of the repo), then compare.
<this folder>/test/snapshot.py /tmp/snapshot.json
node --import tsx <this folder>/test/parity.mts /tmp/snapshot.json $PWD/extensions/book-dashboard/ui/plan.ts

# Editor regions: the box shows each section without its nav (texts.json: id → { text }, read-only, holds drafts).
node --import tsx <this folder>/test/regions.test.mts /tmp/texts.json $PWD/extensions/book-dashboard/ui

# References: formatting and matching; --live also looks up the six hand-written references and compares.
node --import tsx <this folder>/test/refs.test.mts $PWD/extensions/book-dashboard --live

# Draft safety, against a disposable local studio with OWNER_PASSWORD=test-password and high API limits.
npx wrangler dev --port 8799 --persist-to /tmp/dash-state
node --import tsx <this folder>/test/apply.test.mts http://127.0.0.1:8799 $PWD/extensions/book-dashboard/ui
```

## Not ported

- Settings other than the two menus and `linksThreads`: `blykker.py sync` still applies the rest of
  `book.json`'s settings.
- `seed`, and writing ids back to `book.json`. A new section in `book.json` needs a re-vendor and deploy.
