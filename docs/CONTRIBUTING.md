# Contributing to হৈচৈ (Hoichoi)

Thanks for your interest in contributing.

## How to contribute

1. Open an issue for the change you have in mind.
2. Fork the repository and create a branch.
3. Keep changes focused and add tests where practical.
4. Run `pnpm install`, `pnpm typecheck`, and `pnpm test` before submitting, then
   `pnpm build` for anything touching `apps/web`. (`pnpm lint` currently runs no
   tasks — no package defines one — so it is not a real gate yet.)
5. Open a pull request.

## Guidelines

- Never commit real secrets (`gitleaks` runs in CI).
- Editorial policy (see `editorial-policy.md`) is the floor for everything content-related.
- Bangla output must use Bengali script (U+0980–U+09FF) and clean, attribution-first news language.
- Sensitive categories (`child-sexual-abuse`) have extra gates — do not weaken them.

_This file is a placeholder the maintainers should complete._