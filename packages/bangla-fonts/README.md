# @hoichoi/bangla-fonts

The Lipighor families from the repository's local `Bangla Fonts/` folder,
subset to Bengali + Latin and converted to WOFF2. The web app, the admin console
and the desktop app import `fonts.css` once; nothing is fetched from Google.

- `src/index.ts` — the manifest (`BANGLA_FONTS`, ids, stacks) and
  `EXCLUDED_BANGLA_FONTS`.
- `fonts.css` — generated `@font-face` rules pointing at `files/`.
- `licenses/` — the original readme/terms shipped inside each source zip.

The bundled files are redistributed under each family's own terms; see the
matching folder under `licenses/`. The build never invents a licence for a font
that did not ship one.

## Why only 18 of 47 families

The build clears licences before it converts a single face. FontBD's readme says
the fonts may not be used as webfonts or uploaded to a website; sixteen zips
ship no licence at all; BL Masud's terms do not grant redistribution. Those 29
families appear in `EXCLUDED_BANGLA_FONTS` with their reason, and no file from
them is written or served. Lipighor permits webfont use with a permission email
and a footer backlink, so its 18 families ship and the site adds the credit when
one is selected.

The source zips are kept outside git history (20 MB of duplicates); the built
package is self-contained. To regenerate, restore `Bangla Fonts/` at the repo
root and run `python packages/bangla-fonts/scripts/build.py`.
