// The port against blykker.py: same text and same publish decision, section by section, except where
// the port differs on purpose (a section with unpublished edits).
//   node --import tsx test/parity.ts <snapshot.json>       (from a studio tree, for tsx)
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const planPath = process.argv[3] ?? resolve(import.meta.dirname, '../extension/ui/plan.ts');
const { buildPlan, outstanding, statusLine, spliceBlock } = (await import(pathToFileURL(planPath).href)) as typeof import('../extension/ui/plan.ts');
const snapshot = JSON.parse(readFileSync(process.argv[2], 'utf8'));

let failures = 0;
const fail = (scenario: string, message: string) => {
  failures++;
  console.log(`FAIL ${scenario}: ${message}`);
};

for (const [name, s] of Object.entries<any>(snapshot.scenarios)) {
  const items = new Map<string, any>(s.before.map((i: any) => [i.id, i]));
  // The plan loads what it reads up front; blykker reads lazily. Give it everything either touched.
  for (const i of s.items) if (!items.has(i.id)) items.set(i.id, i);
  const settings = s.settings ? { authorLinks: s.settings.authorLinks, linksExternal: s.settings.linksExternal } : undefined;
  const plan = buildPlan(snapshot.book, items, settings);
  const ours = new Map<string, any>(plan.sections.map((p: any) => [p.id, p]));
  let compared = 0;
  for (const [id, write] of Object.entries<any>(s.writes)) {
    const p = ours.get(id);
    if (!p) { fail(name, `${id}: blykker writes it, the port doesn't`); continue; }
    compared++;
    if (p.newWorking !== write.text) {
      fail(name, `${p.title}: working text differs`);
      const a = p.newWorking.split('\n'), b = write.text.split('\n');
      const at = a.findIndex((l: string, n: number) => l !== b[n]);
      console.log(`  line ${at}\n  port:   ${JSON.stringify(a[at])}\n  python: ${JSON.stringify(b[at])}`);
    }
    const item = items.get(id);
    if (item.dirty && item.status === 'public') {
      if (write.publish) fail(name, `${p.title}: blykker would publish a draft`);
      if (p.action === 'publish' && p.newWorking !== p.newPublic && item.published.contentMd !== p.newWorking) fail(name, `${p.title}: port publishes a draft`);
    } else if ((p.action === 'publish') !== write.publish) {
      fail(name, `${p.title}: port ${p.action}, blykker publish=${write.publish}`);
    }
  }
  for (const p of plan.sections) {
    const item = items.get(p.id);
    if (s.writes[p.id]) continue;
    // Only a draft section may have a plan blykker lacks, and only for its published text.
    if (!(item.dirty && item.status === 'public' && p.newWorking === item.contentMd)) fail(name, `${p.title}: the port writes it, blykker doesn't`);
  }
  // A published plan never carries draft text.
  for (const p of plan.sections) {
    if (p.newPublic?.includes('SECRET') || (p.action === 'publish' && p.newWorking.includes('SECRET'))) fail(name, `${p.title}: draft text would be public`);
  }
  if (JSON.stringify(plan).includes('SECRET') && !plan.sections.every((p: any) => !p.newPublic?.includes('SECRET'))) fail(name, 'SECRET in public plan');
  // The indicator: everything blykker would write is flagged, and a clean book says so.
  const flagged = new Set(outstanding(plan).pending.map((p: any) => p.id));
  for (const id of Object.keys(s.writes)) if (!flagged.has(id)) fail(name, `${id}: blykker writes it, the indicator doesn't flag it`);
  for (const id of flagged) {
    const item = items.get(id);
    if (!s.writes[id] && !(item.dirty && item.status === 'public')) fail(name, `${id}: flagged, but blykker has nothing to do`);
  }
  if (!flagged.size && !plan.menu && !statusLine(plan).startsWith('Up to date')) fail(name, 'clean plan not reported up to date');
  if (flagged.size && statusLine(plan).startsWith('Up to date')) fail(name, 'pending plan reported up to date');
  const planned = plan.sections.map((p: any) => `${p.title}:${p.action}`).join(', ') || 'nothing';
  console.log(`${name}: ${compared}/${Object.keys(s.writes).length} match; plan: ${planned}`);
  if (plan.warnings.length) console.log(`  warnings: ${plan.warnings.join('; ')}`);
}
void spliceBlock;
if (failures) { console.log(`${failures} failures`); process.exit(1); }
console.log('PARITY OK');
