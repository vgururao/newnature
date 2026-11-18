// The book dashboard's server half: one owner read that looks up a source for a reference
// (lookup.ts). Mounted under /api/ext/book-dashboard/ behind the owner API's middleware, and
// only answering when the extension is enabled.
import { failure, success } from "../../src/operation-types.ts";
import type { ServerExtension } from "../../src/extensions/server.ts";
import { routes } from "./contract.ts";
import { lookup } from "./lookup.ts";

export const server: ServerExtension = {
  name: "book-dashboard",
  routes(router) {
    router.get(routes.extBookDashboardLookup, async (_context, input) => {
      const q = String(input.query.q ?? "").trim();
      if (q.length < 2) return failure("invalid-input", { error: "q is a URL, DOI, ISBN or citation" });
      try {
        return success(await lookup((url, init) => fetch(url, init), q));
      } catch (error) {
        return success({ sources: [], note: error instanceof Error ? error.message : String(error) });
      }
    });
  },
};
