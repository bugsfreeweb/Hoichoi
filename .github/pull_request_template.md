## What changed

<!-- One paragraph. What was wrong before, and what is true now. -->

## Why

<!-- The bug, the audit item, or the requirement. Link the roadmap id (C1..C24). -->

## Verification

<!-- What you actually ran, not what you intend to run. -->

- [ ] `pnpm typecheck` (7/7)
- [ ] `pnpm test` (5/5)
- [ ] Checked the change in a browser or against the real database
- [ ] New user-facing text is bilingual via `t()` (Bangla first)

## Risk

- [ ] Touches admin auth / roles
- [ ] Touches a migration (new file only — never edit an applied one)
- [ ] Touches CSP or headers
- [ ] Touches the desktop app (a release rebuild is required)

## Rollback

<!-- How to undo it if it misbehaves in production. -->
