# DEVLOG — New Nature (and blykker, while it is run from here)

One entry per session, newest first. `status.md` holds the current state and open items. This file
records what happened. blykker (`Code/blygger-protocol/blykker/`) is run from this project until it
is managed on its own, so its work is logged here too.

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
