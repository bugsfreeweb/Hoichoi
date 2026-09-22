"use client";

import { useCallback, useEffect, useState } from "react";
import type { Notice, NoticeTone } from "@hoichoi/shared-types";
import { Check, Megaphone, Pencil, Pin, Plus, RefreshCw, Trash2, X } from "lucide-react";

const TONES: Array<{ v: NoticeTone; label: string; dot: string; chip: string }> = [
  { v: "info", label: "তথ্য", dot: "#22d3ee", chip: "bg-[#22d3ee]/15 text-[#22d3ee]" },
  { v: "success", label: "সফল", dot: "#c8f65d", chip: "bg-[#c8f65d]/15 text-[#c8f65d]" },
  { v: "warn", label: "সতর্কতা", dot: "#ffb454", chip: "bg-[#ffb454]/15 text-[#ffb454]" },
  { v: "alert", label: "জরুরি", dot: "#ff6b6b", chip: "bg-[#ff6b6b]/15 text-[#ff6b6b]" },
];

interface Form {
  title: string;
  body: string;
  tone: NoticeTone;
  url: string;
  pinned: boolean;
  active: boolean;
  expiresAt: string;
}

const EMPTY: Form = { title: "", body: "", tone: "info", url: "", pinned: false, active: true, expiresAt: "" };

/**
 * নোটিশ CRUD (web অ্যাডমিন)। Pinned + active নোটিশটি পাবলিক সাইটের হেডারে
 * "স্পেশাল নোটিশ" ব্যানার, বাকিগুলো বেল নোটিফিকেশনে — ডেস্কটপ অ্যাপ থেকেও
 * একই টেবিল লেখা যায়, তাই দুদিক থেকেই আপডেট।
 */
