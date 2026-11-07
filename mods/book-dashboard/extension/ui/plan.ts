/*
 * The rebuild plan: a port of `blykker.py sync` (Code/blygger-protocol/blykker/tools/blykker.py).
 * Pure given the items, so it runs in the browser and against a fixture. test/parity.ts holds it to
 * the Python output. It differs on purpose in one place: a section with unpublished edits also gets
 * a plan for its published text, so readers don't keep stale navigation.
 */

export interface Book {
  blyg: string;
  notes: 'chapter' | 'book';
  sections: Record<string, { role: string; title: string; id?: string }>;
  references: string[];
  indexTerms: string[];
  menu?: { top: MenuEntry[]; bottom: MenuEntry[] };
}
export type MenuEntry = { label: string; url?: string; section?: string };

export interface ItemLike {
  id: string;
  kind: string;
  status: string;
  revision: number;
  dirty: boolean;
  contentMd: string;
  stubOf?: unknown;
  media?: { id: string; inline?: boolean }[];
  publishedMedia?: { id: string }[];
  published?: { contentMd: string; generated?: unknown[] | null; stubOf?: unknown } | null;
}

const ID = '[0-9a-hjkmnp-tv-z]{26}';
const link = () => new RegExp(`(?<!!)\\[\\[(${ID})(?:[ \\t]*\\|([^\\n]*?))?\\]\\]`, 'g');
const directive = () => new RegExp(`^[ \\t]*!\\[\\[(${ID})(?:[ \\t]*\\|[^\\n]*?)?\\]\\][ \\t]*$`, 'gm');
const INDEX = /^\[index:\s*([^\]]+?)\]:\s*#\s*$/gm;
const NAV_TOP = '[blykker-nav-top]: #';
const NAV_BOTTOM = '[blykker-nav-bottom]: #';
const GENERATED = '[blykker-generated]: #';
const REF_MARK = '[blykker-ref]: #';
const NOTE_MARK = '[blykker-note]: #';
const IMAGE_MARK = '[blykker-image]: #';
const NOTES_AT = '[blykker-notes]: #';
const START = new RegExp(`\\[\\[(${ID})([ \\t]*\\|[^\\n\\]]*?Start reading[^\\n\\]]*?)\\]\\]`, 'g');
const NAV_LINE = new RegExp(`^\\[\\[${ID}[ \\t]*\\|[^\\n\\]]*\\]\\](?:[ \\t]*·[ \\t]*\\[\\[${ID}[ \\t]*\\|[^\\n\\]]*\\]\\])*$`);
export const NAV_NOTE = 'Navigation updated';

// Python's str.splitlines boundaries.
const LINES = new RegExp('\\r\\n|[\\n\\r\\v\\f\\x1c\\x1d\\x1e\\x85\\u2028\\u2029]');
const before = (text: string, mark: string) => {
  const at = text.indexOf(mark);
  return at < 0 ? text : text.slice(0, at);
};

/** The text readers see: the published version when the working copy has unpublished edits. */
export const liveText = (item: ItemLike) => (item.dirty && item.published ? item.published.contentMd : item.contentMd);

function notNav(chunk: string) {
  return chunk.trim().split(LINES).filter((l) => !NAV_LINE.test(l.trim())).join('\n').trim();
}

