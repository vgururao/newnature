/*
 * The Dashboard's writing sessions: "Start writing session" keeps a snapshot of the book in a
 * private draft; "End session" compares the book with it, shows the log entry for a note and a
 * look, and publishes it into the public "Writing log" hopper. The counting is in session.ts.
 */
import { useEffect, useState } from 'react';
import { BlyggerApi, Button, confirm, toast, unwrap } from '../../../src/ui/extension-api.ts';
import type { StudioContext } from '../../../src/ui/extension-api.ts';
import { NAV_NOTE, type Book, type ItemLike } from './plan.ts';
import { REF_MARK } from './refs.ts';
import { duration, entryText, GENERATED_ROLES, parseSnapshot, SESSION_NOTE, SESSION_OPEN, snapshotText, summarize, type SectionNow, type SessionSummary, type Snapshot } from './session.ts';

const HOPPER = 'Writing log';
const HOPPER_ABOUT = 'Writing sessions on this book: words added and cut by chapter, references added and edited. AI words are those the studio marks as generated (TK and impyrt).';

type Item = ItemLike & { version: number; created?: string };
type Open = { id: string; revision: number; snapshot: Snapshot };

async function allItems(context: StudioContext, status?: 'draft' | 'public') {
  const out: Item[] = [];
  let cursor: string | undefined;
  do {
    const page = (await unwrap(BlyggerApi.listItems({ client: context.client, query: { limit: 100, ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) } }))) as { items: Item[]; page: { nextCursor: string | null } };
    out.push(...page.items);
    cursor = page.page.nextCursor ?? undefined;
  } while (cursor);
  return out;
}

async function openSession(context: StudioContext): Promise<Open | null> {
  for (const item of await allItems(context, 'draft')) {
    const snapshot = item.contentMd.startsWith(SESSION_OPEN) ? parseSnapshot(item.contentMd) : null;
    if (snapshot) return { id: item.id, revision: item.revision, snapshot };
  }
  return null;
}

/** Every reference fragment on the node, published or not: version and revision. */
async function refsNow(context: StudioContext) {
  const refs: Snapshot['refs'] = {};
  for (const item of await allItems(context))
    if (item.kind === 'fragment' && item.status !== 'withdrawn' && item.contentMd.startsWith(REF_MARK)) refs[item.id] = { version: item.version, revision: item.revision };
  return refs;
}

const get = (context: StudioContext, id: string) => unwrap(BlyggerApi.getItem({ client: context.client, path: { id } })) as Promise<Item>;

async function start(context: StudioContext, chain: [string, string][]) {
  const sections: Snapshot['sections'] = {};
  for (const [id] of chain) {
    const item = await get(context, id);
    sections[id] = { text: item.contentMd, version: item.version, revision: item.revision };
  }
  const snapshot: Snapshot = { v: 1, startedAt: new Date().toISOString(), chain, sections, refs: await refsNow(context) };
  await unwrap(BlyggerApi.createItem({ client: context.client, body: { kind: 'thread', contentMd: snapshotText(snapshot) } }));
}

async function end(context: StudioContext, open: Open, chain: [string, string][], book: Book): Promise<SessionSummary> {
  const now: SectionNow[] = [];
  for (const [id, title] of chain) {
    const item = await get(context, id);
    const then = open.snapshot.sections[id];
    let notes: SectionNow['notes'];
    if (item.version > (then?.version ?? 0)) {
      const versions = (await unwrap(BlyggerApi.listItemVersions({ client: context.client, path: { id }, query: { limit: 100 } }))) as { items: { version: number; note: string | null }[] };
      notes = versions.items.filter((v) => v.version > (then?.version ?? 0) && v.note !== NAV_NOTE).map((v) => ({ version: v.version, note: v.note }));
    }
    now.push({ id, title, text: item.contentMd, version: item.version, notes });
  }
  const skip = new Set(Object.values(book.sections).filter((s) => GENERATED_ROLES.has(s.role) && s.id).map((s) => s.id!));
  return summarize(open.snapshot, now, await refsNow(context), new Date().toISOString(), skip);
}

/** The public "Writing log" hopper, made the first time. */
async function logHopper(context: StudioContext) {
  const { client } = context;
  type Hopper = { id: string; name: string; slug: string | null; public: boolean };
  const hoppers = (await unwrap(BlyggerApi.listHoppers({ client, query: { limit: 100 } }))) as { items: Hopper[] };
  let hopper = hoppers.items.find((h) => h.name === HOPPER) ?? ((await unwrap(BlyggerApi.createHopper({ client, body: { name: HOPPER } }))) as Hopper);
  if (!hopper.public) hopper = (await unwrap(BlyggerApi.updateHopper({ client, path: { id: hopper.id }, body: { public: true, description: HOPPER_ABOUT } }))) as Hopper;
  return hopper;
}

