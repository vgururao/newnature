// The change from one book to a shelf, as one ordered script. It runs against a local studio holding a copy
// of the book: it refuses any other host until Venkat has approved publishing this, because every step is a
// permanent public event on a real node.
//   node --import tsx shelf/setup.mts <http://127.0.0.1:port> <book.json> <cover.jpg> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';

const [base, bookPath, coverPath, outPath] = process.argv.slice(2);
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error(`Refusing ${base}: this script only runs against a local studio for now.`);
const nn = JSON.parse(readFileSync(bookPath, 'utf8'));
const id = (key: string) => nn.sections[key].id as string;
const publicBase = nn.blyg.replace(/\/+$/, '');

const login = await fetch(`${base}/studio/login`, {
  method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: base }, body: `password=${process.env.OWNER_PASSWORD}`,
});
const cookie = login.headers.get('set-cookie')!.split(';')[0];
async function api(method: string, path: string, body?: unknown) {
  const r = await fetch(`${base}/api${path}`, { method, headers: { 'content-type': 'application/json', origin: base, cookie }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!r.ok) throw new Error(`${method} ${path} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<any>;
}

const steps: { n: number; what: string; title: string; id?: string; feedEvent: boolean; text?: string }[] = [];
const note = (what: string, title: string, feedEvent: boolean, itemId?: string, text?: string) =>
  steps.push({ n: steps.length + 1, what, title, feedEvent, ...(itemId ? { id: itemId } : {}), ...(text ? { text } : {}) });
const NOTE = 'New book scaffold';
async function publish(itemId: string, revision: number, title: string, text: string) {
  await api('POST', `/items/${itemId}/publish`, { note: NOTE, expectedRevision: revision });
  note('publish', title, true, itemId, text);
}
async function thread(title: string, text: string) {
  const { id: itemId, revision } = await api('POST', '/items', { kind: 'thread', contentMd: text });
  await publish(itemId, revision, title, text);
  return itemId as string;
}

// Sections first: a link to a draft won't publish.
const PLACEHOLDER = (what: string) => `*Placeholder. ${what} has not been written yet.*`;
const preface = await thread('The Strange Forest: Preface', `# Preface\n\n${PLACEHOLDER('The preface')}`);
const ch1 = await thread('The Strange Forest: Chapter 1', `# Chapter 1: Placeholder\n\n${PLACEHOLDER('This chapter')}`);
const references = await thread('The Strange Forest: References', '# References\n\n[blykker-generated]: #');
const index = await thread('The Strange Forest: Index', '# Index\n\n[blykker-generated]: #');
const titlePage = await thread('The Strange Forest: Title page',
  `# The Strange Forest\n\n**Venkatesh Rao**\n\n${PLACEHOLDER('This book')}\n\n*Cover art by Venkatesh Rao, generated with ChatGPT from the author's prompt. Licensed CC BY 4.0.*`);

// The cover's id goes into the Contents' marker, and the cover links to the Contents, so it's created first and published after.
const cover = await api('POST', '/items', { kind: 'thread', contentMd: '# The Strange Forest' });
const tocText = `# Contents\n\n- [[${preface} | Preface]]\n- [[${ch1} | Chapter 1: Placeholder]]\n- [[${references} | References]]\n- [[${index} | Index]]\n\n[book-cover]: /t/${cover.id}/\n[book-title]: /t/${titlePage}/\n[book-references]: /t/${references}/\n[book-index]: /t/${index}/`;
const sfToc = await thread('The Strange Forest: Contents', tocText);

const alt = 'The Strange Forest, by Venkatesh Rao';
const form = new FormData();
form.set('itemId', cover.id);
form.set('expectedRevision', String(cover.revision));
form.set('alt', alt);
form.set('inline', 'true');
form.set('file', new File([readFileSync(coverPath)], 'the-strange-forest-cover-web-1600x1567.jpg', { type: 'image/jpeg' }));
const uploaded = await fetch(`${base}/api/media`, { method: 'POST', headers: { origin: base, cookie }, body: form });
if (!uploaded.ok) throw new Error(`upload ${uploaded.status}: ${await uploaded.text()}`);
const media = await uploaded.json() as any;
note('upload (not a feed event)', 'The Strange Forest: cover image', false, cover.id);
const coverText = `![${alt}](${media.url})\n\n[[${sfToc} | Contents]] · [[${preface} | Start reading →]]`;
const patched = await api('PATCH', `/items/${cover.id}`, { contentMd: coverText, expectedRevision: media.revision });
await publish(cover.id, patched.revision, 'The Strange Forest: Cover', coverText);

// New Nature declares its structure in its own Contents. Readers see no change.
const markers = [
  ...['cover', 'title', 'references', 'index'].map((r) => `[book-${r}]: /t/${id(r)}/`),
  ...nn.references.filter((r: any) => r.id).map((r: any) => `[book-ref ${r.id}]: #`),
  ...nn.index.terms.map((t: string) => `[book-term: ${t}]: #`),
].join('\n');
const contents = await api('GET', `/items/${id('toc')}`);
if (contents.dirty) throw new Error('New Nature\'s Contents has unpublished edits; publishing here would publish them.');
const nnToc = contents.contentMd.replace('[blykker-nav-bottom]: #', `${markers}\n\n[blykker-nav-bottom]: #`);
const nnPatched = await api('PATCH', `/items/${id('toc')}`, { contentMd: nnToc, expectedRevision: contents.revision });
await api('POST', `/items/${id('toc')}/publish`, { note: 'Book structure declared in its Contents (invisible)', expectedRevision: nnPatched.revision });
note('publish new version', 'New Nature: Contents', true, id('toc'), nnToc);

const shelfText = `# New Nature\n\nBooks on this shelf:\n\n- [[${id('toc')} | New Nature]]\n- [[${sfToc} | The Strange Forest]]\n\nCovers: [[${id('cover')} | New Nature]] · [[${cover.id} | The Strange Forest]]\n\n[blykker-shelf]: #\n[shelf-about]: /t/${id('about')}/\n[menu-top: Library]: ${publicBase}/\n[menu-top: About]: ${publicBase}/t/${id('about')}/\n[menu-bottom: Made with Blykker]: https://github.com/blygger/blykker`;
const shelf = await thread('Shelf (the new front page)', shelfText);

const settings = {
  frontPage: shelf,
  linksThreads: [],
  authorLinks: [{ label: 'Library', url: `${publicBase}/` }, { label: 'About', url: `${publicBase}/t/${id('about')}/` }],
  linksExternal: [{ label: 'Made with Blykker', url: 'https://github.com/blygger/blykker' }],
};
await api('PATCH', '/settings', settings);
note('settings (no feed event, immediate)', 'Front page → shelf; masthead menu → Library, About', false);

writeFileSync(outPath, JSON.stringify({ ids: { shelf, sfToc, sfCover: cover.id, titlePage, preface, ch1, references, index }, settings, steps }, null, 2));
console.log(steps.map((s) => `${s.n}. ${s.what}: ${s.title}`).join('\n'));
