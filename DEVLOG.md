# DEVLOG — New Nature (and blykker, while it is run from here)

One entry per session, newest first. `status.md` holds the current state and open items. This file
records what happened. blykker (`Code/blygger-protocol/blykker/`) is run from this project until it
is managed on its own, so its work is logged here too.

---

## Session 6 — 2026-11-20

**Model:** Opus 5.5 · **Time:** 14:15–21:19 PST · **Committed:** yes (newnature; studio feature branches) ·
**Deployed:** yes, four times: Worker `blyg-newnature`, finally `e62954ff` (studio 0.65.0 + `mods/book-dashboard`,
rollback `96b3fed3`; the chain is in `blyg.md`). **Published by Claude:** References (the rebuild for Venkat's 11-18
reference), via `blykker.py sync`. Nothing else; no writing-log entry yet.

**Upgrade to studio 0.65.0** (0.63 tangling and placeholders, 0.64 Base UI and a Hono security fix, 0.65 conditional
reads). Migrations 0047–0048. Verified live; the mod's one unused constant removed so the typecheck passes.

**Nav-region bug** (Venkat: full screen showed the nav and lost the toggle). Cause: the mod's regions claimed all
whitespace before the nav, so a typed Enter at a chapter's end (where focus view puts the caret) was swallowed, and the
editor's fail-safe showed everything and dropped its toggle. Fix: a region takes only the rebuild's `\n\n` and starts at
the nav links. `regions.test.mts` now types at every caret through the studio's own split/join/rebase.

**Writing sessions** (Venkat's request): Start/End on the Dashboard; a word diff against a snapshot kept in a private
draft; AI/hand split from TK and `impyrt` markup; references added/edited; versions published; a note; preview, then a
published entry in the public **Writing log** hopper with a change note marking it a log entry, and an invisible data
line for goals and graphs later. The Dashboard's word counts now share the counter (TK instructions aren't words).
Publish path tested on a local studio; start/end/discard on the live blyg with publishing blocked.

**Studio PRs (all ready, none merged; the studio session reviews #154):**
- **#154 editor bars** — rows above and below the text box, room allocated by the studio, a bars menu, bars that edit.
  The studio session reworked it the same day into *replaceable controls* (`replaces: ['regionToggle']`).
- **#155 spellcheck** (shipped extension, stacked) — US English list (ESDB size 60) checked in the browser, suggestions,
  the blyg's dictionary, an AI proofread; now replaces the browser's spellcheck with live underlines.
- **#156 dictionary** (core) — `GET /dictionary`, `PUT /dictionary/{source}`; `owner` plus installed sets; Settings card;
  migration 0049. Venkat: core, not per-device, so domain extensions can add sets.
- **#159 editor marks** (core, stacked on #154) — `context.mark()` draws underlines in a layer laid over the text box;
  `spellcheck` becomes a replaceable control. Also fixes a flaky #154 test (a caret-restore race under load).

**Issues filed:** blygger-spec#36 (editing passes as version-level provenance: the AI proofread's fixes can't be
disclosed sensibly span by span; Venkat found the size-threshold workaround clunky). blygger-studio#163 (an editorial
desk: suggestions, assistants and passes over many items, for agents that edit or author; the book editor is its
first client).

**Decisions:** book editing is the stock editor plus a Book bar, not a separate editor (a strict superset of studio
controls). The dictionary is core. Model-made fixes wait on spec#36. Reference add-and-insert waits on #154's release.

