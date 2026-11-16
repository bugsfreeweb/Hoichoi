# Security policy

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Email **security@hoichoi.io** with:

- what you found and where (URL, endpoint, or file),
- the smallest steps that reproduce it,
- what an attacker gains, and
- whether any reader data or credential was exposed.

You will get an acknowledgement within **72 hours** and an assessment within
**7 days**. If a fix is needed we will tell you when it ships; if we disagree that
something is a vulnerability we will explain why.

## Scope

In scope: the public site and its API, the admin console, the scraper pipeline,
the desktop app, and the release artifacts.

Out of scope: findings that need a compromised device or an already-leaked
credential, rate-limit bypass that requires rotating your own session, missing
security headers on non-production hosts, and social engineering.

## What we already do

- Reader forms store HMACs of email and network, never the raw address; guest
  identity is an opaque cookie id (`packages/db/src/guest.ts`).
- Every admin API route declares a minimum role; audit rows carry the actor
  snapshot (`apps/web/src/lib/auth.ts`, `packages/db/src/audit.ts`).
- CSP ships report-only and is promoted deliberately with `CSP_ENFORCE=true`;
  violations are never persisted (`apps/web/security-headers.mjs`).
- Secret-bearing endpoints fail closed when their secret is unset.
- Credential expiries are tracked (label + date only, never the secret) and mailed
  on a cron that fails closed.
- Dependabot, CodeQL and gitleaks run on this repository.

## Disclosure

We credit reporters in the fix commit unless asked not to. We do not run a paid
bounty programme.
