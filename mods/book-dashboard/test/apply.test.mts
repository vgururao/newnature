// Draft safety against a real local studio: every step of the swap fails in turn, as a refused request
// and as a request that succeeded but whose answer was lost.
//   node --import tsx test/apply.test.mts <base-url> <studio-tree>/extensions/book-dashboard/ui
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const [base, ui] = process.argv.slice(2);
const load = async (name: string) => import(pathToFileURL(`${ui}/${name}`).href);
const { buildPlan, loadItems } = await load('plan.ts');
const { applyPlan } = await load('apply.ts');

const login = await fetch(`${base}/studio/login`, {
  method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: base },
  body: 'password=test-password',
});
const cookie = login.headers.get('set-cookie')!.split(';')[0];

async function api(method: string, path: string, body?: unknown, auth = true) {
  const r = await fetch(`${base}/api${path}`, {
    method,
    headers: { 'content-type': 'application/json', origin: base, ...(auth ? { cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data: any = await r.json().catch(() => null);
  if (!r.ok) throw Object.assign(new Error(`${method} ${path} ${r.status}`), { statusCode: r.status, data });
  return data;
}

const real = {
  get: (id: string) => api('GET', `/items/${id}`),
  patch: (id: string, contentMd: string, expectedRevision: number) => api('PATCH', `/items/${id}`, { contentMd, expectedRevision }),
  publish: (id: string, note: string, expectedRevision: number) => api('POST', `/items/${id}/publish`, { note, expectedRevision }),
  settings: async () => {},
};
const memory = () => {
  const records = new Map<string, any>();
  return { records, save: (r: any) => void records.set(r.id, r), clear: (id: string) => void records.delete(id), list: () => [...records.values()] };
};

async function published(text: string, kind = 'thread') {
  const { id, revision } = await api('POST', '/items', { kind, contentMd: text });
  await api('POST', `/items/${id}/publish`, { note: 'seed', expectedRevision: revision });
  return id as string;
}

let run = 0;
/** A small book, in sync, whose first chapter holds a draft, with a new chapter added to the Contents. */
async function scene() {
  const tag = `S${Date.now().toString(36)}${run++}`;
  const secret = `DRAFTSECRET${tag}`;
  const ch1 = await published(`# One ${tag}\n\nPublished one.`);
  const ch2 = await published(`# Two ${tag}\n\nPublished two.`);
  const ch3 = await published(`# Three ${tag}\n\nPublished three.`);
  const toc = await published(`# Contents ${tag}\n\n- [[${ch1} | One]]\n- [[${ch2} | Two]]`);
  const book: any = { blyg: base, notes: 'chapter', references: [], indexTerms: [], sections: {
    toc: { role: 'toc', title: 'Contents', id: toc }, ch1: { role: 'chapter', title: 'One', id: ch1 }, ch2: { role: 'chapter', title: 'Two', id: ch2 },
  } };
  const clean = async (ops = real) => {
    const items = await loadItems(book, async (id: string) => real.get(id));
    return applyPlan(buildPlan(book, items), ops, memory(), () => {});
  };
  await clean();
  // Author: a draft in chapter one, then a new chapter in the Contents.
  const one = await real.get(ch1);
  const draft = one.contentMd.replace('Published one.', `Published one.\n\n${secret} a draft paragraph.\n\n[index: ${secret}]: #`);
  await real.patch(ch1, draft, one.revision);
  const contents = await real.get(toc);
  const tocText = contents.contentMd.replace(`[[${ch2} | Two]]`, `[[${ch3} | Three]]\n- [[${ch2} | Two]]`);
  await real.patch(toc, tocText, contents.revision);
  await real.publish(toc, 'reorder', (await real.get(toc)).revision);
  const items = await loadItems(book, async (id: string) => real.get(id));
  const plan = buildPlan(book, items);
  const section = plan.sections.find((s: any) => s.id === ch1);
  assert.equal(section?.action, 'splice', `chapter one should splice, got ${section?.action}`);
  return { tag, secret, ch1, ch2, ch3, toc, book, plan, section, draft };
}

/** Nothing of the draft reaches any public surface. */
async function assertPrivate(secret: string, id: string) {
  for (const path of [`/t/${id}/`, `/items/${id}.json`, '/feed.xml', '/items/index.json', '/']) {
    const text = await (await fetch(base + path)).text();
    assert.ok(!text.includes(secret), `${path} leaked the draft`);
  }
  const item = await real.get(id);
  assert.ok(!item.published.contentMd.includes(secret), 'published version carries the draft');
  const versions = await api('GET', `/items/${id}/versions`);
  assert.ok(!JSON.stringify(versions).includes(secret), 'version history carries the draft');
}

type Hook = (id: string, ops: typeof real) => Promise<void>;
/** Ops that break the nth write to the chapter, before or after it really happens. */
function breaking(id: string, method: 'patch' | 'publish', nth: number, when: 'refused' | 'lost', times = 1) {
  let count = 0;
  let failed = 0;
  const wrap = (name: 'patch' | 'publish') => async (...args: any[]) => {
    if (args[0] === id && name === method && ++count >= nth && failed < times) {
      failed++;
      if (when === 'lost') await (real[name] as any)(...args);
      throw Object.assign(new Error(`injected ${name} ${when}`), { statusCode: 500 });
    }
    return (real[name] as any)(...args);
  };
  return { ...real, patch: wrap('patch'), publish: wrap('publish') };
}

let passed = 0;
async function test(name: string, body: () => Promise<void>) {
  await body();
  passed++;
  console.log(`ok - ${name}`);
}

await test('happy path: readers get new nav, the draft stays private and comes back', async () => {
  const s = await scene();
  const before = (await real.get(s.ch1)).version;
  const store = memory();
  const outcomes = await applyPlan(s.plan, real, store, () => {});
  assert.ok(outcomes.every((o: any) => o.ok), JSON.stringify(outcomes));
  const item = await real.get(s.ch1);
  assert.equal(item.version, before + 1);
  assert.equal(item.dirty, true);
  assert.ok(item.contentMd.includes(s.secret), 'draft lost');
  assert.ok(item.contentMd.includes(`[[${s.ch3} | Three →]]`), 'draft lacks new nav');
  assert.ok(item.published.contentMd.includes(`[[${s.ch3} | Three →]]`), 'readers lack new nav');
  assert.equal(store.list().length, 0);
  await assertPrivate(s.secret, s.ch1);
});

await test('index and chain ignore the draft', async () => {
  const s = await scene();
  assert.ok(!s.plan.sections.some((p: any) => p.newPublic?.includes(s.secret)));
  assert.ok(!s.plan.sections.some((p: any) => p.action === 'publish' && p.newWorking.includes(s.secret)));
});

for (const when of ['refused', 'lost'] as const) {
  await test(`first write ${when}: draft back, nothing public`, async () => {
    const s = await scene();
    const store = memory();
    const version = (await real.get(s.ch1)).version;
    const out = await applyPlan(s.plan, breaking(s.ch1, 'patch', 1, when), store, () => {});
    assert.equal(out.at(-1).ok, false);
    const item = await real.get(s.ch1);
    assert.equal(item.contentMd, s.draft);
    assert.equal(item.version, version);
    assert.equal(store.list().length, 0);
    await assertPrivate(s.secret, s.ch1);
  });

  await test(`publish ${when}: draft back`, async () => {
    const s = await scene();
    const store = memory();
    const out = await applyPlan(s.plan, breaking(s.ch1, 'publish', 1, when), store, () => {});
    assert.equal(out.at(-1).ok, false);
    const item = await real.get(s.ch1);
    assert.equal(item.contentMd, s.draft);
    assert.equal(store.list().length, 0);
    await assertPrivate(s.secret, s.ch1);
  });

  await test(`putting the draft back ${when}: copy kept and offered, or draft confirmed back`, async () => {
    const s = await scene();
    const store = memory();
    const out = await applyPlan(s.plan, breaking(s.ch1, 'patch', 2, when), store, () => {});
    const item = await real.get(s.ch1);
    if (when === 'refused') {
      // The restore itself failed: the working copy holds no draft, so the copy is what's left.
      assert.equal(out.at(-1).ok, false);
      assert.equal(out.at(-1).recoverable, true);
      assert.equal(store.list().length, 1);
      assert.equal(store.list()[0].draft, s.draft);
      assert.ok(!item.contentMd.includes(s.secret));
    } else {
      // The write landed and only its answer was lost; either way, nothing may be lost.
      assert.ok(item.contentMd.includes(s.secret) || store.list()[0]?.draft === s.draft, 'draft is nowhere');
    }
    await assertPrivate(s.secret, s.ch1);
    // Recovery from the kept copy works.
    if (store.list().length) {
      const { restore } = await load('apply.ts');
      const r = store.list()[0];
      assert.equal(await restore(real, r.id, r.draft, r.transient), true);
      assert.equal((await real.get(s.ch1)).contentMd, s.draft);
      await assertPrivate(s.secret, s.ch1);
    }
  });
}

await test('both publish and the restore fail: copy kept, nothing public', async () => {
  const s = await scene();
  const store = memory();
  const ops = { ...breaking(s.ch1, 'publish', 1, 'refused'), patch: breaking(s.ch1, 'patch', 2, 'refused', 99).patch };
  const out = await applyPlan(s.plan, ops, store, () => {});
  assert.equal(out.at(-1).recoverable, true);
  assert.equal(store.list()[0].draft, s.draft);
  await assertPrivate(s.secret, s.ch1);
});

await test('edit between preview and apply: stops, nothing changed', async () => {
  const s = await scene();
  const store = memory();
  const item = await real.get(s.ch1);
  const newer = `${item.contentMd}\n\n${s.secret} newer`;
  await real.patch(s.ch1, newer, item.revision);
  const version = item.version;
  const out = await applyPlan(s.plan, real, store, () => {});
  const failing = out.find((o: any) => !o.ok);
  assert.match(failing.message, /changed since the last check/);
  assert.equal(out.at(-1), failing, 'should stop at the failure');
  const now = await real.get(s.ch1);
  assert.equal(now.contentMd, newer);
  assert.equal(now.version, version);
  assert.equal(store.list().length, 0);
  await assertPrivate(s.secret, s.ch1);
});

await test('edit just before the first write: real 409, nothing changed', async () => {
  const s = await scene();
  const store = memory();
  let sneaked = false;
  const ops = { ...real, patch: async (id: string, text: string, rev: number) => {
    if (id === s.ch1 && !sneaked) {
      sneaked = true;
      await real.patch(id, `${s.draft}\n\nNEWER`, rev);
    }
    return real.patch(id, text, rev);
  } };
  const out = await applyPlan(s.plan, ops, store, () => {});
  assert.match(out.at(-1).message, /Nothing was changed/);
  assert.equal((await real.get(s.ch1)).contentMd, `${s.draft}\n\nNEWER`);
  assert.equal(store.list().length, 0);
  await assertPrivate(s.secret, s.ch1);
});

await test('edit while the draft is swapped out: never overwritten, copy kept', async () => {
  const s = await scene();
  const store = memory();
  const ops = { ...real, publish: async (id: string, note: string, rev: number) => {
    if (id !== s.ch1) return real.publish(id, note, rev);
    const out = await real.publish(id, note, rev);
    await real.patch(id, 'SOMEONE ELSE', out.revision);
    return out;
  } };
  const out = await applyPlan(s.plan, ops, store, () => {});
  assert.equal(out.at(-1).recoverable, true);
  assert.equal((await real.get(s.ch1)).contentMd, 'SOMEONE ELSE');
  assert.equal(store.list()[0].draft, s.draft);
  await assertPrivate(s.secret, s.ch1);
});

await test('the copy can\'t be stored: stops before touching anything', async () => {
  const s = await scene();
  const store = { ...memory(), save() { throw new Error('storage unavailable'); } };
  const out = await applyPlan(s.plan, real, store as any, () => {});
  assert.equal(out.at(-1).ok, false);
  assert.equal((await real.get(s.ch1)).contentMd, s.draft);
});

await test('a generated published version is held, not republished', async () => {
  const { spliceBlock } = await load('plan.ts');
  assert.match(spliceBlock({ published: { contentMd: 'x', generated: [{ sources: [] }] } } as any), /disclosure/);
  assert.match(spliceBlock({ stubOf: { id: 'a' }, published: { contentMd: 'x', stubOf: null } } as any), /responds/);
  assert.match(spliceBlock({ media: [{ id: 'm', inline: false }], publishedMedia: [], published: { contentMd: 'x' } } as any), /attachment/);
  assert.equal(spliceBlock({ media: [{ id: 'm', inline: true }], publishedMedia: [], published: { contentMd: 'x' } } as any), null);
});

await test('the status line and button say what is outstanding', async () => {
  const { statusLine, actionLabel, outstanding } = await load('plan.ts');
  const same = { oldWorking: 'a', newWorking: 'a' };
  const changed = { oldWorking: 'a', newWorking: 'b' };
  const plan = (sections: any[], menu: unknown = null) => ({ chain: [], sections, menu, warnings: [] });
  const both = (sections: any[], menu: unknown = null) => [statusLine(plan(sections, menu)), actionLabel(plan(sections, menu))];
  assert.deepEqual(both([]), ['Up to date', null]);
  assert.deepEqual(both([{ id: 'a', action: 'publish', ...changed }]), ['Rebuild needed: 1 item', 'Rebuild and publish 1 section']);
  assert.deepEqual(both([{ id: 'a', action: 'publish', ...changed }, { id: 'b', action: 'splice', ...same }]), ['Rebuild needed: 2 items', 'Rebuild and publish 2 sections']);
  assert.deepEqual(both([], {}), ['Rebuild needed: 1 item', 'Update and publish the menu']);
  assert.deepEqual(both([{ id: 'a', action: 'publish', ...changed }], {}), ['Rebuild needed: 2 items', 'Rebuild and publish 1 section and the menu']);
  assert.deepEqual(both([{ id: 'a', action: 'draft', ...changed }], {}), ['Rebuild needed: 2 items', 'Update 1 draft, and publish the menu']);
  assert.deepEqual(both([{ id: 'a', action: 'draft', ...changed }]), ['Rebuild needed: 1 item', 'Update 1 draft (nothing gets published)']);
  assert.deepEqual(both([{ id: 'a', action: 'publish', ...changed }, { id: 'b', action: 'held', ...changed }]), ['Rebuild needed: 2 items', 'Rebuild and publish 1 section, and update 1 draft']);
  assert.deepEqual(both([{ id: 'a', action: 'held', ...changed }]), ['Rebuild needed: 1 item', 'Update 1 draft (nothing gets published)']);
  // Rebuilding can't settle a held section with nothing left to write, so it isn't reported as due.
  const held = { id: 'a', action: 'held', ...same };
  assert.deepEqual(both([held]), ['Up to date, except 1 section held until published', null]);
  assert.equal(outstanding(plan([held])).pending.length, 0);
});

await test('changes are described in plain words, without raw links', async () => {
  const { describeChange } = await load('plan.ts');
  const A = 'a'.repeat(26), B = 'b'.repeat(26), C = 'c'.repeat(26), T = 'd'.repeat(26);
  const nav = (prev: string, next: string) => {
    const line = `[[${A} | ← ${prev}]] · [[${T} | Contents]] · [[${B} | ${next} →]]`;
    return (body: string) => `# Title\n\n${line}\n\n[blykker-nav-top]: #\n\n${body}\n\n[blykker-nav-bottom]: #\n\n${line}`;
  };
  const say = (old: string, now: string, extra: any = {}) => describeChange({ id: 'x', title: 'Index', action: 'publish', revision: 1, oldWorking: old, newWorking: now, ...extra }, new Map([[C, 'Chapter 2']]));
  assert.deepEqual(say(nav('One', 'Two')('Body.'), nav('One', 'Pinched vs. Warped')('Body.')).changes, ['Next link → Pinched vs. Warped']);
  assert.deepEqual(say(nav('One', 'Two')('Body.'), nav('Zero', 'Two')('Body.')).changes, ['Previous link → Zero']);
  assert.deepEqual(say('# Title\n\nBody.', nav('One', 'Two')('Body.')).changes, ['Gets navigation for the first time']);
  const index = (terms: string[]) => nav('One', 'Two')(`# Index\n\n[blykker-generated]: #\n\n${terms.map((t) => `- **${t}** — [[${A} | One]]`).join('\n')}`);
  assert.deepEqual(say(index(['a']), index(['a', 'b', 'c'])).changes, ['Index: 2 entries added']);
  assert.deepEqual(say(index(['a', 'b']), index(['a'])).changes, ['Index: 1 entry removed']);
  const refs = (ids: string[]) => `# R\n\n[blykker-generated]: #\n\n${ids.map((i) => `![[${i}]]`).join('\n\n')}`;
  assert.deepEqual(say(refs([A]), refs([A, B])).changes, ['Index: 1 entry added']);
  const navRefs = (prev: string) => `# R\n\n[[${A} | ← ${prev}]]\n\n[blykker-nav-top]: #\n\n[blykker-generated]: #\n\n![[${A}]]\n\n[blykker-nav-bottom]: #\n\n[[${A} | ← ${prev}]]`;
  assert.deepEqual(say(navRefs('One'), navRefs('Two')).changes, ['Previous link → Two']);
  assert.deepEqual(say(`[[${A} | Start reading →]]`, `[[${C} | Start reading →]]`).changes, ['“Start reading” link → Chapter 2']);
  assert.deepEqual(say(`Text.[[${A} | 2]]`, `Text.[[${A} | 1]]`).changes, ['Note numbers or link labels updated']);
  assert.deepEqual(say('Body.  \n\n\n', 'Body.').changes, ['Whitespace tidied']);
  // Readers' side first; the draft's own text never appears in a description.
  const draft = say(`DRAFT ${nav('One', 'Two')('Body.')}`, `DRAFT ${nav('One', 'Three')('Body.')}`, { action: 'splice', oldPublic: nav('One', 'Two')('Body.'), newPublic: nav('One', 'Three')('Body.') });
  assert.deepEqual(draft.changes, ['Next link → Three']);
  assert.match(draft.note, /stays private/);
  assert.match(say('a', 'b', { action: 'draft' }).note, /nothing is published/);
  assert.match(say('a', 'a', { action: 'held', reason: 'because' }).note, /held: because/);
  for (const line of say(nav('One', 'Two')('Body.'), index(['a'])).changes) assert.ok(!line.includes('[['), line);
});

await test('logged out: every read and write the dashboard uses is refused', async () => {
  const s = await scene();
  for (const [method, path, body] of [
    ['GET', `/items/${s.ch1}`], ['PATCH', `/items/${s.ch1}`, { contentMd: 'x', expectedRevision: 1 }],
    ['POST', `/items/${s.ch1}/publish`, { note: 'x', expectedRevision: 1 }], ['GET', '/settings'], ['PATCH', '/settings', { linksThreads: [] }],
  ] as const) {
    await assert.rejects(api(method, path, body, false), (e: any) => {
      assert.ok([401, 403].includes(e.statusCode), `${method} ${path} -> ${e.statusCode}`);
      return true;
    });
  }
  assert.ok(!(await (await fetch(`${base}/items/${s.ch1}.json`)).text()).includes(s.secret));
});

console.log(`${passed} passed`);
void (0 as unknown as Hook);
