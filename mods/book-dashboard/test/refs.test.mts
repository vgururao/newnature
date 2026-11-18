// References quick-add: formatting, labels and matching, pure (refs.ts), plus an optional live
// check that looking up this book's hand-written references gives back the same entries.
//   node --import tsx refs.test.mts <studio tree's extensions/book-dashboard> [--live]
import assert from 'node:assert/strict';

const [dir, live] = process.argv.slice(2);
const r = await import(`${dir}/ui/refs.ts`);

const wulf = { type: 'book', title: "The invention of nature: Alexander von Humboldt's new world", authors: [{ given: 'Andrea', family: 'Wulf' }], publisher: 'Knopf', place: 'New York', date: '2015', from: 'openlibrary' };
assert.equal(r.formatEntry(r.distinct([wulf])[0]), "Wulf, Andrea. *The Invention of Nature: Alexander von Humboldt’s New World*. New York: Knopf, 2015.");
assert.equal(r.citeLabel(wulf), 'Wulf 2015');
const essay = { type: 'web', title: 'New Nature', authors: [{ given: 'Venkatesh', family: 'Rao' }], container: 'Protocolized', date: '2026-06-17', url: 'https://protocolized.io/features/new-nature', from: 'page' };
assert.equal(r.formatEntry(essay), 'Rao, Venkatesh. “New Nature.” *Protocolized*, June 17, 2026. <https://protocolized.io/features/new-nature>');
const paper = { type: 'article', title: 'Deep learning', authors: [{ given: 'Yann', family: 'LeCun' }, { given: 'Yoshua', family: 'Bengio' }, { given: 'Geoffrey', family: 'Hinton' }], container: 'Nature', date: '2015-05-28', volume: '521', issue: '7553', pages: '436–444', doi: '10.1038/nature14539', from: 'crossref' };
assert.equal(r.formatEntry(paper), 'LeCun, Yann, Yoshua Bengio, and Geoffrey Hinton. “Deep learning.” *Nature* 521, no. 7553 (2015): 436–444. <https://doi.org/10.1038/nature14539>');
assert.equal(r.citeLabel(paper), 'LeCun et al. 2015');
assert.equal(r.citeLabel({ ...paper, authors: paper.authors.slice(0, 2) }), 'LeCun and Bengio 2015');
assert.equal(r.formatEntry({ ...essay, title: 'Who Wins?' }).includes('“Who Wins?” *Protocolized*'), true);
assert.equal(r.labelFromEntry('Rao, Venkatesh. “New Nature.” *Protocolized*, June 17, 2026. <https://x>'), 'Rao 2026');
assert.equal(r.citation('1ytmw03xgpkmhmrm7hcv0ea1gd', 'Rao 2026'), '[[1ytmw03xgpkmhmrm7hcv0ea1gd | Rao 2026]]');
assert.equal(r.refText(' X. '), '[blykker-ref]: #\n\nX.\n');
const shout = r.distinct([{ ...wulf, title: 'THE TACIT DIMENSION. --', authors: [{ given: 'M', family: 'POLANYI' }] }])[0];
assert.equal(shout.title, 'The Tacit Dimension');
assert.equal(shout.authors[0].family, 'Polanyi');
assert.equal(r.distinct([wulf, { ...wulf, isbn: '9780385350662' }]).length, 1);
const refs = [{ id: 'a', entry: 'Rao, Venkatesh. “New Nature.” *Protocolized*, June 17, 2026. <https://protocolized.io/features/new-nature>' }];
assert.equal(r.findExisting({ ...essay, url: 'http://www.protocolized.io/features/new-nature/' }, refs)?.id, 'a');
assert.equal(r.findExisting({ ...essay, title: 'Something Else', url: 'https://example.com/x' }, refs), undefined);
console.log('refs ok');

