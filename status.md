# Status: New Nature

## Project
- **Title:** New Nature (working title)
- **Source:** New Nature thesis — 2026-06-17 Protocol Institute town-hall talk + new material
- **Type:** Book, written in public as a blyg
- **Status:** in-progress

## Outputs
| Format | Status | Notes |
|--------|--------|-------|
| Site   | in-progress | Blyg live at newnature.venkateshrao.com — studio 0.54.1 + `mods/book-dashboard` (with a temporary main-menu patch, not stock) |
| Ebook  | not-started | |
| Print  | not-started | |

## Active / Open
- Book dashboard prototype live 2026-11-06 at `/studio/ext/book-dashboard` (`mods/book-dashboard/`, Worker `f783804b`, rollback `d226d31a`, studio v0.54.1). First live rebuild worked. **A deploy that doesn't vendor the mod removes the page and the menu patch**, including `npm run deploy:all` from the studio checkout; see the mod's README.
- **Waiting on Venkat, The Strange Forest:** approve the cover (`images/cover/the-strange-forest-cover-web-1600x1567.jpg`); publish it (15 permanent feed events, new front page, placeholder pages); retire `blykker.py sync` on this blyg (sync would reset the front page and menus after the change); masthead link name (Bookshelf proposed).
- **Waiting on Venkat, design:** core support for `[[index:]]` and `refyr` as a narrow exception to "everything in the mod"; where LLM calls for passes and `refyr` run, given browser-only extensions (`blykker-notes.md` → *Design decisions*).
- **Studio PRs open:** the studio session merges them, not this project. #131 comments to self and #133 main-menu entry are ready (no stray `/*` on the blyg; #133 API-surface gate cleared by Venkat). #125 word count and #126 focus view: conflict fixes with main in progress at last update, then CI; see each PR description. If #133 is rejected, keep the patch and call it permanent here.
- **Studio upgrade paused:** Venkat is waiting for 0.56. Resume from the mod's README against that tag and rerun its checks. Live is 0.54.1, Worker `f783804b`, with migration `0042_contacts` already applied (probably by the studio session, Venkat thinks; harmless). If `deploy:all` still lists this node, it should come out of the studio's `deploy-targets.json`.
- Sync hazard fixed 2026-11-06: sync no longer publishes a section with unpublished edits. Those sections keep stale published nav until they are published.
- Word-count extension: live here since studio 0.54.0 (2026-11-05, PR #117). Compiled in through the studio's gitignored `extensions.local.json` and enabled in Settings.
- Planned in `blykker/PLAN.md`: editions; several books on one blyg (shelf + book projects, hoppers). Decisions recorded there.
- **Feature to-do and decisions:** `blykker-notes.md`. Built-first item done as a prototype; next by plan: generalize the dashboard, the rich-editor prototype, the references pipeline.
- Cover art is 1024 px, not print-ready; needs a higher-resolution source for print.
- Start writing: Preface and Chapter 1 are placeholders. See `AUTHORING.md`.

## Notes
- 2026-11-02 — Project created. Local git repo `main`, GitHub `vgururao/newnature` (private). Inbox, `sources.md`, `blykker-notes.md`, `blyg.md`. Blyg provisioned on the personal Cloudflare account: D1 `blyg-newnature`, R2 `blyg-newnature-media`, Worker `blyg-newnature` on Custom Domain `newnature.venkateshrao.com`, deployed from the studio repo's private config (`newnature` env) at v0.50.0; live checks pass. Sibling project `Code/blygger-protocol/blykker` created dormant (GitHub `blygger/blykker`, public, created after Venkat granted permission). Secret generation by Claude was blocked by the auto-mode classifier, so it is a script for Venkat to run.

- 2026-11-02 (later) — Book-blyg design: `book.json` (settings, sections, 6 references, index terms hardness/immutability), driven by blykker phase 1 (`blykker/PLAN.md`, `tools/blykker.py`, `design/book-layout.html`). Seeding blocked until the owner secrets exist.

- 2026-11-02 (evening) — Owner secrets set (script run by Claude on Venkat's go-ahead; registered in `.env.keys`, copy in `.env`); AI key placeholder added. Composed cover (`scripts/make_cover.py`). Seeded and published via blykker: cover (front page), title page, Contents, Preface, Chapter 1, References + 6 reference fragments, Index (hardness, immutability), About. Masthead menu = Contents · Start reading · About; bottom links = Blykker line. Custom "Book" palette, book font. `AUTHORING.md` written. Verified by screenshots.

- 2026-11-02 (evening) — Venkat confirmed all six references. Cover rights recorded (titles.xyz, Bucket Art model, from Humboldt's public-domain Chimborazo diagram) in the new image register `images/index.json`; images renamed to `<book>-<subject>-<variant>-<W>x<H>`; credit added to the title page (published).

- 2026-11-02 19:14 PST — Session 1 closed; the full entry is in `DEVLOG.md` and supersedes the interim wrap-up below.
- **2026-11-02 15:15 PST — interim wrap-up (session 1).** Created the project and repo, the blyg (personal CF account, deployed from the studio's private config), sibling `blykker` (`blygger/blykker`, public; README states intent + this book as pilot). Book scaffold live and verified (all pages 200, sync dry-run clean). Open: AI key (placeholder in `.env.keys`), print-resolution cover art, start writing Preface/Ch1. Uncommitted by design: one-line index entries in `Publishing/CLAUDE.md` and `Code/CLAUDE.md` (Publishing has other pending edits; Code/ root isn't a repo).

- 2026-11-02 15:25 PST — AI enabled: Worker `AI_PROVIDER_KEY` set from `ANTHROPIC_KEY_BLYGS_VENKATESHRAO` (shared on Venkat's instruction; exception recorded in `.env.keys`, `devops/warnings-keys.md`); `aiModel`/`aiModelTk` = claude-sonnet-5-5, `aiModelChangelog` = claude-haiku-4-5 (Venkat) in `book.json`, synced.

## Instructions for Agents
After each work session, update this file:
1. Change the **Status** field to reflect current state (e.g., `not-started`, `in-progress`, `blocked`, `done`)
2. Update the Outputs table with current status of each format
3. Add dated notes at the bottom describing what was done
