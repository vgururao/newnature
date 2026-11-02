# The New Nature blyg

**URL:** https://newnature.venkateshrao.com/ — studio at `/studio`.
**Client:** vanilla `blygger-studio` (0.50.0 at creation), until `blykker` replaces it.

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
| AI | none yet — needs its own Anthropic key (`ANTHROPIC_KEY_BLYGS_NEWNATURE`, one key per blyg Worker) |

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

When blykker forks, its own private config takes over the `newnature` env and the studio's entry is removed.

## Setup state

- 2026-11-02 — D1 and R2 created, migrations 0001–0038 applied, Worker deployed, live checks pass
  (`blyg.json` 200, generator `blygger-studio/0.50.0`; `feed.xml` 200; `items/index.json` 200; `studio/syntax` 302).
- **Pending:** owner password and cookie secret. Until they are set the studio login refuses everyone
  (the Worker fails closed). Run `scripts/set-blyg-secrets.sh` once.
- **Then, in the studio:** Settings → title ("New Nature"?), author name, bio. Default title is "blyg".