async function publish(context: StudioContext, open: Open, text: string) {
  const { client } = context;
  const item = (await unwrap(BlyggerApi.createItem({ client, body: { kind: 'thread', contentMd: text } }))) as { id: string; revision: number };
  await unwrap(BlyggerApi.publishItem({ client, path: { id: item.id }, body: { note: SESSION_NOTE, expectedRevision: item.revision } }));
  const hopper = await logHopper(context);
  await unwrap(BlyggerApi.addHopperItem({ client, path: { id: hopper.id, sub: '~own', remoteId: item.id } }));
  const draft = await get(context, open.id);
  await unwrap(BlyggerApi.deleteItem({ client, path: { id: open.id }, body: { expectedRevision: draft.revision } }));
  return { id: item.id, hopper: hopper.slug };
}

function Preview({ context, text }: { context: StudioContext; text: string }) {
  const [html, setHtml] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      unwrap(BlyggerApi.preview({ client: context.client, body: { contentMd: text, kind: 'thread' } })).then((p) => setHtml((p as { html: string }).html), () => setHtml(''));
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);
  return <div className="book-dashboard-session-preview preview" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function WritingSession({ context, chain, book }: { context: StudioContext; chain?: [string, string][]; book?: Book }) {
  const [open, setOpen] = useState<Open | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [note, setNote] = useState('');
  const [, tick] = useState(0);
  const [done, setDone] = useState<{ id: string; hopper: string | null } | null>(null);

  const refresh = () => openSession(context).then(setOpen, (e) => { setOpen(null); context.showError(e); });
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, []);
  const act = (work: () => Promise<unknown>) => {
    setBusy(true);
    void context.run(work).finally(() => setBusy(false));
  };

  if (open === undefined || !chain || !book) return null;
  const text = summary ? entryText(summary, note) : '';
  return (
    <section className="book-dashboard-session" data-session={open ? 'open' : 'none'}>
      {done ? (
        <p className="book-dashboard-session-done">
          Log entry published{' '}
          <a href={`/studio/edit/${done.id}`} onClick={(e) => { e.preventDefault(); void context.navigate({ to: '/edit/$id', params: { id: done.id } }); }}>(open)</a>
          {done.hopper ? <> · in the <a href={`/h/${done.hopper}/`} target="_blank" rel="noreferrer">Writing log ↗</a></> : null}
          {' '}<Button className="link-btn" onClick={() => setDone(null)}>dismiss</Button>
        </p>
      ) : null}
      {!open ? (
        <div className="book-dashboard-session-row">
          <Button className="btn btn-ghost" data-session-start disabled={busy} onClick={() => act(async () => { await start(context, chain); await refresh(); toast('Writing session started'); })}>
            Start writing session
          </Button>
        </div>
      ) : !summary ? (
        <div className="book-dashboard-session-row">
          <span>
            <strong>Writing session</strong> since {new Date(open.snapshot.startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {duration(open.snapshot.startedAt, new Date().toISOString())}
          </span>
          <Button className="btn btn-primary" data-session-end disabled={busy} onClick={() => act(async () => setSummary(await end(context, open, chain, book)))}>
            {busy ? 'Counting…' : 'End session'}
          </Button>
          <Button
            className="link-btn"
            disabled={busy}
            onClick={() => act(async () => {
              if (!(await confirm({ title: 'Discard this session?', body: 'Nothing is logged. Your writing is untouched.', ok: 'discard' }))) return;
              const draft = await get(context, open.id);
              await unwrap(BlyggerApi.deleteItem({ client: context.client, path: { id: open.id }, body: { expectedRevision: draft.revision } }));
              await refresh();
            })}
          >
            discard
          </Button>
        </div>
      ) : (
        <div className="book-dashboard-session-review">
          <h2>Log entry</h2>
          <p className="book-dashboard-sub">Published to the blyg and the Writing log hopper. Its change note marks it as a log entry, not book text.</p>
          <label>
            A note (optional)
            <textarea data-session-note rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you worked on, what's next…" />
          </label>
          <Preview context={context} text={text} />
          <div className="book-dashboard-session-row">
            <Button
              className="btn btn-primary"
              data-session-publish
              disabled={busy}
              onClick={() => act(async () => {
                const published = await publish(context, open, text);
                setSummary(null);
                setNote('');
                setDone(published);
                await refresh();
              })}
            >
              {busy ? 'Publishing…' : 'Publish log entry'}
            </Button>
            <Button className="btn btn-ghost" disabled={busy} onClick={() => setSummary(null)}>Keep writing</Button>
          </div>
        </div>
      )}
    </section>
  );
}
