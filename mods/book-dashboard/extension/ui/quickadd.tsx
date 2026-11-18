// Quick-add a reference while writing: "+REF" beside the counts opens a sheet. Paste a URL,
// DOI or ISBN, or type a rough citation; check the entry; add it (a published [blykker-ref] fragment)
// and get its citation on the clipboard. Or cite one of the book's references. The References
// section picks a new one up at the next rebuild.
import { useEffect, useState } from 'react';
import { BlyggerApi, Button, Sheet, toast, unwrap } from '../../../src/ui/extension-api.ts';
import type { DraftCounterContext } from '../../../src/ui/extension-api.ts';
import { BOOK } from './book.ts';
import { citation, citeLabel, distinct, relevant, entryOf, findExisting, formatEntry, labelFromEntry, REF_MARK, refText, type Source } from './refs.ts';

type Ref = { id: string; entry: string };
/** A rough citation, not a URL, DOI or ISBN: the kind the model can help with. */
const rough = (q: string) => !/^(https?:|10\.\d|isbn|\d[\d\s-]{8,}[\dXx]$)/i.test(q.trim());
const ID = /!\[\[([0-9a-hjkmnp-tv-z]{26})\]\]/g;

/** The book's references: those listed in book.json and those the References section transcludes. */
async function bookRefs(context: DraftCounterContext): Promise<Ref[]> {
  const get = (id: string) => unwrap(BlyggerApi.getItem({ client: context.client, path: { id } })) as Promise<{ contentMd: string; kind: string; status: string }>;
  const section = BOOK.sections.references?.id;
  const text = section ? await get(section).then((item) => item.contentMd, () => '') : '';
  const listed = [...text.matchAll(ID)].map((m) => m[1]);
  const ids = [...new Set([...BOOK.references, ...listed])];
  const items = await Promise.all(ids.map((id) => get(id).then((item) => ({ id, item }), () => null)));
  return items.flatMap((x) => (x && x.item.kind === 'fragment' && x.item.status !== 'withdrawn' && x.item.contentMd.startsWith(REF_MARK) ? [{ id: x.id, entry: entryOf(x.item.contentMd) }] : []));
}

async function lookup(q: string, ask = false): Promise<{ sources: Source[]; note?: string }> {
  const at = location.pathname.indexOf('/studio');
  const base = at > 0 ? location.pathname.slice(0, at) : '';
  const response = await fetch(`${base}/api/ext/book-dashboard/lookup?q=${encodeURIComponent(q)}${ask ? '&ask=1' : ''}`, { credentials: 'same-origin' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `lookup answered ${response.status}`);
  return body;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Citation copied: paste it where it goes');
  } catch {
    toast('Could not copy; select the citation and copy it');
  }
}

