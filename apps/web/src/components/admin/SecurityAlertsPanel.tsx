"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useBi } from "@/components/i18n/LocaleProvider";
import { safeHttpUrl } from "@/lib/safe-url";

type AlertSeverity =
  "critical" | "high" | "medium" | "low" | "warning" | "note";

interface CodeAlert {
  number: number;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  path: string;
  startLine: number;
  title: string;
  description: string;
  htmlUrl: string;
  createdAt: string;
}

type DismissReason = "false positive" | "won't fix" | "used in tests";

const DISMISS_REASONS: Array<{
  value: DismissReason;
  bn: string;
  en: string;
}> = [
  { value: "false positive", bn: "ভুল শনাক্ত", en: "False positive" },
  { value: "won't fix", bn: "ঠিক করা হবে না", en: "Won't fix" },
  { value: "used in tests", bn: "টেস্ট কোডে ব্যবহৃত", en: "Used in tests" },
];

interface Payload {
  ok: boolean;
  configured: boolean;
  repo: string | null;
  open: number;
  bySeverity: Record<string, number>;
  alerts: CodeAlert[];
  fetchedAt: string;
  cached: boolean;
  truncated: boolean;
  error?: string;
}

const SEV: Record<AlertSeverity, { bn: string; en: string; cls: string }> = {
  critical: {
    bn: "সংকট",
    en: "critical",
    cls: "bg-alizarin/15 text-alizarin border-alizarin/40",
  },
  high: {
    bn: "উচ্চ",
    en: "high",
    cls: "bg-orange-500/15 text-orange-700 border-orange-500/40",
  },
  medium: {
    bn: "মাঝারি",
    en: "medium",
    cls: "bg-amberx/15 text-amber-700 border-amberx/40",
  },
  low: {
    bn: "নিম্ন",
    en: "low",
    cls: "bg-cat-blue/15 text-cat-blue border-cat-blue/40",
  },
  warning: {
    bn: "সতর্কতা",
    en: "warning",
    cls: "bg-amberx/15 text-amber-700 border-amberx/40",
  },
  note: { bn: "নোট", en: "note", cls: "bg-ink/10 text-ink-soft border-ink/20" },
};

/**
 * Rule → what actually fixes it. The alert title from GitHub is accurate but
 * abstract ("Polynomial regular expression used on uncontrolled data"); an
 * operator who has not memorised the CodeQL suite needs the next action, not a
 * link to a rule catalogue.
 */
const FIX_HINT: Record<string, { bn: string; en: string }> = {
  "js/polynomial-redos": {
    bn: "রেগুলার এক্সপ্রেশনের পুনরাবৃত্ত অংশে সীমা দিন (যেমন \s{0,64}) অথবা লুপ/trim() দিয়ে বদলান।",
    en: "Bound the repeating part of the regex (e.g. \s{0,64}) or replace it with a loop/trim().",
  },
  "js/regex/missing-regexp-anchor": {
    bn: "হোস্ট/ইউআরএল মেলানোর regex-এ ^ ও $ অ্যাঙ্কর দিন, নইলে সাবস্ট্রিং মিলে যাবে।",
    en: "Anchor host/URL regexes with ^ and $, otherwise substrings match.",
  },
  "js/incomplete-url-substring-sanitization": {
    bn: "includes() দিয়ে ডোমেইন যাচাই করবেন না — new URL(value).hostname মিলিয়ে দেখুন।",
    en: "Do not validate a domain with includes(); compare new URL(value).hostname.",
  },
  "js/xss-through-dom": {
    bn: "src/href-এ যাওয়ার আগে http(s)/same-origin/data:image allowlist দিয়ে যাচাই করুন।",
    en: "Validate src/href against an http(s), same-origin or data:image allowlist before use.",
  },
  "actions/missing-workflow-permissions": {
    bn: "ওয়ার্কফ্লোতে permissions: contents: read (বা {}) যোগ করুন।",
    en: "Add permissions: contents: read (or {}) to the workflow.",
  },
  "js/insecure-randomness": {
    bn: "নিরাপত্তার জন্য Math.random() নয় — crypto.getRandomValues / randomInt ব্যবহার করুন।",
    en: "Security values must use crypto.getRandomValues / randomInt, not Math.random().",
  },
  "js/insecure-temporary-file": {
    bn: "নির্দিষ্ট টেম্প নামের বদলে fs.mkdtempSync() দিয়ে নতুন ডিরেক্টরি বানান।",
    en: "Use fs.mkdtempSync() for a fresh directory instead of a predictable temp name.",
  },
  "js/file-access-to-http": {
    bn: "ফাইল পড়ে রিমোটে পাঠানোর আগে হোস্ট allowlist ও ইউজার-নিয়ন্ত্রিত পাথ বন্ধ করুন।",
    en: "Before sending file bytes to a remote host, allowlist the host and stop user-controlled paths.",
  },
  "js/http-to-file-access": {
    bn: "রিমোট থেকে নামানো ফাইলের নাম নিজে তৈরি করুন; URL থেকে পাথ নেবেন না।",
    en: "Generate the downloaded filename yourself; never derive the path from the URL.",
  },
  "rust/hard-coded-cryptographic-value": {
    bn: "কী/ননস OsRng বা getrandom দিয়ে তৈরি করুন, স্থির অ্যারে দিয়ে নয়।",
    en: "Generate keys/nonces with OsRng or getrandom, not a fixed array.",
  },
};

