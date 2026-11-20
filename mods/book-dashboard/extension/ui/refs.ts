// References: a looked-up source as a bibliography entry in this book's style (Chicago, as the
// first six were written by hand), its citation label, and matching against the book's references.
// Pure, so the tests can run it in Node.
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
  from: string;
  model?: boolean;
}

export const REF_MARK = '[blykker-ref]: #';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SMALL = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet', 'as', 'at', 'by', 'in', 'of', 'on', 'to', 'up', 'via', 'vs.', 'von', 'van', 'de', 'der']);

/** Headline case for a title that came in lower case (Open Library's habit); others are kept as given. */
export function headline(title: string) {
  const words = title.split(' ');
  const lower = words.filter((w) => /^[a-z]/.test(w) && !SMALL.has(w)).length;
  if (lower < 2 && title !== title.toUpperCase()) return title;
  const src = title === title.toUpperCase() ? title.toLowerCase() : title;
  return src
    .split(' ')
    .map((w, i, all) => (i === 0 || i === all.length - 1 || /[:.?!]$/.test(all[i - 1] ?? '') || !SMALL.has(w) ? w.replace(/^([“"'(]?)(\p{Ll})/u, (_, p, c) => p + c.toUpperCase()) : w))
    .join(' ');
}
const nameCase = (s: string) => (s === s.toUpperCase() && /[A-Z]{2}/.test(s) ? s.toLowerCase().replace(/(^|[\s'-])\p{Ll}/gu, (m) => m.toUpperCase()) : s);
const tidy = (s: Source): Source => ({
  ...s,
  title: headline(s.title.replace(/[\s.:;,-]+$/, '').replace(/\s+--$/, '')).replace(/(\p{L})'(\p{L})/gu, '$1’$2'),
  authors: s.authors.map((n) => ({ ...n, given: n.given && nameCase(n.given), family: n.family && nameCase(n.family) })),
});

/** Drop repeat search hits: one per kind, title and first author, keeping the fullest. */
export function distinct(sources: Source[]) {
  const seen = new Map<string, Source>();
  for (const raw of sources) {
    const s = tidy(raw);
    const key = `${s.type}|${s.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()}|${(s.authors[0]?.family ?? s.authors[0]?.literal ?? '').toLowerCase()}`;
    const had = seen.get(key);
    const score = (x: Source) => Object.values(x).filter(Boolean).length;
    if (!had || score(s) > score(had)) seen.set(key, s);
  }
  return [...seen.values()];
}

const display = (n: Name, inverted: boolean) => n.literal ?? (inverted && n.given ? `${n.family}, ${n.given}` : [n.given, n.family].filter(Boolean).join(' '));
function authorList(names: Name[]) {
  if (!names.length) return '';
  const shown = names.length > 10 ? names.slice(0, 7) : names;
  const parts = shown.map((n, i) => display(n, i === 0));
  if (names.length > 10) return `${parts.join(', ')}, et al.`;
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}
const end = (s: string) => (/[.?!]$/.test(s) ? s : `${s}.`);
const quoted = (t: string) => (/[?!]$/.test(t) ? `“${t}”` : `“${t}.”`);
const year = (d?: string) => d?.slice(0, 4);
function longDate(d?: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  if (!m) return y;
  return day ? `${MONTHS[Number(m) - 1]} ${Number(day)}, ${y}` : `${MONTHS[Number(m) - 1]} ${y}`;
}

/** The entry, in the style of this book's hand-written references. */
export function formatEntry(s: Source) {
  const who = authorList(s.authors);
  const lead = who ? `${end(who)} ` : '';
  const link = s.doi ? `<https://doi.org/${s.doi}>` : s.url ? `<${s.url}>` : '';
  if (s.type === 'book') {
    const imprint = [s.place && s.publisher ? `${s.place}: ${s.publisher}` : s.publisher ?? s.place, year(s.date)].filter(Boolean).join(', ');
    return `${lead}*${s.title}*.${imprint ? ` ${imprint}.` : ''}`;
  }
  if (s.type === 'chapter') {
    const tail = [s.publisher, year(s.date)].filter(Boolean).join(', ');
    return `${lead}${quoted(s.title)}${s.container ? ` In *${s.container}*${s.pages ? `, ${s.pages}` : ''}.` : ''}${tail ? ` ${tail}.` : ''}${link ? ` ${link}` : ''}`;
  }
  if (s.type === 'article' && s.container) {
    const vol = s.volume ? ` ${s.volume}${s.issue ? `, no. ${s.issue}` : ''}` : '';
    const when = vol ? ` (${year(s.date) ?? 'n.d.'})${s.pages ? `: ${s.pages}` : ''}` : `, ${longDate(s.date) || 'n.d.'}`;
    return `${lead}${quoted(s.title)} *${s.container}*${vol}${when}.${link ? ` ${link}` : ''}`;
  }
  const where = [s.container ? `*${s.container}*` : '', longDate(s.date)].filter(Boolean).join(', ');
  return `${lead}${quoted(s.title)}${where ? ` ${where}.` : ''}${link ? ` ${link}` : ''}`;
}

/** The text a citation link shows: "Polanyi 1966", "LeCun and Bengio 2015", "LeCun et al. 2015". */
export function citeLabel(s: Source) {
  const fam = s.authors.map((n) => n.family ?? n.literal ?? '').filter(Boolean);
  const who = fam.length > 2 ? `${fam[0]} et al.` : fam.join(' and ');
  const short = s.title.split(/[:.?!]/)[0].split(' ').slice(0, 4).join(' ');
  return [who || short, year(s.date)].filter(Boolean).join(' ');
}

/** A label for a reference written by hand: the text before its first comma, and its last year. */
export function labelFromEntry(entry: string) {
  const who = entry.match(/^([^,.“"*<]+)[,.]/)?.[1]?.trim() ?? '';
  const y = [...entry.matchAll(/\b(1[5-9]\d\d|20\d\d)\b/g)].pop()?.[1];
  return [who, y].filter(Boolean).join(' ');
}

export const citation = (id: string, label: string) => (label.trim() ? `[[${id} | ${label.trim()}]]` : `[[${id}]]`);
export const entryOf = (contentMd: string) => contentMd.slice(REF_MARK.length).trim();
export const refText = (entry: string) => `${REF_MARK}\n\n${entry.trim()}\n`;

const norm = (s: string) => s.toLowerCase().replace(/[“”"'’*]/g, '').replace(/\s+/g, ' ').trim();
const bareUrl = (u: string) => u.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[/#?]+$/, '');

/** Which of the book's references already is this source: same DOI, same address, or same title. */
export function findExisting(s: Source, refs: { id: string; entry: string }[]) {
  const doi = s.doi?.toLowerCase();
  const url = s.url && !/openlibrary\.org|doi\.org/.test(s.url) ? bareUrl(s.url) : '';
  const title = norm(s.title);
  return refs.find(({ entry }) => {
    const e = entry.toLowerCase();
    return (doi && e.includes(doi)) || (url && e.replace(/https?:\/\/(www\.)?/g, '').includes(url)) || (title.length > 8 && norm(entry).includes(title));
  });
}

/** Does any hit carry most of the query's words in its title and authors? If not, the query was a description. */
export function relevant(q: string, sources: Source[]) {
  const words = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter((w) => w.length > 2);
  const want = [...new Set(words(q))];
  if (!want.length) return sources.length > 0;
  return sources.some((s) => {
    const have = new Set(words(`${s.title} ${s.authors.map((a) => `${a.given ?? ''} ${a.family ?? a.literal ?? ''}`).join(' ')}`));
    return want.filter((w) => have.has(w)).length / want.length >= 0.7;
  });
}
