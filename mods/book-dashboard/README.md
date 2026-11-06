# book-dashboard

New Nature's private project page, and the prototype for the same thing in blykker: the book's sections
with word counts and state, plus a Rebuild that ports `blykker.py sync` to the browser. New Nature only
for now. Book config is generated from `book.json`; nothing is generalized yet.

It's a browser-only Studio extension at `/studio/ext/book-dashboard`, linked from More and from the
Contents entry in the Studio's reading view. Everything goes through the owner's session, so it adds
no server routes, and public pages and feeds are unaffected.

## Files

| Path | What it is |
|---|---|
| `extension/ui/plan.ts` | The port: what a rebuild would change. Pure. |
| `extension/ui/apply.ts` | Applies a plan, including the swap for sections with drafts. |
| `extension/ui/index.tsx`, `dashboard.css` | The page. |
| `install.sh` | Vendors this into a studio tree and generates `book.ts` from `book.json`. |
| `test/` | Parity with `blykker.py`, and draft safety against a local studio. |

## Sections with drafts

Publish sends the whole working copy, so a section with unpublished edits is rebuilt like this: copy the
draft to this browser's storage, set the working copy to the published text plus new nav, publish, then put
the draft back with its own new nav, and read it back. If a step fails, the draft goes back. If it can't go
back, the dashboard offers the saved copy until you restore or delete it. A newer edit from elsewhere is
never overwritten.

A section is held, with only its draft updated, if republishing would also publish something else or lose
something: generated text in the published version (its disclosure would go), a changed stub, or a new
attachment.

## Build and deploy

Build from a separate worktree at the version the node runs. `install.sh` edits `extensions/catalog.ts` and
`extensions.local.json`, which apply to every node a tree builds, so never run it in the shared checkout.

```bash
cd ../../blygger-protocol/blygger-studio
git worktree add --detach /tmp/studio-dash v<live version>       # read it from blyg.json's generator
cp wrangler.private.jsonc /tmp/studio-dash/
cd /tmp/studio-dash && npm ci
<this folder>/install.sh /tmp/studio-dash
npm run build
env -u CLOUDFLARE_API_TOKEN npx wrangler deploy --config wrangler.private.jsonc --env newnature
```

Then turn it on in Settings → extensions (it stays on across deploys).

**A deploy that doesn't vendor this drops the page.** That includes `npm run deploy:all` from the studio
checkout. Nothing is lost when that happens: re-run the steps above. Saved draft copies stay in the browser.

## Tests

From the studio worktree, after `install.sh`:

```bash
# Parity: snapshot the live book (read-only; holds drafts, so keep it out of the repo), then compare.
<this folder>/test/snapshot.py /tmp/snapshot.json
node --import tsx <this folder>/test/parity.mts /tmp/snapshot.json $PWD/extensions/book-dashboard/ui/plan.ts

# Draft safety, against a disposable local studio with OWNER_PASSWORD=test-password and high API limits.
npx wrangler dev --port 8799 --persist-to /tmp/dash-state
node --import tsx <this folder>/test/apply.test.mts http://127.0.0.1:8799 $PWD/extensions/book-dashboard/ui
```

## Not ported

- Settings other than the two menus and `linksThreads`: `blykker.py sync` still applies the rest of
  `book.json`'s settings.
- `seed`, and writing ids back to `book.json`. A new section in `book.json` needs a re-vendor and deploy.