**State after:** blyg on 0.65.0 + mods, no patches; writing sessions live, unused so far. **Open:** References and Strange
Rules need a rebuild (Venkat's studio edits tonight); the Preface and Tangle Logic drafts; merge order #154 → #156, #159 →
#155; studio 0.67 removes `/changes` (blykker and the mod don't use it).

---

## Session 5 — 2026-11-18

**Model:** Opus 5.5 · **Time:** 14:27–15:21 PST · **Committed:** yes (newnature) ·
**Deployed:** yes, six times: Worker `blyg-newnature`, finally `01999f52` (studio 0.62.0 + `mods/book-dashboard`, rollback
`af473206`; the chain is in `blyg.md`). **Published:** nothing by Claude. Venkat added one reference through the new
sheet (cited in Pinched vs. Strained); References still needs a Dashboard rebuild. **Repo made public** at Venkat's request.

**Follow-ups from 0.62.0** (PRs #143 and #144 were merged 2026-11-13 and released in 0.59.0). The Dashboard asks for menu
zone `top`, and `editorRegions` (`regions.ts`) holds the two nav blocks out of the full editor's text box. Tested
against all 15 live sections, and in a logged-in screenshot. The five new chapters already had nav: the dry-run's
`chain:` and `settings:` lines print on every run, which I misread at startup as pending changes.

**Reference quick-add** (Venkat chose it over `refyr`, mining and a management tab). **+REF**, a boxed button beside the
counts (composer and full editor), opens a sheet: a URL, DOI, ISBN or rough citation → an entry in the book's Chicago
style plus an "Author Year" label, both editable → duplicate check against the book's references → **add and
publish**, which creates the `[blykker-ref]` fragment and copies `[[id | label]]` to the clipboard. The mod's first server
half: the owner read `GET /api/ext/book-dashboard/lookup` (page metadata; Crossref, then DataCite; Open Library). Five of
the six hand-written references come back identical from their URLs. Add was tested on a disposable local studio.
Inline insertion was ruled out: `draftCounter` can't write to the editor, and Venkat declined a DOM workaround ("good
enough"). The toolbar row has no extension slot. A studio PR is possible but wasn't asked for.

**Model step.** A rough citation that no keyword hit matches goes once to the TK generation model (Sonnet 5.5) through
the studio's `complete()`, using the blyg's key and daily budget. "ask the model" asks by hand. Each suggestion is kept
only if a registry or the page confirms it. Verified live: a description gave *The Tacit Dimension*, and an invented title was
rejected in the stand-in test. Fixed on the way: a book and a chapter with the same title no longer merge.

**Decisions:** LLM calls in the mod run server-side through the studio's `complete()`, with the TK model; the model
suggests, a registry confirms (`blykker-notes.md` → *LLM calls in the mod*). Reference fragments stay in the public feed for now.
Repo `vgururao/newnature` public (history scanned for secrets first; Cloudflare account id visible in `blyg.md`).

**State after:** blyg on 0.62.0 + mods, no patches; Dashboard at top; nav hidden in the editor; +REF live with the model
fallback. **Open:** run the Dashboard rebuild for References; Contents label mismatches (status.md); generalize nav
regions and quick-add into blykker; the `Publishing/CLAUDE.md` line is edited but not committed (that repo has other pending edits).

---

## Session 4b — 2026-11-17 (backfilled 2026-11-18)

**Model:** Opus 5.5 · **Committed:** `94e3322` (blyg.md only; pushed 2026-11-18) · **Deployed:** yes: Worker
`blyg-newnature` `1148a4d9` (studio 0.62.0 + `mods/book-dashboard` unchanged, rollback `fca06ebd`).

A short upgrade session that logged only to `blyg.md`; this entry was written from that commit in session 5.
Studio 0.59.0–0.62.0 (menu zones, editor regions, extension vendoring, backup, Discover, Shelf, Background,
mathematics, burst fold). Migrations `0044` (shelf) and `0046` (Background) applied. Verified then: generator
0.62.0, section items 200, sync dry-run clean, Dashboard "Up to date". By session 5 the five new chapters were in
Contents with nav built; this log doesn't record when that rebuild ran.

---

## Session 4 — 2026-11-09

**Model:** Opus 5.5 · **Time:** ~08:00–09:50 PST · **Committed:** yes (newnature; studio branches for PRs) ·
**Deployed:** yes: Worker `blyg-newnature` `fca06ebd` (studio 0.58.1 + `mods/book-dashboard`, rollback `648710d2`).
**Published:** nothing. No sync or rebuild ran.

**Upgrade to studio 0.58.1.** It has all four of this project's PRs (#125, #126, #131, #133) and the 0.58.1
follow-ups. Migration `0045` applied. The Dashboard's menu patch is retired: the mod already used the released
`page.mainMenu` API, so this node is stock studio plus mods again. Verified: generator 0.58.1, all sections 200,
sync dry-run clean, Dashboard above compose in a headless logged-in screenshot.

**Studio PR #143, menu zones** (ready, CI green, not merged). An extension page asks for `top`, `visible` or `hidden`,
and the studio decides: a zone or a lower one, never higher, ties by compiled order; the page is told where it
landed. Venkat named the zones and ruled it minimal: `reason`, the Settings display and any owner override were cut,
with the override suggested as a possible studio feature, not specified by us.

**Studio PR #144, editor regions** (ready, not merged; CI pending at wrap-up; locally 2319 Worker, 245 UI and 337 editor e2e tests pass). Decided with Venkat: a
narrow `editorRegions` slot, not an editor replacement (the editor's tools all depend on the native textarea). It
holds ranges of the full text out of the text box; edits are rejoined before autosave, so the draft, preview and
publish keep the whole text. Hidden each time the editor opens; read-only when shown. Found while testing: after
select-all and type, a common-suffix diff kept the old final "." and put it after the nav marker (`[blykker-nav-top]: #.`);
fixed by passing the text box's caret to the diff. Template `regions-example`.

**Noticed:** five threads from 2026-11-07 aren't in the Contents chain, so the Dashboard says "Up to date" and a
rebuild won't give them nav. If they are new chapters, they go in the Contents thread first.

**Decisions:** menu zones top/visible/hidden, extension asks and studio decides; studio PRs stay minimal to what
blykker needs (owner-facing features are the studio's call); nav hiding by `editorRegions`, read-only when shown,
reset each time. All in `blykker-notes.md`.

**State after:** blyg on 0.58.1 with the Dashboard, no patches. #143 open and green, #144 open with CI pending;
nothing merged. After release: Dashboard `zone: 'top'`, and a blykker `editorRegions` for the two nav blocks.

---

## Session 3 — 2026-11-06

**Model:** Opus 5.5 · **Time:** 13:40–16:45 PST · **Committed:** yes (newnature, blykker) ·
**Deployed:** yes: Worker `blyg-newnature`, finally `648710d2` (studio 0.56.0 + `mods/book-dashboard`, rollback `f783804b`).
**Published:** nav via sync (References, Contents, Chapter 1, Ooze and Hardness); Venkat's first Dashboard rebuild
added Pinched vs. Warped. The Strange Forest is **not** published.

A writing session with features noted as they came, each triaged at once: simple ones built in the background, the
rest logged. Then a design interview over the backlog (decisions in `blykker-notes.md` → *Design decisions*).

**Sync hazard fixed** (blykker `4b6d324`): sync no longer publishes a section with unpublished edits, and builds the
chain, index, references and notes from what readers see. A real sync ran; the Preface draft stayed private.

**Book dashboard prototype** (`mods/book-dashboard/`): a private page at `/studio/ext/book-dashboard`, above compose.
Status on load ("Rebuild needed: N items"), one rebuild-and-publish button at the top, changes in plain words, a
report with links. Draft sections republish with new nav and keep the draft private. Sync's logic is ported to
TypeScript and matches `blykker.py` in 7 scenarios. Venkat ran the first live rebuild; the nav came out right.
Main-menu position is a temporary patch of PR #133, which breaks "stock studio" until released.

**Studio PRs, none merged:**
- #125 word count beside the character count (`draftCounter` slot).
- #126 focus view: typewriter scrolling, top controls, preview tab, faint counts, caret at the end. Local e2e had
  1 failure in 502 on the prior commit, and CI failed e2e on the commit before that; fixes are in `92e346f`, unconfirmed.
- #131 comments to self. Conflicts resolved. Privacy suite still running on the pushed commit `8ae02c5`.
- #133 main-menu entry for extension pages. Marked ready at Venkat's request with most tests unfinished.
- #126, #131 and #133 were pushed or opened before their tests finished, at Venkat's request. Wrap-up stopped development
  with runs still underway; results go into each PR description, and failures stay open rather than fixed.

**The Strange Forest:** second book, built and tested locally with the shelf (front-page thread, book identified by its
Contents, front matter in invisible markers). Cover composed from Venkat's ChatGPT image, credited to him, CC BY 4.0
(my pick from "creative commons or something"). Publishing means 15 permanent feed events and a new front page.

**Decided:** build process (prototype here as a custom install, generalize into blykker later, back-apply). Dropped: public
Bookshelf dropdown; the front page becomes a standard thread instead.

**Corrections:** my first #126 report said everything passed before CI had finished. I leaned towards rewriting
`[[index:]]` and `refyr` in the browser, and the build showed that would leak the markup through the normal Publish
button; I now recommend studio support for those forms only.

**After the first wrap-up (resumed at Venkat's request):**
- #125 and #126 conflicts with main resolved, CI green. All four studio PRs are ready and mergeable, so the state above is
  superseded. Merging is for the studio session (Venkat). #133's and `draftCounter`'s API-surface gates cleared by Venkat.
- No stray `/*` or `*/` on any of the 18 blyg items, ahead of #131.
- Upgraded the node to studio **0.56.0**: Worker `648710d2`, rollback `f783804b`, migration `0043` applied (`0042` was
  already there; Venkat thinks the studio session ran it). Venkat will tell that session not to deploy here; deploys of this
  node run from newnature sessions. 0.56.0 has none of our PRs, so `/* ... */` still publishes and the menu patch stays.
  Full Playwright wasn't run, and two-book isolation wasn't re-tested at 0.56 (it passed at 0.54.1).
- Seen, left to Venkat: `#Chapter: Pinched vs. Warped` lacks the space after `#`, so it has no heading.

**Open:** see `status.md`.

---

## Session 2 — 2026-11-04

**Model:** Opus 5.5 · **Time:** 12:31–14:05 PST · **Committed:** yes (newnature, blykker) ·
**Deployed:** no. A studio PR is open, not merged; nothing was published to the blyg.

**Word-count extension: blygger-studio PR #117** (https://github.com/blygger/blygger-studio/pull/117)
- Read the studio's `docs/mods.md` (decision #89) and `docs/extensions.md`. Extensions are Studio-only by rule
  ("The wire"), so word counts on public pages cannot be an extension. That half is deferred: Venkat is thinking
  about how to handle the extensions/public-pages rule.
- Built `extensions/word-count` (a server half and a byline): each entry shows published and draft counts, and
  each side rolls up over its own **outline tree**. The tree follows only list items that are just an `[[id]]`
  link. Inline links (blykker nav, citations) are never followed, because nav makes every section of a book
  reach every other. Transclusions count in the item's own text. Roll-ups are strict about shape, not state:
  a cycle, a repeat, a remote, withdrawn or missing item, or more than 500 items gives no total, and says why.
  Drafts render as the Studio preview renders them.
- Decisions on the way: outline links, not inline links (Venkat agreed after I showed that nav defeats any rule
  based on the link graph); drafts count (Venkat: too conservative otherwise); report both published and draft
  totals (Venkat).
- Built in a worktree off `origin/main` in the scratchpad, leaving the studio checkout's
  `fix/reader-indexes-113` branch alone. Tests: `npm test` 2160, `test:ui` 194, extension e2e 10. The full
  Playwright run (423) passed on the first commit. I installed Playwright's Chromium into the user cache.
- Correction: I wrongly told Venkat the Preface was missing from the Contents. I had read `book.json`'s seed,
  not the live thread. The live Contents lists Preface, Chapter 1, References and Index.

**Planning (in `blykker/PLAN.md`)**
- *Editions*: bleeding edge, newest stable and older editions, all per book; a `cut-edition` sketch; word-count
  v2 for pinned versions (counts first recorded in the edition manifest, then computed on demand); dashboard
  gaps (drafting ahead of published, published ahead of stable). Open: there is no versioned link form
  (a FABLE/spec question), and baked nav inside a pinned edition points at the live book.
- *Several books on one blyg*: a shelf with **book projects** (`blykker.py new-book` would seed one: config,
  section threads, staging hopper, shelf entry, local folder); per-book nav, notes, references, index and editions;
  hoppers `notebook` (shelf-wide, private), `meta` (shelf-wide, public) and `<slug>-manuscript` (per book, staging).
- Decided (Venkat): "New Nature" is both the shelf and volume 1, the way a ship class is named for its first
  ship; a later volume might be *The New Nature of Computing*. The notebook is private drafts by default.
  Manuscript hoppers are staging only. Venkat is building a studio feature that separates private from draft;
  revisit the notebook when it lands.

**Found at wrap-up: a sync hazard (blykker bug, not fixed)**
- `sync --dry-run` reports "Preface: update + publish". The Preface has Venkat's unpublished draft paragraph
  (dirty working copy), and sync's only change is stripping one trailing space. A real sync would **publish
  the unpublished draft**: sync publishes any published thread whose text it changes, and it cannot tell
  its own nav edit from the author's pending text. I did not run sync. Fix before the next real sync: only
  publish when the published version is what changed, or never publish a thread with unpublished author edits.
- The live node is on studio **0.52.0** (it was 0.50.0 at creation), upgraded outside this session. All
  section pages return 200.

---

## Session 1 — 2026-11-02

**Model:** Opus 5.5 · **Time:** 14:08–19:14 PST (an interim wrap-up at 15:15; this entry supersedes it) ·
**Committed:** yes (newnature, blykker, devops) · **Deployed:** yes: blyg Worker `blyg-newnature` (studio
0.50.0) and all book content, on Venkat's standing go-ahead to deploy as we work.

**Projects created**
- `Publishing/newnature/`: local repo → `vgururao/newnature` (private). Inbox, `sources.md` (the
  New Nature feature page and the essays and slides it links), `CLAUDE.md`, `status.md`.
- `Code/blygger-protocol/blykker/`: local repo → `blygger/blykker` (public, MIT). Created dormant,
  started the same day, then **reframed as a configuration-first mod of Blygger Studio, not an
  independent client**: config file first, features as mods, missing hooks proposed upstream as
  studio PRs. First test case for a studio mods model.

**The blyg: https://newnature.venkateshrao.com/**
- Personal Cloudflare account: D1 `blyg-newnature`, R2 `blyg-newnature-media`, Worker
  `blyg-newnature` on a Custom Domain. Deployed from the studio repo's private config (`newnature`
  env, beside the other three nodes) so it shares their upgrade path. Details in `blyg.md`.
- Owner secrets generated per security-policy Rule 1 (shown, saved to `.env`, registered in
  `Code/.env.keys`, then set). The first attempt was blocked by the auto-mode classifier. It was
  re-run on Venkat's explicit go-ahead.
- AI: `AI_PROVIDER_KEY` = the personal blyg key `ANTHROPIC_KEY_BLYGS_VENKATESHRAO`. Models
  Sonnet 5.5 (general, TK) and Haiku 4.5 (changelog notes).
- A local DNS gotcha: a lookup before the deploy left NXDOMAIN cached in the home router for ~30 min.
  Public DNS was fine.

**The book scaffold** (seeded and kept in step by `blykker.py`)
- Cover as the static front page: the art supplied by Venkat, composed with a title panel
  (`scripts/make_cover.py`). Title page (with the cover credit), Contents, Preface, Chapter 1:
  Introduction, References (6 reference fragments), Index (hardness, immutability), About the author.
- Top menu (masthead author links): Contents · Start reading · About. Bottom links section: "Made
  with Blykker". Custom "Book" palette, the studio's book font.
- Image register `images/index.json`. Images named `<book>-<subject>-<variant>-<W>x<H>`. Cover rights:
  titles.xyz, Bucket Art model, from Humboldt's public-domain Chimborazo diagram. Not print-ready
  (1024 px source).
- `AUTHORING.md`: how to write in the studio with the blykker conventions.

**blykker built** (all against stock studio, no studio code)
- `PLAN.md`: book model (Contents is the source of truth), invisible markers (link reference
  definitions, since `html: false` shows comments), notes, references, index, images, phases, an
  *Upstream hooks* table.
- `tools/blykker.py`: `seed` (sections, reference fragments, cover upload) and `sync` (nav blocks,
  menus, settings, chapter/book notes with renumbering, references, index, cover "Start reading"
  retarget, image-record checks), `--dry-run`, 429/connection retry, and text an author types
  outside nav markers is kept. Tested offline on fake nodes. It runs idempotently against the live blyg.
- `book.template.json`: user starting point (studio release + install links, setup steps, New
  Nature-style config with CHANGE-ME placeholders the tool refuses to run with).
- `design/book-layout.html`: phase-2 target layout (needs an upstream presentation hook).
- Bugs found live and fixed: the Start-reading regex could span two links. Seeding was interrupted
  by a dropped connection and then the login rate limiter, which led to the retry logic.

**devops**
- Key policy revised (Venkat): blyg Anthropic keys are **one per org**, and an org is separate when it
  has its own GitHub org. Three keys: personal, blygger, PI. Recorded in `warnings-keys.md`,
  `decisions.md`, `anthropic-key-plan.md`, `Code/CLAUDE.md`, `.env.keys`.

**Decisions:** nav links point at live versions (pinned-version nav is circular). Settings live in
`book.json`, not the studio. All six references kept. Deploy as we work.

**State after:** book scaffold live and verified (all section pages 200, generator
`blygger-studio/0.50.0`, sync dry-run clean). Both repos clean and pushed.

**Open:** feature to-do in `blykker-notes.md` (manuscript stats, composition start page, rebuild
nav when Contents change). Print-resolution cover art. Start writing the Preface and Chapter 1.
Two one-line index entries are uncommitted in `Publishing/CLAUDE.md` and `Code/CLAUDE.md` (Publishing
has unrelated pending edits; `Code/` isn't a repo).
