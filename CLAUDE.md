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
| `blykker-notes.md` | Feature to-do and friction log for blykker, gathered while writing (see below). |
| `DEVLOG.md` | Session log, newest first (covers blykker while it is run from here). |
| `status.md` | Current state and open items (the Dashboard reads it). |
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

`Code/blygger-protocol/blykker/` (repo `blygger/blykker`, public) is a configuration-first mod of
blygger-studio for book-like blygs. **This book is its pilot: its first user and its requirements source.** While writing:

- When the vanilla studio gets in the way of book-shaped work (chapters, ordering, TOC, manuscript
  export, revision of long items…), log it in `blykker-notes.md` here — dated, concrete, one item each.
- blykker phase 1 is a config + editorial assistant (`blykker/PLAN.md`). Book structure is edited in the
  **Contents thread**; then run `../../blygger-protocol/blykker/tools/blykker.py book.json sync` (try
  `--dry-run` first; a real run publishes, so only when Venkat says so).
- Markers: `[index: term]: #` on its own line after a paragraph marks an index entry (invisible on the site).
  Notes and references are fragments; see PLAN.md.
- blykker is a mod of the studio, not a client: this blyg stays on stock blygger-studio, with blykker mods compiled in as studio extensions when they exist.

## Session rituals

**Base:** [`Code/devops/rituals.md`](../../devops/rituals.md) — v1.1. Startup is S1–S7, wrap-up is W0–W7 (IDs reserved).
Everything below is this project's **local config**; it adds to the base and never replaces it.

**Ritual config**
- **Log:** `DEVLOG.md`, one numbered entry per session, newest first, covering blykker work too.
  `status.md` holds state and *Active / Open* (the Dashboard reads it). Add a `vgr-books/registry.json`
  entry once the book reaches beta (Publishing convention).
- **Scope:** this project **runs blykker** (`Code/blygger-protocol/blykker/`) until blykker is managed on
  its own. Every step covers both repos.
- **Startup extras (S5):** (a) anything new in `inbox/` since the last session (`git status --short inbox/`,
  `ls -t inbox/ | head`); (b) blykker repo state (`git -C ../../blygger-protocol/blykker status --short`,
  unpushed commits); (c) `blykker.py book.json sync --dry-run`, which should report no changes. Any change it
  reports is a structural edit made in the studio since the last sync.
- **Verification (W2):** live section pages 200 and generator string; `sync --dry-run` clean; for writing,
  read what changed; for layout or menu changes, look at the page (headless Chrome screenshot).
- **Wrap-up extras (after W5):** W5a — friction or feature ideas go in `blykker-notes.md`. W5b — blykker:
  commit and push, add a one-line state note to `blykker/status.md`, keep `book.template.json` in step with
  `book.json` when the format changes.
- **Deploy policy:** deploy and publish to the blyg as we work (Venkat, 2026-11-02); say what was published.
- **Carry-overs (S6):** none
