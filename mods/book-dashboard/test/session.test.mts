// Writing sessions (extension/ui/session.ts): words marked hand or AI, the word diff, the summary,
// and the log entry's data line.
//   node --import tsx session.test.mts <vendored ui dir>
import assert from 'node:assert/strict';

const ui = process.argv[2];
const s = await import(`${ui}/session.ts`);
const words = (text: string) => s.tokens(text).map((t: { word: string; ai: boolean }) => (t.ai ? `*${t.word}` : t.word)).join(' ');

// Generated text: TK output and impyrt are AI; an instruction isn't text; nav and markers aren't words.
const nav = '[[aaaaaaaaaaaaaaaaaaaaaaaaaa | ← Back]] · [[bbbbbbbbbbbbbbbbbbbbbbbbbb | Next →]]';
assert.equal(words(`# Title\n\n${nav}\n\n[blykker-nav-top]: #\n\nOne two [TK]summarize this[=]gen text[/TK] three.\n\n[blykker-nav-bottom]: #\n\n${nav}`), '# Title One two *gen *text three.'.replace('# ', ''));
assert.equal(words('A [TK]write more[/TK] B'), 'A B');
assert.equal(words('A [TK]impyrt=pasted words[/TK] B [TK]impyrt claude-x=more[/TK]'), 'A *pasted *words B *more');
assert.equal(words('See [[cccccccccccccccccccccccccc | Ooze and Hardness]] now.\n\n[index: hardness]: #'), 'See Ooze and Hardness now.');

// The diff: an insertion, a deletion, a rewrite (both ways), AI counted on each side.
const d = (a: string, b: string) => {
  const { approximate, ...c } = s.diffCounts(s.tokens(a), s.tokens(b));
  return c;
};
assert.deepEqual(d('one two three', 'one two new words three'), { added: 2, cut: 0, addedAi: 0, cutAi: 0 });
assert.deepEqual(d('one two three', 'one three'), { added: 0, cut: 1, addedAi: 0, cutAi: 0 });
assert.deepEqual(d('the cat sat', 'the dog sat'), { added: 1, cut: 1, addedAi: 0, cutAi: 0 });
assert.deepEqual(d('a b', 'a [TK]go[=]x y[/TK] b'), { added: 2, cut: 0, addedAi: 2, cutAi: 0 });
assert.deepEqual(d('a [TK]go[=]x y[/TK] b', 'a b'), { added: 0, cut: 2, addedAi: 0, cutAi: 2 });
assert.deepEqual(d('', 'fresh start here'), { added: 3, cut: 0, addedAi: 0, cutAi: 0 });
// Too large for a word-by-word diff: counted as bags, and marked approximate.
const big = (k: number, w: string) => Array.from({ length: k }, (_, i) => `${w}${i % 50}`).join(' ');
const huge = s.diffCounts(s.tokens(big(2500, 'a')), s.tokens(big(2500, 'b')));
assert.equal(huge.approximate, true);
assert.equal(huge.added, 2500);
assert.equal(huge.cut, 2500);

// The summary: rows only for sections that changed; generated sections skipped; references added and edited.
const snap = {
  v: 1, startedAt: '2026-11-20T22:00:00Z',
  chain: [['c1', 'Chapter One'], ['c2', 'Chapter Two'], ['toc', 'Contents'], ['gone', 'Dropped']],
  sections: { c1: { text: 'one two', version: 2, revision: 5 }, c2: { text: 'same', version: 1, revision: 1 }, toc: { text: 'x', version: 1, revision: 1 }, gone: { text: 'old words', version: 1, revision: 1 } },
  refs: { r1: { version: 1, revision: 1 }, r2: { version: 1, revision: 2 } },
};
const sum = s.summarize(
  snap,
  [
    { id: 'c1', title: 'Chapter One', text: 'one two three four', version: 3, notes: [{ version: 2, note: 'old' }, { version: 3, note: 'Added a paragraph' }] },
    { id: 'c2', title: 'Chapter Two', text: 'same', version: 1 },
    { id: 'toc', title: 'Contents', text: 'y z', version: 2 },
  ],
  { r1: { version: 1, revision: 1 }, r2: { version: 2, revision: 3 }, r3: { version: 1, revision: 1 } },
  '2026-11-20T23:25:00Z',
  new Set(['toc']),
);
assert.deepEqual(sum.rows.map((r: { id: string; added: number; cut: number; versions: unknown[] }) => [r.id, r.added, r.cut, r.versions.length]), [['c1', 2, 0, 1], ['gone', 0, 2, 0]]);
assert.deepEqual({ added: sum.total.added, cut: sum.total.cut, before: sum.total.before, after: sum.total.after }, { added: 2, cut: 2, before: 5, after: 5 });
assert.deepEqual(sum.refs, { added: 1, edited: 1 });
assert.equal(s.duration(sum.startedAt, sum.endedAt), '1 h 25 min');

// The entry: links to the chapters, the note, and a data line that reads back.
const text = s.entryText(sum, 'Worked on the opening.', 'America/Los_Angeles');
assert.match(text, /^# Writing session, November 20, 2026\n/);
assert.match(text, /2:00 PM to 3:25 PM · 1 h 25 min/);
assert.match(text, /\| \[\[c1 \| Chapter One\]\] \| 2 \| 0 \| \+2 \| 0 \|/);
assert.match(text, /- Chapter One, v3: Added a paragraph/);
assert.match(text, /\*\*References:\*\* 1 added, 1 edited\./);
assert.match(text, /Worked on the opening\./);
const data = s.parseDataLine(text);
assert.equal(data.fields.added, '2');
assert.equal(data.fields.refs_added, '1');
assert.equal(data.fields.minutes, '85');
assert.deepEqual(data.chapters, [{ id: 'c1', added: 2, cut: 0, addedAi: 0 }]);
// The data line holds no words of its own.
assert.equal(s.tokens(s.dataLine(sum)).length, 0);

// The snapshot round-trips through its draft text.
assert.deepEqual(s.parseSnapshot(s.snapshotText(snap)), snap);
assert.equal(s.parseSnapshot('not a session'), null);

console.log('session ok');
