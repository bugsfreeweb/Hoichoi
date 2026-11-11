"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, RefreshCw, Send } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useToast } from "@/components/admin/ui/toast";
import { PageHeading } from "@/components/admin/ui/PageHeader";

interface MailStatus {
  ok: boolean;
  mail: { configured: boolean; transport: "resend" | "smtp" | "none"; from: string; reason: string | null };
  recent: Array<{ kind: string; email: string; createdAt: string; used: boolean; expiresAt: string }>;
}

/**
 * Mail & recovery settings.
 *
 * There was no way to see whether outbound mail worked, so "forgot password"
 * could fail silently. This panel reports the active transport, sends a real
 * test message, and issues advertiser reset links (surfacing the link inline when
 * no transport is configured, so a fresh install is never locked out).
 */
export function MailSection() {
  const toast = useToast();
  const [status, setStatus] = useState<MailStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await adminFetch<MailStatus>("/api/admin/mail");
      setStatus(data);
    } catch (err) {
      toast.error("মেইল স্ট্যাটাস আনা যায়নি", (err as Error).message);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendTest() {
    setBusy(true);
    const id = toast.busy("টেস্ট ইমেইল পাঠানো হচ্ছে…", testTo || "লগইন করা অ্যাডমিনের ঠিকানায়");
    try {
      const res = await adminFetch<{ ok: boolean; transport: string; to: string }>("/api/admin/mail", {
        method: "POST",
        body: JSON.stringify({ action: "test", to: testTo || undefined }),
      });
      toast.success("টেস্ট ইমেইল পাঠানো হয়েছে", `${res.transport.toUpperCase()} → ${res.to}`);
      await load();
    } catch (err) {
      toast.error("টেস্ট ইমেইল ব্যর্থ", (err as Error).message);
    } finally {
      toast.dismiss(id);
      setBusy(false);
    }
  }

  async function issueReset() {
    setBusy(true);
    setDevLink(null);
    const id = toast.busy("রিসেট লিংক তৈরি হচ্ছে…", resetEmail || "ইমেইল দিন");
    try {
      const res = await adminFetch<{ ok: boolean; sent: boolean; devLink: string | null; error: string | null }>(
        "/api/admin/mail",
        { method: "POST", body: JSON.stringify({ action: "reset", kind: "advertiser", email: resetEmail }) },
      );
      if (res.sent) toast.success("রিসেট ইমেইল পাঠানো হয়েছে", resetEmail);
      else if (res.devLink) {
        setDevLink(res.devLink);
        toast.info("মেইল কনফিগার নেই — লিংকটি কপি করে দিন", resetEmail);
      } else toast.error("রিসেট পাঠানো যায়নি", res.error ?? "");
      await load();
    } catch (err) {
      toast.error("রিসেট লিংক তৈরি ব্যর্থ", (err as Error).message);
    } finally {
      toast.dismiss(id);
      setBusy(false);
    }
  }

  const configured = status?.mail.configured ?? false;

  return (
    <div>
      <PageHeading
        emoji="✉️"
        kicker="MAIL · RECOVERY"
        title="মেইল ও অ্যাকাউন্ট রিকভারি"
        description="পাসওয়ার্ড রিসেট, অ্যাডমিন লগইন কোড ও টেস্ট ইমেইল — সব এক জায়গা থেকে।"
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 border border-ink/25 px-3 py-2 text-[11px] font-bold text-ink hover:border-ink"
          >
            <RefreshCw size={12} /> রিফ্রেশ
          </button>
        }
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="border border-ink/20 bg-card p-5">
          <p className="eyebrow">▚ TRANSPORT</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${configured ? "bg-lime" : "bg-alizarin"}`}
              aria-hidden
            />
            <p className="font-serif-bn text-[17px] font-bold text-ink">
              {configured ? `${status?.mail.transport.toUpperCase()} সক্রিয়` : "কোনো ট্রান্সপোর্ট নেই"}
            </p>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
            {configured
              ? `প্রেরক: ${status?.mail.from}`
              : status?.mail.reason ?? "RESEND_API_KEY অথবা SMTP_URL সেট করুন।"}
          </p>
          <ul className="mt-3 space-y-1.5 text-[11.5px] text-ink-soft">
            <li><code className="font-mono-x">RESEND_API_KEY</code> — Vercel/serverless-এ সবচেয়ে সহজ</li>
            <li><code className="font-mono-x">SMTP_URL</code> — <span className="font-mono-x text-[10.5px]">smtp://user:pass@smtp.host:587</span></li>
            <li><code className="font-mono-x">MAIL_FROM</code> — প্রেরকের নাম/ঠিকানা (ঐচ্ছিক)</li>
            <li><code className="font-mono-x">NEXT_PUBLIC_SITE_URL</code> — মেইলের লিংকের বেস URL</li>
          </ul>
          <div className="mt-4 space-y-2">
            <label className="block">
              <span className="field-label">টেস্ট প্রাপক</span>
              <input
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="খালি রাখলে আপনার নিজের ইমেইলে যাবে"
                className="mt-1 w-full border border-ink/25 bg-paper px-3 py-2 text-[13px] text-ink outline-none focus:border-alizarin"
              />
            </label>
            <button
              type="button"
              onClick={() => void sendTest()}
              disabled={busy}
              className="inline-flex items-center gap-2 bg-ink px-4 py-2.5 text-[12px] font-bold text-paper hover:bg-alizarin disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} টেস্ট ইমেইল পাঠান
            </button>
          </div>
        </section>

        <section className="border border-ink/20 bg-card p-5">
          <p className="eyebrow">▚ RECOVERY</p>
          <h2 className="mt-1 font-serif-bn text-[17px] font-bold text-ink">বিজ্ঞাপনদাতার রিসেট লিংক</h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
            লিংক ৬০ মিনিট কার্যকর, একবারই ব্যবহারযোগ্য। নতুন লিংক তৈরি করলে আগের অসম্পূর্ণ লিংক বাতিল হয়।
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="client@example.com"
              className="min-w-0 flex-1 border border-ink/25 bg-paper px-3 py-2 text-[13px] text-ink outline-none focus:border-alizarin"
            />
            <button
              type="button"
              onClick={() => void issueReset()}
              disabled={busy || !resetEmail.trim()}
              className="inline-flex items-center justify-center gap-2 border border-ink/30 px-4 py-2 text-[12px] font-bold text-ink hover:border-ink disabled:opacity-50"
            >
              <Mail size={13} /> পাঠান
            </button>
          </div>
          {devLink && (
            <div className="mt-3 border border-amberx/40 bg-amberx/10 p-3">
              <p className="font-mono-x text-[9px] tracking-[0.14em] text-ink-soft uppercase">ম্যানুয়াল লিংক</p>
              <p className="mt-1 break-all font-mono-x text-[11px] text-ink">{devLink}</p>
            </div>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
            অ্যাডমিন অ্যাকাউন্ট কোড দিয়ে লগইন করে — তাই অ্যাডমিনের জন্য{" "}
            <a href="/admin/forgot" className="font-bold text-alizarin hover:underline">/admin/forgot</a> থেকে ইমেইলে কোড
            পাঠানো হয়।
          </p>
        </section>
      </div>

      <section className="mt-4 border border-ink/20 bg-card p-5">
        <p className="eyebrow">▚ RECENT RESETS</p>
        {!status || status.recent.length === 0 ? (
          <p className="mt-2 text-[12px] text-ink-soft">এখনো কোনো রিসেট অনুরোধ নেই।</p>
        ) : (
          <div className="mt-3 divide-y divide-ink/10">
            {status.recent.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 py-2 text-[12px]">
                <span className="font-mono-x text-[9.5px] uppercase text-ink-soft">{r.kind}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{r.email}</span>
                <span className={`px-2 py-0.5 text-[9.5px] font-bold uppercase ${r.used ? "bg-ink/10 text-ink-soft" : "bg-lime text-paper"}`}>
                  {r.used ? "ব্যবহৃত" : "সক্রিয়"}
                </span>
                <span className="font-mono-x text-[10px] text-ink-soft">
                  {new Date(r.createdAt).toLocaleString("bn-BD", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
