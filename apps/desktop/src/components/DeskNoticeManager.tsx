import { useCallback, useEffect, useState } from "react";
import { Bell, Check, Megaphone, Pin, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import {
  deskNotices,
  deskAddNotice,
  deskUpdateNotice,
  deskToggleNotice,
  deskRemoveNotice,
  type DeskNotice,
  type DeskNoticeTone,
} from "../lib/tauri";
import { getRunEnv } from "../lib/vault";
import { autoPush } from "../lib/autosync";

const TONES: Array<{ v: DeskNoticeTone; label: string; chip: string }> = [
  { v: "info", label: "তথ্য", chip: "bg-sky/15 text-sky" },
  { v: "success", label: "সফল", chip: "bg-lime/15 text-lime" },
  { v: "warn", label: "সতর্কতা", chip: "bg-amberx/15 text-amberx" },
  { v: "alert", label: "জরুরি", chip: "bg-alizarin/15 text-alizarin" },
];

const TONE_DOT: Record<DeskNoticeTone, string> = {
  info: "#22d3ee",
  success: "#c8f65d",
  warn: "#ffb454",
  alert: "#ff6b6b",
};

interface Form {
  title: string;
  body: string;
  tone: DeskNoticeTone;
  url: string;
  pinned: boolean;
  expiresAt: string;
}

const EMPTY: Form = { title: "", body: "", tone: "info", url: "", pinned: false, expiresAt: "" };

/** Notice / announcement manager for the desk — powers the web's special-notice banner + notification bell. */
export default function DeskNoticeManager() {
  const [notices, setNotices] = useState<DeskNotice[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Form | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const refresh = useCallback(async () => {
    try {
      setNotices(await deskNotices(await getRunEnv()));
    } catch (e) {
      flash("err", String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
    setEditForm(null);
    setOpen(false);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) {
      flash("err", "শিরোনাম আবশ্যক");
      return;
    }
    setBusy(true);
    try {
      await deskAddNotice(await getRunEnv(), {
        title: form.title.trim(),
        body: form.body.trim() || null,
        tone: form.tone,
        url: form.url.trim() || null,
        pinned: form.pinned,
        expiresAt: form.expiresAt || null,
      });
      resetForm();
      await refresh();
      await autoPush();
      flash("ok", "নোটিশ তৈরি হয়েছে");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "তৈরি ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (n: DeskNotice) => {
    setEditingId(n.id);
    setEditForm({
      title: n.title,
      body: n.body ?? "",
      tone: n.tone,
      url: n.url ?? "",
      pinned: n.pinned,
      expiresAt: n.expires_at ?? "",
    });
  };

  const handleSave = async () => {
    if (!editingId || !editForm) return;
    setBusy(true);
    try {
      await deskUpdateNotice(await getRunEnv(), editingId, {
        title: editForm.title.trim(),
        body: editForm.body.trim() || null,
        tone: editForm.tone,
        url: editForm.url.trim() || null,
        pinned: editForm.pinned,
        expiresAt: editForm.expiresAt || null,
      });
      setEditingId(null);
      setEditForm(null);
      await refresh();
      await autoPush();
      flash("ok", "আপডেট হয়েছে");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "আপডেট ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (n: DeskNotice) => {
    try {
      await deskToggleNotice(await getRunEnv(), n.id);
      await refresh();
      await autoPush();
    } catch (e) {
      flash("err", String(e));
    }
  };

  const handleRemove = async (n: DeskNotice) => {
    if (!window.confirm(`"${n.title}" নোটিশটি মুছতে চান?`)) return;
    setBusy(true);
    try {
      await deskRemoveNotice(await getRunEnv(), n.id);
      await refresh();
      await autoPush();
      flash("ok", "মুছে ফেলা হয়েছে");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "মুছতে ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const toneChip = (tone: DeskNoticeTone) => TONES.find((t) => t.v === tone) as { v: DeskNoticeTone; label: string; chip: string };

  const toneSelect = (
    value: DeskNoticeTone,
    onChange: (v: DeskNoticeTone) => void,
  ) => (
    <select className="field mt-1 w-full" value={value} onChange={(e) => onChange(e.target.value as DeskNoticeTone)}>
      {TONES.map((t) => (
        <option key={t.v} value={t.v}>
          {t.label} ({t.v})
        </option>
      ))}
    </select>
  );

  return (
    <div className="panel mt-5">
      <p className="flex items-center gap-2 panel-title">
        <Bell size={14} className="text-lime" /> নোটিশ ও ঘোষণা · notices
      </p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
        "Pinned + active" নোটিশটি ওয়েবসাইটের হেডারে স্পেশাল নোটিশ ব্যানার হিসেবে আসে; সব active নোটিশ
        ওয়েবসাইটের ঘণ্টা (bell) আইকনে নোটিফিকেশনের তালিকায় থাকে। ওয়েব অ্যাডমিনও এই তালিকা
        সম্পাদনা করতে পারে — দুদিক থেকেই একই টেবিল আপডেট হয়।
      </p>

      {msg && (
        <p className={`mt-3 px-3 py-2 text-[12px] font-bold ${msg.type === "ok" ? "bg-lime text-night" : "bg-alizarin text-paper"}`}>
          {msg.type === "ok" ? "✓ " : "✕ "}
          {msg.text}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!open && !editingId && (
          <button className="btn" onClick={() => setOpen(true)}>
            <Megaphone size={14} /> নতুন নোটিশ
          </button>
        )}
        <button className="btn-ghost" onClick={() => void refresh()}>
          <RefreshCw size={13} /> refresh
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 rounded-xl border border-lime/30 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <p className="font-serif-bn text-[15px] font-bold text-white">নতুন নোটিশ</p>
            <button className="rounded p-1 text-white/50 hover:text-white" onClick={() => setOpen(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">শিরোনাম</span>
              <input
                className="field mt-1 w-full"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="যেমন: পরীক্ষামূলক নতুন রিরাইট ইঞ্জিন চালু হয়েছে"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">বিস্তারিত</span>
              <textarea
                className="field mt-1 h-20 w-full resize-none text-[12px]"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">টোন</span>
              {toneSelect(form.tone, (tone) => setForm({ ...form, tone }))}
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">লিঙ্ক (লেখাটিতে)</span>
              <input
                className="field mt-1 w-full font-mono-x text-[10.5px]"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">মেয়াদ (ISO)</span>
              <input
                className="field mt-1 w-full font-mono-x text-[10.5px]"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                placeholder="2026-12-31T23:59:59+06:00"
              />
            </label>
            <label className="flex items-end gap-2 pb-2 text-[12px] text-white/70">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
              Pinned — টপ স্পেশাল নোটিশ
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              বাতিল
            </button>
            <button className="btn" disabled={busy} onClick={() => void handleCreate()}>
              <Check size={14} /> তৈরি করুন
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {notices.map((n) => {
          const editing = editingId === n.id && editForm;
          const chip = toneChip(n.tone);
          return (
            <div key={n.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              {editing ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">শিরোনাম</span>
                      <input
                        className="field mt-1 w-full"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">বিস্তারিত</span>
                      <textarea
                        className="field mt-1 h-20 w-full resize-none text-[12px]"
                        value={editForm.body}
                        onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">টোন</span>
                      {toneSelect(editForm.tone, (tone) => setEditForm({ ...editForm, tone }))}
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">লিঙ্ক</span>
                      <input
                        className="field mt-1 w-full font-mono-x text-[10.5px]"
                        value={editForm.url}
                        onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">মেয়াদ (ISO)</span>
                      <input
                        className="field mt-1 w-full font-mono-x text-[10.5px]"
                        value={editForm.expiresAt}
                        onChange={(e) => setEditForm({ ...editForm, expiresAt: e.target.value })}
                      />
                    </label>
                    <label className="flex items-end gap-2 pb-2 text-[12px] text-white/70">
                      <input type="checkbox" checked={editForm.pinned} onChange={(e) => setEditForm({ ...editForm, pinned: e.target.checked })} />
                      Pinned
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        setEditingId(null);
                        setEditForm(null);
                      }}
                    >
                      বাতিল
                    </button>
                    <button className="btn" disabled={busy} onClick={() => void handleSave()}>
                      <Check size={14} /> সংরক্ষণ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-black text-night"
                    style={{ background: TONE_DOT[n.tone] }}
                  >
                    <span className="sr-only">{toneChip(n.tone).label}</span>
                    <Megaphone size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-bold text-white">
                      {n.title}
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${chip.chip}`}>
                        {chip.label}
                      </span>
                      {n.pinned && (
                        <span className="flex items-center gap-0.5 rounded-full bg-amberx/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amberx">
                          <Pin size={9} /> pinned
                        </span>
                      )}
                    </p>
                    <p className="font-mono-x text-[10px] text-white/40">
                      {n.id.slice(0, 8)} · {n.created_by} · {n.updated_at.slice(0, 10)}
                      {n.expires_at ? ` · মেয়াদ ${n.expires_at.slice(0, 10)}` : ""}
                    </p>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-[11px] text-white/45">{n.body}</p>}
                  </div>
                  <button
                    onClick={() => void handleToggle(n)}
                    className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-night transition-colors ${n.is_active ? "bg-lime hover:brightness-110" : "bg-white/20 text-white/60"}`}
                  >
                    {n.is_active ? "Active" : "Paused"}
                  </button>
                  <button
                    onClick={() => startEdit(n)}
                    disabled={busy}
                    className="rounded-lg p-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                    title="সম্পাদনা"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => void handleRemove(n)}
                    disabled={busy}
                    className="rounded-lg p-2 text-alizarin transition-colors hover:bg-alizarin/12"
                    title="মুছুন"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {notices.length === 0 && !open && (
        <div className="py-10 text-center text-ink-soft">
          কোনো নোটিশ নেই। "নতুন নোটিশ" বোতামে ক্লিক করে একটি তৈরি করুন।
        </div>
      )}
    </div>
  );
}