import Link from "next/link";
import type { SecretSpec } from "@hoichoi/shared-types";
import { RUN_SUCCESS_STATUS } from "@/lib/setup-readiness";
import { ExternalLink } from "./ExternalLink";

/**
 * On-screen guide for configuring the automation.
 *
 * Every secret is rendered as a self-contained card: what it does, why it is
 * needed, whether it is currently present, step-by-step instructions for
 * obtaining it, a link to the provider dashboard, the `.env` line, the cost,
 * and what breaks if it is skipped.
 *
 * This exists because the previous UI only listed secret *names*. Knowing a
 * value is called FB_SESSION_COOKIE does not tell an operator where to get one
 * or how to check whether it arrived.
 */

const REPO_URL = "https://github.com/bugsfreeweb/Hoichoi";
const ACTIONS_SECRETS_URL = `${REPO_URL}/settings/secrets/actions`;
const ACTIONS_VARS_URL = `${REPO_URL}/settings/variables/actions`;
const NEW_TOKEN_URL = `${REPO_URL}/settings/personal-access-tokens/new`;

export interface SecretView extends SecretSpec {
  present: boolean;
  updatedAt: string | null;
  inVault: boolean;
  satisfied: boolean;
}

const BADGE: Record<
  SecretSpec["requirement"],
  { label: string; cls: string }
> = {
  required: { label: "আবশ্যক", cls: "border-alizarin/50 bg-alizarin/15 text-alizarin" },
  recommended: { label: "প্রস্তাবিত", cls: "border-amber/50 bg-amber/15 text-amber" },
  optional: { label: "ঐচ্ছিক", cls: "border-white/15 bg-white/5 text-white/50" },
};

