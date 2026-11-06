/*
 * Apply a rebuild plan through the owner API. The one risky case is a section with a draft: publish
 * sends the whole working copy, so the working copy briefly holds the published text plus new nav,
 * then gets the draft back. The draft is copied to storage first, and that copy is cleared only once
 * the working copy has been read back holding the draft.
 */
import { NAV_NOTE, type ItemLike, type Plan, type SectionPlan } from './plan.ts';

export interface Ops {
  get(id: string): Promise<ItemLike>;
  patch(id: string, contentMd: string, expectedRevision: number): Promise<{ revision: number }>;
  publish(id: string, note: string, expectedRevision: number): Promise<{ revision: number }>;
  settings(body: NonNullable<Plan['menu']>): Promise<unknown>;
}

export interface Recovery {
  id: string;
  title: string;
  /** The author's working copy as it was before anything happened. */
  draft: string;
  at: string;
  /** What the rebuild last wrote there, so a restore can tell if someone else has edited since. */
  transient: string;
}

export interface RecoveryStore {
  save(record: Recovery): void;
  clear(id: string): void;
  list(): Recovery[];
}

export interface Outcome {
  id: string;
  title: string;
  ok: boolean;
  message: string;
  /** The draft copy was kept, and the dashboard offers it. */
  recoverable?: boolean;
}

const statusOf = (e: unknown) => (e as { statusCode?: number }).statusCode;
const describe = (e: unknown) => (statusOf(e) === 409 ? 'it changed on the server (another tab or device)' : e instanceof Error ? e.message : String(e));

class Stale extends Error {}

async function fresh(ops: Ops, section: SectionPlan) {
  const item = await ops.get(section.id);
  if (item.revision !== section.revision) throw new Stale(`${section.title} changed since the preview`);
  return item;
}

/**
 * Put `text` in the working copy if it still holds what we left there. Anything else there is
 * someone's newer edit, which is never overwritten.
 */
export async function restore(ops: Ops, id: string, text: string, transient: string) {
  const item = await ops.get(id);
  if (item.contentMd === text) return true;
  if (item.contentMd !== transient) return false;
  await ops.patch(id, text, item.revision);
  return (await ops.get(id)).contentMd === text;
}

async function spliceSection(ops: Ops, store: RecoveryStore, section: SectionPlan, note: string): Promise<Outcome> {
  const base = { id: section.id, title: section.title };
  const newPublic = section.newPublic!;
  await fresh(ops, section);
  store.save({ ...base, draft: section.oldWorking, at: new Date().toISOString(), transient: newPublic });

  let revision = section.revision;
  let touched = false;
  try {
    ({ revision } = await ops.patch(section.id, newPublic, revision));
    touched = true;
    await ops.publish(section.id, note, revision);
  } catch (e) {
    const untouched = !touched && statusOf(e) === 409;
    if (untouched) {
      store.clear(section.id);
      return { ...base, ok: false, message: `Stopped: ${describe(e)}. Nothing was changed in ${section.title}.` };
    }
    let restored = false;
    try {
      restored = await restore(ops, section.id, section.oldWorking, newPublic);
    } catch { /* reported below */ }
    if (restored) store.clear(section.id);
    return restored
      ? { ...base, ok: false, message: `Stopped: ${describe(e)}. Your draft of ${section.title} is back in place.` }
      : { ...base, ok: false, recoverable: true, message: `Stopped: ${describe(e)}, and ${section.title}'s draft couldn't be put back. A copy is kept here; use it below.` };
  }

  // Published. Now the draft goes back, with its own new nav.
  let back = false;
  try {
    back = await restore(ops, section.id, section.newWorking, newPublic);
  } catch {
    // The write may have landed with only its answer lost.
    back = await ops.get(section.id).then((item) => item.contentMd === section.newWorking, () => false);
  }
  if (!back) {
    return { ...base, ok: false, recoverable: true, message: `New navigation was published, but ${section.title}'s draft couldn't be put back. A copy is kept here; use it below.` };
  }
  store.clear(section.id);
  return { ...base, ok: true, message: 'new navigation published, draft kept private' };
}

async function plainSection(ops: Ops, section: SectionPlan, note: string): Promise<Outcome> {
  const base = { id: section.id, title: section.title };
  await fresh(ops, section);
  let revision = section.revision;
  if (section.newWorking !== section.oldWorking) ({ revision } = await ops.patch(section.id, section.newWorking, revision));
  if (section.action === 'publish') {
    await ops.publish(section.id, note, revision);
    return { ...base, ok: true, message: 'published' };
  }
  if (section.action === 'held') return { ...base, ok: true, message: `draft updated, published version held: ${section.reason}` };
  return { ...base, ok: true, message: 'draft updated' };
}

/** Sections in order, stopping at the first failure so nothing proceeds on a surprise. */
export async function applyPlan(plan: Plan, ops: Ops, store: RecoveryStore, progress: (outcome: Outcome) => void, note = NAV_NOTE) {
  const outcomes: Outcome[] = [];
  const done = (outcome: Outcome) => {
    outcomes.push(outcome);
    progress(outcome);
    return outcome.ok;
  };
  for (const section of plan.sections) {
    let outcome: Outcome;
    try {
      outcome = section.action === 'splice' ? await spliceSection(ops, store, section, note) : await plainSection(ops, section, note);
    } catch (e) {
      const message = e instanceof Stale
        ? `Stopped: ${e.message}. Nothing was changed in it. Preview again.`
        : `Stopped at ${section.title}: ${describe(e)}. Preview again to see where things stand.`;
      outcome = { id: section.id, title: section.title, ok: false, message };
    }
    if (!done(outcome)) return outcomes;
  }
  if (plan.menu) {
    try {
      await ops.settings(plan.menu);
      done({ id: 'menu', title: 'Menu', ok: true, message: 'updated' });
    } catch (e) {
      done({ id: 'menu', title: 'Menu', ok: false, message: `Stopped: ${describe(e)}.` });
    }
  }
  return outcomes;
}
