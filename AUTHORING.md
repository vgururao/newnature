# Authoring New Nature

You write in the studio (https://newnature.venkateshrao.com/studio). The book's structure lives
in a few threads, and the editorial assistant (`blykker.py sync`) keeps navigation, notes,
references, the index, the menus and the cover link in step with them. Conventions in full:
`Code/blygger-protocol/blykker/PLAN.md`.

## The book's threads

| Section | Item | Notes |
|---|---|---|
| Cover (front page) | `2sj0bb5vpy606f545190mhjfrt` | Cover image + links. "Start reading" follows the first Contents entry. |
| Title page | `0qz1zryj43v0ey4wt31f10xzzk` | Carries the cover credit. |
| Contents | `0ajsfe9jk0rrctr9x76j0xf6fz` | **Defines the book's order.** |
| Preface | `3sfmhy8dmsxqrk3wtg3we4a9dk` | |
| Chapter 1: Introduction | `78yzqsnjsjw5qcaza3xe4sk3qv` | |
| References | `6mt28vrv8adg37kz1sjmh11qjp` | Generated below its marker. |
| Index | `55vash0p5z5ktpcdw8ypwax36g` | Generated below its marker. |
| About the author | `4p7ppd8mtqmv5dj4q100yszjqz` | Outside the reading order; linked from the top menu. |

`book.json` holds these ids too. It's the source of truth for them.

## Everyday moves

**Write a chapter.** Edit its thread. Leave the nav lines and the `[blykker-…]: #` lines alone.
They're generated and invisible on the site. Write between the two nav lines.

**Add or reorder chapters.** Create a new thread whose first line is `# Chapter 2: Title`. Then
edit **Contents** and add `- [[newid | Chapter 2: Title]]` where it belongs (drag to reorder, or
change a label). Publish both, then ask Claude to run sync. Navigation, the cover's "Start
reading" and the menus all follow.

**Endnote.** Create a *fragment*:
```
[blykker-note]: #

The text of the note.
```
Cite it in the chapter where the marker goes: `…a claim.[[noteid | 1]]`. The number doesn't
matter, because sync renumbers notes in order of first citation and assembles them under
**Notes** at the end of the chapter. (`book.json` → `"notes": "book"` moves them all into a
Notes section before References instead.)

**Reference.** Create a fragment:
```
[blykker-ref]: #

Author, A. *Title*. Publisher, 2026. <https://…>
```
Cite it inline with `[[refid]]` or `[[refid | Author 2026]]`. Sync adds every cited reference to
References, sorted A–Z. Uncited references are listed in `book.json` → `references`.

**Index term.** After the paragraph, on its own line with a blank line before it:
```
[index: hardness]: #
```
Subentry: `[index: protocols; hardness of]: #`. A second marker for the same term in the same
thread needs a number to keep it unique: `[index: hardness 2]: #`. Sync builds the Index with
links to each section. Terms listed in `book.json` → `index.terms` appear even before they're
used (currently: hardness, immutability).

**Image.** Create a fragment, upload the web-resolution image into it, and record provenance:
```
[blykker-image]: #

![Alt text](uploaded image)

*Figure 1.1 — Caption.* Credit line.

[rights: CC BY 4.0]: #
[source: https://…]: #
[print: images/print/fig-1-1.tif]: #
```
Transclude it in the chapter with `![[imgid]]` on its own line. Register every image in
`images/index.json` (files, credit, rights, where it's used). Naming and folders are in
`images/README.md`. Print-resolution files go in `images/print/` (Dropbox only). Sync warns about
images missing rights, source or a print file.

## Running sync

Claude runs it for you. From this folder:
```
../../blygger-protocol/blykker/tools/blykker.py book.json sync --dry-run   # what would change
../../blygger-protocol/blykker/tools/blykker.py book.json sync             # do it (publishes)
```
It only republishes threads that were already published and whose generated parts changed. Your
own unpublished drafts get edited but stay drafts.
