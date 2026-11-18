// Finding a source for a reference: a URL (the page's citation and Open Graph metadata), a DOI
// (Crossref, then DataCite), an ISBN (Open Library), or a rough citation searched in Crossref and
// Open Library. `fetch` is passed in, so the tests can run it in Node.
type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
export interface Name { given?: string; family?: string; literal?: string }
export interface Source {
  type: 'web' | 'article' | 'book' | 'chapter' | 'other';
  title: string;
  authors: Name[];
  container?: string;
  publisher?: string;
  place?: string;
  date?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  url?: string;
  doi?: string;
  isbn?: string;
  from: 'page' | 'crossref' | 'datacite' | 'openlibrary';
}
export type Query = { kind: 'doi' | 'isbn' | 'url' | 'text'; value: string };

const UA = 'blygger-studio book-dashboard (reference lookup)';
const PAGE_BYTES = 1_500_000;
const TIMEOUT = 8000;
const SEARCH_ROWS = 4;

export function classify(input: string): Query {
  const q = input.trim();
  const doi = q.match(/\b(10\.\d{4,9}\/[^\s"<>]+)/);
  if (doi && (!/^https?:/i.test(q) || /(^|\.)doi\.org\//i.test(q))) return { kind: 'doi', value: doi[1].replace(/[.,;)]+$/, '') };
  if (/^https?:\/\//i.test(q)) return { kind: 'url', value: q };
  const isbn = q.replace(/^isbn[:\s]*/i, '').replace(/[\s-]/g, '');
  if (/^(97[89]\d{10}|\d{9}[\dXx])$/.test(isbn)) return { kind: 'isbn', value: isbn.toUpperCase() };
  return { kind: 'text', value: q };
}

const clean = (s: unknown) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '');
const opt = (s: unknown) => clean(s) || undefined;

/** "Given Family", "Family, Given", or a name that is an organization. */
export function parseName(raw: string): Name {
  const s = clean(raw).replace(/^by\s+/i, '');
  if (!s) return {};
  if (s.includes(',')) {
    const [family, given] = s.split(',', 2).map((p) => p.trim());
    return given ? { given, family } : { literal: family };
  }
  const parts = s.split(' ');
  if (parts.length === 1 || /\b(inc|llc|ltd|institute|university|press|foundation|staff)\b/i.test(s)) return { literal: s };
  return { given: parts.slice(0, -1).join(' '), family: parts[parts.length - 1] };
}

function isoDate(raw: unknown): string | undefined {
  const s = clean(raw == null ? '' : String(raw));
  const m = s.match(/^(\d{4})(?:[-/](\d{1,2}))?(?:[-/](\d{1,2}))?/);
  if (m) return [m[1], m[2]?.padStart(2, '0'), m[3]?.padStart(2, '0')].filter(Boolean).join('-');
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  const y = s.match(/\b(1[5-9]\d\d|20\d\d)\b/);
  return y?.[1];
}

const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

function attrs(tag: string) {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) out[m[1].toLowerCase()] = decode(m[3] ?? m[4] ?? m[5] ?? '');
  return out;
}

/** A page's citation, Open Graph, JSON-LD and plain metadata, as a source. Pure. */
export function fromPage(html: string, url: string): Source {
  const meta = new Map<string, string[]>();
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const key = (a.name ?? a.property ?? a.itemprop ?? '').toLowerCase();
    if (key && a.content !== undefined) meta.set(key, [...(meta.get(key) ?? []), clean(decode(a.content))]);
  }
  const one = (...keys: string[]) => keys.map((k) => meta.get(k)?.find(Boolean)).find(Boolean);
  const ld: Record<string, any>[] = [];
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const v = JSON.parse(m[1]);
      for (const node of [v, ...(Array.isArray(v) ? v : []), ...(Array.isArray(v?.['@graph']) ? v['@graph'] : [])])
        if (node && typeof node === 'object' && !Array.isArray(node)) ld.push(node);
    } catch { /* a page's broken JSON-LD is skipped */ }
  }
  const article = ld.find((n) => /Article|BlogPosting|Report|ScholarlyArticle|WebPage|Book/.test(String(n['@type'])) && (n.headline || n.name));
  const ldNames = (v: unknown): string[] => (Array.isArray(v) ? v : v ? [v] : []).map((a: any) => clean(typeof a === 'string' ? a : a?.name)).filter(Boolean);

  const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0])).find((a) => /\bcanonical\b/i.test(a.rel ?? ''))?.href;
  const site = one('og:site_name', 'citation_journal_title', 'citation_publisher', 'application-name') ?? clean(article?.publisher?.name) ?? undefined;
  let title = one('citation_title', 'og:title', 'twitter:title', 'dc.title') ?? clean(article?.headline ?? article?.name) ?? '';
  if (!title) title = clean(decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''));
  if (site) title = title.replace(new RegExp(`\\s*[|–—-]\\s*${site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'), '');

  const named = meta.get('citation_author') ?? (ldNames(article?.author).length ? ldNames(article?.author) : [one('author', 'dc.creator', 'parsely-author', 'twitter:creator:name')].filter(Boolean) as string[]);
  const authors = named.filter((n) => !/^https?:/i.test(n)).map(parseName).filter((n) => n.family || n.literal);
  const doi = one('citation_doi', 'dc.identifier')?.match(/10\.\d{4,9}\/\S+/)?.[0];
  const journal = one('citation_journal_title');
  return {
    type: journal ? 'article' : /book/i.test(one('og:type') ?? '') ? 'book' : 'web',
    title,
    authors,
    container: site,
    date: isoDate(one('citation_publication_date', 'citation_date', 'article:published_time', 'date', 'dc.date', 'pubdate') ?? article?.datePublished),
    volume: opt(one('citation_volume')),
    issue: opt(one('citation_issue')),
    pages: [one('citation_firstpage'), one('citation_lastpage')].filter(Boolean).join('–') || undefined,
    url: canonical && /^https?:/i.test(canonical) ? canonical : url,
    doi,
    from: 'page',
  };
}

const TYPES: Record<string, Source['type']> = {
  'journal-article': 'article', 'proceedings-article': 'article', 'posted-content': 'article', article: 'article', 'article-journal': 'article',
  book: 'book', monograph: 'book', 'edited-book': 'book', 'book-chapter': 'chapter', 'book-section': 'chapter', chapter: 'chapter',
};
const csNames = (list: any[] | undefined): Name[] =>
  (list ?? []).map((a) => (a.family ? { given: opt(a.given), family: clean(a.family) } : { literal: clean(a.name ?? a.literal) })).filter((n) => n.family || n.literal);
const parts = (d: any) => (d?.['date-parts']?.[0] ?? []).filter((x: unknown) => x != null).map((x: number, i: number) => (i ? String(x).padStart(2, '0') : String(x))).join('-') || undefined;

export function fromCrossref(w: any): Source {
  const book = TYPES[w.type] === 'book';
  return {
    type: TYPES[w.type] ?? 'other',
    title: [clean(w.title?.[0]), clean(w.subtitle?.[0])].filter(Boolean).join(': '),
    authors: csNames(w.author?.length ? w.author : w.editor),
    container: book ? undefined : opt(w['container-title']?.[0]),
    publisher: opt(w.publisher),
    place: opt(w['publisher-location']),
    date: parts(w['published-print']) ?? parts(w.issued) ?? parts(w['published-online']),
    volume: opt(w.volume), issue: opt(w.issue), pages: opt(w.page)?.replace('-', '–'),
    doi: opt(w.DOI), url: w.DOI ? `https://doi.org/${w.DOI}` : opt(w.URL),
    isbn: opt(w.ISBN?.[0]),
    from: 'crossref',
  };
}

