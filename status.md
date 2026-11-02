# Status: New Nature

## Project
- **Title:** New Nature (working title)
- **Source:** New Nature thesis — 2026-06-17 Protocol Institute town-hall talk + new material
- **Type:** Book, written in public as a blyg
- **Status:** in-progress

## Outputs
| Format | Status | Notes |
|--------|--------|-------|
| Site   | in-progress | Blyg live at newnature.venkateshrao.com (empty; vanilla studio 0.50.0) |
| Ebook  | not-started | |
| Print  | not-started | |

## Active / Open
- **Owner secrets not set** — run `! bash scripts/set-blyg-secrets.sh` (generates, shows, saves to `.env`, registers in `Code/.env.keys`, then sets the Worker secrets). Studio login is closed until then.
- **No AI key on the blyg** — needs its own `ANTHROPIC_KEY_BLYGS_NEWNATURE` (one key per blyg Worker); logged in `Code/devops/status.md`.
- Studio settings: title, author, bio (default title is "blyg").
- Start dropping materials in `inbox/` and links in `sources.md`; first chapter when ready.

## Notes
- 2026-11-02 — Project created. Local git repo `main`, GitHub `vgururao/newnature` (private). Inbox, `sources.md`, `blykker-notes.md`, `blyg.md`. Blyg provisioned on the personal Cloudflare account: D1 `blyg-newnature`, R2 `blyg-newnature-media`, Worker `blyg-newnature` on Custom Domain `newnature.venkateshrao.com`, deployed from the studio repo's private config (`newnature` env) at v0.50.0; live checks pass. Sibling project `Code/blygger-protocol/blykker` (repo `blygger/blykker`) created dormant. Secret generation by Claude was blocked by the auto-mode classifier, so it is a script for Venkat to run.

## Instructions for Agents
After each work session, update this file:
1. Change the **Status** field to reflect current state (e.g., `not-started`, `in-progress`, `blocked`, `done`)
2. Update the Outputs table with current status of each format
3. Add dated notes at the bottom describing what was done
