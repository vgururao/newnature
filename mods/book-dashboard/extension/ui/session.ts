/*
 * Writing sessions: what changed in the book between "start" and "end", and the log entry that
 * records it. Pure, so test/session.test.mts can hold it to fixtures.
 *
 * Words are the author's (no nav, markers, generated blocks or link syntax; the Dashboard's word
 * counts are these too), each marked hand-written or AI. AI means inside a TK scope's output (`[TK]…[=]output[/TK]`) or an
 * `impyrt` scope (`[TK]impyrt=…[/TK]`), the studio's own markup for generated text; text pasted
 * in without `impyrt` counts as hand-written. A TK instruction is not text and isn't counted.
 */
import { stripNav } from './plan.ts';

const ID = '[0-9a-hjkmnp-tv-z]{26}';
const GENERATED = '[blykker-generated]: #';
const NOTES_AT = '[blykker-notes]: #';
export const SESSION_OPEN = '[blykker-session-open]: #';
export const SESSION_MARK = '[blykker-session]: #';
export const SESSION_NOTE = 'Writing log entry: a record of a writing session on this book, not book text.';
const AI_ON = '\u0001';
const AI_OFF = '\u0002';

export interface Token {
  word: string;
  ai: boolean;
}

/** The text with each TK scope reduced to its output, wrapped in AI markers; instructions dropped. */
export function markGenerated(text: string) {
  let out = '';
  let at = 0;
  for (;;) {
    const open = text.indexOf('[TK]', at);
    if (open < 0) break;
    const close = text.indexOf('[/TK]', open + 4);
    if (close < 0) break;
    out += text.slice(at, open);
    const inner = text.slice(open + 4, close);
    const eq = inner.indexOf('[=]');
    const impyrt = /^impyrt(?:\s[^=\n]*)?=/.exec(inner);
    const output = eq >= 0 ? inner.slice(eq + 3) : impyrt ? inner.slice(impyrt[0].length) : '';
    if (output) out += ` ${AI_ON}${output}${AI_OFF} `;
    at = close + 5;
  }
  return out + text.slice(at);
}

const before = (text: string, mark: string) => {
  const at = text.indexOf(mark);
  return at < 0 ? text : text.slice(0, at);
};

/** The author's words, in order, each marked hand-written or AI. */
export function tokens(text: string): Token[] {
  const body = markGenerated(before(before(stripNav(text), GENERATED), NOTES_AT))
    .replace(/^\[[^\]\n]+\]:[ \t]*\S+[ \t]*(?:\([^)\n]*\))?[ \t]*$/gm, ' ')
    .replace(/!\[\[[^\]\n]*\]\]/g, ' ')
    .replace(new RegExp(`\\[\\[${ID}[ \\t]*\\|([^\\n]*?)\\]\\]`, 'g'), '$1')
    .replace(new RegExp(`\\[\\[${ID}\\]\\]`, 'g'), ' ')
    .replace(/!\[[^\]\n]*\]\([^)\n]*\)/g, ' ')
    .replace(/\[([^\]\n]*)\]\([^)\n]*\)/g, '$1');
  const out: Token[] = [];
  let ai = false;
  for (const piece of body.split(new RegExp(`(${AI_ON}|${AI_OFF})`))) {
    if (piece === AI_ON) ai = true;
    else if (piece === AI_OFF) ai = false;
    else for (const word of piece.split(/\s+/)) if (/[\p{L}\p{N}]/u.test(word)) out.push({ word, ai });
  }
  return out;
}

export interface Counts {
  added: number;
  cut: number;
  addedAi: number;
  cutAi: number;
  /** True when the change was too large for a word-by-word diff and was counted as word bags. */
  approximate: boolean;
}

/** The longest diff done word by word; past it, words are compared as bags. */
const EXACT_CELLS = 4_000_000;

