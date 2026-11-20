// The chapter nav that a rebuild writes, held out of the full editor's text box (studio
// `editorRegions`, 0.59.0+). Same layout as `withNav` in plan.ts:
//   # Heading \n\n <nav line> \n\n [blykker-nav-top]: # \n\n body \n\n [blykker-nav-bottom]: # \n\n <nav line>
// Each region starts with its own separator, so text typed where it was cut stays in the
// paragraph above (docs/extensions.md, "Editor regions").
//
// A region takes only the separator a rebuild writes (one "\n\n"), never a run of whitespace:
// the editor re-finds the regions after every edit and expects the box to come back as typed,
// so a newline typed beside a region must not be claimed by it.
import type { EditorRegion } from '../../../src/ui/extension-api.ts';

const NAV_TOP = '[blykker-nav-top]: #';
const NAV_BOTTOM = '[blykker-nav-bottom]: #';
const LABEL = 'chapter navigation';
/** A rebuild's nav line (`navLine` in plan.ts): links joined by " · ", to the end of its line. */
const NAV_LINK = String.raw`\[\[[0-9a-z]{26} \|[^\n]*?\]\]`;
const NAV_LINKS = new RegExp(`${NAV_LINK}(?: · ${NAV_LINK})*\\s*$`);

/** How many of the characters just before `at` are the separator: "\n\n", or a lone "\n". */
const before = (text: string, at: number) => (text.startsWith('\n\n', at - 2) ? 2 : text[at - 1] === '\n' ? 1 : 0);

export function navRegions(text: string): EditorRegion[] {
  const regions: EditorRegion[] = [];
  const top = text.indexOf(NAV_TOP);
  const bottom = text.lastIndexOf(NAV_BOTTOM);
  if (top >= 0) {
    // The nav line is the line before the marker's separator; the region starts at its links,
    // so anything typed onto the front of that line stays in the box.
    const line = text.lastIndexOf('\n', top - before(text, top) - 1) + 1;
    const links = NAV_LINKS.exec(text.slice(line, top))?.index;
    const nav = line + (links ?? 0);
    let end = top + NAV_TOP.length;
    // After a heading, the region is the separator, nav line and marker. With nothing on the
    // lines above, it takes the separator after the marker instead.
    const lead = text.slice(0, nav).trim() !== '' ? before(text, nav) : 0;
    if (!lead) end += text.startsWith('\n\n', end) ? 2 : text[end] === '\n' ? 1 : 0;
    regions.push({ start: nav - lead, end, label: LABEL });
  }
  if (bottom >= 0 && bottom > top) regions.push({ start: bottom - before(text, bottom), end: text.length, label: LABEL });
  return regions;
}