export function stripNav(input: string) {
  let text = input;
  const top = text.indexOf(NAV_TOP);
  if (top >= 0) text = `${notNav(text.slice(0, top))}\n\n${text.slice(top + NAV_TOP.length).trim()}`;
  const bottom = text.lastIndexOf(NAV_BOTTOM);
  if (bottom >= 0) text = `${text.slice(0, bottom).trimEnd()}\n\n${notNav(text.slice(bottom + NAV_BOTTOM.length))}`;
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

function splitHeading(input: string): [string, string] {
  const text = input.trim();
  const at = text.indexOf('\n');
  const first = at < 0 ? text : text.slice(0, at);
  return first.startsWith('#') ? [first, at < 0 ? '' : text.slice(at + 1).trim()] : ['', text];
}

type Ref = [string, string];

function navLine(prev: Ref | null, toc: Ref | null, nxt: Ref | null, here: string) {
  const parts: string[] = [];
  if (prev) parts.push(`[[${prev[0]} | ← ${prev[1]}]]`);
  if (toc && here !== toc[0] && (!prev || prev[0] !== toc[0]) && (!nxt || nxt[0] !== toc[0])) parts.push(`[[${toc[0]} | ${toc[1]}]]`);
  if (nxt) parts.push(`[[${nxt[0]} | ${nxt[1]} →]]`);
  return parts.join(' · ');
}

function withNav(text: string, line: string) {
  const body = stripNav(text);
  if (!line) return body;
  const [heading, rest] = splitHeading(body);
  const top = heading ? `${heading}\n\n${line}` : line;
  return `${top}\n\n${NAV_TOP}\n\n${rest}\n\n${NAV_BOTTOM}\n\n${line}`.replaceAll('\n\n\n\n', '\n\n');
}

function tocEntries(tocText: string): Ref[] {
  const seen = new Set<string>();
  const out: Ref[] = [];
  for (const m of stripNav(tocText).matchAll(link())) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push([m[1], (m[2] ?? '').trim() || m[1]]);
  }
  return out;
}

function notesCited(text: string, isNote: (id: string) => boolean) {
  return [...new Set([...text.matchAll(link())].map((m) => m[1]).filter(isNote))];
}

function notesBlock(notes: string[]) {
  return notes.map((id, i) => `**${i + 1}.**\n\n![[${id}]]`).join('\n\n');
}

function withChapterNotes(text: string, isNote: (id: string) => boolean, inline: boolean) {
  let main = before(stripNav(text), NOTES_AT).trimEnd();
  const notes = notesCited(main, isNote);
  const number = new Map(notes.map((id, i) => [id, i + 1]));
  main = main.replace(link(), (whole, id: string) => (number.has(id) ? `[[${id} | ${number.get(id)}]]` : whole));
  return inline && notes.length ? `${main}\n\n${NOTES_AT}\n\n### Notes\n\n${notesBlock(notes)}` : main;
}

function withGenerated(text: string, generated: string) {
  const head = before(stripNav(text), GENERATED).trimEnd();
  return `${head}\n\n${GENERATED}\n\n${generated}`.trimEnd();
}