/** Words added and cut between two token lists: a word-level diff, so a rewrite counts both ways. */
export function diffCounts(a: Token[], b: Token[]): Counts {
  let start = 0;
  while (start < a.length && start < b.length && a[start].word === b[start].word) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1].word === b[endB - 1].word) {
    endA--;
    endB--;
  }
  const x = a.slice(start, endA);
  const y = b.slice(start, endB);
  const counts: Counts = { added: 0, cut: 0, addedAi: 0, cutAi: 0, approximate: false };
  if (!x.length || !y.length || x.length * y.length > EXACT_CELLS) {
    if (x.length && y.length) counts.approximate = true;
    const bag = (list: Token[]) => {
      const m = new Map<string, { hand: number; ai: number }>();
      for (const t of list) {
        const c = m.get(t.word) ?? { hand: 0, ai: 0 };
        c[t.ai ? 'ai' : 'hand']++;
        m.set(t.word, c);
      }
      return m;
    };
    const from = bag(x);
    const to = bag(y);
    for (const word of new Set([...from.keys(), ...to.keys()])) {
      const f = from.get(word) ?? { hand: 0, ai: 0 };
      const t = to.get(word) ?? { hand: 0, ai: 0 };
      const ai = t.ai - f.ai;
      const hand = t.hand - f.hand;
      if (ai > 0) counts.addedAi += ai;
      else counts.cutAi -= ai;
      counts.added += Math.max(0, ai) + Math.max(0, hand);
      counts.cut += Math.max(0, -ai) + Math.max(0, -hand);
    }
    return counts;
  }
  // LCS lengths, row by row from the end, then a walk from the start.
  const n = x.length;
  const m = y.length;
  const table = new Uint32Array((n + 1) * (m + 1));
  const w = m + 1;
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      table[i * w + j] = x[i].word === y[j].word ? table[(i + 1) * w + j + 1] + 1 : Math.max(table[(i + 1) * w + j], table[i * w + j + 1]);
  let i = 0;
  let j = 0;
  const cut = (t: Token) => {
    counts.cut++;
    if (t.ai) counts.cutAi++;
  };
  const add = (t: Token) => {
    counts.added++;
    if (t.ai) counts.addedAi++;
  };
  while (i < n && j < m) {
    if (x[i].word === y[j].word) {
      i++;
      j++;
    } else if (table[(i + 1) * w + j] >= table[i * w + j + 1]) cut(x[i++]);
    else add(y[j++]);
  }
  while (i < n) cut(x[i++]);
  while (j < m) add(y[j++]);
  return counts;
}

/** What "start writing session" keeps, in a private draft, until the session ends. */
export interface Snapshot {
  v: 1;
  startedAt: string;
  /** The book's Contents chain at the start: id and title. */
  chain: [string, string][];
  /** Each section's working text, version and revision. */
  sections: Record<string, { text: string; version: number; revision: number }>;
  /** The book's reference fragments: version and revision. */
  refs: Record<string, { version: number; revision: number }>;
}

export const snapshotText = (s: Snapshot) =>
  `${SESSION_OPEN}\n\nWriting session in progress since ${s.startedAt}. The Dashboard keeps this draft until the session ends: don't edit or publish it.\n\n\`\`\`json\n${JSON.stringify(s)}\n\`\`\`\n`;

export function parseSnapshot(contentMd: string): Snapshot | null {
  if (!contentMd.startsWith(SESSION_OPEN)) return null;
  const m = /```json\n([\s\S]*?)\n```/.exec(contentMd);
  if (!m) return null;
  try {
    const s = JSON.parse(m[1]) as Snapshot;
    return s.v === 1 ? s : null;
  } catch {
    return null;
  }
}

export interface SectionNow {
  id: string;
  title: string;
  text: string;
  version: number;
  /** Change notes of versions published since the start, oldest first. */
  notes?: { version: number; note: string | null }[];
}

export interface SessionSummary {
  startedAt: string;
  endedAt: string;
  rows: (Counts & { id: string; title: string; before: number; after: number; versions: { version: number; note: string | null }[] })[];
  total: Counts & { before: number; after: number };
  refs: { added: number; edited: number };
}

/** The roles that hold generated text, not the author's: left out of the chapter rows. */
export const GENERATED_ROLES = new Set(['toc', 'references', 'index']);

/**
 * The session: per section, words added and cut since the start; the book's words before and
 * after; references added (fragments new since the start) and edited (a new version or revision).
 * `skip` names sections whose text a rebuild writes (Contents, References, Index).
 */
export function summarize(
  snap: Snapshot,
  now: SectionNow[],
  refsNow: Record<string, { version: number; revision: number }>,
  endedAt: string,
  skip: Set<string> = new Set(),
): SessionSummary {
  const rows: SessionSummary['rows'] = [];
  const total = { added: 0, cut: 0, addedAi: 0, cutAi: 0, approximate: false, before: 0, after: 0 };
  const seen = new Set<string>();
  for (const s of now) {
    seen.add(s.id);
    if (skip.has(s.id)) continue;
    const then = snap.sections[s.id];
    const a = then ? tokens(then.text) : [];
    const b = tokens(s.text);
    const c = diffCounts(a, b);
    total.before += a.length;
    total.after += b.length;
    accumulate(total, c);
    const versions = (s.notes ?? []).filter((n) => !then || n.version > then.version);
    if (c.added || c.cut || versions.length) rows.push({ ...c, id: s.id, title: s.title, before: a.length, after: b.length, versions });
  }
  // A section dropped from the Contents during the session: its words left the book.
  for (const [id, title] of snap.chain) {
    if (seen.has(id) || skip.has(id) || !snap.sections[id]) continue;
    const a = tokens(snap.sections[id].text);
    const c = diffCounts(a, []);
    total.before += a.length;
    accumulate(total, c);
    rows.push({ ...c, id, title: `${title} (left the Contents)`, before: a.length, after: 0, versions: [] });
  }
  let added = 0;
  let edited = 0;
  for (const [id, r] of Object.entries(refsNow)) {
    const then = snap.refs[id];
    if (!then) added++;
    else if (r.version !== then.version || r.revision !== then.revision) edited++;
  }
  return { startedAt: snap.startedAt, endedAt, rows, total, refs: { added, edited } };
}