if (live === '--live') {
  const { lookup } = await import(`${dir}/lookup.ts`);
  const cases: [string, string][] = [
    ['https://protocolized.io/features/new-nature', 'Rao, Venkatesh. “New Nature.” *Protocolized*, June 17, 2026. <https://protocolized.io/features/new-nature>'],
    ['https://protocolized.io/p/inventing-new-nature', 'Rao, Venkatesh. “Inventing New Nature.” *Protocolized*, May 12, 2026. <https://protocolized.io/p/inventing-new-nature>'],
    ['https://protocolized.io/p/the-fabric-and-the-brain', 'Rao, Venkatesh. “The Fabric and the Brain.” *Protocolized*, March 31, 2026. <https://protocolized.io/p/the-fabric-and-the-brain>'],
    ['https://protocolized.io/p/theorizing-protocolization-i-new', 'Rao, Venkatesh. “Theorizing Protocolization I: New Nature.” *Protocolized*, January 8, 2026. <https://protocolized.io/p/theorizing-protocolization-i-new>'],
    ['https://protocolized.io/p/constructing-the-evil-twin-of-ai', 'Rao, Venkatesh. “Constructing the Evil Twin of AI.” *Protocolized*, October 15, 2025. <https://protocolized.io/p/constructing-the-evil-twin-of-ai>'],
    ['ISBN 9780385350662', 'Wulf, Andrea. *The Invention of Nature: Alexander von Humboldt’s New World*. New York: Knopf, 2015.'],
  ];
  for (const [q, hand] of cases) {
    const got = await lookup(fetch, q);
    const entry = got.sources.length ? r.formatEntry(r.distinct(got.sources)[0]) : `(nothing: ${got.note})`;
    console.log(entry === hand ? 'same ' : 'DIFF ', q, '\n   got:  ', entry, entry === hand ? '' : `\n   hand: ${hand}`);
  }
}

// Asking the model, with a stand-in model: a real suggestion is confirmed, an invented one is not.
if (live === '--live') {
  const { ask, parseGuesses } = await import(`${dir}/lookup.ts`);
  assert.equal(parseGuesses('Sure: [{"title": "X"}] hope that helps').length, 1);
  assert.deepEqual(parseGuesses('no idea'), []);
  const model = async () => JSON.stringify([
    { title: 'The Tacit Dimension', authors: ['Michael Polanyi'], year: 1966, kind: 'book' },
    { title: 'The Glass Orchard of Forgotten Engines', authors: ['Petronella Vandersnoot'], year: 1987, kind: 'book' },
  ]);
  const got = await ask(fetch, model, 'that 60s book about knowing more than we can tell');
  console.log('ask:', got.sources.map((s: { title: string; from: string }) => `${s.title} (${s.from})`), '|', got.note);
  assert.equal(got.sources.length, 1);
  assert.equal(got.sources[0].model, true);
  assert.match(got.note ?? '', /Glass Orchard/);
  console.log('ask ok');
}

const hit = (title: string, family: string) => ({ type: 'book', title, authors: [{ family }], from: 'openlibrary' });
assert.equal(r.relevant('polanyi tacit dimension', [hit('The Tacit Dimension', 'Polanyi')]), true);
assert.equal(r.relevant('that 60s book about knowing more than we can tell', [hit('American Film', 'Institute'), hit('Knowing More Than We Can Tell', 'Sinclair')]), false);
assert.equal(r.relevant('anything', []), false);
console.log('relevant ok');
const book = hit('The Tacit Dimension', 'Polanyi');
const chapter = { type: 'chapter', title: 'The Tacit Dimension', authors: [{ given: 'M', family: 'POLANYI' }], container: 'Knowledge in Organisations', pages: '135–146', publisher: 'Elsevier', date: '1997', doi: '10.1016/x', from: 'crossref' };
assert.deepEqual(r.distinct([book, chapter]).map((s: { type: string }) => s.type), ['book', 'chapter']);
console.log('distinct ok');
