"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Plus, RefreshCw, Trash2 } from "lucide-react";

/**
 * ক্রেডেনশিয়াল মেয়াদ ট্র্যাকিং।
 *
 * আসল সিক্রেট এখানে সংরক্ষণ হয় না — শুধু নাম আর মেয়াদের তারিখ। মেয়াদ শেষ হওয়ার
 * ৭ দিন আগে ডেইলি জব ইমেইল পাঠায়, আর এই তালিকা দেখায় কবে কার মেয়াদ শেষ হবে।
 */

interface Credential {
  id: string;
  name: string;
  scope: string;
  owner_email: string | null;
  expires_at: string;
  warn_days: number;
  notes: string | null;
  last_notified_at: string | null;
  status: { state: "ok" | "due" | "expired"; daysLeft: number; expiresAt: string | null };
}

const SCOPE_LABEL: Record<string, string> = {
  provider: "এআই প্রোভাইডার",
  storage: "স্টোরেজ",
  mail: "ইমেইল",
  vcs: "গিট/GitHub",
  infra: "ইনফ্রা",
  other: "অন্যান্য",
};

const STATE_LABEL = { ok: "ঠিক আছে", due: "মেয়াদ প্রায় শেষ", expired: "মেয়াদ শেষ" } as const;

function fmt(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value.slice(0, 10) : d.toLocaleString("bn-BD", { dateStyle: "medium" });
}

export default function CredentialList({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<Credential[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    scope: "other",
    expires_at: "",
    warn_days: "7",
    owner_email: "",
    notes: "",
  });

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/credentials", { cache: "no-store" });
      if (!res.ok) throw new Error("লোড ব্যর্থ");
      const data = (await res.json()) as { credentials: Credential[] };
      setItems(data.credentials);
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = async () => {
    if (!form.name.trim() || !form.expires_at) {
      flash("err", "নাম ও মেয়াদের তারিখ দরকার।");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/credentials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          warn_days: Number(form.warn_days) || 7,
          owner_email: form.owner_email.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "সংরক্ষণ ব্যর্থ");
      await refresh();
      setOpen(false);
      setForm({ name: "", scope: "other", expires_at: "", warn_days: "7", owner_email: "", notes: "" });
      flash("ok", "সংরক্ষণ হয়েছে");
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: Credential) => {
    if (!window.confirm(`${item.name} মুছে ফেলবেন? শুধু ট্র্যাকিং, সিক্রেট নয় — মুছে গেলে ওই মেয়াদে সতর্কতা আসবে না।`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/credentials?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("মুছতে ব্যর্থ");
      await refresh();
      flash("ok", "মুছে ফেলা হয়েছে");
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "mt-1 block w-full border border-ink/25 bg-paper px-2 py-1 font-mono-x text-[11px] text-ink outline-none focus:border-alizarin";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 border border-ink/25 bg-paper-deep px-3 py-1.5 font-mono-x text-[11px] font-bold text-ink disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> রিফ্রেশ
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 border border-ink/25 bg-ink px-3 py-1.5 font-mono-x text-[11px] font-bold text-paper"
          >
            <Plus className="h-3.5 w-3.5" /> {open ? "বাতিল" : "ক্রেডেনশিয়াল যোগ/নবায়ন"}
          </button>
        )}
        <span className="font-mono-x text-[11px] text-ink-soft">
          মেয়াদ শেষ হওয়ার {items.find((i) => i.status.state !== "ok")?.status.state === "due" ? "৭ দিন আগে" : "৭ দিন"} আগে ডেইলি ইমেইল সতর্কতা · শুধু নাম ও তারিখ সংরক্ষিত, সিক্রেট নয়
        </span>
      </div>

      {msg && <p className="font-mono-x text-[11.5px] font-bold text-alizarin">{msg.text}</p>}

      {open && (
        <div className="border border-ink/25 bg-paper-deep p-4">
          <p className="font-mono-x text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">নতুন ক্রেডেনশিয়াল</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="font-mono-x text-[10.5px] text-ink-soft">
              নাম *
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="GitHub PAT (pipeline)" />
            </label>
            <label className="font-mono-x text-[10.5px] text-ink-soft">
              মেয়াদের তারিখ *
              <input type="date" className={inputCls} value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </label>
            <label className="font-mono-x text-[10.5px] text-ink-soft">
              ধরন
              <select className={inputCls} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
                {Object.entries(SCOPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="font-mono-x text-[10.5px] text-ink-soft">
              কত দিন আগে সতর্ক করবে
              <input type="number" min={0} max={90} className={inputCls} value={form.warn_days} onChange={(e) => setForm({ ...form, warn_days: e.target.value })} />
            </label>
            <label className="font-mono-x text-[10.5px] text-ink-soft">
              সতর্কতার ইমেইল (খালি = SECURITY_CONTACT_EMAIL)
              <input type="email" className={inputCls} value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} />
            </label>
            <label className="font-mono-x text-[10.5px] text-ink-soft">
              নোট
              <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="কোন সার্ভিসে ব্যবহৃত" />
            </label>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="border border-ink/25 bg-ink px-4 py-1.5 font-mono-x text-[11px] font-bold text-paper disabled:opacity-50"
            >
              সংরক্ষণ
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && !open && (
        <p className="font-mono-x text-[11.5px] text-ink-soft">
          কোনো ক্রেডেনশিয়াল ট্র্যাক করা হচ্ছে না। প্রোভাইডার কী বা টোকেনের মেয়াদ যোগ করুন।
        </p>
      )}

      <div className="space-y-2.5">
        {items.map((item) => {
          const st = item.status.state;
          const badge =
            st === "expired" ? "bg-alizarin text-paper" : st === "due" ? "bg-amberx text-paper" : "bg-cat-teal text-paper";
          return (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border border-ink/20 bg-paper-deep px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-ink-soft"><CalendarDays className="h-4 w-4" /></span>
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-mono-x text-[12px] font-bold text-ink">
                    {item.name}
                    <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${badge}`}>
                      {STATE_LABEL[st]}
                      {st !== "ok" ? ` · ${st === "expired" ? "০ দিন" : `${item.status.daysLeft} দিন বাকি`}` : ""}
                    </span>
                  </p>
                  <p className="font-mono-x text-[10.5px] text-ink-soft">
                    {SCOPE_LABEL[item.scope] ?? item.scope} · মেয়াদ {fmt(item.expires_at)}
                    {item.owner_email ? ` · সতর্কতা → ${item.owner_email}` : ""}
                    {item.last_notified_at ? " · সতর্কতা পাঠানো হয়েছে" : ""}
                  </p>
                </div>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void remove(item)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 border border-ink/25 px-2.5 py-1.5 font-mono-x text-[10.5px] font-bold text-ink disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> মুছুন
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}