export function fromDatacite(a: any): Source {
  return {
    type: TYPES[clean(a.types?.citeproc) || clean(a.types?.resourceTypeGeneral).toLowerCase()] ?? 'other',
    title: clean(a.titles?.[0]?.title),
    authors: (a.creators ?? []).map((c: any) => (c.familyName ? { given: opt(c.givenName), family: clean(c.familyName) } : { literal: clean(c.name) })).filter((n: Name) => n.family || n.literal),
    container: opt(a.container?.title),
    publisher: opt(typeof a.publisher === 'string' ? a.publisher : a.publisher?.name),
    date: opt(String(a.publicationYear ?? '')),
    doi: opt(a.doi), url: a.doi ? `https://doi.org/${a.doi}` : opt(a.url),
    from: 'datacite',
  };
}

/** Open Library's books API (jscmd=data) or a search doc. */
export function fromOpenLibrary(b: any): Source {
  const authors = (b.authors ?? []).map((a: any) => parseName(a.name)).concat((b.author_name ?? []).map(parseName));
  return {
    type: 'book',
    title: [clean(b.title), clean(b.subtitle)].filter(Boolean).join(': '),
    authors,
    publisher: opt(b.publishers?.[0]?.name ?? b.publisher?.[0]),
    place: opt(b.publish_places?.[0]?.name),
    date: isoDate(b.publish_date ?? b.first_publish_year)?.slice(0, 4),
    isbn: opt(b.identifiers?.isbn_13?.[0] ?? b.identifiers?.isbn_10?.[0] ?? b.isbn?.[0]),
    url: b.key ? `https://openlibrary.org${b.key}` : opt(b.url),
    from: 'openlibrary',
  };
}

