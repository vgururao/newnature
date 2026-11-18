// The chapter nav that a rebuild writes, held out of the full editor's text box (studio
// `editorRegions`, 0.59.0+). Same layout as `withNav` in plan.ts:
//   # Heading \n\n <nav line> \n\n [blykker-nav-top]: # \n\n body \n\n [blykker-nav-bottom]: # \n\n <nav line>
// Each region starts with its own separator, so text typed where it was cut stays in the
// paragraph above (docs/extensions.md, "Editor regions").
import type { EditorRegion } from '../../../src/ui/extension-api.ts';

const NAV_TOP = '[blykker-nav-top]: #';
const NAV_BOTTOM = '[blykker-nav-bottom]: #';
const LABEL = 'chapter navigation';

export function navRegions(text: string): EditorRegion[] {
  const regions: EditorRegion[] = [];
  const top = text.indexOf(NAV_TOP);
  const bottom = text.lastIndexOf(NAV_BOTTOM);
  if (top >= 0) {
    const head = text.slice(0, top);
    const first = head.indexOf('\n');
    // After a heading, the region is the separator, nav line and marker. With no heading it
    // starts the text, so it also takes the blank line after the marker.
    const start = head.startsWith('#') && first >= 0 ? first : 0;
    let end = top + NAV_TOP.length;
    if (start === 0) end += text.slice(end).length - text.slice(end).trimStart().length;
    regions.push({ start, end, label: LABEL });
  }
  if (bottom >= 0 && bottom > top) {
    const start = text.slice(0, bottom).trimEnd().length;
    regions.push({ start, end: text.length, label: LABEL });
  }
  return regions;
}
