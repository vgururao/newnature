# blykker notes — requirements from writing this book

Features wanted for this blyg, to be built here first and then generalized into blykker
(`Code/blygger-protocol/blykker/`), plus friction found with the vanilla studio along the way.

## Feature to-do

Each item gets built for New Nature first and then generalized into blykker. A built item moves to
**Taken up by blykker** with a pointer to where it lives.

- [ ] **Manuscript statistics** (2026-11-02). Word count for the whole book and for each chapter
  (author text only: no nav lines, markers, or transcluded notes and references), plus counts of
  notes, references (cited / listed), index terms and locators, images (and how many lack rights
  or a print file), and sections by state (draft, published, unpublished changes).
  *First cut:* a `blykker.py stats` command that prints a table. *Later:* the same numbers in the
  studio, owner-only (an extension page, or an unpublished "Manuscript" thread that sync keeps up
  to date). Word counts per chapter over time would make a progress chart.
- [ ] **Composition start page** (2026-11-02). A studio-side page listing the book's sections in
  Contents order, each one click from its editor, with its word count and state. The front page is
  for readers; this one is for writing. It must stay private.
  *Options:* a studio extension page at `/studio/ext/blykker` (extensions are compiled in by the
  operator, so no fork needed — see blygger-studio `docs/extensions.md`); or, as a stopgap, an
  unpublished draft thread of links that sync regenerates.
- [ ] **Rebuild navigation when the Contents change** (2026-11-02). Reordering, adding or deleting
  chapter links in the Contents thread should rebuild the navigation (and menus, cover link,
  notes, references, index) without asking Claude to run sync.
  *Options:* a "Rebuild" button in the studio (an extension; its UI can write through the owner
  session, so sync's logic would be ported to TypeScript); or a local watcher (launchd every few
  minutes: compare the Contents' published version with the last one synced, run sync only when it
  changed). The watcher is the quickest to build. Same as PLAN.md phase 1 "Trigger".

## Friction log

- 2026-11-02 — Studio has no book navigation, and public pages can't be restyled by config (no custom CSS). Nav is now a `blykker.py sync` job; layout is phase 2 (`blykker/design/book-layout.html`).
- 2026-11-02 — HTML comments render as visible text (markdown `html: false`), so markers use link reference definitions on their own line.
- 2026-11-02 — Published reference and note fragments show up in the public feed as items.

## Taken up by blykker