const get = (fetch: Fetch, url: string, accept = 'application/json') =>
  fetch(url, { headers: { accept, 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT) });
async function json(fetch: Fetch, url: string): Promise<any> {
  const r = await get(fetch, url);
  return r.ok ? r.json() : null;
}

/** Only public web pages: no localhost, private ranges or odd ports. */
export function fetchable(raw: string) {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password || (u.port && !['80', '443'].includes(u.port))) return false;
  const h = u.hostname.toLowerCase();
  return !(h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local') || /^\[/.test(h) || /^(0|10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h) || !h.includes('.'));
}

async function page(fetch: Fetch, url: string): Promise<Source> {
  if (!fetchable(url)) throw new Error('That address is not a public web page.');
  const r = await get(fetch, url, 'text/html,application/xhtml+xml');
  if (!r.ok) throw new Error(`The page answered ${r.status}.`);
  if (!/html|xml/i.test(r.headers.get('content-type') ?? 'text/html')) throw new Error('That address is not a web page.');
  const reader = r.body!.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < PAGE_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await reader.cancel().catch(() => {});
  const html = new TextDecoder().decode(concat(chunks));
  return fromPage(html, r.url || url);
}
function concat(chunks: Uint8Array[]) {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

async function doi(fetch: Fetch, value: string): Promise<Source | null> {
  const id = encodeURIComponent(value);
  const cr = await json(fetch, `https://api.crossref.org/works/${id}`);
  if (cr?.message) return fromCrossref(cr.message);
  const dc = await json(fetch, `https://api.datacite.org/dois/${id}`);
  return dc?.data?.attributes ? fromDatacite(dc.data.attributes) : null;
}

export async function lookup(fetch: Fetch, input: string): Promise<{ sources: Source[]; note?: string }> {
  const q = classify(input);
  if (q.kind === 'doi') {
    const found = await doi(fetch, q.value);
    return found ? { sources: [found] } : { sources: [], note: `No record for DOI ${q.value}.` };
  }
  if (q.kind === 'isbn') {
    const got = await json(fetch, `https://openlibrary.org/api/books?bibkeys=ISBN:${q.value}&format=json&jscmd=data`);
    const book = got?.[`ISBN:${q.value}`];
    return book ? { sources: [{ ...fromOpenLibrary(book), isbn: q.value }] } : { sources: [], note: `Open Library has no book with ISBN ${q.value}.` };
  }
  if (q.kind === 'url') {
    const found = await page(fetch, q.value);
    // A page that names its DOI gets the registry's fuller record, keeping the page's address.
    if (found.doi && found.type !== 'web') {
      const record = await doi(fetch, found.doi).catch(() => null);
      if (record) return { sources: [record, found] };
    }
    return { sources: [found] };
  }
  const text = encodeURIComponent(q.value);
  const [cr, ol] = await Promise.all([
    json(fetch, `https://api.crossref.org/works?rows=${SEARCH_ROWS}&query.bibliographic=${text}&select=DOI,title,subtitle,author,editor,issued,published-print,published-online,container-title,type,publisher,publisher-location,volume,issue,page,ISBN,URL`).catch(() => null),
    json(fetch, `https://openlibrary.org/search.json?limit=${SEARCH_ROWS}&q=${text}&fields=key,title,subtitle,author_name,first_publish_year,publisher,isbn`).catch(() => null),
  ]);
  const books = (ol?.docs ?? []).map(fromOpenLibrary).map((b: Source) => ({ ...b, publisher: undefined }));
  const works = (cr?.message?.items ?? []).map(fromCrossref);
  // Books first: a rough citation in this book is more often a book than a paper.
  const sources = [...books, ...works].filter((s) => s.title).slice(0, 6);
  const silent = [!ol && 'Open Library', !cr && 'Crossref'].filter(Boolean).join(' and ');
  const note = silent ? `${silent} didn't answer; try again for more.` : undefined;
  return sources.length ? { sources, note } : { sources: [], note: note ?? 'Nothing found. Try a URL, DOI or ISBN, or fewer words.' };
}