function indexTerms(text: string) {
  return [...text.matchAll(INDEX)].map((m) => m[1].replace(/\s+\d+$/, '').trim());
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function indexBody(found: Map<string, Ref[]>, listed: string[]) {
  const terms = new Map<string, Ref[]>(listed.map((t) => [t, found.get(t) ?? []]));
  for (const [t, locs] of found) terms.set(t, locs);
  return [...terms.keys()].sort((a, b) => compare(a.toLowerCase(), b.toLowerCase())).map((term) => {
    const at = term.indexOf(';');
    const name = (at < 0 ? term : term.slice(0, at)).trim();
    const sub = at < 0 ? '' : term.slice(at + 1);
    const label = `**${name}**` + (sub ? `, ${sub.trim()}` : '');
    const locs = terms.get(term)!.map(([i, t]) => `[[${i} | ${t}]]`).join(', ');
    return `- ${label}` + (locs ? ` — ${locs}` : '');
  }).join('\n');
}

const byRole = (book: Book, role: string) => Object.values(book.sections).find((s) => s.role === role);
const sectionId = (book: Book, role: string) => byRole(book, role)?.id;

/** The reading order, from what readers see of the Contents. */
export function chainOf(book: Book, toc: ItemLike): Ref[] {
  const chain: Ref[] = [];
  for (const role of ['cover', 'title']) {
    const s = byRole(book, role);
    if (s?.id) chain.push([s.id, s.title]);
  }
  chain.push([toc.id, byRole(book, 'toc')!.title]);
  const known = new Set(chain.map((c) => c[0]));
  return chain.concat(tocEntries(liveText(toc)).filter((e) => !known.has(e[0])));
}

/** Load everything a plan reads; ids that don't resolve are left out and warned about by the plan. */
export async function loadItems(book: Book, get: (id: string) => Promise<ItemLike | null>) {
  const items = new Map<string, ItemLike>();
  const fetchAll = async (ids: Iterable<string>) => {
    const queue = [...new Set(ids)].filter((id) => !items.has(id));
    await Promise.all(Array.from({ length: 5 }, async () => {
      for (let id = queue.shift(); id; id = queue.shift()) {
        const item = await get(id);
        if (item) items.set(id, item);
      }
    }));
  };
  await fetchAll([...Object.values(book.sections).flatMap((s) => (s.id ? [s.id] : [])), ...book.references]);
  const chain = chainOf(book, items.get(sectionId(book, 'toc')!)!);
  await fetchAll(chain.map((c) => c[0]));
  const texts = chain.flatMap(([id]) => {
    const item = items.get(id);
    return item ? [item.contentMd, liveText(item)] : [];
  });
  await fetchAll(texts.flatMap((t) => [...t.matchAll(link()), ...t.matchAll(directive())].map((m) => m[1])));
  return items;
}

export type Action = 'publish' | 'draft' | 'splice' | 'held';

export interface SectionPlan {
  id: string;
  title: string;
  action: Action;
  revision: number;
  /** The working copy before and after. */
  oldWorking: string;
  newWorking: string;
  /** The published text before and after; on splice and held only. */
  oldPublic?: string;
  newPublic?: string;
  /** Why a section with a draft can't get new navigation published. */
  reason?: string;
}

export interface Plan {
  chain: Ref[];
  sections: SectionPlan[];
  menu: { authorLinks: unknown[]; linksExternal: unknown[]; linksThreads: string[] } | null;
  warnings: string[];
}

/** What the plan says is outstanding. A held section with nothing to write isn't: only publishing it can settle it. */
export function outstanding(plan: Plan) {
  return {
    pending: plan.sections.filter((s) => s.action !== 'held' || s.newWorking !== s.oldWorking),
    held: plan.sections.filter((s) => s.action === 'held'),
    menu: !!plan.menu,
  };
}

/** The plain sentence for the top of the dashboard. */
export function statusLine(plan: Plan) {
  const { pending, held, menu } = outstanding(plan);
  const n = pending.length + (menu ? 1 : 0);
  if (n) return `Rebuild needed: ${n} item${n === 1 ? '' : 's'}`;
  return held.length ? `Up to date, except ${held.length} section${held.length === 1 ? '' : 's'} held until published` : 'Up to date';
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** What the rebuild button says it will do; null when there's nothing it can do. */
export function actionLabel(plan: Plan) {
  const { pending, menu } = outstanding(plan);
  const publishes = pending.filter((s) => s.action === 'publish' || s.action === 'splice').length;
  const drafts = pending.length - publishes;
  if (publishes) return `Rebuild and publish ${count(publishes, 'section')}${menu ? ' and the menu' : ''}${drafts ? `, and update ${count(drafts, 'draft')}` : ''}`;
  if (drafts && menu) return `Update ${count(drafts, 'draft')}, and publish the menu`;
  if (drafts) return `Update ${count(drafts, 'draft')} (nothing gets published)`;
  return menu ? 'Update and publish the menu' : null;
}

const navLinks = (text: string) => {
  const at = text.indexOf(NAV_TOP);
  if (at < 0) return null;
  const line = text.slice(0, at).split('\n').reverse().find((l) => NAV_LINE.test(l.trim()));
  const labels = line ? [...line.matchAll(link())].map((m) => (m[2] ?? '').trim()) : [];
  return {
    prev: labels.find((l) => l.startsWith('← '))?.slice(2) ?? null,
    next: labels.find((l) => l.endsWith(' →'))?.slice(0, -2) ?? null,
    contents: labels.some((l) => !l.startsWith('← ') && !l.endsWith(' →')),
  };
};

const after = (text: string, mark: string) => {
  const at = text.indexOf(mark);
  return at < 0 ? '' : text.slice(at + mark.length);
};
const authorPart = (text: string) => settled(before(before(stripNav(text), GENERATED), NOTES_AT));
const entries = (body: string) => new Map(
  body.split('\n').filter((l) => l.startsWith('- ')).map((l) => {
    const at = l.indexOf(' — ');
    return [at < 0 ? l : l.slice(0, at), at < 0 ? '' : l.slice(at)] as [string, string];
  }),
);
const directives = (body: string) => [...body.matchAll(directive())].map((m) => m[1]);

function tally(title: string, added: number, removed: number) {
  return [
    ...(added ? [`${title}: ${count(added, 'entry', 'entries')} added`] : []),
    ...(removed ? [`${title}: ${count(removed, 'entry', 'entries')} removed`] : []),
  ];
}

/** What a rebuild does to one section, in words. Describes what readers get where that differs from the draft. */
export function describeChange(section: SectionPlan, titles: Map<string, string>) {
  const oldText = section.oldPublic ?? section.oldWorking;
  const newText = section.newPublic ?? section.newWorking;
  const changes: string[] = [];

  const oldNav = navLinks(oldText);
  const newNav = navLinks(newText);
  if (newNav && !oldNav) changes.push('Gets navigation for the first time');
  else if (oldNav && !newNav) changes.push('Navigation removed');
  else if (oldNav && newNav) {
    if (oldNav.prev !== newNav.prev) changes.push(newNav.prev ? `Previous link → ${newNav.prev}` : 'Previous link removed');
    if (oldNav.next !== newNav.next) changes.push(newNav.next ? `Next link → ${newNav.next}` : 'Next link removed');
    if (oldNav.contents !== newNav.contents) changes.push(newNav.contents ? 'Contents link added' : 'Contents link removed');
  }

  const startOf = (text: string) => [...text.matchAll(START)][0]?.[1];
  const startChanged = startOf(oldText) !== startOf(newText);
  if (startChanged && startOf(newText)) changes.push(`“Start reading” link → ${titles.get(startOf(newText)!) ?? startOf(newText)}`);

  const oldBody = after(stripNav(oldText), GENERATED);
  const newBody = after(stripNav(newText), GENERATED);
  if (oldBody.trim() !== newBody.trim()) {
    const was = entries(oldBody);
    const now = entries(newBody);
    if (was.size || now.size) {
      changes.push(...tally(section.title, [...now.keys()].filter((k) => !was.has(k)).length, [...was.keys()].filter((k) => !now.has(k)).length));
      const moved = [...now].filter(([k, v]) => was.has(k) && was.get(k) !== v).length;
      if (moved) changes.push(`${section.title}: ${count(moved, 'entry', 'entries')} with changed locations`);
    } else {
      const was2 = directives(oldBody);
      const now2 = directives(newBody);
      const lines = tally(section.title, now2.filter((k) => !was2.includes(k)).length, was2.filter((k) => !now2.includes(k)).length);
      changes.push(...(lines.length ? lines : [`${section.title}: order or generated text changed`]));
    }
  }

  const oldNotes = directives(after(stripNav(oldText), NOTES_AT));
  const newNotes = directives(after(stripNav(newText), NOTES_AT));
  const notesAdded = newNotes.filter((k) => !oldNotes.includes(k)).length;
  const notesRemoved = oldNotes.filter((k) => !newNotes.includes(k)).length;
  if (notesAdded) changes.push(`Notes: ${count(notesAdded, 'note')} added`);
  if (notesRemoved) changes.push(`Notes: ${count(notesRemoved, 'note')} removed`);

  const oldMain = authorPart(oldText);
  const newMain = authorPart(newText);
  if (oldMain !== newMain) {
    const bare = (text: string) => text.replace(link(), '[[]]');
    if (bare(oldMain) !== bare(newMain)) changes.push('Other generated text changed');
    else if (!startChanged) changes.push('Note numbers or link labels updated');
  }
  if (!changes.length) changes.push(settled(oldText) === settled(newText) ? 'Whitespace tidied' : 'Generated text changed');

  const note = section.action === 'splice' ? 'Your unpublished draft stays private, and gets the same navigation.'
    : section.action === 'draft' ? 'Draft only: nothing is published.'
    : section.action === 'held' ? `Published version held: ${section.reason}. Readers get these changes when you publish this section.`
    : null;
  return { changes, note };
}

/** What would reach readers if published text were republished, other than the text. Null when nothing would. */
export function spliceBlock(item: ItemLike) {
  const published = item.published!;
  if (published.generated?.length) return 'its published version has generated text, and republishing that text would lose the disclosure';
  if (JSON.stringify(item.stubOf ?? null) !== JSON.stringify(published.stubOf ?? null)) return 'the draft changes what it responds to, and publishing would make that public';
  const shown = new Set((item.publishedMedia ?? []).map((m) => m.id));
  if ((item.media ?? []).some((m) => !m.inline && !shown.has(m.id))) return 'the draft has a new attachment, and publishing would make it public';
  return null;
}

// Whitespace-only differences don't justify a new public version of a draft section.
const settled = (text: string) => text.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();

export function buildPlan(book: Book, items: Map<string, ItemLike>, settings?: { authorLinks?: unknown; linksExternal?: unknown }): Plan {
  const warnings: string[] = [];
  const tocSection = byRole(book, 'toc')!;
  const toc = items.get(tocSection.id!)!;
  const chain = chainOf(book, toc);
  const tocRef: Ref = [toc.id, tocSection.title];
  const titles = new Map(chain);
  const coverId = sectionId(book, 'cover');
  const notesId = sectionId(book, 'notes');
  const present = (id: string) => {
    const item = items.get(id);
    if (!item && !warned.has(id)) {
      warned.add(id);
      warnings.push(`${id} is linked in the book but doesn't resolve`);
    }
    return item;
  };
  const warned = new Set<string>();

  const found = new Map<string, Ref[]>();
  const cited: string[] = [];
  for (const [id, title] of chain) {
    const item = present(id);
    if (!item) continue;
    const text = stripNav(liveText(item));
    for (const term of indexTerms(text)) {
      if (!found.has(term)) found.set(term, []);
      if (!found.get(term)!.some((r) => r[0] === id)) found.get(term)!.push([id, title]);
    }
    for (const m of text.matchAll(link())) cited.push(m[1]);
  }

  const isNote = (i: string) => {
    if (titles.has(i)) return false;
    const item = present(i);
    return !!item && item.kind === 'fragment' && item.contentMd.startsWith(NOTE_MARK);
  };
  const assembled = new Set(['cover', 'toc', 'index', 'references', 'notes'].flatMap((r) => sectionId(book, r) ?? []));
  const inline = book.notes !== 'book';
  const bookNotes: [string, string[]][] = [];
  for (const [id, title] of chain) {
    const item = present(id);
    if (!item || assembled.has(id)) continue;
    const notes = notesCited(before(stripNav(liveText(item)), NOTES_AT), isNote);
    if (notes.length) bookNotes.push([title, notes]);
    for (const m of stripNav(item.contentMd).matchAll(directive())) {
      const img = present(m[1]);
      if (!img?.contentMd.startsWith(IMAGE_MARK)) continue;
      const missing = ['rights', 'source', 'print'].filter((k) => !img.contentMd.includes(`[${k}:`));
      if (missing.length) warnings.push(`image ${m[1]} in ${title} lacks ${missing.join(', ')}`);
    }
  }

  const tocAt = chain.findIndex((c) => c[0] === tocRef[0]);
  const first = tocAt + 1 < chain.length ? chain[tocAt + 1][0] : null;
  const indexBodyText = indexBody(found, book.indexTerms);
  const refs = [...book.references, ...[...new Set(cited)].filter((i) => {
    if (book.references.includes(i) || titles.has(i)) return false;
    const item = present(i);
    return !!item && item.kind === 'fragment' && item.contentMd.startsWith(REF_MARK);
  })].filter((i) => present(i));
  const entries = [...refs].sort((a, b) => compare(refKey(items.get(a)!), refKey(items.get(b)!)));
  const refsBody = entries.map((i) => `![[${i}]]`).join('\n\n');
  const notesBody = bookNotes.map(([t, n]) => `### ${t}\n\n${notesBlock(n)}`).join('\n\n');

  /** Apply everything the book generates to one text of one section. */
  const transform = (id: string, n: number, base: string) => {
    let text = base;
    if (id === notesId) text = withGenerated(text, notesBody);
    else if (!assembled.has(id) && n >= 0) text = withChapterNotes(text, isNote, inline);
    if (id === coverId && first) text = text.replace(START, (_, _id, label: string) => `[[${first}${label}]]`);
    if (id === sectionId(book, 'index')) text = withGenerated(text, indexBodyText);
    if (id === sectionId(book, 'references')) text = withGenerated(text, refsBody);
    if (n < 0) return text;
    if (id === coverId) return stripNav(text);
    const prev = n > 0 && chain[n - 1][0] !== coverId ? chain[n - 1] : null;
    const nxt = n + 1 < chain.length ? chain[n + 1] : null;
    return withNav(text, navLine(prev, tocRef, nxt, id));
  };

  const targets: [string, string, number][] = chain.map(([id, title], n) => [id, title, n]);
  for (const role of ['notes', 'index', 'references']) {
    const s = byRole(book, role);
    if (s?.id && !titles.has(s.id)) targets.push([s.id, s.title, -1]);
  }

  const sections: SectionPlan[] = [];
  for (const [id, title, n] of targets) {
    const item = items.get(id);
    if (!item) continue;
    const newWorking = transform(id, n, item.contentMd);
    const base = { id, title, revision: item.revision, oldWorking: item.contentMd, newWorking };
    if (item.status === 'public' && item.dirty && item.published) {
      const oldPublic = item.published.contentMd;
      const newPublic = transform(id, n, oldPublic);
      if (settled(newPublic) === settled(oldPublic)) {
        if (newWorking !== item.contentMd) sections.push({ ...base, action: 'draft' });
      } else if (newWorking === newPublic) {
        sections.push({ ...base, action: 'publish' });
      } else {
        const reason = spliceBlock(item);
        sections.push({ ...base, action: reason ? 'held' : 'splice', oldPublic, newPublic, ...(reason ? { reason } : {}) });
      }
    } else if (newWorking !== item.contentMd) {
      sections.push({ ...base, action: item.status === 'public' ? 'publish' : 'draft' });
    }
  }

  return { chain, sections, menu: planMenu(book, first ?? toc.id, settings), warnings };
}

const refKey = (item: ItemLike) => {
  const text = item.contentMd.startsWith(REF_MARK) ? item.contentMd.slice(REF_MARK.length) : item.contentMd;
  return text.trim().toLowerCase();
};

function planMenu(book: Book, first: string, settings?: { authorLinks?: unknown; linksExternal?: unknown }): Plan['menu'] {
  if (!book.menu || !settings) return null;
  const url = (e: MenuEntry) =>
    e.url ?? `${book.blyg.replace(/\/+$/, '')}/t/${e.section === '@first' ? first : book.sections[e.section!].id}/`;
  const links = (entries: MenuEntry[]) => entries.map((e) => ({ label: e.label, url: url(e) }));
  const authorLinks = links(book.menu.top);
  const linksExternal = links(book.menu.bottom);
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  return same(authorLinks, settings.authorLinks) && same(linksExternal, settings.linksExternal)
    ? null
    : { authorLinks, linksExternal, linksThreads: [] };
}

/** Words the author wrote: no nav, markers, generated blocks or link syntax. */
export function authorWords(text: string) {
  const body = before(before(stripNav(text), GENERATED), NOTES_AT)
    .replace(/^\[[^\]\n]+\]:[ \t]*\S+[ \t]*$/gm, ' ')
    .replace(/!\[\[[^\]\n]*\]\]/g, ' ')
    .replace(new RegExp(`\\[\\[${ID}[ \\t]*\\|([^\\n]*?)\\]\\]`, 'g'), '$1')
    .replace(new RegExp(`\\[\\[${ID}\\]\\]`, 'g'), ' ')
    .replace(/!\[[^\]\n]*\]\([^)\n]*\)/g, ' ')
    .replace(/\[([^\]\n]*)\]\([^)\n]*\)/g, '$1');
  return body.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** The lines that differ between two texts, for the preview. */
export function changedLines(oldText: string, newText: string): { sign: '+' | '-'; line: string }[] {
  const a = oldText.split('\n');
  const b = newText.split('\n');
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  const x = a.slice(start, endA);
  const y = b.slice(start, endB);
  if (x.length * y.length > 4_000_000) {
    return [...x.map((line) => ({ sign: '-' as const, line })), ...y.map((line) => ({ sign: '+' as const, line }))].filter((l) => l.line.trim());
  }
  const lcs = Array.from({ length: x.length + 1 }, () => new Uint32Array(y.length + 1));
  for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) {
    lcs[i][j] = x[i] === y[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  }
  const out: { sign: '+' | '-'; line: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) { i++; j++; }
    else if (j < y.length && (i === x.length || lcs[i][j + 1] >= lcs[i + 1][j])) out.push({ sign: '+', line: y[j++] });
    else out.push({ sign: '-', line: x[i++] });
  }
  return out.filter((l) => l.line.trim());
}