function num(v: number, en: boolean): string {
  return en
    ? String(v)
    : String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
}

function age(iso: string, en: boolean): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (mins < 60) return en ? `${mins}m` : `${num(mins, en)} মিনিট`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return en ? `${hours}h` : `${num(hours, en)} ঘণ্টা`;
  return en
    ? `${Math.round(hours / 24)}d`
    : `${num(Math.round(hours / 24), en)} দিন`;
}

export default function SecurityAlertsPanel({ canSee }: { canSee: boolean }) {
  const b = useBi();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drafts, setDrafts] = useState<
    Record<
      number,
      { reason: DismissReason; comment: string; busy: boolean; msg?: string }
    >
  >({});

  const load = useCallback(
    async (refresh = false): Promise<void> => {
      setLoading(true);
      try {
        const res = await fetch(
          refresh
            ? "/api/admin/security-alerts?refresh=1"
            : "/api/admin/security-alerts",
          { cache: "no-store" },
        );
        setData((await res.json()) as Payload);
      } catch {
        setData({
          ok: false,
          configured: true,
          repo: null,
          open: 0,
          bySeverity: {},
          alerts: [],
          fetchedAt: new Date().toISOString(),
          cached: false,
          truncated: false,
          error: b("অ্যালার্ট আনা যায়নি।", "Could not load alerts."),
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [b],
  );

  useEffect(() => {
    if (canSee) void load();
  }, [canSee, load]);

  const draftFor = (number: number) =>
    drafts[number] ?? {
      reason: "won't fix" as DismissReason,
      comment: "",
      busy: false,
    };

  const setDraft = (
    number: number,
    patch: Partial<{ reason: DismissReason; comment: string; busy: boolean; msg: string }>,
  ) => {
    setDrafts((all) => ({
      ...all,
      [number]: { ...draftFor(number), ...patch },
    }));
  };

  const dismiss = async (number: number) => {
    const draft = draftFor(number);
    setDraft(number, { busy: true, msg: undefined });
    try {
      const res = await fetch("/api/admin/security-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number,
          reason: draft.reason,
          comment: draft.comment,
        }),
      });
      const j = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !j?.ok) {
        setDraft(number, {
          busy: false,
          msg: j?.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              open: Math.max(0, prev.open - 1),
              alerts: prev.alerts.filter((a) => a.number !== number),
            }
          : prev,
      );
      setDrafts((all) => {
        const next = { ...all };
        delete next[number];
        return next;
      });
      void load(true);
    } catch (e) {
      setDraft(number, {
        busy: false,
        msg: e instanceof Error ? e.message : b("Dismiss ব্যর্থ", "Dismiss failed"),
      });
    }
  };

  if (!canSee) return null;

  if (loading && !data) {
    return (
      <div className="rounded-xl border border-ink/15 bg-paper p-4 font-mono-x text-[11px] text-ink-soft">
        {b("কোড-স্ক্যানিং অ্যালার্ট আনা হচ্ছে…", "Loading code-scanning alerts…")}
      </div>
    );
  }

  const repo = data?.repo;
  const repoUrl = repo
    ? `https://github.com/${repo}/security/code-scanning`
    : null;

  return (
    <div className="overflow-hidden rounded-xl border border-ink/15 bg-paper">
      <div className="flex flex-wrap items-center gap-3 border-b border-ink/10 px-4 py-3">
        <ShieldAlert size={16} className="text-ink-soft" />
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-ink">
            {b("কোড-স্ক্যানিং অ্যালার্ট", "Code-scanning alerts")}
            {data?.ok && data.open > 0 ? (
              <span className="ml-2 rounded-full bg-alizarin px-2 py-0.5 font-mono-x text-[10px] font-bold text-white">
                {num(data.open, false)}
              </span>
            ) : null}
          </p>
          <p className="font-mono-x text-[9.5px] text-ink-soft">
            {repo ? `${repo} · ` : ""}
            {data?.fetchedAt
              ? b(
                  `সর্বশেষ দেখা ${age(data.fetchedAt, false)} আগে`,
                  `checked ${age(data.fetchedAt, true)} ago`,
                )
              : ""}
            {data?.cached ? b(" · ক্যাশ", " · cached") : ""}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-ink/25 px-2 py-1 font-mono-x text-[9.5px] font-bold text-ink-soft hover:border-ink hover:text-ink"
            >
              {b("GitHub-এ খুলুন", "Open on GitHub")}
              <ExternalLink size={10} />
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              void load(true);
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-1 rounded-md border border-ink/25 px-2 py-1 font-mono-x text-[9.5px] font-bold text-ink-soft hover:border-ink hover:text-ink disabled:opacity-50"
          >
            <RefreshCw size={10} className={refreshing ? "animate-spin" : ""} />
            {b("রিফ্রেশ", "Refresh")}
          </button>
        </div>
      </div>

      {!data?.configured && (
        <div className="space-y-2 border-b border-ink/10 bg-amberx/5 px-4 py-3 text-[11.5px] text-ink-soft">
          <p className="font-semibold text-ink">
            {b("এখনো GitHub-এর সাথে যুক্ত নয়।", "Not connected to GitHub yet.")}
          </p>
          <p>
            {b(
              "Vercel → Settings → Environment Variables-এ GH_REPO এবং GH_SECURITY_TOKEN যোগ করুন। টোকেনে Code scanning alerts: read অনুমতি থাকতে হবে। GH_TRIGGER_TOKEN থাকলে সেটিও ব্যবহার করা হবে।",
              "Add GH_REPO and GH_SECURITY_TOKEN in Vercel → Settings → Environment Variables. The token needs Code scanning alerts: read. GH_TRIGGER_TOKEN is used as a fallback.",
            )}
          </p>
          {data?.error && (
            <p className="font-mono-x text-[10px] text-alizarin">
              {data.error}
            </p>
          )}
        </div>
      )}

      {data?.configured && data.error && (
        <div className="border-b border-ink/10 bg-alizarin/5 px-4 py-3 text-[11.5px] text-alizarin">
          {data.error}
        </div>
      )}

      {data?.ok && data.open === 0 && (
        <div className="flex items-center gap-2 px-4 py-5 text-[12px] text-emerald-700">
          <CheckCircle2 size={15} />
          {b(
            "কোনো খোলা কোড-স্ক্যানিং অ্যালার্ট নেই।",
            "No open code-scanning alerts.",
          )}
        </div>
      )}

      {data?.ok && data.open > 0 && (
        <ul className="divide-y divide-ink/10">
          {data.alerts.slice(0, 20).map((a) => {
            const sev = SEV[a.severity] ?? SEV.note;
            const hint = FIX_HINT[a.ruleId];
            return (
              <li key={`${a.ruleId}-${a.number}`} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono-x text-[9px] font-bold uppercase ${sev.cls}`}
                  >
                    {b(sev.bn, sev.en)}
                  </span>
                  <span className="font-mono-x text-[10.5px] font-semibold text-ink">
                    {a.ruleId}
                  </span>
                  <span className="font-mono-x text-[9.5px] text-ink-soft">
                    #{a.number}
                  </span>
                  {a.createdAt && (
                    <span className="ml-auto font-mono-x text-[9.5px] text-ink-soft">
                      {age(a.createdAt, false)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed font-semibold text-ink">
                  {a.title}
                </p>
                {a.path && (
                  <p className="font-mono-x text-[10px] text-ink-soft">
                    {a.path}
                    {a.startLine ? `:${a.startLine}` : ""}
                  </p>
                )}
                {a.description && (
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                    {a.description}
                  </p>
                )}
                {hint && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink">
                    <AlertTriangle
                      size={12}
                      className="mt-0.5 shrink-0 text-amberx"
                    />
                    {b(hint.bn, hint.en)}
                  </p>
                )}
                {a.htmlUrl && (
                  <a
                    href={safeHttpUrl(a.htmlUrl) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 font-mono-x text-[10px] font-bold text-alizarin underline"
                  >
                    {b("অ্যালার্টটি খুলে ঠিক করুন", "Open the alert and fix it")}
                    <ExternalLink size={10} />
                  </a>
                )}

                {(() => {
                  const draft = draftFor(a.number);
                  return (
                    <div className="mt-2 border-t border-ink/10 pt-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <select
                          aria-label={b("Dismiss করার কারণ", "Dismiss reason")}
                          value={draft.reason}
                          onChange={(e) =>
                            setDraft(a.number, {
                              reason: e.target.value as DismissReason,
                              msg: undefined,
                            })
                          }
                          style={{
                            colorScheme: "light",
                            backgroundColor: "#ffffff",
                            color: "#141414",
                          }}
                          className="border border-ink/25 px-2 py-1 text-[10.5px] outline-none focus:border-ink"
                        >
                          {DISMISS_REASONS.map((r) => (
                            <option
                              key={r.value}
                              value={r.value}
                              style={{
                                backgroundColor: "#ffffff",
                                color: "#141414",
                              }}
                            >
                              {b(r.bn, r.en)}
                            </option>
                          ))}
                        </select>
                        <input
                          value={draft.comment}
                          onChange={(e) =>
                            setDraft(a.number, {
                              comment: e.target.value,
                              msg: undefined,
                            })
                          }
                          maxLength={280}
                          placeholder={b(
                            "মন্তব্য (ঐচ্ছিক)",
                            "Comment (optional)",
                          )}
                          style={{
                            backgroundColor: "#ffffff",
                            color: "#141414",
                          }}
                          className="min-w-0 flex-1 border border-ink/25 px-2 py-1 text-[10.5px] outline-none placeholder:text-[#6b6250] focus:border-ink"
                        />
                        <button
                          type="button"
                          onClick={() => void dismiss(a.number)}
                          disabled={draft.busy}
                          className="border border-ink/30 bg-ink px-2 py-1 text-[10px] font-bold text-paper hover:bg-alizarin disabled:cursor-wait disabled:opacity-50"
                        >
                          {draft.busy
                            ? b("বন্ধ হচ্ছে…", "Dismissing…")
                            : b("GitHub-এ বন্ধ করুন", "Dismiss on GitHub")}
                        </button>
                      </div>
                      <p className="mt-1 text-[9.5px] leading-relaxed text-ink-soft">
                        {b(
                          "এটি কোড ঠিক করে না — কারণসহ অ্যালার্টটি GitHub-এ dismissed হিসেবে বন্ধ হয় এবং এই তালিকা থেকে সরে যায়।",
                          "This does not fix the code — it marks the alert dismissed on GitHub with the reason and removes it from this list.",
                        )}
                      </p>
                      {draft.msg && (
                        <p className="mt-1 font-mono-x text-[9.5px] text-alizarin">
                          {draft.msg}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </li>
            );
          })}
        </ul>
      )}

      {data?.truncated && (
        <p className="border-t border-ink/10 px-4 py-2 font-mono-x text-[9.5px] text-ink-soft">
          {b(
            "প্রথম ১০০টি দেখানো হচ্ছে — GitHub-এ বাকিগুলো দেখুন।",
            "Showing the first 100 — see GitHub for the rest.",
          )}
        </p>
      )}
    </div>
  );
}
