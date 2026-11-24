# @hoichoi/bangla-fonts

Every Unicode Bengali family from the repository's local `Bangla Fonts/` folder,
subset to Bengali + Latin and converted to WOFF2. The web app, the admin console
and the desktop app import `fonts.css` once; nothing is fetched from Google.

- `src/index.ts` — the manifest (`BANGLA_FONTS`, ids, stacks).
- `fonts.css` — generated `@font-face` rules pointing at `files/`.
- `licenses/` — the original readme/terms shipped inside each source zip.

The bundled files are redistributed under each family's own terms; see the
matching folder under `licenses/`. The build never invents a licence for a font
that did not ship one.

The source zips are kept outside git history (20 MB of duplicates); the built
package is self-contained. To regenerate, restore `Bangla Fonts/` at the repo
root and run `python packages/bangla-fonts/scripts/build.py`.