function SecretCard({ s }: { s: SecretView }) {
  const badge = BADGE[s.requirement];
  return (
    <details
      className={`group rounded-xl border bg-panel/50 ${
        s.satisfied ? "border-white/10" : "border-alizarin/40"
      }`}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
            s.present
              ? "bg-lime/20 text-lime"
              : s.requirement === "required"
                ? "bg-alizarin/20 text-alizarin"
                : "bg-white/8 text-white/40"
          }`}
        >
          {s.present ? "✓" : s.requirement === "required" ? "!" : "–"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <code className="font-mono-x text-[12.5px] font-bold text-white">
              {s.name}
            </code>
            <span
              className={`rounded-full border px-2 py-0.5 font-mono-x text-[9px] tracking-wide uppercase ${badge.cls}`}
            >
              {badge.label}
            </span>
            {s.present && (
              <span className="rounded-full border border-lime/30 bg-lime/10 px-2 py-0.5 font-mono-x text-[9px] text-lime">
                সেট হয়েছে
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-[12.5px] text-white/55">{s.labelBn}</span>
        </span>
        <span className="shrink-0 font-mono-x text-[11px] text-white/30 group-open:rotate-90">
          ▸
        </span>
      </summary>

      <div className="space-y-4 border-t border-white/8 px-4 py-4">
        <p className="text-[13px] leading-relaxed text-white/75">{s.purposeBn}</p>

        <div>
          <p className="font-mono-x text-[10px] tracking-[0.2em] text-white/40 uppercase">
            যেভাবে পাবেন
          </p>
          <ol className="mt-2 space-y-2">
            {s.howToBn.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-white/80">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/8 font-mono-x text-[10px] text-white/60">
                  {i + 1}
                </span>
                <span className="whitespace-pre-wrap">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {s.dashboardUrl && (
          <ExternalLink
            href={s.dashboardUrl}
            className="inline-block border border-white/20 px-4 py-2 text-[12px] font-bold text-white transition-colors hover:border-alizarin hover:bg-alizarin"
          >
            {s.dashboardLabelBn ?? "ড্যাশবোর্ড খুলুন"} ↗
          </ExternalLink>
        )}

        <div>
          <p className="font-mono-x text-[10px] tracking-[0.2em] text-white/40 uppercase">
            .env লাইন
          </p>
          <pre className="mt-1.5 overflow-x-auto border border-white/10 bg-black/40 p-3 font-mono-x text-[11.5px] leading-relaxed whitespace-pre-wrap text-lime">
            {s.envExample}
          </pre>
        </div>

        {s.costNoteBn && (
          <p className="text-[12.5px] text-white/55">
            <span className="font-bold text-white/70">খরচ: </span>
            {s.costNoteBn}
          </p>
        )}

        <p className="border-l-2 border-alizarin/50 pl-3 text-[12.5px] text-white/60">
          <span className="font-bold text-alizarin">না দিলে: </span>
          {s.ifMissingBn}
        </p>

        <p className="text-[11.5px] text-white/40">
          {s.present && s.updatedAt
            ? `সর্বশেষ হালনাগাদ: ${new Date(s.updatedAt).toLocaleString("bn-BD")}`
            : "এখনো GitHub-এ সেট করা হয়নি।"}
        </p>
      </div>
    </details>
  );
}

export function SetupGuide({
  secrets,
  manualRun,
  lastRun,
  preflightBlocked,
}: {
  secrets: SecretView[];
  manualRun: {
    configured: boolean;
    method: string;
    repo: string | null;
    hasTriggerToken: boolean;
    hasRunnerUrl: boolean;
  };
  lastRun: { status: string; error: string | null; started_at: string | null } | null;
  preflightBlocked: boolean;
}) {
  const missingRequired = secrets.filter((s) => s.requirement === "required" && !s.satisfied);
  const allReady = missingRequired.length === 0;

  return (
    <div className="space-y-8">
      {/* ============ STATUS BANNER ============ */}
      <section
        className={`rounded-2xl border p-6 ${
          allReady
            ? "border-lime/40 bg-lime/[0.07]"
            : "border-alizarin/40 bg-alizarin/[0.07]"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-serif-bn text-[26px] leading-tight font-black text-white">
              {allReady ? "সেটআপ সম্পূর্ণ" : "সেটআপ অসম্পূর্ণ"}
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/70">
              {allReady ? (
                <>
                  সব আবশ্যক সিক্রেট GitHub-এ সেট আছে। নিচের ধাপগুলো শুধু ঐচ্ছিক উন্নতির জন্য।
                </>
              ) : (
                <>
                  <strong className="text-alizarin">
                    {missingRequired.length}টি আবশ্যক সিক্রেট অনুপস্থিত।
                  </strong>{" "}
                  নিচের কার্ডগুলো খুলে ধাপে ধাপে সেট করুন — পাইপলাইন এগুনো পর্যন্ত এটি লাগবেই।
                </>
              )}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono-x text-[34px] leading-none font-black text-white">
              {secrets.filter((s) => s.present).length}
              <span className="text-white/30">/{secrets.length}</span>
            </p>
            <p className="font-mono-x text-[9.5px] tracking-[0.18em] text-white/40 uppercase">
              secrets ready
            </p>
          </div>
        </div>

        {lastRun && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
              <span
                className={`rounded-full px-2.5 py-0.5 font-mono-x text-[10px] font-bold uppercase ${
                  lastRun.status === RUN_SUCCESS_STATUS
                    ? "bg-lime/20 text-lime"
                    : lastRun.status === "running"
                      ? "bg-amber/20 text-amber"
                      : "bg-alizarin/20 text-alizarin"
                }`}
              >
                {lastRun.status}
              </span>
              <span className="text-white/55">সর্বশেষ পাইপলাইন রান</span>
              {lastRun.started_at && (
                <span className="font-mono-x text-[11px] text-white/35">
                  {new Date(lastRun.started_at).toLocaleString("bn-BD")}
                </span>
              )}
            </div>
            {preflightBlocked && (
              <p className="mt-2 border-l-2 border-alizarin/50 pl-3 text-[12.5px] text-white/70">
                রানটি প্রিফ্লাইটে বন্ধ হয়েছে, অর্থাৎ উপরের সিক্রেটগুলোর একটি এখনো
                GitHub-এ নেই। ওয়ার্কফ্লো লগে ঠিক কোনটি নেই তা লেখা থাকে।
              </p>
            )}
            {lastRun.error && !preflightBlocked && (
              <p className="mt-2 border-l-2 border-white/20 pl-3 font-mono-x text-[11.5px] break-all text-white/45">
                {lastRun.error}
              </p>
            )}
          </div>
        )}
      </section>

      {/* ============ STEP 0: WHERE TO GO ============ */}
      <section className="rounded-2xl border border-white/10 bg-panel/50 p-6">
        <h3 className="font-mono-x text-[10px] tracking-[0.24em] text-lime uppercase">
          ধাপ ০ · কোথায় যাবেন
        </h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">
          সিক্রেট যোগ করার জায়গা একটাই — সেটি খুলে রাখুন, নিচের কার্ডগুলো থেকে মান
          সংগ্রহ করে একে একে সেখানে পেস্ট করবেন।
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ExternalLink
            href={ACTIONS_SECRETS_URL}
            className="rounded-lg border border-lime/40 bg-lime/10 p-4 transition-colors hover:bg-lime/15"
          >
            <p className="text-[13px] font-bold text-lime">Repository Secrets (প্রধান জায়গা)</p>
            <p className="mt-1 font-mono-x text-[11px] break-all text-white/50">
              {ACTIONS_SECRETS_URL}
            </p>
            <p className="mt-2 text-[12px] text-white/60">
              এখানে "New repository secret" বাটনে ক্লিক করে নাম ও মান দুটোই পেস্ট করুন।
            </p>
          </ExternalLink>
          <ExternalLink
            href={ACTIONS_VARS_URL}
            className="rounded-lg border border-white/15 bg-white/5 p-4 transition-colors hover:border-white/30"
          >
            <p className="text-[13px] font-bold text-white/70">Repository Variables (ঐচ্ছিক টিউনিং)</p>
            <p className="mt-1 font-mono-x text-[11px] break-all text-white/50">
              {ACTIONS_VARS_URL}
            </p>
            <p className="mt-2 text-[12px] text-white/60">
              MAX_POSTS_PER_RUN, ARCHIVE_RETENTION_DAYS ইত্যাদি সংখ্যা টিউনিং এখানে যায়।
              এগুলো সিক্রেট নয়, তাই গোপন রাখার দরকার নেই।
            </p>
          </ExternalLink>
        </div>
        <p className="mt-4 text-[12.5px] text-white/50">
          ডেস্ক অ্যাপ ব্যবহার করলে হাতে কাজ কম: সেখানে{" "}
          <span className="font-bold text-white/70">Settings → GitHub Actions Secrets</span>{" "}
          থেকে ভল্টের মানগুলো এক ক্লিকে GitHub-এ পাঠানো যায়, আর নিচে সেট হয়েছে কি না
          সরাসরি দেখা যায়।
        </p>
      </section>

      {/* ============ SECRET CARDS ============ */}
      <section className="space-y-3">
        <h3 className="font-mono-x text-[10px] tracking-[0.24em] text-white/40 uppercase">
          ধাপ ১ · প্রতিটি সিক্রেট বিস্তারিত
        </h3>
        {secrets.map((s) => (
          <SecretCard key={s.name} s={s} />
        ))}
      </section>

      {/* ============ STEP 2: MANUAL RUN ============ */}
      <section className="rounded-2xl border border-white/10 bg-panel/50 p-6">
        <h3 className="font-mono-x text-[10px] tracking-[0.24em] text-lime uppercase">
          ধাপ ২ · ওয়েবসাইটের "Run pipeline" বাটন
        </h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">
          ড্যাশবোর্ডের বাটনটি GitHub-কে সরাসরি স্ক্র্যাপ চালু করতে বলে। এর জন্য সিক্রেট
          Actions-এ নয়, Vercel-এর Environment Variables-এ বসাতে হয়।
        </p>

        <div
          className={`mt-4 rounded-lg border p-4 ${
            manualRun.configured
              ? "border-lime/40 bg-lime/10"
              : "border-amber/40 bg-amber/10"
          }`}
        >
          <p className="text-[13px] font-bold text-white">
            {manualRun.configured
              ? `✓ কনফিগার্ড (${manualRun.method})`
              : "✕ এখনো কনফিগার্ড নয়"}
          </p>
          <p className="mt-1 text-[12.5px] text-white/65">
            {manualRun.configured ? (
              <>
                ড্যাশবোর্ডের বাটন এখন কাজ করবে। লক্ষ্য রিপো:{" "}
                <code className="font-mono-x text-lime">{manualRun.repo}</code>
              </>
            ) : (
              <>
                এখন বাটনটি চাপলে "রানার কনফিগার্ড নেই" বার্তা দেবে। নিচের দুটি ভ্যারিয়েবল
                Vercel-এ যোগ করলেই ঠিক হয়ে যাবে।
              </>
            )}
          </p>
        </div>

        {!manualRun.configured && (
          <div className="mt-4 space-y-3">
            <ol className="space-y-2">
              {[
                "github.com → আপনার প্রোফাইল → Settings → Developer settings → Personal access tokens → Tokens (classic)",
                "Generate new token (classic) চাপুন, scope-এ repo টিক দিন (repository_dispatch পাঠাতে এটি লাগে)",
                "টোকেনটি কপি করে রাখুন — একবারই দেখা যাবে",
                "Vercel → আপনার প্রজেক্ট → Settings → Environment Variables",
                "প্রথম ভ্যারিয়েবল: নাম GH_TRIGGER_TOKEN, মান ghp_ দিয়ে শুরু টোকেন",
                "দ্বিতীয় ভ্যারিয়েবল: নাম GH_REPO, মান bugsfreeweb/Hoichoi",
                "Environment: Production টিক দিন → Save",
                "পরিবর্তন কার্যকর করতে Vercel-এ নতুন ডিপ্লয় লাগবে",
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-white/80">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/8 font-mono-x text-[10px] text-white/60">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <ExternalLink
              href={NEW_TOKEN_URL}
              className="inline-block border border-white/20 px-4 py-2 text-[12px] font-bold text-white transition-colors hover:border-alizarin hover:bg-alizarin"
            >
              নতুন PAT তৈরি করুন ↗
            </ExternalLink>
          </div>
        )}
      </section>

      {/* ============ STEP 3: VERIFY ============ */}
      <section className="rounded-2xl border border-white/10 bg-panel/50 p-6">
        <h3 className="font-mono-x text-[10px] tracking-[0.24em] text-lime uppercase">
          ধাপ ৩ · যাচাই
        </h3>
        <ol className="mt-3 space-y-2">
          {[
            "সব সিক্রেট যোগ হলে এই পেজের উপরের সবুজ ব্যানার দেখা যাবে।",
            "GitHub → এই রিপোজিটরির Actions ট্যাব → Pipeline cron → Run workflow চাপে ম্যানুয়ালি চালান।",
            "লগে 'Preflight — required secrets' ধাপটি সবুজ হলে কনফিগারেশন ঠিক আছে।",
            "লগে 'Run scraping pipeline' শেষে success দেখালে কাজ হয়ে গেছে।",
            "নতুন পোস্ট সাইটে দেখা না গেলে VERCEL_DEPLOY_HOOK_URL সেট আছে কি না দেখুন।",
          ].map((step, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-white/80">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime/15 font-mono-x text-[10px] text-lime">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <Link
          href="/admin/logs"
          className="mt-4 inline-block border border-white/20 px-4 py-2 text-[12px] font-bold text-white transition-colors hover:border-lime hover:bg-lime hover:text-ink"
        >
          রান লগ দেখুন →
        </Link>
      </section>

      {/* ============ SAFETY ============ */}
      <section className="rounded-2xl border border-alizarin/30 bg-alizarin/[0.05] p-6">
        <h3 className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">
          নিরাপত্তা
        </h3>
        <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-white/75">
          <li>• কখনো কোনো সিক্রেটের মান গিট-এ কমিট, চ্যাটে বা ইমেইলে পাঠাবেন না।</li>
          <li>• FB_SESSION_COOKIE হলো আপনার ফেসবুক লগইন — এটি চুরি হলে অ্যাকাউন্ট ঝুঁকিতে পড়বে। শেয়ার করবেন না।</li>
          <li>• Turso টোকেন ও LLM কী একবার দেখায়, পরে আর দেখায় না — সেদিনই সেভ করে রাখুন।</li>
          <li>• সিক্রেট বদলাতে চাইলে GitHub-এ ডিলিট করে নতুন করে যোগ করুন; এডিট করা যায় না।</li>
          <li>• ডেস্ক অ্যাপের ভল্ট AES-256 দিয়ে এনক্রিপ্ট করা, এবং কখনো রিপোতে যায় না।</li>
        </ul>
      </section>
    </div>
  );
}
