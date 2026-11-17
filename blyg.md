# The New Nature blyg

**URL:** https://newnature.venkateshrao.com/ — studio at `/studio`.
**Client:** vanilla `blygger-studio` (0.50.0 at creation), with blykker's config applied by `blykker.py sync`. blykker is a studio mod, so the client stays stock.

## Deployment

| Thing | Value |
|---|---|
| Cloudflare account | Personal — `Vgr@ribbonfarm.com's Account` (`7026b5d7c1ad16cb808987576bb07ab2`) |
| Worker | `blyg-newnature` |
| Route | `newnature.venkateshrao.com` (Custom Domain; Cloudflare manages DNS and cert) |
| Mount | `""` (domain root) |
| D1 | `blyg-newnature` (`7b9534e4-fc27-4874-8a83-0001d066f7a6`) |
| R2 | `blyg-newnature-media` |
| Secrets | `OWNER_PASSWORD`, `COOKIE_SECRET` — registry names `BLYG_NEWNATURE_*` in `Code/.env.keys`, copy in this project's `.env` |
| AI | `AI_PROVIDER_KEY` = `ANTHROPIC_KEY_BLYGS_VENKATESHRAO` (the personal blyg key: one blyg key per org, an org = its own GitHub org; `devops/decisions.md` 2026-11-02); models via `book.json`: claude-sonnet-5-5 for general and TK, claude-haiku-4-5 for changelog notes |

**The deploy config lives in the studio repo, not here.** It is the `newnature` env in
`Code/blygger-protocol/blygger-studio/wrangler.private.jsonc` and the matching target in its
`deploy-targets.json` — both gitignored, beside the other three nodes. That keeps this blyg on the
same upgrade path as the others: `npm run deploy:all` in the studio includes it, with the
tsc+test gate, migration preflight and live verification.

Deploy or upgrade just this node (from the studio repo, with `CLOUDFLARE_API_TOKEN` unset):

```bash
cd ../../blygger-protocol/blygger-studio
npx wrangler d1 migrations apply DB --remote --config wrangler.private.jsonc --env newnature
npm run build && npx wrangler deploy --config wrangler.private.jsonc --env newnature
```

> ⚠️ **Since 2026-11-06 these commands, and `npm run deploy:all`, drop the Dashboard from this node.**
> Deploy through `mods/book-dashboard/README.md` instead. Nothing else is lost if it happens: re-run the README's steps.
> **Upgrades and deploys of this node run from newnature sessions only** (Venkat, 2026-11-06); the studio session doesn't deploy here.

blykker never forks the studio. If a blykker mod needs code, it is a studio extension compiled into this node through the studio's gitignored `extensions.local.json`. No exceptions since 0.58.1 (the menu patch is gone; the Dashboard uses core `page.mainMenu`).

## Setup state

- 2026-11-02 — D1 and R2 created, migrations 0001–0038 applied, Worker deployed, live checks pass
  (`blyg.json` 200, generator `blygger-studio/0.50.0`; `feed.xml` 200; `items/index.json` 200; `studio/syntax` 302).
- 2026-11-02 — Owner secrets set (`scripts/set-blyg-secrets.sh`). Settings (title, author, theme, menus,
  front page) are applied by `blykker.py sync` from `book.json`. Change them there, not in the studio,
  or the next sync reverts them.
- 2026-11-02 — `AI_PROVIDER_KEY` set from `ANTHROPIC_KEY_BLYGS_VENKATESHRAO`. If that key is rotated, re-run
  `npx wrangler secret put AI_PROVIDER_KEY --config wrangler.private.jsonc --env newnature` (studio repo).
- 2026-11-06 — Upgraded to studio 0.56.0 from a worktree at the tag, with `mods/book-dashboard` vendored (0.56.0 doesn't have `page.mainMenu`, so the temporary patch stays). Migration `0043` applied at the upgrade; `0042` was already applied, by another session. Worker `648710d2-b3b2-4904-9a32-dc45954e0a3e`; rollback `f783804b-5404-4157-a247-a5eebf106814`.
- 2026-11-09 — Upgraded to studio 0.58.1 (brings PRs #125, #126, #131, #133 and the 0.58.1 New Nature follow-ups) from a worktree at the tag, `mods/book-dashboard` vendored with the menu patch removed. Migration `0045` applied (0044 is reserved, not shipped). Worker `fca06ebd-15a6-41e8-bee0-5ec8d606ba60`; rollback `648710d2-b3b2-4904-9a32-dc45954e0a3e`. Verified: generator 0.58.1, all section pages 200, sync dry-run clean, Dashboard in the main menu above compose (headless screenshot).
- 2026-11-17 — Upgraded to studio 0.62.0 (0.59.0–0.62.0: menu zones, editor regions, extension vendoring, backup, Discover, Shelf, Background, mathematics, burst fold) from a worktree at the tag, `mods/book-dashboard` vendored unchanged. Migrations `0044` (shelf) and `0046` (Background) applied. Worker `1148a4d9-cb19-4e96-b0c2-dc889b900df2`; rollback `fca06ebd-15a6-41e8-bee0-5ec8d606ba60`. Verified: generator 0.62.0, all section items 200, sync dry-run clean, Dashboard above compose and "Up to date" (headless logged-in screenshot).
