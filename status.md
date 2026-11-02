# Status: New Nature

## Project
- **Title:** New Nature (working title)
- **Source:** New Nature thesis — 2026-06-17 Protocol Institute town-hall talk + new material
- **Type:** Book, written in public as a blyg
- **Status:** in-progress

## Outputs
| Format | Status | Notes |
|--------|--------|-------|
| Site   | in-progress | Blyg live at newnature.venkateshrao.com — book scaffold published (vanilla studio 0.50.0 + blykker sync) |
| Ebook  | not-started | |
| Print  | not-started | |

## Active / Open
- **AI key:** paste the Anthropic key into `Code/.env.keys` → `ANTHROPIC_KEY_BLYGS_NEWNATURE=` (placeholder there), then Claude sets it as the Worker's `AI_PROVIDER_KEY` and registers it in `devops/warnings-keys.md`.
- Cover art is 1024 px, not print-ready; needs a higher-resolution source for print.
- Start writing: Preface and Chapter 1 are placeholders. See `AUTHORING.md`.

## Notes
- 2026-11-02 — Project created. Local git repo `main`, GitHub `vgururao/newnature` (private). Inbox, `sources.md`, `blykker-notes.md`, `blyg.md`. Blyg provisioned on the personal Cloudflare account: D1 `blyg-newnature`, R2 `blyg-newnature-media`, Worker `blyg-newnature` on Custom Domain `newnature.venkateshrao.com`, deployed from the studio repo's private config (`newnature` env) at v0.50.0; live checks pass. Sibling project `Code/blygger-protocol/blykker` created dormant (GitHub `blygger/blykker`, public, created after Venkat granted permission). Secret generation by Claude was blocked by the auto-mode classifier, so it is a script for Venkat to run.

- 2026-11-02 (later) — Book-blyg design: `book.json` (settings, sections, 6 references, index terms hardness/immutability), driven by blykker phase 1 (`blykker/PLAN.md`, `tools/blykker.py`, `design/book-layout.html`). Seeding blocked until the owner secrets exist.

- 2026-11-02 (evening) — Owner secrets set (script run by Claude on Venkat's go-ahead; registered in `.env.keys`, copy in `.env`); AI key placeholder added. Composed cover (`scripts/make_cover.py`). Seeded and published via blykker: cover (front page), title page, Contents, Preface, Chapter 1, References + 6 reference fragments, Index (hardness, immutability), About. Masthead menu = Contents · Start reading · About; bottom links = Blykker line. Custom "Book" palette, book font. `AUTHORING.md` written. Verified by screenshots.

- 2026-11-02 (evening) — Venkat confirmed all six references. Cover rights recorded (titles.xyz, Bucket Art model, from Humboldt's public-domain Chimborazo diagram) in the new image register `images/index.json`; images renamed to `<book>-<subject>-<variant>-<W>x<H>`; credit added to the title page (published).

## Instructions for Agents
After each work session, update this file:
1. Change the **Status** field to reflect current state (e.g., `not-started`, `in-progress`, `blocked`, `done`)
2. Update the Outputs table with current status of each format
3. Add dated notes at the bottom describing what was done