function RefSheet({ context, close }: { context: DraftCounterContext; close: () => void }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>();
  const [sources, setSources] = useState<Source[]>([]);
  const [pick, setPick] = useState(0);
  const [entry, setEntry] = useState('');
  const [label, setLabel] = useState('');
  const [refs, setRefs] = useState<Ref[]>();
  const [filter, setFilter] = useState('');
  const [added, setAdded] = useState<string>();

  useEffect(() => {
    bookRefs(context).then(setRefs, (e) => { setRefs([]); context.showError(e); });
  }, []);
  const choose = (list: Source[], i: number) => {
    setPick(i);
    setEntry(list[i] ? formatEntry(list[i]) : '');
    setLabel(list[i] ? citeLabel(list[i]) : '');
  };
  const [asked, setAsked] = useState(false);
  const search = async (ask = false) => {
    if (q.trim().length < 2) return;
    setBusy(true); setNote(ask ? 'Asking the model…' : undefined); setAdded(undefined); setAsked(ask);
    try {
      let got = await lookup(q.trim(), ask);
      // A rough citation no keyword hit matches is a description: it goes to the model once, on its
      // own. If the model confirms nothing, the keyword hits stay.
      if (!ask && rough(q) && !relevant(q, got.sources)) {
        setAsked(true);
        setNote('No close match by keywords. Asking the model…');
        const model = await lookup(q.trim(), true).catch((e) => ({ sources: [], note: e instanceof Error ? e.message : String(e) }));
        got = model.sources.length ? model : { sources: got.sources, note: `${model.note ?? 'The model found nothing.'} Keyword results below.` };
      }
      const list = distinct(got.sources);
      setSources(list);
      setNote(got.note);
      choose(list, 0);
    } catch (e) {
      setSources([]); setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const write = () => {
    // Nothing found: write the entry by hand.
    setSources([]); setEntry(q.trim()); setLabel(labelFromEntry(q.trim())); setNote(undefined);
  };
  const add = () =>
    context.run(async () => {
      setBusy(true);
      try {
        const item = (await unwrap(BlyggerApi.createItem({ client: context.client, body: { kind: 'fragment', contentMd: refText(entry) } }))) as { id: string; revision: number };
        await unwrap(BlyggerApi.publishItem({ client: context.client, path: { id: item.id }, body: { note: 'Reference added', expectedRevision: item.revision } }));
        const cite = citation(item.id, label);
        setAdded(cite);
        setRefs((r) => [...(r ?? []), { id: item.id, entry }]);
        await copy(cite);
      } finally {
        setBusy(false);
      }
    });

  const source = sources[pick];
  const existing = source && refs && !added ? findExisting(source, refs) : undefined;
  const shown = (refs ?? []).filter((r) => r.entry.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Sheet open onClose={close} title="add a reference" description="A URL, DOI or ISBN, or a rough citation (author and a few title words).">
      <div className="book-dashboard-ref" data-extension-sheet="book-dashboard">
        <form className="book-dashboard-ref-row" onSubmit={(e) => { e.preventDefault(); void search(); }}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="https://…, 10.…, ISBN, or Polanyi tacit dimension" aria-label="source" />
          <Button className="btn btn-mini" type="submit" disabled={busy || q.trim().length < 2}>{busy && !entry ? 'looking…' : 'look up'}</Button>
        </form>
        {note ? <p className="book-dashboard-ref-note">{note} {sources.length || busy ? null : <button type="button" className="book-dashboard-link" onClick={write}>write it by hand</button>}</p> : null}
        {rough(q) && q.trim().length > 1 && (sources.length || note) && !asked && !busy ? (
          <p className="book-dashboard-ref-note">
            Not it? <button type="button" className="book-dashboard-link" onClick={() => void search(true)}>ask the model</button> (one AI call; each suggestion is checked in Crossref or Open Library)
          </p>
        ) : null}

        {sources.length > 1 ? (
          <ul className="book-dashboard-ref-picks">
            {sources.map((s, i) => (
              <li key={i}>
                <label>
                  <input type="radio" checked={i === pick} onChange={() => choose(sources, i)} /> {formatEntry(s)} <span className="book-dashboard-ref-from">{s.model ? `model, confirmed by ${s.from}` : s.from}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : null}

        {entry || sources.length ? (
          <>
            {existing ? (
              <p className="book-dashboard-warning">
                Already in the book: {existing.entry}{' '}
                <Button className="btn btn-ghost btn-mini" onClick={() => void copy(citation(existing.id, labelFromEntry(existing.entry)))}>cite that one</Button>
              </p>
            ) : null}
            <label className="book-dashboard-ref-field">
              entry
              <textarea value={entry} onChange={(e) => setEntry(e.target.value)} rows={3} />
            </label>
            <label className="book-dashboard-ref-field">
              citation shows
              <input value={label} onChange={(e) => setLabel(e.target.value)} />
            </label>
            <div className="book-dashboard-actions">
              <Button className="btn btn-mini" disabled={busy || !entry.trim() || !!added} onClick={() => void add()}>add and publish reference</Button>
              {added ? (
                <>
                  <code className="book-dashboard-ref-cite">{added}</code>
                  <Button className="btn btn-ghost btn-mini" onClick={() => void copy(added)}>copy</Button>
                </>
              ) : null}
            </div>
            {added ? <p className="book-dashboard-ref-note">Published. References lists it after the next Dashboard rebuild.</p> : null}
          </>
        ) : null}

        <details className="book-dashboard-ref-book">
          <summary>this book’s references ({refs ? refs.length : '…'})</summary>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="filter" aria-label="filter references" />
          <ul>
            {shown.map((r) => (
              <li key={r.id}>
                <span>{r.entry}</span>{' '}
                <Button className="btn btn-ghost btn-mini" onClick={() => void copy(citation(r.id, labelFromEntry(r.entry)))}>cite</Button>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </Sheet>
  );
}

/** "+REF" beside the counts, in the composer and the full editor. */
export function QuickAdd({ context }: { context: DraftCounterContext }) {
  const [open, setOpen] = useState(false);
  return (
    <span data-extension="book-dashboard">
      {' '}
      <button type="button" className="book-dashboard-refbtn" aria-label="add a reference" title="Add a reference: URL, DOI, ISBN or rough citation" onClick={() => setOpen(true)}>+REF</button>
      {open ? <RefSheet context={context} close={() => setOpen(false)} /> : null}
    </span>
  );
}
