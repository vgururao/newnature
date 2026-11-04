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
  *Started 2026-11-04:* the word-count studio extension (blygger-studio PR #117) gives published
  and draft word counts per section, rolled up over the Contents outline (Studio only, not yet
  deployed here). Note it counts nav lines and transcluded references, unlike the author-text-only
  count above. Counts per edition are planned in `blykker/PLAN.md` → *Editions*.
- [ ] **Editions** (2026-11-04). A "newest stable" edition and a "bleeding edge" edition, like software
  releases, plus older editions from older pins. Each edition gets a word count that never changes. The
  dashboard shows how far drafting is ahead of published, and published ahead of stable. Plan:
  `blykker/PLAN.md` → *Editions*.
- [ ] **Several books on one blyg** (2026-11-04). This blyg may host several related books on the theme.
  Plan: a shelf front page whose outline lists each book; per-book config, nav chains, notes,
  references, index and editions; shelf-wide `notebook` (private) and `meta` (public) hoppers, and a
  `<slug>-manuscript` staging hopper per book. The unit is a **book project**: `blykker.py new-book`
  seeds a book's config, section threads, staging hopper, shelf entry and local folder in one step.
  Decided: "New Nature" is both the shelf and volume 1 (named like a ship class for its first ship); a
  later volume might be *The New Nature of Computing*.
  Also decided: the notebook is private drafts by default; manuscript hoppers are staging only. Venkat is
  building a studio feature that distinguishes private from draft; revisit the notebook when it lands.
  `blykker/PLAN.md` → *Several books on one blyg*.
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

- 2026-11-04 — **sync would publish unpublished author edits.** Preface had a pending draft paragraph; sync's only change was stripping a trailing space, yet it reports "update + publish", which would make the draft public. Sync must not publish a thread whose working copy has author edits it didn't make.

- 2026-11-02 — Studio has no book navigation, and public pages can't be restyled by config (no custom CSS). Nav is now a `blykker.py sync` job; layout is phase 2 (`blykker/design/book-layout.html`).
- 2026-11-02 — HTML comments render as visible text (markdown `html: false`), so markers use link reference definitions on their own line.
- 2026-11-02 — Published reference and note fragments show up in the public feed as items.

## Taken up by blykker
