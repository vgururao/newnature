/*
 * book-dashboard: New Nature's private project page, a prototype for blykker. Browser only: it reads
 * and writes through the owner's session, like any Studio screen. Nothing runs until the owner
 * presses Preview and then Apply.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BlyggerApi, Button, confirm, toast, unwrap } from '../../../src/ui/extension-api.ts';
import type { StudioContext, StudioExtension } from '../../../src/ui/extension-api.ts';
import { applyPlan, restore, type Ops, type Outcome, type Recovery, type RecoveryStore } from './apply.ts';
import { BOOK } from './book.ts';
import { authorWords, buildPlan, changedLines, chainOf, loadItems, type ItemLike, type Plan, type SectionPlan } from './plan.ts';
import './dashboard.css';

const NAME = 'book-dashboard';
const TOC = Object.values(BOOK.sections).find((s) => s.role === 'toc')!.id!;
const KEY = `${NAME}:recovery:`;

const store: RecoveryStore = {
  save(record) {
    localStorage.setItem(KEY + record.id, JSON.stringify(record));
  },
  clear(id) {
    localStorage.removeItem(KEY + id);
  },
  list() {
    try {
      return Object.keys(localStorage).filter((k) => k.startsWith(KEY)).map((k) => JSON.parse(localStorage.getItem(k)!) as Recovery);
    } catch {
      return [];
    }
  },
};

function opsFor(context: StudioContext): Ops {
  const { client } = context;
  return {
    get: (id) => unwrap(BlyggerApi.getItem({ client, path: { id } })) as Promise<ItemLike>,
    patch: (id, contentMd, expectedRevision) => unwrap(BlyggerApi.updateItem({ client, path: { id }, body: { contentMd, expectedRevision } })) as Promise<{ revision: number }>,
    publish: (id, note, expectedRevision) => unwrap(BlyggerApi.publishItem({ client, path: { id }, body: { note, expectedRevision } })) as Promise<{ revision: number }>,
    settings: (body) => unwrap(BlyggerApi.updateSettings({ client, body: body as never })),
  };
}

async function load(context: StudioContext) {
  const ops = opsFor(context);
  const [items, settings] = await Promise.all([
    loadItems(BOOK, async (id) => {
      try {
        return await ops.get(id);
      } catch (e) {
        if ((e as { statusCode?: number }).statusCode === 404) return null;
        throw e;
      }
    }),
    unwrap(BlyggerApi.getSettings({ client: context.client })),
  ]);
  return { items, settings: settings as { authorLinks?: unknown; linksExternal?: unknown } };
}

const stateOf = (item: ItemLike) =>
  item.status === 'withdrawn' ? 'withdrawn' : item.status !== 'public' ? 'draft' : item.dirty ? 'unpublished changes' : 'published';

function EditLink({ context, id, children }: { context: StudioContext; id: string; children: ReactNode }) {
  return (
    <a
      href={`/studio/edit/${id}`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        void context.navigate({ to: '/edit/$id', params: { id } });
      }}
    >
      {children}
    </a>
  );
}

function Sections({ context, items }: { context: StudioContext; items: Map<string, ItemLike> }) {
  const chain = chainOf(BOOK, items.get(TOC)!);
  const inChain = new Set(chain.map((c) => c[0]));
  const others = Object.values(BOOK.sections).filter((s) => s.id && !inChain.has(s.id)).map((s) => [s.id!, s.title] as [string, string]);
  const rows = [...chain, ...others].filter(([id]) => items.has(id));
  const live = (item: ItemLike) => (item.published ? authorWords(item.published.contentMd) : 0);
  const totalLive = rows.reduce((n, [id]) => n + live(items.get(id)!), 0);
  const totalDraft = rows.reduce((n, [id]) => n + authorWords(items.get(id)!.contentMd), 0);
  return (
    <table className="book-dashboard-table">
      <thead>
        <tr>
          <th>Section</th>
          <th>State</th>
          <th className="book-dashboard-num">Published</th>
          <th className="book-dashboard-num">Draft</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([id, title]) => {
          const item = items.get(id)!;
          const state = stateOf(item);
          return (
            <tr key={id} data-section={id}>
              <td><EditLink context={context} id={id}>{title}</EditLink></td>
              <td><span className={`book-dashboard-state book-dashboard-${state.split(' ')[0]}`}>{state}</span></td>
              <td className="book-dashboard-num">{live(item).toLocaleString()}</td>
              <td className="book-dashboard-num">{authorWords(item.contentMd).toLocaleString()}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <th colSpan={2}>Author words</th>
          <th className="book-dashboard-num">{totalLive.toLocaleString()}</th>
          <th className="book-dashboard-num">{totalDraft.toLocaleString()}</th>
        </tr>
      </tfoot>
    </table>
  );
}

const ACTION: Record<SectionPlan['action'], string> = {
  publish: 'update and publish',
  draft: 'update draft only',
  splice: 'publish new navigation, keep draft private',
  held: 'update draft only; published version held',
};

function Lines({ label, before, after }: { label: string; before: string; after: string }) {
  const lines = changedLines(before, after);
  if (!lines.length) return null;
  return (
    <>
      <p className="book-dashboard-diff-label">{label}</p>
      <pre className="book-dashboard-diff">
        {lines.map((l, i) => (
          <span key={i} className={l.sign === '+' ? 'book-dashboard-add' : 'book-dashboard-del'}>
            {l.sign} {l.line}
            {'\n'}
          </span>
        ))}
      </pre>
    </>
  );
}

function Preview({ plan }: { plan: Plan }) {
  return (
    <>
      {plan.warnings.map((w) => <p key={w} className="book-dashboard-warning">Warning: {w}</p>)}
      {plan.sections.length || plan.menu ? (
        <ul className="book-dashboard-plan">
          {plan.sections.map((s) => (
            <li key={s.id} data-plan={s.action}>
              <details>
                <summary><strong>{s.title}</strong>: {ACTION[s.action]}</summary>
                {s.reason ? <p className="book-dashboard-warning">Held: {s.reason}. Readers get new navigation when you publish this section.</p> : null}
                {s.newPublic ? <Lines label="What readers get" before={s.oldPublic!} after={s.newPublic} /> : null}
                <Lines label={s.newPublic ? 'Your draft' : 'Changes'} before={s.oldWorking} after={s.newWorking} />
              </details>
            </li>
          ))}
          {plan.menu ? <li data-plan="menu"><strong>Menu</strong>: update links</li> : null}
        </ul>
      ) : <p data-plan-empty>Everything is up to date.</p>}
    </>
  );
}

function Recoveries({ context, records, refresh }: { context: StudioContext; records: Recovery[]; refresh: () => void }) {
  if (!records.length) return null;
  return (
    <section className="book-dashboard-recovery" data-recovery>
      <h2>A draft needs your attention</h2>
      {records.map((r) => (
        <div key={r.id}>
          <p>
            A rebuild on {new Date(r.at).toLocaleString()} couldn't confirm that <EditLink context={context} id={r.id}>{r.title}</EditLink> got its draft back. This is the copy kept in this browser.
          </p>
          <textarea readOnly rows={8} value={r.draft} aria-label={`Saved draft of ${r.title}`} />
          <div className="book-dashboard-actions">
            <Button className="btn btn-ghost btn-mini" onClick={() => void navigator.clipboard.writeText(r.draft).then(() => toast('Copied'))}>copy</Button>
            <Button
              className="btn btn-ghost btn-mini"
              onClick={() => void context.run(async () => {
                const ok = await restore(opsFor(context), r.id, r.draft, r.transient);
                if (ok) {
                  store.clear(r.id);
                  refresh();
                  toast('Draft restored');
                } else {
                  toast('The section has newer edits, so nothing was overwritten. Copy the draft and merge by hand.');
                }
              })}
            >
              restore
            </Button>
            <Button
              className="btn btn-ghost btn-mini"
              onClick={() => void context.run(async () => {
                if (await confirm({ title: `Delete the saved draft of ${r.title}?`, body: 'Only do this if the section already holds your draft.', ok: 'delete copy' })) {
                  store.clear(r.id);
                  refresh();
                }
              })}
            >
              delete copy
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}

function Dashboard({ context }: { context: StudioContext }) {
  const [items, setItems] = useState<Map<string, ItemLike>>();
  const [plan, setPlan] = useState<Plan>();
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [busy, setBusy] = useState(false);
  const [records, setRecords] = useState<Recovery[]>([]);
  const refreshRecords = useCallback(() => setRecords(store.list()), []);

  const reload = useCallback(() => context.run(async () => setItems((await load(context)).items)), [context]);
  useEffect(() => {
    void reload();
    refreshRecords();
  }, []);

  const preview = () => {
    setBusy(true);
    setOutcomes([]);
    void context.run(async () => {
      const loaded = await load(context);
      setItems(loaded.items);
      setPlan(buildPlan(BOOK, loaded.items, loaded.settings));
    }).finally(() => setBusy(false));
  };
  const apply = () => {
    if (!plan) return;
    setBusy(true);
    setOutcomes([]);
    void context.run(async () => {
      await applyPlan(plan, opsFor(context), store, (o) => setOutcomes((all) => [...all, o]));
      setPlan(undefined);
      refreshRecords();
      setItems((await load(context)).items);
    }).finally(() => setBusy(false));
  };

  return (
    <div className="book-dashboard" data-extension-page={NAME}>
      <h1>New Nature</h1>
      <p className="book-dashboard-sub">Private to you. Readers never see this page.</p>
      <Recoveries context={context} records={records} refresh={refreshRecords} />
      {items ? <Sections context={context} items={items} /> : <p>Loading…</p>}
      <h2>Rebuild navigation</h2>
      <p className="book-dashboard-sub">Updates navigation, the cover link, notes, references, the index and the menu from the Contents. Nothing changes until you press Apply.</p>
      <div className="book-dashboard-actions">
        <Button className="btn btn-ghost" disabled={busy} onClick={preview}>{plan ? 'Preview again' : 'Preview rebuild'}</Button>
        {plan && (plan.sections.length || plan.menu) ? <Button className="btn btn-primary" disabled={busy} onClick={apply}>Apply</Button> : null}
      </div>
      {plan?.sections.some((s) => s.action === 'splice') ? (
        <p className="book-dashboard-warning">Close other tabs editing these sections before you apply. Their drafts are swapped out for a moment, and an open editor will report a conflict.</p>
      ) : null}
      {plan ? <Preview plan={plan} /> : null}
      {outcomes.length ? (
        <ul className="book-dashboard-outcomes" data-outcomes>
          {outcomes.map((o) => <li key={o.id} className={o.ok ? '' : 'book-dashboard-failed'}><strong>{o.title}</strong>: {o.message}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

export const extension: StudioExtension = {
  name: NAME,
  label: 'Book dashboard',
  description: 'New Nature’s private project page: sections, word counts, and the navigation rebuild.',
  entryByline: ({ context }) =>
    context.id === TOC && !context.imported ? (
      <a
        data-extension={NAME}
        href={`/studio/ext/${NAME}`}
        onClick={(e) => {
          e.preventDefault();
          void context.navigate({ to: '/ext/$name', params: { name: NAME } });
        }}
      >
        · book dashboard
      </a>
    ) : null,
  page: { title: 'book dashboard', component: Dashboard },
};
