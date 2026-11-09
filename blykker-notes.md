# blykker notes — requirements from writing this book

Features wanted for this blyg, to be built here first and then generalized into blykker
(`Code/blygger-protocol/blykker/`), plus friction found with the vanilla studio along the way.

## Feature to-do

**Build process (Venkat, 2026-11-06):** prototype the basic idea on New Nature as a custom install mod; make
it part of the general blykker mod later, with suitable instructions; then back-apply that to New Nature.
A generalized item moves to **Taken up by blykker** with a pointer to where it lives.

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
  *Venkat's preferred form (2026-11-06):* a rebuild-nav button visible on the Contents page that updates
  the navbars on all listed items.
  *To discuss:* extensions are Studio-only, so the button would show in the Studio's view of the Contents,
  not on the public page, unless the extensions rule changes; what it does to a section with an
  unpublished draft (update the draft only, leaving the published nav stale, or update both without
  publishing the draft text); whether nav-only changes publish straight away.
  *Blocked by:* the sync hazard in the friction log.
- [ ] **Distraction-free writing view** (2026-11-06). A full-screen writing view in the studio's full
  editor, as a PR to blygger-studio. *PR open 2026-11-06:*
  https://github.com/blygger/blygger-studio/pull/126 (not merged). Word count is hidden in this view;
  Venkat to decide whether to show it (see PR #125). Not yet tested on real phones, Firefox or Safari.
  *Added to the same PR, in progress 2026-11-06:* Scrivener-style typewriter scrolling (current line kept
  roughly centred, the writing window resizing to keep it that way, blank space below); controls shown
  on hover or tap in the conventional places such as near the top; tabbed access to the rendered preview
  that shows in the right half of the full editor.
- [ ] **Hide chapter navigation in the editor** (2026-11-06). Inserted chapter nav can be shown or hidden
  in the editing view with a checkbox or toggle, like code view vs. WYSIWYG toggles. Hidden by default,
  so the nav markup can't be broken by accident while typing content.
  *To discuss:* how the studio recognizes nav lines, since it knows nothing about blykker (a marker in
  the text, or a generic "protected region" hook proposed upstream); whether a mod can do this at all
  (extensions may have no editor hook, the word-count-in-editor work will tell us); what the visible
  state allows (editable, or read-only since sync owns those lines); or whether to keep nav out of the
  stored text altogether, which ties into the layout work in phase 2 (`blykker/design/book-layout.html`).
- [ ] **Top-down outlining with tangles** (2026-11-06). Once the tangle feature is implemented in the
  studio, blykker should support it as a way to do top-down outlining.
  *Waiting on:* the studio's tangle feature: `![[+ text]]` spans become fragments at publish, planned in
  blygger-spec `docs/tangling-plan.md` (ROADMAP row 45, status `next`).
- [ ] **Reference directive in the text** (2026-11-06). A markup similar to TK, or TK overloaded with a
  directive such as `refyr`, holding an instruction to find and cite a reference from loose indications
  (e.g. a half-remembered author and idea). A later pass creates the reference fragment and links to it.
  Author-marked counterpart of *Mine references while writing*; the two should share one pipeline.
  *To discuss:* new markup or a TK directive, given that TK is in the protocol spec, how each renders on
  the public site before it resolves, and whether a directive needs a spec change or stays a blykker
  convention; who does the finding (the studio's TK AI or a local blykker pass) and with what sources;
  whether Venkat confirms a match before it is cited, and what happens when a search is unsure or finds
  nothing; when the later pass runs.
  *Blocked by:* the sync hazard in the friction log, since the later pass edits author text.
- [ ] **Process-references button** (2026-11-06). A button on the Contents page, next to the rebuild-nav
  button, that triggers a pass through the doc for new unprocessed references or `refyr` directives
  and executes them.
  *To discuss:* whether "the doc" means the whole book (every item listed in the Contents) or one
  section; how the pass tracks what is already processed; whether results are applied straight away
  or shown for Venkat to confirm first; what it does to sections with unpublished drafts, and whether
  it publishes; long-running passes in a Worker (progress, cost, failures part way through); shared
  Studio-only button question with rebuild-nav.
  *Depends on:* *Reference directive in the text*, *Mine references while writing*, and the rebuild-nav
  button's placement. *Blocked by:* the sync hazard in the friction log.
- [ ] **Editorial stylesheet: LLM passes** (2026-11-06). An editorial stylesheet in settings where the
  author declares a number of "global passes" that can be individually applied via an LLM, such as
  "define all acronyms on first use" or "find and flag instances of passive voice": something like
  compiler pass directives, adding up to an intelligent linter.
  *To discuss:* whether this belongs in the studio (useful to any blyg) or blykker; flag-only passes vs.
  passes that edit, and how edits are reviewed and accepted; where flags appear, given that HTML comments
  render as visible text; scope of a run (one section, the whole book, or changed text only) and how
  order-dependent passes like "first use" work across chapters; whether results are remembered, so an
  accepted or dismissed flag doesn't return; cost and long runs in a Worker; drafts vs. published text.
  *Related:* *Process-references button* could be one such pass with its own trigger, and a Contents-page
  control could run them all.
- [ ] **Review highlights** (2026-11-06). A markup mechanism that lets certain automated actions highlight
  text for human review: for example, an editorial-stylesheet action "find and tag all ad hominems in
  the text". Easy to clear. The UI can draw inspiration from how IDEs display code with syntax
  highlighting. If it is better as a base feature in the studio, design it as a studio PR, not as part
  of the blykker mod.
  *Leaning:* base studio feature (any blyg could use it; a mod can't change the editor from outside).
  *To discuss:* highlights as markup in the text, or stored beside it as ranges (which can't leak into
  published text but must follow edits); how they are kept off the public page either way; drawing
  them, since the editor is a plain textarea and can't color text (an overlay, or a real code-editor
  component, which is a much bigger change); what a highlight shows (the pass that made it, its reason,
  dismiss); clearing one, one pass's, or all; how it works in the focus view and on phones.
  *Serves:* *Editorial stylesheet: LLM passes* (where flags appear), and could show unresolved `refyr`
  directives and the nav lines in *Hide chapter navigation in the editor*.
- [ ] **References pane in the editor** (2026-11-06). An expandable "references" pane on the right in
  laptop view (with a suitable alternative on mobile) that shows all references in the currently active
  book context in the main editor window.
  *To discuss:* how the editor knows the active book (the studio has no book concept; reachable from a
  Contents thread, `book.json`, or a new setting), which *Several books on one blyg* also needs; sharing
  the right side with the live preview (a tab, a third column, or an overlay); a general side-pane slot
  proposed to the studio vs. a core feature, since extensions have no pane surface; what a row offers
  (search, insert a citation at the cursor, open the fragment, cited vs. listed); drafts and unresolved
  `refyr` directives; the phone alternative (likely a bottom sheet); whether the focus view gets it.
  *Related:* *Mine references while writing*, *Reference directive in the text*.
- [ ] **Inline index markup and rebuild-index action** (2026-11-06). A markup for indicating that a word
  should be included in the index, and a "rebuild index" action in the Contents page controls.
  *Exists today:* a `[index: term]: #` line after a paragraph marks an entry for that paragraph
  (invisible on the site), and `blykker.py sync` rebuilds the index from those markers.
  *To discuss:* inline marking of the word itself, which must stay invisible on the public page and in
  the studio's stock renderer (markdown `html: false`, so no comments), or a studio feature; marking a
  word under a different index term; whether to mark one occurrence or every occurrence of the term;
  keeping the old marker working; whether rebuild-index is its own button or part of rebuild-nav.
  *Related:* the rebuild-nav and process-references buttons, which share this control area.
  *Blocked by:* the sync hazard in the friction log.
- [ ] **Book project dashboard** (2026-11-06). *Prototype live 2026-11-06:* `mods/book-dashboard/` here, at
  `/studio/ext/book-dashboard` (section list, Preview then Apply rebuild). Apply not yet tried on the live
  book. Any deploy that doesn't vendor the mod removes the page. Generalize into blykker after testing.
  *In progress 2026-11-06:* show that a rebuild is due, without pressing Preview (Venkat: "There is no
  indication that the nav needs rebuilding"). First live rebuild worked (2026-11-06), but the wording confused:
  "Preview" suggests a page previewer, though it only lists changes. Replacing the two-step buttons with
  one labelled rebuild-and-publish button, plain-language changes, and links to the changed public pages. Either the table of contents page is treated as a special
  page that is effectively a project dashboard, or a separate project dashboard page exists, where a
  selected book project shows all its macro controls: the various passes available, rebuild actions, etc.
  *Leaning:* a separate page, likely the extension page already proposed for the *Composition start page*
  (`/studio/ext/blykker`): the Contents is a public reader page, and extensions are Studio-only.
  *To discuss:* that choice; how a book project is selected (shared with *References pane* and *Several
  books on one blyg*); what happens to Contents-page buttons if the dashboard is separate (perhaps a link);
  extension page or studio feature; run status, cost and history of passes.
  *Would gather:* rebuild nav, rebuild index, process references, editorial passes, manuscript statistics,
  editions, and the composition start page, which may simply become this page.
- [ ] **Comments to self in drafts** (2026-11-06). Markup for comments to self in a working draft, perhaps
  like C-style `/* ... */` blocks. Contents can be like regular contents, including things like TK
  generation, but they are left out of the published and wire views. As a PR to blygger-studio.
  *PR open 2026-11-06:* https://github.com/blygger/blygger-studio/pull/131 (not merged).
  Check `blykker.py sync` and the dashboard handle these once merged: they edit working copies, and
  discarding changes or restoring a version removes comments.
- [ ] **Reference management tab** (2026-11-06). A tab for overriding `refyr`'s automatic citations, offering
  alternative references. Probably on the book dashboard.
- [ ] **Bibliography cleanup pass** (2026-11-06). A separate pass action that turns the simple references
  `refyr` creates into full bibliographic entries.
- [x] **Dashboard in the main menu** (2026-11-06). High in the Studio's main menu, above compose, called
  Dashboard, not hidden in More. *Done:* PR #133 (`page.mainMenu`), released in 0.57.0, live here since 0.58.1
  (2026-11-09) without the interim patch.
- [ ] **Dashboard at the top of the menu** (2026-11-09). Above reading, not just above compose. Needs menu
  zones in the studio (see *Menu zones* under Design decisions); then the Dashboard asks for `zone: 'top'`.
  *PR open 2026-11-09:* https://github.com/blygger/blygger-studio/pull/143 (not merged). The owner override
  is not in it (it changes the `/api` settings contract, so API-surface review first).
- [ ] **Bookshelf dropdown and book metastructure** (2026-11-06). A dropdown on the dashboard to select the
  book being worked on, perhaps with a second book started to test the mechanism.
  *Today:* the node has no book object. A book is defined by `book.json` in this repo: sections by role and id,
  references, index terms. Contents is the only structure on the node, and the cover, title page and About
  are found only through `book.json`. The dashboard compiles that in, so a change needs a redeploy.
  *Proposal:* put the definition on the node: a shelf thread whose outline lists each book's Contents, a
  book identified by its Contents id, and front matter declared in the Contents by invisible markers.
  *Testing:* a second book on the live blyg is public and permanent, so test on a local copy first.
  *Decided 2026-11-06:* go ahead. The second book is a real one Venkat might write, **The Strange Forest**, with
  stubs for all the elements New Nature has; Venkat supplies the cover image. The public page gets something
  like a Bookshelf dropdown that loads one book to read; extensions are Studio-only, so that needs a general
  masthead-dropdown setting as a studio PR.
- [ ] **Mine references while writing** (2026-11-06). blykker only. References inserted while writing
  are automatically mined and created as reference fragments. In a later pass, the inline references
  are updated to point to the fragment instead of going directly to the reference.
  *To discuss:* what counts as a reference (bare URLs, markdown links, or "Author Year" and book titles
  too, and which links are not references); where bibliographic details come from, and whether Venkat
  confirms an entry before it is listed; how repeat citations of one source are matched to one fragment;
  when each pass runs, and whether rewriting links may touch unpublished drafts or republish a section.
  *Blocked by:* the sync hazard in the friction log, since the second pass edits author text.
- [ ] **Word count in the full editor** (2026-11-06). The word-count extension shows only in the index
  view; show it in the full editor too, as a PR to blygger-studio. *PR open 2026-11-06:*
  https://github.com/blygger/blygger-studio/pull/125 (not merged). Adds a general `editorStatus` slot;
  the PR asks Venkat to confirm the slot is fine without API-surface review. Check how it behaves with
  the distraction-free view once that PR exists.
  *Added to the same PR, in progress 2026-11-06:* show the word count in the composer index and full
  editor views too, not just the reader index, next to the character count that is already there by default.

## Design decisions (interview, 2026-11-06)

- **Dashboard:** a separate private Studio page, which also replaces the composition start page. The
  Contents stays a clean reader page, with a Studio-only link to the dashboard.
- **Active book:** derived from the Contents: a section belongs to the book whose Contents lists it.
  Items in no book have no active book and use a picker.
- **Where actions run:** in the studio, with sync's logic ported to TypeScript in an extension.
- **Sections with unpublished edits on rebuild:** publish a version made of the published text plus new
  nav, then put the draft back in the working copy. Readers never hit stale nav; the draft stays private.
- **Protecting nav in the editor:** a general "protected region" feature in the studio, hidden by default;
  the toggle shows those lines read-only, since sync owns them.
- **Rebuild trigger:** the button only. Nothing rebuilds on its own.
- **Index markup, Venkat's preference:** inline `[[index: ossification]]`, and the indexing pass extends the
  markup to all occurrences so they can get special rendering. No clash with `[[id]]` links (a link needs a
  26-character id). Per decision #70 a private bracket form must be rewritten before publish, so it needs a
  studio PR, on the same source/public split as comments to self. Public pages can show a plain word or a
  link to the Index; custom styling needs a further studio change.
  Also `[[index: ossification | ossified]]` when the word on the page differs from the term.
- **Indexed words on the public page:** a plain word for now; the markup stays in the source for special
  rendering later.
- **Indexing pass matching:** exact matches (ignoring case) are marked automatically; other forms are
  flagged for Venkat to accept, and accepted ones use the pipe form.
- **Automatic index markup in the editor:** dimmed or hidden, through the protected-region and highlight
  features. Marks Venkat typed stay as typed.
- **`refyr` form:** `[[TK refyr = a reference about ancient Rome | Ancient Rome]]`: instruction, then the text
  anchor. The pass adds the discovered reference inside the same markup, so it can be regenerated. A private
  bracket form under decision #70: rewritten at publish, so readers see a link on the anchor text.
  The discovered reference goes after `[=]`: `[[TK refyr = ... | Ancient Rome [=] <fragment id>]]`.
- **`refyr` citing:** eager. It cites automatically, and can be overridden later in a reference management
  tab offering alternative references (new need: see *Reference management tab* below).
- **Mining:** external links plus plain citations an LLM spots, like "Polanyi 1966" or a book title.
  Internal links are ignored. Mined citations are proposed for approval.
- **`refyr` sources:** this book's existing references first, then web search. It only finds a source and puts
  in a simple reference; bibliographic cleanup is a separate pass action.
- **Editorial passes:** can flag and edit from the start; each pass declares which, so the review interface
  comes first. They live in the blykker mod, not the studio. A run takes either the current section (from the
  editor) or the whole book (from the dashboard), skips sections unchanged since the last run, and reads in
  Contents order for "first use" style passes.
- **Highlights:** in the blykker mod, stored beside the text with their position, not as markup.
- **Rich editor:** prototype a code-editor component (e.g. CodeMirror 6), **not as a studio PR**: too complex
  for a reference client. A separate extension, useful without books, that blykker depends on. It needs a small
  studio slot letting an extension replace the editor's text area. This revises "Protecting nav in the
  editor" above: hiding regions comes from this extension, not a studio base feature.
- **References pane:** a tab beside Preview on the right side of the editor; a bottom sheet on phones.
- **Focus view (PR #126):** counts always faintly visible; a freshly loaded editor enters with the cursor at
  the end of the text, unless the cursor has already been placed.
- **`draftCounter` slot (PR #125):** fine without API-surface review (browser-only, no API or wire change).
- **Build first:** the dashboard and the sync port to an extension, with rebuild buttons and the
  published-nav fix for draft sections.
- **Still open:** `[[index: ...]]` and `refyr` must be rewritten at publish (decision #70), but passes now live
  in the mod, and studio `docs/mods.md` already refuses a server hook that runs on publish. Options: a
  general source/public rewrite built into the studio, like TK and comments to self; or a browser-side
  extension action. The browser route falls short: to keep the markup in the source it must publish through
  the dashboard, and the normal Publish button would leak the literal markup.
- **Also open:** vendored extensions must be browser-only with read-only server routes, so where do LLM calls
  for passes and `refyr` run, and with whose key?

## Design decisions: menu zones (2026-11-09)

Venkat's ruling: many extensions may compete for visible menu placement, so **an extension makes a case and the
studio decides.** What an extension asks for may not be what it gets.

- **Three zones:** `top` (above the default icons, before reading), `visible` (among the default icons, at a
  spot the studio picks), `hidden` (under More, the default for every extension page).
- **The request:** `page.mainMenu: { icon, zone?, reason? }`. `reason` is a short sentence for the owner,
  shown in Settings and never parsed. A `{ icon }` with no zone means `visible`, so #133 users keep today's spot.
- **Granting:** an extension gets its zone or a lower one, never a higher one. A full zone demotes it to the
  next one down, ending in `hidden`, so nothing is lost. Studio caps: top = 1, visible = 1 (the phone tab bar
  has no room for more); the caps are constants and can grow.
- **Contention:** the owner's order in Settings first, then compiled order. Never load order.
- **Owner override:** Settings → extensions shows each request, its reason and the zone granted. The owner can
  put any extension in any zone, past the caps: the caps limit what extensions claim, not what the owner chooses.
  The owner picks zone and order among extensions; the studio still places them among its own icons.
- **Feedback:** the page context carries the granted zone, so an extension that was demoted can adapt.
- Browser-only; an extension API addition, so API-surface review as #133 had. No protocol or wire change.
- **New Nature:** the Dashboard asks for `zone: 'top'`, reason "the book's home: status and rebuild".

## Friction log

- 2026-11-06 — A deploy that doesn't vendor a local mod silently drops it, and `npm run deploy:all` in the studio includes this blyg. Needs a safeguard before anyone relies on the Dashboard.
- 2026-11-06 — `docs/mods.md` says vendoring works through `extensions.local.json`, but `build-extensions.ts` also needs the name in the committed `extensions/catalog.ts`, so `install.sh` patches the catalog.
- 2026-11-06 — The Dashboard's "Author words" total includes Cover, Title page and About, which overstates the book's text.
- 2026-11-04 — **sync would publish unpublished author edits.** Preface had a pending draft paragraph; sync's only change was stripping a trailing space, yet it reports "update + publish", which would make the draft public. *Fixed 2026-11-06:* a section with unpublished edits only gets its working copy updated, and the chain, index, references and notes are built from what readers see. Such a section's published nav stays stale until it is published (see *Rebuild navigation*). Items above marked "Blocked by" are no longer blocked by this.

- 2026-11-02 — Studio has no book navigation, and public pages can't be restyled by config (no custom CSS). Nav is now a `blykker.py sync` job; layout is phase 2 (`blykker/design/book-layout.html`).
- 2026-11-02 — HTML comments render as visible text (markdown `html: false`), so markers use link reference definitions on their own line.
- 2026-11-02 — Published reference and note fragments show up in the public feed as items.

## Taken up by blykker
