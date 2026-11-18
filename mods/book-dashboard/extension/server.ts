// The book dashboard's server half: one owner read that looks up a source for a reference
// (lookup.ts), asking the blyg's TK generation model when told to (`ask=1`). Mounted under /api/ext/book-dashboard/ behind the owner API's middleware, and
// only answering when the extension is enabled.
import { failure, success } from "../../src/operation-types.ts";
import type { ServerExtension } from "../../src/extensions/server.ts";
import { routes } from "./contract.ts";
import { complete } from "../../src/ai/provider.ts";
import { ask, lookup } from "./lookup.ts";

export const server: ServerExtension = {
  name: "book-dashboard",
  routes(router) {
    router.get(routes.extBookDashboardLookup, async (context, input) => {
      const q = String(input.query.q ?? "").trim();
      if (q.length < 2) return failure("invalid-input", { error: "q is a URL, DOI, ISBN or citation" });
      try {
        const get = (url: string, init?: RequestInit) => fetch(url, init);
        if (input.query.ask === "1") return success(await ask(get, async (system, user) => (await complete(context.env, system, user, undefined, "tk")).text, q));
        return success(await lookup(get, q));
      } catch (error) {
        return success({ sources: [], note: error instanceof Error ? error.message : String(error) });
      }
    });
  },
};
