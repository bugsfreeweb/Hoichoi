import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useDeskLocale } from "../lib/locale";
import { listCodeScanningAlerts, type CodeScanningResult } from "../lib/github";
import { openAdmin } from "../lib/tauri";
import { safeHttpUrl } from "../lib/safe-url";

/**
 * Repository security findings in the desk, not just in GitHub.
 *
 * The desk is where the operator already starts the day; a scan that has been
 * red for a week should be visible here without opening a browser tab. This is a
 * direct GitHub read using the PAT already in the vault, so it needs no web
 * deployment token and no new endpoint. Failures are silent when the vault has
 * no GitHub credentials — the desk must not nag about an integration the
 * operator never configured.
 */

const POLL_MS = 5 * 60_000;

const SEV_COLOR: Record<string, string> = {
  critical: "bg-red-500/15 text-red-300 border-red-500/40",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  medium: "bg-amber-400/15 text-amber-200 border-amber-400/40",
  low: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  warning: "bg-amber-400/15 text-amber-200 border-amber-400/40",
  note: "bg-white/10 text-white/60 border-white/20",
};

function age(iso: string, en: boolean): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (mins < 60)
    return en
      ? `${mins}m`
      : `${String(mins).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d)} মিনিট`;
  const hours = Math.round(mins / 60);
  if (hours < 24)
    return en
      ? `${hours}h`
      : `${String(hours).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d)} ঘণ্টা`;
  return en
    ? `${Math.round(hours / 24)}d`
    : `${String(Math.round(hours / 24)).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d)} দিন`;
}

export default function SecurityBanner() {
  const { b, locale } = useDeskLocale();
  const en = locale === "en";
  const [data, setData] = useState<CodeScanningResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await listCodeScanningAlerts();
      setData(result);
      setError("");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // "not configured" is a setup choice, not a finding. Stay quiet.
      setError(message.includes("not configured") ? "" : message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  if (!data?.open && !error) return null;

  const repoUrl = data?.repo
    ? `https://github.com/${data.repo}/security/code-scanning`
    : "https://github.com";

  return (
    <div className="mx-3 mt-2 overflow-hidden rounded-lg border border-red-500/40 bg-red-500/10 text-[12px]">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <ShieldAlert size={15} className="shrink-0 text-red-300" />
        <p className="font-semibold text-red-100">
          {data?.open
            ? b(
                `${data.open}টি কোড-স্ক্যানিং অ্যালার্ট খোলা`,
                `${data.open} open code-scanning alerts`,
              )
            : b(
                "কোড-স্ক্যানিং অবস্থা পড়া যায়নি",
                "Could not read code-scanning status",
              )}
        </p>
        {data?.bySeverity.critical ? (
          <span className="rounded border border-red-400/50 px-1.5 py-0.5 font-mono-x text-[9px] font-bold text-red-200">
            {b(
              `${data.bySeverity.critical}টি সংকট`,
              `${data.bySeverity.critical} critical`,
            )}
          </span>
        ) : null}
        {error && (
          <span className="text-[10.5px] text-red-200/80">
            {error.slice(0, 140)}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded border border-red-400/40 px-2 py-1 font-mono-x text-[9.5px] font-bold text-red-100 hover:bg-red-500/20"
          >
            {open ? b("গোপন করুন", "Hide") : b("বিস্তারিত", "Details")}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded border border-red-400/40 p-1 text-red-100 hover:bg-red-500/20 disabled:opacity-50"
            aria-label={b("রিফ্রেশ", "Refresh")}
          >
            <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={() => void openAdmin(repoUrl)}
            className="inline-flex items-center gap-1 rounded border border-red-400/40 px-2 py-1 font-mono-x text-[9.5px] font-bold text-red-100 hover:bg-red-500/20"
          >
            {b("GitHub-এ ঠিক করুন", "Fix on GitHub")}
            <ExternalLink size={10} />
          </button>
        </div>
      </div>

      {open && data?.alerts.length ? (
        <ul className="max-h-64 divide-y divide-red-400/20 overflow-y-auto border-t border-red-400/20">
          {data.alerts.slice(0, 8).map((a) => (
            <li key={`${a.ruleId}-${a.number}`} className="px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded border px-1.5 py-0.5 font-mono-x text-[9px] font-bold uppercase ${SEV_COLOR[a.severity] ?? SEV_COLOR.note}`}
                >
                  {a.severity}
                </span>
                <span className="font-mono-x text-[10px] font-semibold text-red-100">
                  {a.ruleId}
                </span>
                <span className="font-mono-x text-[9.5px] text-red-200/70">
                  #{a.number}
                </span>
                <span className="ml-auto font-mono-x text-[9.5px] text-red-200/70">
                  {age(a.createdAt, en)}
                </span>
              </div>
              <p className="mt-0.5 leading-snug text-red-50/90">{a.title}</p>
              {a.path && (
                <p className="font-mono-x text-[9.5px] text-red-200/70">
                  {a.path}
                  {a.startLine ? `:${a.startLine}` : ""}
                </p>
              )}
              {a.htmlUrl && (
                <button
                  type="button"
                  onClick={() =>
                    void openAdmin(safeHttpUrl(a.htmlUrl) ?? repoUrl)
                  }
                  className="mt-1 inline-flex items-center gap-1 font-mono-x text-[9.5px] font-bold text-red-200 underline"
                >
                  {b("অ্যালার্টটি খুলুন", "Open the alert")}
                  <ExternalLink size={9} />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {open && data?.truncated ? (
        <p className="flex items-center gap-1 border-t border-red-400/20 px-3 py-1.5 font-mono-x text-[9px] text-red-200/70">
          <AlertTriangle size={10} />
          {b("প্রথম ১০০টি দেখানো হচ্ছে।", "Showing the first 100.")}
        </p>
      ) : null}
    </div>
  );
}