function accumulate(into: Counts, c: Counts) {
  into.added += c.added;
  into.cut += c.cut;
  into.addedAi += c.addedAi;
  into.cutAi += c.cutAi;
  into.approximate ||= c.approximate;
}


const n = (x: number) => x.toLocaleString('en-US');
const signed = (x: number) => (x > 0 ? `+${n(x)}` : x < 0 ? `−${n(-x)}` : '0');
const minutes = (from: string, to: string) => Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 60000));
export function duration(from: string, to: string) {
  const m = minutes(from, to);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** The invisible data line: key=value pairs a later reader (goals, progress graphs) can parse. */
export function dataLine(s: SessionSummary) {
  const t = s.total;
  const fields = [
    'v=1',
    `start=${s.startedAt}`,
    `end=${s.endedAt}`,
    `minutes=${minutes(s.startedAt, s.endedAt)}`,
    `added=${t.added}`,
    `cut=${t.cut}`,
    `added_ai=${t.addedAi}`,
    `cut_ai=${t.cutAi}`,
    `words_before=${t.before}`,
    `words_after=${t.after}`,
    `refs_added=${s.refs.added}`,
    `refs_edited=${s.refs.edited}`,
    ...(t.approximate ? ['approximate=1'] : []),
    ...s.rows.filter((r) => !r.title.endsWith('(left the Contents)')).map((r) => `ch=${r.id}:${r.added}:${r.cut}:${r.addedAi}`),
  ];
  return `${SESSION_MARK} (${fields.join(' ')})`;
}

/** Reads a log entry's data line back. */
export function parseDataLine(contentMd: string) {
  const m = new RegExp(`^${SESSION_MARK.replace(/[[\]]/g, '\\$&')} \\(([^)\\n]*)\\)$`, 'm').exec(contentMd);
  if (!m) return null;
  const out: Record<string, string> = {};
  const chapters: { id: string; added: number; cut: number; addedAi: number }[] = [];
  for (const pair of m[1].split(' ')) {
    const at = pair.indexOf('=');
    const key = pair.slice(0, at);
    const value = pair.slice(at + 1);
    if (key === 'ch') {
      const [id, added, cut, addedAi] = value.split(':');
      chapters.push({ id, added: +added, cut: +cut, addedAi: +addedAi });
    } else out[key] = value;
  }
  return { fields: out, chapters };
}

/** The log entry's markdown: a heading, the totals, a row per chapter, references, the author's note. */
export function entryText(s: SessionSummary, note: string, timeZone?: string) {
  const day = new Date(s.startedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone });
  const time = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone });
  const t = s.total;
  const hand = t.added - t.addedAi;
  const lines = [
    `# Writing session, ${day}`,
    '',
    `${time(s.startedAt)} to ${time(s.endedAt)} · ${duration(s.startedAt, s.endedAt)}`,
    '',
    `**${signed(t.added)} / ${t.cut ? `−${n(t.cut)}` : '0'} words** (net ${signed(t.added - t.cut)})${t.approximate ? ', roughly' : ''}. ` +
      (t.added ? `Of the words added, ${n(hand)} hand-written and ${n(t.addedAi)} AI-generated. ` : '') +
      `The book: ${n(t.before)} → ${n(t.after)} words.`,
  ];
  if (s.rows.length) {
    lines.push('', '| Section | Added | Cut | Net | AI added |', '|---|---:|---:|---:|---:|');
    for (const r of s.rows) {
      const name = r.title.endsWith('(left the Contents)') ? r.title : `[[${r.id} | ${r.title.replace(/[|\]]/g, ' ').trim()}]]`;
      lines.push(`| ${name} | ${n(r.added)} | ${n(r.cut)} | ${signed(r.added - r.cut)} | ${n(r.addedAi)} |`);
    }
  }
  if (s.refs.added || s.refs.edited) lines.push('', `**References:** ${n(s.refs.added)} added, ${n(s.refs.edited)} edited.`);
  const published = s.rows.flatMap((r) => r.versions.map((v) => ({ r, v })));
  if (published.length) {
    lines.push('', '**Published this session:**', '');
    for (const { r, v } of published) lines.push(`- ${r.title.replace(/[|\]]/g, ' ').trim()}, v${v.version}${v.note ? `: ${v.note}` : ''}`);
  }
  if (note.trim()) lines.push('', note.trim());
  lines.push('', dataLine(s), '');
  return lines.join('\n');
}