export function AdminNotices({ initial }: { initial: Notice[] }) {
  const [notices, setNotices] = useState<Notice[]>(initial);
  const [form, setForm] = useState<Form>(EMPTY);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [editForm, setEditForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notices?all=1", { cache: "no-store" });
      if (!res.ok) throw new Error("লোড ব্যর্থ");
      const data = (await res.json()) as { notices: Notice[] };
      setNotices(data.notices ?? []);
    } catch (e) {
      flash("err", String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toForm = (n: Notice): Form => ({
    title: n.title,
    body: n.body ?? "",
    tone: n.tone,
    url: n.url ?? "",
    pinned: n.pinned,
    active: n.is_active,
    expiresAt: n.expires_at ?? "",
  });

  const handleCreate = async () => {
    if (!form.title.trim()) {
      flash("err", "শিরোনাম প্রয়োজন");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("তৈরি ব্যর্থ");
      setForm(EMPTY);
      setOpen(false);
      await refresh();
      flash("ok", "নোটিশ তৈরি হয়েছে — পিন করলে সাইটের হেডারে ব্যানার আসবে");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "তৈরি ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editing || !editForm) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/notices/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("আপডেট ব্যর্থ");
      setEditing(null);
      setEditForm(null);
      await refresh();
      flash("ok", "আপডেট হয়েছে");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "আপডেট ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (n: Notice) => {
    try {
      const res = await fetch(`/api/notices/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !n.is_active }),
      });
      if (!res.ok) throw new Error("টগল ব্যর্থ");
      await refresh();
    } catch (e) {
      flash("err", String(e));
    }
  };

  const handleRemove = async (n: Notice) => {
    if (!window.confirm(`"${n.title}" নোটিশটি মুছতে চান?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/notices/${n.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("মুছতে ব্যর্থ");
      await refresh();
      flash("ok", "মুছে ফেলা হয়েছে");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "মুছতে ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const toneOf = (t: NoticeTone) => TONES.find((x) => x.v === t) ?? TONES[0]!;

  return (
    <div>
      <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">
        🔔 NOTICE BOARD · Pinned + active → হেডার ব্যানার
      </p>
      <h1 className="mt-1 font-serif-bn text-[34px] font-black text-ink">নোটিশ ও ঘোষণা</h1>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
        Pinned + active নোটিশটি দর্শকের হেডারে "স্পেশাল নোটিশ" ব্যানার হিসেবে দেখায়; সব active নোটিশ
        বেল আইকনে নোটিফিকেশন হিসেবে। ডেস্কটপ অ্যাপের Settings → নোটিশ ট্যাব এই একই টেবিলে লেখে,
        তাই যে কোনো দিক থেকে আপডেট করলেই ওয়েবসাইটে সঙ্গে সঙ্গে প্রতিফলিত হয়।
      </p>

      {msg && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-[12px] font-bold ${msg.type === "ok" ? "bg-lime text-night" : "bg-alizarin text-paper"}`}>
          {msg.type === "ok" ? "✓ " : "✕ "}
          {msg.text}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {!open && !editing && (
          <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-lime px-3 py-2 text-[12px] font-bold text-night hover:brightness-110">
            <Plus size={14} /> নতুন নোটিশ
          </button>
        )}
        <button onClick={() => void refresh()} className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-[12px] font-bold text-white/70 hover:text-white">
          <RefreshCw size={13} /> refresh
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 rounded-xl border border-lime/30 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between">
            <p className="font-serif-bn text-[16px] font-bold text-white">নতুন নোটিশ</p>
            <button onClick={() => setOpen(false)} className="rounded p-1 text-white/50 hover:text-white">
              <X size={14} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-white/40">শিরোনাম</span>
              <input
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-3 py-2 text-[13px] text-white outline-none focus:border-lime/60"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="যেমন: আজ রাত ১০টা পর্যন্ত লাইভ আপডেট"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-white/40">বিস্তারিত</span>
              <textarea
                className="mt-1 h-20 w-full resize-none rounded-lg border border-white/10 bg-[#0a0d12] px-3 py-2 text-[12px] text-white outline-none focus:border-lime/60"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-white/40">টোন</span>
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-3 py-2 text-[13px] text-white outline-none"
                value={form.tone}
                onChange={(e) => setForm({ ...form, tone: e.target.value as NoticeTone })}
              >
                {TONES.map((t) => (
                  <option key={t.v} value={t.v}>
                    {t.label} ({t.v})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-white/40">লিঙ্ক (ক্লিক করলে খুলবে)</span>
              <input
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-3 py-2 font-mono-x text-[11px] text-white outline-none focus:border-lime/60"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-white/40">মেয়াদ (ISO, ঐচ্ছিক)</span>
              <input
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-3 py-2 font-mono-x text-[11px] text-white outline-none focus:border-lime/60"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                placeholder="2026-12-31T23:59:59+06:00"
              />
            </label>
            <div className="flex flex-wrap items-end gap-5 pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-white/75">
                <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
                Pinned — হেডার ব্যানার
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-white/75">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Active
              </label>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={() => setOpen(false)} className="rounded-lg border border-white/15 px-3 py-2 text-[12px] font-bold text-white/70">
              বাতিল
            </button>
            <button onClick={() => void handleCreate()} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-lime px-3 py-2 text-[12px] font-bold text-night disabled:opacity-50">
              <Check size={14} /> তৈরি করুন
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-2.5">
        {notices.length === 0 && !open && (
          <div className="rounded-xl border border-dashed border-white/15 py-12 text-center text-white/35">
            কোনো নোটিশ নেই। "নতুন নোটিশ" দিয়ে একটি তৈরি করুন।
          </div>
        )}
        {notices.map((n) => {
          const t = toneOf(n.tone);
          const editingThis = editing?.id === n.id && editForm;
          return (
            <div key={n.id} className="rounded-xl border border-white/8 bg-white/[0.04] p-4">
              {editingThis ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-white/40">শিরোনাম</span>
                      <input
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-3 py-2 text-[13px] text-white outline-none focus:border-lime/60"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-white/40">বিস্তারিত</span>
                      <textarea
                        className="mt-1 h-20 w-full resize-none rounded-lg border border-white/10 bg-[#0a0d12] px-3 py-2 text-[12px] text-white outline-none focus:border-lime/60"
                        value={editForm.body}
                        onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-white/40">টোন</span>
                      <select
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-3 py-2 text-[13px] text-white outline-none"
                        value={editForm.tone}
                        onChange={(e) => setEditForm({ ...editForm, tone: e.target.value as NoticeTone })}
                      >
                        {TONES.map((x) => (
                          <option key={x.v} value={x.v}>
                            {x.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-white/40">লিঙ্ক</span>
                      <input
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-3 py-2 font-mono-x text-[11px] text-white outline-none focus:border-lime/60"
                        value={editForm.url}
                        onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-white/40">মেয়াদ (ISO)</span>
                      <input
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-3 py-2 font-mono-x text-[11px] text-white outline-none focus:border-lime/60"
                        value={editForm.expiresAt}
                        onChange={(e) => setEditForm({ ...editForm, expiresAt: e.target.value })}
                      />
                    </label>
                    <div className="flex items-end gap-5 pb-1">
                      <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-white/75">
                        <input type="checkbox" checked={editForm.pinned} onChange={(e) => setEditForm({ ...editForm, pinned: e.target.checked })} />
                        Pinned
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-white/75">
                        <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} />
                        Active
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditing(null);
                        setEditForm(null);
                      }}
                      className="rounded-lg border border-white/15 px-3 py-2 text-[12px] font-bold text-white/70"
                    >
                      বাতিল
                    </button>
                    <button onClick={() => void handleSaveEdit()} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-lime px-3 py-2 text-[12px] font-bold text-night disabled:opacity-50">
                      <Check size={14} /> সংরক্ষণ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${t.dot}22` }}>
                    <Megaphone size={15} style={{ color: t.dot }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-[14px] font-bold text-white">
                      {n.title}
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${t.chip}`}>{t.label}</span>
                      {n.pinned && (
                        <span className="flex items-center gap-0.5 rounded-full bg-[#ffb454]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#ffb454]">
                          <Pin size={9} /> pinned
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 font-mono-x text-[10px] text-white/40">
                      {n.id.slice(0, 8)} · {n.created_by} · {n.updated_at.slice(0, 10)}
                      {n.expires_at ? ` · মেয়াদ ${n.expires_at.slice(0, 10)}` : ""}
                    </p>
                    {n.body && <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-white/50">{n.body}</p>}
                    {n.url && <p className="mt-0.5 truncate font-mono-x text-[10px] text-white/35">{n.url}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => void handleToggle(n)}
                      className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide transition-colors ${
                        n.is_active ? "bg-lime text-night hover:brightness-110" : "bg-white/15 text-white/55 hover:text-white"
                      }`}
                      title={n.is_active ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                    >
                      {n.is_active ? "Active" : "Paused"}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(n);
                        setEditForm(toForm(n));
                      }}
                      disabled={busy}
                      className="rounded-lg p-2 text-white/55 hover:bg-white/10 hover:text-white"
                      title="সম্পাদনা"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => void handleRemove(n)}
                      disabled={busy}
                      className="rounded-lg p-2 text-alizarin hover:bg-alizarin/12"
                      title="মুছুন"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}