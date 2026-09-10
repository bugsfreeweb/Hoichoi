import { useMemo, useState, useEffect } from "react";
import { Pause, Play, Plus, Radio, Search, Trash2 } from "lucide-react";
import { agoBn, toBn } from "../lib/format";
import {
  deskAddSource,
  deskRemoveSource,
  deskToggleSource,
  deskCategories,
  type DeskSource,
} from "../lib/tauri";
import { getRunEnv } from "../lib/vault";

const KIND_BN: Record<string, string> = { page: "পেজ", group: "গ্রুপ" };
const STATUS_BN: Record<string, string> = {
  watching: "পর্যবেক্ষণ",
  paused: "বিরতি",
};

function fbUrl(fbId: string): string {
  const t = fbId.trim();
  if (/^https?:\/\//.test(t)) return t;
  if (/^\d+$/.test(t)) return `https://facebook.com/profile.php?id=${t}`;
  return `https://facebook.com/${t}`;
}

export default function Watchlist({
  sources,
  refresh,
}: {
  sources: DeskSource[];
  refresh: () => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "page" | "group">("all");
  const [form, setForm] = useState({ name: "", fbId: "", kind: "page" as "page" | "group", categories: [] as string[] });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ slug: string; displayNameBn: string; displayNameEn: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const env = await getRunEnv();
        const cats = await deskCategories(env);
        setCategories(cats);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const shown = useMemo(
    () =>
      sources.filter((s) => {
        const matchQ =
          q.trim() === "" ||
          s.page_name.toLowerCase().includes(q.trim().toLowerCase()) ||
          String(s.fb_id ?? "").toLowerCase().includes(q.trim().toLowerCase());
        const matchK = kind === "all" || s.kind === kind;
        return matchQ && matchK;
      }),
    [sources, q, kind],
  );

  const toggle = async (s: DeskSource) => {
    setBusy(s.id);
    setErr(null);
    try {
      await deskToggleSource(await getRunEnv(), s.id);
      await refresh();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (s: DeskSource) => {
    if (!window.confirm(`সোর্স " ${s.page_name} " মুছে ফেলবেন? পরের স্ক্র্যাপে আর দেখা হবে না।`)) return;
    setBusy(s.id);
    setErr(null);
    try {
      await deskRemoveSource(await getRunEnv(), s.id);
      await refresh();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  };

  const add = async () => {
    if (!form.name.trim() || !form.fbId.trim()) return;
    setErr(null);
    try {
      await deskAddSource(await getRunEnv(), {
        pageUrl: fbUrl(form.fbId),
        pageName: form.name.trim(),
        kind: form.kind,
        categories: form.categories,
        fbId: form.fbId.trim(),
        topics: "নতুন",
      });
      setForm({ name: "", fbId: "", kind: "page", categories: [] });
      setOpen(false);
      await refresh();
    } catch (e) {
      setErr(String(e));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-3.5">
        <p className="font-serif-bn text-[17px] font-bold text-white">ওয়াচলিস্ট</p>
        <span className="font-mono-x text-[9.5px] tracking-[0.2em] text-white/35 uppercase">
          PUBLIC PAGES · GROUPS · GRAPH READ
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5">
            <Search size={12} className="text-white/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="পেজ / হ্যান্ডেল…"
              className="w-40 bg-transparent text-[12px] text-white/85 outline-none placeholder:text-white/30"
            />
          </div>
          {(["all", "page", "group"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${
                kind === k ? "bg-white text-night" : "text-white/50 hover:bg-white/8"
              }`}
            >
              {k === "all" ? "সব" : KIND_BN[k]}
            </button>
          ))}
          <div className="relative">
            <div className="relative">
            <select
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                setForm({ ...form, categories: selected });
              }}
              className="rounded-lg border border-white/10 bg-night-grid px-3 py-2 text-[11px] text-white outline-none appearance-none pr-8 cursor-pointer"
              multiple
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug} selected={form.categories.includes(c.slug)}>{c.displayNameBn}</option>
              ))}
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-lime px-3 py-1.5 text-[11.5px] font-bold text-night"
          >
            <Plus size={13} /> সোর্স
          </button>
        </div>
      </div>

      {err && (
        <div className="border-b border-white/8 bg-rose-500/10 px-5 py-2 text-[11.5px] font-semibold text-rose-300">
          ✕ {err}
        </div>
      )}

      {open && (
        <div className="grid gap-2 border-b border-white/8 bg-white/[0.03] px-5 py-3 sm:grid-cols-4">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="পেজের নাম"
            className="rounded-lg border border-white/10 bg-night-grid px-3 py-2 text-[12px] text-white outline-none"
          />
          <input
            value={form.fbId}
            onChange={(e) => setForm({ ...form, fbId: e.target.value })}
            placeholder="Facebook ID / URL"
            className="rounded-lg border border-white/10 bg-night-grid px-3 py-2 font-mono-x text-[12px] text-white outline-none"
          />
          <select
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as "page" | "group" })}
            className="rounded-lg border border-white/10 bg-night-grid px-3 py-2 text-[12px] text-white outline-none"
          >
            <option value="page">পেজ</option>
            <option value="group">গ্রুপ</option>
          </select>
          <button onClick={() => void add()} className="rounded-lg bg-lime text-[12px] font-bold text-night">
            ওয়াচলিস্টে যোগ
          </button>
        </div>
      )}

      <div className="scroll-slim flex-1 overflow-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="font-mono-x text-[9.5px] tracking-[0.18em] text-white/35 uppercase">
              <th className="px-5 py-3 font-medium">সোর্স</th>
              <th className="px-3 py-3 font-medium">ধরন</th>
              <th className="px-3 py-3 font-medium">বিষয়</th>
              <th className="px-3 py-3 font-medium">শেষ চেক</th>
              <th className="px-3 py-3 font-medium">আজ</th>
              <th className="px-3 py-3 font-medium">হেলথ</th>
              <th className="px-5 py-3 text-right font-medium">স্ট্যাটাস</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center text-[12.5px] text-white/35">
                  কোনো সোর্স মিললো না — ফিল্টার বদলান বা নতুন সোর্স যোগ করুন।
                </td>
              </tr>
            )}
            {shown.map((s) => {
              const st = s.is_active ? "watching" : "paused";
              return (
                <tr key={s.id} className="group hover:bg-white/[0.03]">
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] font-semibold text-white/90">{s.page_name}</p>
                    <p className="font-mono-x text-[10px] text-white/35">
                      {s.fb_id ?? s.page_url} · {s.category}
                    </p>
                  </td>
                  <td className="px-3 py-3.5 text-[12px] text-white/60">{KIND_BN[s.kind]}</td>
                  <td className="px-3 py-3.5 text-[11.5px] text-white/55">
                    {s.topics.length ? s.topics.join(", ") : "—"}
                  </td>
                  <td className="px-3 py-3.5 font-mono-x text-[11px] text-white/50">
                    {agoBn(s.last_scraped_at)}
                  </td>
                  <td className="px-3 py-3.5 font-mono-x text-[12px] text-white/80">
                    {toBn(s.posts_today)}
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
                        <span
                          className={`block h-full ${
                            s.health > 80 ? "bg-lime" : s.health > 50 ? "bg-amberx" : "bg-rose-400"
                          }`}
                          style={{ width: `${s.health}%` }}
                        />
                      </span>
                      <span className="font-mono-x text-[10px] text-white/40">{toBn(s.health)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                          st === "watching" ? "bg-lime/15 text-lime" : "bg-white/10 text-white/50"
                        }`}
                      >
                        <Radio size={10} /> {STATUS_BN[st]}
                      </span>
                      <button
                        onClick={() => void toggle(s)}
                        disabled={busy === s.id}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 hover:text-white disabled:opacity-40"
                        title={st === "watching" ? "বিরতি" : "চালু"}
                      >
                        {st === "watching" ? <Pause size={11} /> : <Play size={11} />}
                      </button>
                      <button
                        onClick={() => void remove(s)}
                        disabled={busy === s.id}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 hover:border-rose-400/60 hover:text-rose-300 disabled:opacity-40"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}