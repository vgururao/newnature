// The book dashboard's owner read: look up a source for a reference (docs/extensions.md).
// Studio furniture: nothing here reaches the wire.
import { z } from "@hono/zod-openapi";
import { extensionRoute } from "../../src/extensions/contract.ts";

const Name = z.object({ given: z.string().optional(), family: z.string().optional(), literal: z.string().optional() });
export const SourceSchema = z
  .object({
    type: z.enum(["web", "article", "book", "chapter", "other"]),
    title: z.string(),
    authors: z.array(Name),
    container: z.string().optional().describe("Site, journal or book the work appears in."),
    publisher: z.string().optional(),
    place: z.string().optional(),
    date: z.string().optional().describe("YYYY, YYYY-MM or YYYY-MM-DD."),
    volume: z.string().optional(),
    issue: z.string().optional(),
    pages: z.string().optional(),
    url: z.string().optional(),
    doi: z.string().optional(),
    isbn: z.string().optional(),
    from: z.enum(["page", "crossref", "datacite", "openlibrary"]),
    model: z.boolean().optional().describe("Suggested by the model, then confirmed by `from`."),
  })
  .openapi("BookDashboardSource");

export const routes = {
  // q is a URL, a DOI, an ISBN or a rough citation; a rough one is searched and gives up to 6 candidates.
  // With ask=1, q is a loose description for the model (lookup.ts, `ask`).
  extBookDashboardLookup: extensionRoute("book-dashboard", "lookup", "/lookup", z.object({ sources: z.array(SourceSchema), note: z.string().optional() }), z.object({ q: z.string().min(2).max(500), ask: z.enum(["1"]).optional().describe("Ask the TK generation model to identify the work, then confirm each suggestion in a registry. One AI call, counted in the daily budget.") })),
};
