/*
 * Books defined on the blyg. The front page is the shelf when it carries the shelf marker: its outline
 * lists each book's Contents, and a book is known by that thread's id. Everything else about a book is
 * declared in its Contents by link-reference markers, which render as nothing. All of it is read from
 * what readers see, so an unpublished edit to a Contents or the shelf changes nothing here.
 *
 *   Shelf:    [blykker-shelf]: #
 *             - [[contentsId | Book title]]
 *             [shelf-about]: /t/<id>/
 *             [menu-top: Label]: <url>      [menu-bottom: Label]: <url>
 *   Contents: [book-cover]: /t/<id>/        also book-title, book-references, book-index, book-notes
 *             [book-ref <id>]: #            a reference listed even if uncited
 *             [book-term: hardness]: #      an index term listed even if unused
 */
import { chainOf, type Book, type ItemLike, type MenuEntry } from './plan.ts';

const ID = '[0-9a-hjkmnp-tv-z]{26}';
export const SHELF_MARK = '[blykker-shelf]: #';

export interface ShelfBook {
  tocId: string;
  title: string;
}
export interface Shelf {
  books: ShelfBook[];
  about?: string;
  menu: { top: MenuEntry[]; bottom: MenuEntry[] };
}

export const isShelf = (text: string) => text.split('\n').some((l) => l.trim() === SHELF_MARK);

export function parseShelf(text: string): Shelf {
  const books = [...text.matchAll(new RegExp(`^[ \\t]*[-*+][ \\t]+\\[\\[(${ID})(?:[ \\t]*\\|[ \\t]*([^\\n]*?))?[ \\t]*\\]\\][ \\t]*$`, 'gm'))]
    .map((m) => ({ tocId: m[1], title: m[2] || m[1] }));
  const entries = (where: string) => [...text.matchAll(new RegExp(`^\\[menu-${where}:[ \\t]*([^\\]\\n]+?)\\]:[ \\t]*(\\S+)[ \\t]*$`, 'gm'))]
    .map((m) => ({ label: m[1], url: m[2] }));
  const about = new RegExp(`^\\[shelf-about\\]:[ \\t]*/t/(${ID})/[ \\t]*$`, 'm').exec(text)?.[1];
  return { books, ...(about ? { about } : {}), menu: { top: entries('top'), bottom: entries('bottom') } };
}

const ROLES: Record<string, string> = { cover: 'Cover', title: 'Title page', references: 'References', index: 'Index', notes: 'Notes' };

/** A book from its Contents' published text. */
export function parseBook(blyg: string, tocId: string, tocText: string, shelf: Shelf): Book {
  const sections: Book['sections'] = { toc: { role: 'toc', title: 'Contents', id: tocId } };
  for (const m of tocText.matchAll(new RegExp(`^\\[book-(cover|title|references|index|notes)\\]:[ \\t]*/t/(${ID})/[ \\t]*$`, 'gm'))) {
    sections[m[1]] = { role: m[1], title: ROLES[m[1]], id: m[2] };
  }
  if (shelf.about) sections.about = { role: 'about', title: 'About the author', id: shelf.about };
  return {
    blyg,
    notes: sections.notes ? 'book' : 'chapter',
    sections,
    references: [...tocText.matchAll(new RegExp(`^\\[book-ref[ \\t]+(${ID})\\]:[ \\t]*#[ \\t]*$`, 'gm'))].map((m) => m[1]),
    indexTerms: [...tocText.matchAll(/^\[book-term:[ \t]*([^\]\n]+?)\]:[ \t]*#[ \t]*$/gm)].map((m) => m[1]),
    menu: shelf.menu,
  };
}

const owned = (book: Book, toc: ItemLike) => {
  const ids = new Set(chainOf(book, toc).map((c) => c[0]));
  for (const s of Object.values(book.sections)) if (s.id && s.role !== 'about') ids.add(s.id);
  return ids;
};

/** Sections two books both claim. A rebuild would rewrite them for one book and break the other, so it must not run. */
export function crossings(book: Book, toc: ItemLike, others: { title: string; book: Book; toc: ItemLike }[]) {
  const mine = owned(book, toc);
  return others.flatMap((other) => [...owned(other.book, other.toc)].filter((id) => mine.has(id)).map((id) => ({ id, book: other.title })));
}
