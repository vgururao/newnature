# DEVLOG — New Nature (and blykker, while it is run from here)

One entry per session, newest first. `status.md` holds the current state and open items. This file
records what happened. blykker (`Code/blygger-protocol/blykker/`) is run from this project until it
is managed on its own, so its work is logged here too.

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
