# Status: New Nature

## Project
- **Title:** New Nature (working title)
- **Source:** New Nature thesis — 2026-06-17 Protocol Institute town-hall talk + new material
- **Type:** Book, written in public as a blyg
- **Status:** in-progress

## Outputs
| Format | Status | Notes |
|--------|--------|-------|
| Site   | in-progress | Blyg live at newnature.venkateshrao.com — studio 0.62.0 + `mods/book-dashboard` (stock studio, no patches) |
| Ebook  | not-started | |
| Print  | not-started | |

## Active / Open
- **Studio 0.62.0 live** (2026-11-17; redeployed 2026-11-18 as Worker `6aa42a52`, rollback `1148a4d9`). PRs #143 and #144 are in it: the Dashboard asks for menu zone `top` and hides the chapter nav in the full editor (`editorRegions`, `mods/book-dashboard/extension/ui/regions.ts`). Next: generalize the regions into blykker.
- **Contents mismatches to check (Venkat):** the Ontological Turn chapter is listed as “Chapter: The Ontological Turn Profligacy principle” (its heading says The Ontological Turn); Pinched is listed as “Pinched vs. Warped” but its heading is `#Chapter: Pinched vs. Strained` (no space, so it isn't a heading); The Sacred, the Profane, and the Monstrous has no `#` heading; two labels carry curly quotes.
- **Rebuild pending:** References needs the Dashboard rebuild for the reference Venkat added 2026-11-18 (dry-run: "References: update + publish").
- **Repo public** (2026-11-18, Venkat, to share it): `vgururao/newnature`. History scanned first: no secrets; it does show the Cloudflare account id and name in `blyg.md` (an identifier, not a credential).
- **Reference quick-add live** (2026-11-18, Worker `01999f52`, rollback `af473206`): a boxed **+REF** beside the counts; descriptions go to the TK model, confirmed in a registry in the composer and full editor (`mods/book-dashboard`, README → *Adding a reference*). Not yet used on the live blyg. Next: generalize into blykker.
- Book dashboard prototype live 2026-11-06 at `/studio/ext/book-dashboard` (`mods/book-dashboard/`). First live rebuild worked. **A deploy that doesn't vendor the mod removes the page**, including `npm run deploy:all` from the studio checkout; see the mod's README.
- **Waiting on Venkat, The Strange Forest:** approve the cover (`images/cover/the-strange-forest-cover-web-1600x1567.jpg`); publish it (15 permanent feed events, new front page, placeholder pages); retire `blykker.py sync` on this blyg (sync would reset the front page and menus after the change); masthead link name (Bookshelf proposed).
- **Waiting on Venkat, design:** core support for `[[index:]]` and `refyr` as a narrow exception to "everything in the mod"; where LLM calls for passes and `refyr` run (default set 2026-11-18 by reference lookup: server-side in the mod via the studio's `complete()`) (`blykker-notes.md` → *Design decisions*).
- **Studio PRs merged:** #125 word count, #126 focus view, #131 comments to self, #133 main-menu entry, all in 0.57.0; #143 menu zones and #144 editor regions in 0.59.0; 0.58.1 adds the follow-ups (comment opener rule and typing speed, focus tint, quick-edit word count).
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
