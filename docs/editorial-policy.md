# Editorial Policy — হৈচৈ (Hoichoi)

> **This document is the editorial standard the engineering follows. It is NOT legal advice. The user must have a qualified lawyer review before public launch.**

---

## Positioning

**হৈচৈ (Hoichoi)** is a viral-content ephemeral snapshot for Bangla local content. We collect what's trending on Facebook right now, rewrite it in clean Bangla, show it for up to 7 days, then it disappears. We are **not a permanent archive** and we **do not claim ownership** of the original content. The original Facebook user/page is always the canonical source.

Think of us as: the "আজকের ঢেউ" (today's wave) of Bangla public-interest content, captured, rewritten, and shown — then released.

---

## What this platform is

A viral-content ephemeral snapshot that:
- Collects posts from **public Facebook feeds** of verified public Pages (news outlets, government bodies, child welfare NGOs, similar).
- The original user/page is the **source**. We always attribute. We do not steal, repost verbatim, or strip attribution.
- Rewrites the source material in clean Bangla as news-style articles. The rewrite is a derived work in Bangla, with the original user/page clearly cited.
- Shows each post for up to 7 days, then auto-archives it (admin-only for 30 days), then hard-deletes everything. **Maximum retention on our side is 37 days.** After that, no trace of the post remains in our database or storage.
- Covers three narrow categories chosen for public-interest value.

This is the same editorial model as AllTop, Flipboard, Groundviews, or Scoop.it — a curated feed of public-interest content with proper attribution, repackaged for a specific audience (Bangla, local focus) — but with an **explicit expiry**.

What this platform is **not**:
- A gossip or rumor site.
- A social network with comments or user-generated content.
- A marketplace, dating site, or classifieds.
- A platform for unverified claims or anonymous accusations.
- A scraper of private content. (We only access public Facebook Pages that anyone can view without logging in.)
- A permanent archive. (Every post expires. The original FB post remains the source of truth; we are a temporary mirror.)
- A claim of ownership. (We never claim copyright over the rewritten content; it is a fair-use summary of the source.)

---

## The three categories — what we publish, what we don't

### Category 1: `child-sexual-abuse` — শিশু যৌন নির্যাতন

**What we cover:**
- Reports of child sexual abuse in madrasas, mosques, private settings.
- Both male and female victims.
- Allegations, FIRs, arrests, court proceedings — as reported by verified news sources.
- Awareness content about child protection laws, helplines, and reporting channels.

**What we DON'T publish:**
- The child's name, parent's name, school, madrasa, mosque, village, thana, district, or any other identifying detail — even if in the source.
- The name of the suspect. We say "অভিযুক্ত ব্যক্তি".
- The name of the religious institution. We say "সংশ্লিষ্ট ধর্মীয় প্রতিষ্ঠান".
- The specific sexual act. We say "যৌন নির্যাতন" or "অসদাচরণ".
- Slurs, insults, or graphic language from the source.
- Any speculation on guilt, motive, or punishment.

**Safety controls:**
- Always `pending_review`. Never auto-publishes.
- Requires double-approval from two different admins.
- Shows a content warning before the title on the public page.
- Hard-deleted from DB on removal request (not just unpublished) to minimize retention.
- Backed by the post-rewrite regex pass + `redaction_blocklist`.

### Category 2: `extramarital-crime` — পরকীয়া অপরাধ

**What we cover:**
- Blackmail, extortion, threats, and criminal acts arising from extramarital affairs.
- Murder, suicide, kidnapping-for-ransom, and other crimes connected to affairs.
- Court proceedings and verdicts.

**What we DON'T publish:**
- Gossip that names individuals without any criminal act.
- Intimate details, messages, or photos from the source.
- Moralizing, slut-shaming, or character speculation.
- Any content where the source is a verified gossip/rumor page and the post names individuals without a criminal act being reported.

**Editorial tone:**
- Lead with the **criminal act**, not the affair. The affair is context, not the news.
- Use allegation language: "অভিযোগ", "দাবি", "প্রাথমিক তথ্য অনুযায়ী".
- For verified news pages, names of involved adults are allowed. For gossip pages, anonymize.

**Safety controls:**
- Auto-publishes if safety flag is clean (no double-approval).
- Standard PII redaction rules (admin blocklist applies).
- Public "Report" button with one-click unpublish.

### Category 3: `missing-children` — নিখোঁজ শিশু ও ছেলে ধরা

**What we cover:**
- Missing child reports (name, age, last-seen location, description, contact number) when from a verified source.
- Resolved cases (found alive, false alarm) with the public `case_status` badge updated.
- "ছেলে ধরা" incidents and the public panic they cause — handled carefully.

**What we DON'T publish:**
- Rumor-driven "ছেলে ধরা" panic without verifying with police. If the source is unverified, we mark the post `unverified_claim` and frame the headline as "পুলিশের বরাত দিয়ে দাবি" not as fact.
- Private phone numbers of unrelated parties.
- Identifying details of bystanders caught in mob violence.

**Editorial tone:**
- For active missing child cases: include the child's name, age, last-seen info, and a helpline CTA. This info helps find the child.
- For "ছেলে ধরা" rumors: lead with "প্রাথমিকভাবে যাচাই করা হয়নি", include police helpline 999, add a "সতর্কতা: গুজব ছড়াবেন না" line.

**Safety controls:**
- Auto-publishes if safety flag is clean.
- Helpline numbers (999, 109) included in the body.
- "Share widely" CTA on the post page (social share buttons).
- `case_status` badge on the header: active / found / unresolved / false-alarm.
- Admins can update `case_status` after publish without re-review (the only category where this is allowed).

---

## Cross-cutting rules (all categories)

0. **Risk tier decides the queue.** Every rewritten post is assigned a tier before
   it is stored; the tier — not the category alone — decides whether it can publish
   on its own. Implemented in `apps/scraper/src/pipeline.ts::assessRisk`.

   | Tier | Trigger | Outcome |
   | --- | --- | --- |
   | `critical` | `minor_involved`, `graphic_content`, or `needs_double_approval` safety flag, **or** a category with `requires_double_approval` | `pending_review`, two-person approval required, never auto-publishes |
   | `sensitive` | `unverified_claim` safety flag, **or** a category with `auto_pending_review` | `pending_review`, single approval |
   | `routine` | No flags, category allows auto-publish | Publishes immediately |

   A safety flag always overrides the category default, in the unsafe direction:
   loosening a category's config can never let a minor-involved post through
   unattended. This replaced an earlier all-or-nothing rule that sent every post
   from a flagged category to review, burying genuinely dangerous material under
   hundreds of routine ones.

   On top of the tier, a **fact-gate** holds any post whose category was
   *re-detected* by the classifier at less than `settings.fact_gate` confidence
   (default 90%, adjustable from the desk). The content may be fine, but its
   placement on the site is a guess, so a human confirms it. A post that keeps its
   source's own category is not gated — the source's configuration is authoritative.

1. **No fabrication.** Names, ages, places, quotes, numbers must be in the source. Unclear → "স্পষ্ট নয়".
2. **Always attribute.** "সূত্র: <page name> (ফেসবুক)" with a link to the original post.
3. **No slur or hate speech reproduction.** Summarize without quoting.
4. **Bangla script only.** No Banglish transliteration. Enforce with regex check before publish.
5. **Screenshots stay internal.** The Facebook UI screenshot is for audit only. The public post shows the re-processed media, never the screenshot.
6. **Report button on every post.** Removal requests go to `removal_requests` and admins act on them.
7. **Audit log everything.** Every admin action is recorded in `admin_actions`.
8. **Bangla locale + Bangla helplines.** All UI in Bangla. Footer always shows 999 (police) and 109 (child helpline).
9. **Bangladesh law compliance.** Editor aware of Digital Security Act 2018, Children Act 2013, Pornography Control Act 2012. Legal disclaimer on `/about` and `/terms`.

---

## Sourcing rules

We only scrape **verified public Facebook Pages** with the following characteristics:
- The Page represents a recognized news outlet, government body, child welfare NGO, or similar authoritative source.
- The Page has been on our `sources` table for at least 14 days with `is_verified = true` (set by an admin after manual review).
- The Page has a history of factual reporting (no known history of fabrication, defamation, or hate speech).

We **never** scrape:
- Personal profiles (even with `is_verified = true` on a profile).
- Pages that primarily post gossip, rumor, or unverified claims (except where the post itself reports a police/FIR/government action, which makes it news).
- Pages banned or restricted by Facebook.

The `submitted_pages` form on the public site lets anyone suggest a new source. The admin reviews the suggestion, checks the Page's history, and either accepts (creates a `sources` row with `is_verified = false` for further review) or rejects.

---

## Roles

| Role | Permissions |
|---|---|
| `admin` | Full access. Can approve all categories including `child-sexual-abuse` (but two admins still required for that category). Can manage sources, providers, settings. |
| `editor` | Can approve posts in `extramarital-crime` and `missing-children`. Cannot approve `child-sexual-abuse` alone. Can manage sources. |
| `moderator` | Can view the moderation queue, view the private screenshots, but cannot approve. Can act on removal requests. |

These are enforced in the application layer. There is no Supabase/RLS in this
project — the database is Turso/libSQL and every admin API route re-checks the
session and role before touching a row. See `docs/database-decision.md` for why
Turso was chosen, and `packages/db/src/index.ts` for the bulk-operation helpers
that encode the double-approval rules.

---

## What we will do on a credible correction

If a credible source (the original FB page, a court record, or a major news outlet) publishes a correction or update about a story we've covered:
1. We update the post in place with a "সংশোধনী" (correction) notice at the top in Bangla, dated.
2. We log the change in `admin_actions` with `action = 'correction'`.
3. If the correction is severe enough (false accusation, innocent party named), we unpublish the original post and link the correction from the URL.

---

## What we won't do

We will not, regardless of pressure:
- Publish unverified accusations as fact.
- Name suspects in `child-sexual-abuse` posts (even if named in court records — the engineering redacts regardless).
- Reproduce explicit content, slurs, or graphic descriptions.
- Sell user data or run third-party advertising on sensitive pages.
- Allow comments or unmoderated user content on the public site.
- Share user data (email, IP) with third parties, ever.

These are policy. The engineering is built to enforce them, but a determined admin with a logged-in desktop app could override some of them. The audit log ensures that override is traceable.

---

## The disclaimer (placeholder for `/about` and `/terms`)

> *This is a public-interest news aggregator operated as a journalistic platform. We collect reports from public Facebook Pages, verify them where possible, and rewrite them in Bangla with strict redaction rules for content involving minors. We do not publish unverified accusations. We cooperate with takedown requests via the "Report" button on every post. Posts are rewritten summaries of source material, not endorsements of the source's claims. If you believe a post on this site is inaccurate, defamatory, or should be removed for any reason, please use the Report button or contact us at [email]. This platform is operated from [jurisdiction] and complies with the applicable laws of that jurisdiction.*

> ***This text is a placeholder. A qualified lawyer must review and customize before public launch.***

---

## Legal review checklist before going live

Before flipping the site to public, the user must:

- [ ] Have a lawyer review `/privacy`, `/terms`, `/dmca`, `/contact` and the disclaimer above.
- [ ] Verify that the scraping approach is defensible under Facebook ToS and Bangladesh law.
- [ ] Confirm the editorial policy (this document) is acceptable.
- [ ] Confirm the helpline numbers (999, 109) are current and correct.
- [ ] Have a clear process for handling law enforcement requests (court orders, takedown demands).
- [ ] Have a clear process for handling DMCA / copyright complaints.
- [ ] Have a designated person / role responsible for moderating the queue daily.

If any of these can't be confirmed, the site should not be made public.
