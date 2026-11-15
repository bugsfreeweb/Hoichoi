"use client";

import { useCallback, useEffect, useState } from "react";
import { Laptop, LogOut, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";

/**
 * সেশন ও ডিভাইস ব্যবস্থাপনা।
 *
 * এক-বার ব্যবহারযোগ্য কোড দিয়ে লগইন হলে সেশন তৈরি হয় — কিন্তু আগে কোনও
 * স্ক্রিনে দেখা যেত না কোন ডিভাইস থেকে কে ঢুকেছে, কখন শেষবার ব্যবহার হয়েছে,
 * আর কত দিনে সেশনটি নিজে থেকে বন্ধ হবে। ৩০ দিনের সীমা কার্যকর করার সাথে
 * সাথে সেই দৃশ্যমানতাও দরকার, নাহলে চুরি হওয়া কুকি চিহ্নিত করা যায় না।
 */

interface SessionRow {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  device_name: string | null;
  device_os: string | null;
  app_version: string | null;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  revoked_reason: string | null;
  current: boolean;
}

interface Payload {
  scope: "self" | "all";
  currentId: string | null;
  sessions: SessionRow[];
}

const ROLE_BN: Record<string, string> = {
  admin: "অ্যাডমিন",
  editor: "সম্পাদক",
  moderator: "মডারেটর",
};

function when(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("bn-BD", { dateStyle: "short", timeStyle: "short" });
}

function daysLeft(expiresAt: string): number {
  const ms = Date.parse(expiresAt) - Date.now();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export default function SessionList({ canSeeAll }: { canSeeAll: boolean }) {
  const [data, setData] = useState<Payload | null>(null);
  const [scope, setScope] = useState<"self" | "all">("self");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const refresh = useCallback(async (nextScope: "self" | "all") => {
    setBusy(true);
    try {
      const url = nextScope === "all" ? "/api/admin/sessions?scope=all" : "/api/admin/sessions";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status === 403 ? "এই তালিকা দেখার অনুমতি নেই" : "সেশন লোড ব্যর্থ");
      setData((await res.json()) as Payload);
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh(scope);
  }, [refresh, scope]);

  const revoke = async (row: SessionRow) => {
    const label = `${row.device_name ?? "ডিভাইস"} (${row.device_os ?? "—"})`;
    if (!window.confirm(`${label} থেকে সাইন-ইন বাতিল করবেন? ওই ডিভাইস সাথে সাথে লগআউট হয়ে যাবে।`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "revoke", id: row.id }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "বাতিল করা যায়নি");
      await refresh(scope);
      flash("ok", "সেশন বাতিল হয়েছে");
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const revokeAll = async () => {
    if (!window.confirm("সব ডিভাইস থেকে সাইন-আউট করবেন? এই ডিভাইসেও আবার কোড দিয়ে লগইন করতে হবে।")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "revoke_all", keepSelf: false }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "ব্যর্থ");
      window.location.href = "/admin/login";
    } catch (e) {
      flash("err", (e as Error).message);
      setBusy(false);
    }
  };

  const active = (data?.sessions ?? []).filter((s) => !s.revoked_at);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void refresh(scope)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 border border-ink/25 bg-paper-deep px-3 py-1.5 font-mono-x text-[11px] font-bold text-ink disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> রিফ্রেশ
        </button>
        {canSeeAll && (
          <div className="inline-flex overflow-hidden border border-ink/25">
            <button
              type="button"
              onClick={() => setScope("self")}
              className={`px-3 py-1.5 font-mono-x text-[11px] font-bold ${scope === "self" ? "bg-ink text-paper" : "bg-paper-deep text-ink"}`}
            >
              আমার ডিভাইস
            </button>
            <button
              type="button"
              onClick={() => setScope("all")}
              className={`px-3 py-1.5 font-mono-x text-[11px] font-bold ${scope === "all" ? "bg-ink text-paper" : "bg-paper-deep text-ink"}`}
            >
              সব অ্যাডমিন
            </button>
          </div>
        )}
        <span className="font-mono-x text-[11px] text-ink-soft">
          সক্রিয়: {active.length} · সেশন ৩০ দিনে নিজে থেকে শেষ হয়, ৭ দিন নিষ্ক্রিয় থাকলে বন্ধ হয়
        </span>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => void revokeAll()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 border border-alizarin/50 px-3 py-1.5 font-mono-x text-[11px] font-bold text-alizarin disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" /> সব জায়গা থেকে সাইন-আউট
          </button>
        </div>
      </div>

      {msg && (
        <p className={`font-mono-x text-[11.5px] font-bold ${msg.type === "ok" ? "text-alizarin" : "text-alizarin"}`}>
          {msg.text}
        </p>
      )}

      {!data && <p className="font-mono-x text-[11.5px] text-ink-soft">লোড হচ্ছে…</p>}

      <div className="space-y-2.5">
        {(data?.sessions ?? []).map((s) => {
          const dead = Boolean(s.revoked_at);
          const left = daysLeft(s.expires_at);
          return (
            <div
              key={s.id}
              className={`flex flex-wrap items-center justify-between gap-3 border px-4 py-3 ${
                s.current ? "border-alizarin bg-paper-deep" : "border-ink/20 bg-paper-deep"
              } ${dead ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-ink-soft">
                  {(s.device_os ?? "").match(/Android|iOS/) ? (
                    <Smartphone className="h-4 w-4" />
                  ) : (
                    <Laptop className="h-4 w-4" />
                  )}
                </span>
                <div>
                  <p className="font-mono-x text-[12px] font-bold text-ink">
                    {s.device_name ?? "অজানা ডিভাইস"}
                    {s.device_os ? <span className="text-ink-soft"> · {s.device_os}</span> : null}
                    {s.current && <span className="ml-2 bg-ink px-1.5 py-0.5 text-[9px] font-bold text-paper">এই ডিভাইস</span>}
                  </p>
                  <p className="font-mono-x text-[10.5px] text-ink-soft">
                    {s.display_name ?? s.email} · {ROLE_BN[s.role] ?? s.role} · শুরু {when(s.created_at)}
                  </p>
                  <p className="font-mono-x text-[10.5px] text-ink-soft">
                    শেষ ব্যবহার {when(s.last_used_at)} ·{" "}
                    {dead ? `বাতিল (${s.revoked_reason ?? "—"})` : `আরও ${left} দিন`}
                  </p>
                </div>
              </div>
              {!dead && (
                <button
                  type="button"
                  onClick={() => void revoke(s)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 border border-ink/25 px-2.5 py-1.5 font-mono-x text-[10.5px] font-bold text-ink disabled:opacity-50"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> বাতিল
                </button>
              )}
            </div>
          );
        })}
      </div>

      {data && data.sessions.length === 0 && (
        <p className="font-mono-x text-[11.5px] text-ink-soft">কোনও সেশন নেই।</p>
      )}
    </div>
  );
}
