# DEVLOG — New Nature (and blykker, while it is run from here)

One entry per session, newest first. `status.md` holds the current state and open items. This file
records what happened. blykker (`Code/blygger-protocol/blykker/`) is run from this project until it
is managed on its own, so its work is logged here too.

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
