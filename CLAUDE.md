# New Nature — Book Project

> **Environment rules, keys & safety policies:** see [`Code/CLAUDE.md`](../../CLAUDE.md) and
> [`Publishing/CLAUDE.md`](../CLAUDE.md) — read before starting work.

A book on the **New Nature** thesis, written by Venkat with Claude's assistance and published
in progress as a blyg at **https://newnature.venkateshrao.com/**. Created 2026-11-02.

Repo: `vgururao/newnature` (private, branch `main`).

## Layout

| Path | What it is |
|------|-----------|
| `inbox/` | Raw working materials Venkat drops in — notes, drafts, transcripts, PDFs, images. Unprocessed. See `inbox/README.md`. |
| `sources.md` | Source material by URL — links to read, cite or mine, with a line on why each matters. |
| `blyg.md` | The blyg: where it is deployed, how to deploy/upgrade it, and its state. |
| `AUTHORING.md` | **How to write the book in the studio**: section item ids, chapters, notes, references, index terms, images, running sync. |
| `images/` | All book images, named `<book>-<subject>-<variant>-<W>x<H>`. **`images/index.json` is the image register** (files, credit, rights, blyg media URL, where used). `images/print/` is Dropbox only. See `images/README.md`. |
| `book.json` | The book's blykker config: blyg, settings (theme, font), sections and their item ids, reference entries, index terms. Ids are written back by `blykker.py seed`. |
| `blykker-notes.md` | Requirements for the book-specific client, gathered while writing (see below). |
| `status.md` | Session log and open items (the Dashboard reads it). |
| `scripts/` | Project scripts. `set-blyg-secrets.sh` is the one-time secret setup (Rule 1 order). |

Chapters will get their own folder once writing starts; decide the shape then, not now.

## Working rules

- **Inbox is raw.** Don't edit files in `inbox/` in place; extract, summarize or draft from them
  into other files. Binary/media files in `inbox/` stay in Dropbox and are gitignored (see
  `.gitignore`); text and markdown are tracked.
- **Venkat writes the book.** Claude assists: organizing material, outlining, drafting on request,
  editing. Follow the GenEssays editing preferences in Claude memory (no stubs, no meta-commentary).
- **Prior art in this tree:** the June 17 2026 town-hall talk on the New Nature thesis, edited to an
  essay — `../GenEssays/new-nature-talk/processed/draft.md` is its source of truth. Also related:
  `Code/protocol-institute/humboldt/` (research agent investigating "new nature"). **Never enter
  `protocol-institute/` without asking** (Claude memory).
- **The blyg is the publishing surface.** Writing gets published there through the studio at
  `https://newnature.venkateshrao.com/studio`. Venkat has authorized deploying/publishing changes as we work (2026-11-02);
  still say what was published.

## Sibling project: blykker

`Code/blygger-protocol/blykker/` (repo `blygger/blykker`, public) is the book-specific fork of the
blygger studio client. **This book is its first user and its requirements source.** While writing:

- When the vanilla studio gets in the way of book-shaped work (chapters, ordering, TOC, manuscript
  export, revision of long items…), log it in `blykker-notes.md` here — dated, concrete, one item each.
- blykker phase 1 is a config + editorial assistant (`blykker/PLAN.md`). Book structure is edited in the
  **Contents thread**; then run `../../blygger-protocol/blykker/tools/blykker.py book.json sync` (try
  `--dry-run` first; a real run publishes, so only when Venkat says so).
- Markers: `[index: term]: #` on its own line after a paragraph marks an index entry (invisible on the site).
  Notes and references are fragments; see PLAN.md.
- If blykker ever forks the studio, this blyg's deployment moves to it (see `blyg.md`).

## Session rituals

**Base:** [`Code/devops/rituals.md`](../../devops/rituals.md) — v1.1. Startup is S1–S7, wrap-up is W0–W7 (IDs reserved).
Everything below is this project's **local config**; it adds to the base and never replaces it.

**Ritual config**
- **Log:** `status.md` (dated entries). Add a `vgr-books/registry.json` entry once the book reaches beta (Publishing convention).
- **Startup extras (S5):** list anything new in `inbox/` since the last session (`git status --short inbox/` plus untracked binaries via `ls -t inbox/ | head`).
- **Verification (W2):** for writing, read what changed; for blyg changes, open the live page.
- **Wrap-up extras (after W5):** W5a — if any blykker-relevant friction came up, add it to `blykker-notes.md`.
- **Deploy policy:** only if Venkat says so (publishing to the blyg counts).
- **Carry-overs (S6):** blyg AI key — Venkat pastes `ANTHROPIC_KEY_BLYGS_NEWNATURE` into `Code/.env.keys`, then set it as the Worker's `AI_PROVIDER_KEY` (see `blyg.md`).
