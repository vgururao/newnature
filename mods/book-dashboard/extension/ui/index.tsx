/*
 * book-dashboard: New Nature's private project page, a prototype for blykker. Browser only: it reads
 * and writes through the owner's session, like any Studio screen. It only reads until the owner
 * presses the rebuild button.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { BlyggerApi, Button, confirm, toast, unwrap } from '../../../src/ui/extension-api.ts';
import type { StudioContext, StudioExtension } from '../../../src/ui/extension-api.ts';
import { applyPlan, restore, type Ops, type Outcome, type Recovery, type RecoveryStore } from './apply.ts';
import { BOOK } from './book.ts';
import { actionLabel, authorWords, buildPlan, changedLines, chainOf, describeChange, loadItems, outstanding, statusLine, type ItemLike, type Plan } from './plan.ts';
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

/** A section the Contents lists but the node can't serve can't be planned for, so it isn't a clean bill of health. */
function checkedPlan({ items, settings }: Awaited<ReturnType<typeof load>>) {
  const plan = buildPlan(BOOK, items, settings);
  const missing = plan.chain.filter(([id]) => !items.has(id));
  if (missing.length) throw new Error(`The Contents lists something that doesn't resolve: ${missing.map((c) => c[1]).join(', ')}.`);
  return plan;
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

type Status = { kind: 'checking' } | { kind: 'error'; message: string } | { kind: 'checked'; plan: Plan };

function RebuildStatus({ status }: { status: Status }) {
  if (status.kind === 'checking') return <span data-rebuild-status="checking">Checking…</span>;
  if (status.kind === 'error') {
    return (
      <span role="alert" data-rebuild-status="error">
        <strong>Couldn't check whether the book needs a rebuild.</strong> {status.message}
      </span>
    );
  }
  const { pending, menu } = outstanding(status.plan);
  return (
    <span role="status" data-rebuild-status={pending.length || menu ? 'due' : 'ok'}>
      <strong>{statusLine(status.plan)}</strong>
    </span>
  );
}

const statusClass = (status: Status) =>
  status.kind === 'error' ? 'book-dashboard-status-error'
    : status.kind !== 'checked' ? ''
    : outstanding(status.plan).pending.length || status.plan.menu ? 'book-dashboard-status-due' : 'book-dashboard-status-ok';

function Sections({ context, items, plan }: { context: StudioContext; items: Map<string, ItemLike>; plan?: Plan }) {
  const pending = new Set(plan ? outstanding(plan).pending.map((s) => s.id) : []);
  const held = new Set(plan ? outstanding(plan).held.map((s) => s.id) : []);
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
              <td>
                <span className={`book-dashboard-state book-dashboard-${state.split(' ')[0]}`}>{state}</span>
                {pending.has(id) ? <span className="book-dashboard-flag" data-needs-rebuild>needs rebuild</span> : held.has(id) ? <span className="book-dashboard-flag" data-held>nav held until published</span> : null}
              </td>
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

const planTitles = (plan: Plan) => new Map(plan.chain);

function PublicLink({ id }: { id: string }) {
  return <a href={`/t/${id}/`} target="_blank" rel="noreferrer">public page ↗</a>;
}

function Pending({ context, plan }: { context: StudioContext; plan: Plan }) {
  const { pending, held } = outstanding(plan);
  const shown = [...pending, ...held.filter((s) => !pending.includes(s))];
  const titles = planTitles(plan);
  return (
    <>
      {plan.warnings.map((w) => <p key={w} className="book-dashboard-warning">Warning: {w}</p>)}
      {shown.length || plan.menu ? (
        <ul className="book-dashboard-plan" data-pending>
          {shown.map((s) => {
            const { changes, note } = describeChange(s, titles);
            return (
              <li key={s.id} data-plan={s.action}>
                <strong><EditLink context={context} id={s.id}>{s.title}</EditLink></strong>
                <ul className="book-dashboard-changes">{changes.map((c) => <li key={c}>{c}</li>)}</ul>
                {note ? <p className="book-dashboard-note">{note}</p> : null}
                <details className="book-dashboard-raw">
                  <summary>raw changes</summary>
                  {s.newPublic ? <Lines label="What readers get" before={s.oldPublic!} after={s.newPublic} /> : null}
                  <Lines label={s.newPublic ? 'Your draft' : 'Changes'} before={s.oldWorking} after={s.newWorking} />
                </details>
              </li>
            );
          })}
          {plan.menu ? <li data-plan="menu"><strong>Menu</strong><ul className="book-dashboard-changes"><li>Menu links updated</li></ul></li> : null}
        </ul>
      ) : null}
    </>
  );
}

interface Report {
  at: string;
  rows: (Outcome & { changes: string[] })[];
  /** Sections the rebuild stopped before reaching. */
  notReached: string[];
}

const REPORT_KEY = `${NAME}:last-report`;
function readReport(): Report | null {
  try {
    return JSON.parse(localStorage.getItem(REPORT_KEY) ?? 'null') as Report | null;
  } catch {
    return null;
  }
}
function writeReport(report: Report | null) {
  try {
    if (report) localStorage.setItem(REPORT_KEY, JSON.stringify(report));
    else localStorage.removeItem(REPORT_KEY);
  } catch { /* it still shows until the page is left */ }
}

function ResultReport({ context, report, dismiss }: { context: StudioContext; report: Report; dismiss: () => void }) {
  const failed = report.rows.some((r) => !r.ok);
  return (
    <section className="book-dashboard-report" data-report>
      <div className="book-dashboard-report-head">
        <h2>{failed ? 'Last rebuild stopped' : 'Last rebuild'}</h2>
        <span className="book-dashboard-sub">{new Date(report.at).toLocaleString()}</span>
        <Button className="btn btn-ghost btn-mini" onClick={dismiss}>dismiss</Button>
      </div>
      <ul className="book-dashboard-plan">
        {report.rows.map((r) => (
          <li key={r.id} className={r.ok ? '' : 'book-dashboard-failed'} data-report-row={r.ok ? 'ok' : 'failed'}>
            <strong>{r.title}</strong>
            {r.id !== 'menu' ? (
              <span className="book-dashboard-links">
                <PublicLink id={r.id} />
                <EditLink context={context} id={r.id}>editor</EditLink>
              </span>
            ) : null}
            {r.ok ? <ul className="book-dashboard-changes">{r.changes.map((c) => <li key={c}>{c}</li>)}</ul> : null}
            <p className="book-dashboard-note">{r.message}</p>
          </li>
        ))}
      </ul>
      {report.notReached.length ? <p className="book-dashboard-warning">Not reached: {report.notReached.join(', ')}.</p> : null}
    </section>
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
  const [report, setReport] = useState<Report | null>(() => readReport());
  const [busy, setBusy] = useState(false);
  const [records, setRecords] = useState<Recovery[]>([]);
  const [status, setStatus] = useState<Status>({ kind: 'checking' });
  const busyRef = useRef(false);
  busyRef.current = busy;
  const refreshRecords = useCallback(() => setRecords(store.list()), []);

  // Reads only. A failure says so: it must never look like "up to date".
  const check = useCallback(async () => {
    try {
      const loaded = await load(context);
      const next = checkedPlan(loaded);
      setItems(loaded.items);
      setStatus({ kind: 'checked', plan: next });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, [context]);
  useEffect(() => {
    void check();
    refreshRecords();
    // Coming back from editing in another tab is when this most often changes.
    const onFocus = () => {
      if (!busyRef.current) void check();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const checkAgain = () => {
    setBusy(true);
    void check().finally(() => setBusy(false));
  };
  const plan = status.kind === 'checked' ? status.plan : undefined;
  const label = plan ? actionLabel(plan) : null;
  const rebuild = () => {
    if (!plan) return;
    setBusy(true);
    void context.run(async () => {
      const titles = planTitles(plan);
      const changes = new Map(plan.sections.map((s) => [s.id, describeChange(s, titles).changes]));
      changes.set('menu', ['Menu links updated']);
      const outcomes = await applyPlan(plan, opsFor(context), store, () => {});
      const reached = new Set(outcomes.map((o) => o.id));
      const next: Report = {
        at: new Date().toISOString(),
        rows: outcomes.map((o) => ({ ...o, changes: changes.get(o.id) ?? [] })),
        notReached: [...plan.sections.filter((s) => !reached.has(s.id)).map((s) => s.title), ...(plan.menu && !reached.has('menu') ? ['Menu'] : [])],
      };
      writeReport(next);
      setReport(next);
      refreshRecords();
      await check();
    }).finally(() => setBusy(false));
  };

  return (
    <div className="book-dashboard" data-extension-page={NAME}>
      <h1>New Nature</h1>
      <p className="book-dashboard-sub">Private to you. Readers never see this page.</p>
      <div className={`book-dashboard-status ${statusClass(status)}`}>
        <RebuildStatus status={status} />
        <Button className="btn btn-ghost btn-mini" disabled={busy} onClick={checkAgain}>Check again</Button>
      </div>
      {label ? (
        <div className="book-dashboard-actions">
          <Button className="btn btn-primary" data-rebuild-button disabled={busy} onClick={rebuild}>{busy ? 'Working…' : label}</Button>
        </div>
      ) : null}
      {plan?.sections.some((s) => s.action === 'splice') ? (
        <p className="book-dashboard-warning">Close other tabs editing these sections first. Their drafts are swapped out for a moment, and an open editor will report a conflict.</p>
      ) : null}
      {plan ? <Pending context={context} plan={plan} /> : null}
      {report ? <ResultReport context={context} report={report} dismiss={() => { writeReport(null); setReport(null); }} /> : null}
      <Recoveries context={context} records={records} refresh={refreshRecords} />
      {items ? <Sections context={context} items={items} plan={plan} /> : null}
    </div>
  );
}

export const extension: StudioExtension = {
  name: NAME,
  label: 'Dashboard',
  description: 'New Nature’s private project page: sections, word counts, and the rebuild.',
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
        · dashboard
      </a>
    ) : null,
  page: { title: 'Dashboard', component: Dashboard },
};
