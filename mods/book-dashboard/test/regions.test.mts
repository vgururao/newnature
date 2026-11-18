// The nav regions against real section texts: what the editor's text box shows has no nav
// and is the section's text without it, and a rebuild's own layout round-trips.
//   node --import tsx regions.test.mts <texts.json> <vendored ui dir>
// texts.json maps item id → { text } (live working copies; holds drafts, keep it out of the repo).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const [file, ui] = process.argv.slice(2);
const { navRegions } = await import(`${ui}/regions.ts`);
const { stripNav } = await import(`${ui}/plan.ts`);

const box = (text: string) => {
  let out = '';
  let at = 0;
  for (const r of navRegions(text)) {
    out += text.slice(at, r.start);
    at = r.end;
  }
  return out + text.slice(at);
};
const squash = (s: string) => s.replace(/\n{3,}/g, '\n\n').trim();

const texts: Record<string, { text: string }> = JSON.parse(readFileSync(file, 'utf-8'));
let held = 0;
for (const [id, { text }] of Object.entries(texts)) {
  const shown = box(text);
  assert.ok(!shown.includes('[blykker-nav-'), `${id}: a marker is shown`);
  if (text.includes('[blykker-nav-top]')) assert.ok(!/^\[\[[0-9a-z]{26} \|[^\n]*\]\]( · \[\[[^\n]*\]\])*$/m.test(shown), `${id}: a nav line is shown`);
  assert.equal(squash(shown), stripNav(text), `${id}: the box isn't the text without nav`);
  assert.ok(!/^\n/.test(shown), `${id}: the box starts with a blank line`);
  if (navRegions(text).length) held++;
}

// Synthetic: heading, no heading, top only, nothing.
const line = '[[aaaaaaaaaaaaaaaaaaaaaaaaaa | ← Back]] · [[bbbbbbbbbbbbbbbbbbbbbbbbbb | Next →]]';
const withHeading = `# Title\n\n${line}\n\n[blykker-nav-top]: #\n\nBody.\n\n[blykker-nav-bottom]: #\n\n${line}`;
assert.equal(box(withHeading), '# Title\n\nBody.');
const bare = `${line}\n\n[blykker-nav-top]: #\n\nBody.\n\n[blykker-nav-bottom]: #\n\n${line}`;
assert.equal(box(bare), 'Body.');
assert.deepEqual(navRegions('# Plain\n\nNo nav here.'), []);

console.log(`regions ok: ${Object.keys(texts).length} sections, ${held} with nav`);
