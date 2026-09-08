"use client";

import { useMemo, useState } from "react";
import {
  ShieldAlert,
  Check,
  Ban,
  Trash2,
  Search,
  MessageSquare,
  Globe,
  BookLock,
  Plus,
  Clock,
  Infinity as InfinityIcon,
  Loader2,
  AlertTriangle,
  Bot,
  User,
} from "lucide-react";
import { toBn, bnTime, bnDate, agoBn } from "@/lib/format";
import type { CommentLite, IpBanLite, BannedWordLite } from "@/lib/data";

type Tab = "queue" | "bans" | "words";
type CStatus = "all" | "approved" | "pending" | "blocked";

const STATUS_META: Record<string, { bn: string; cls: string }> = {
  approved: { bn: "অনুমোদিত", cls: "bg-lime/15 text-lime" },
  pending: { bn: "অপেক্ষমাণ", cls: "bg-amberx/15 text-amberx" },
  blocked: { bn: "ব্লকড", cls: "bg-rose-500/15 text-rose-300" },
};

const SCOPE_META: Record<string, { bn: string; cls: string; icon: typeof Clock }> = {
  "7d": { bn: "৭ দিন", cls: "text-amberx", icon: Clock },
  "30d": { bn: "৩০ দিন", cls: "text-orange-300", icon: Clock },
  permanent: { bn: "স্থায়ী", cls: "text-rose-300", icon: InfinityIcon },
};

export default function ModerationPanel({
  comments: initialComments,
  bans: initialBans,
  words: initialWords,
}: {
  comments: CommentLite[];
  bans: IpBanLite[];
  words: BannedWordLite[];
}) {
  const [tab, setTab] = useState<Tab>("queue");
  const [comments, setComments] = useState(initialComments);
  const [bans, setBans] = useState(initialBans);
  const [words, setWords] = useState(initialWords);
  const [cStatus, setCStatus] = useState<CStatus>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [newWord, setNewWord] = useState("");
  const [newSev, setNewSev] = useState(2);
  const [banIp, setBanIp] = useState("");
  const [banScope, setBanScope] = useState<"7d" | "30d" | "permanent">("7d");

  const adminKey =
    typeof window !== "undefined"
      ? localStorage.getItem("hoichoi-admin-key") ?? ""
      : "";

  async function act(action: string, params: Record<string, unknown>) {
    setBusy(action + JSON.stringify(params));
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ action, ...params }),
      });
      return (await res.json()) as { ok: boolean; [k: string]: unknown };
    } catch {
      return { ok: false };
    } finally {
      setBusy(null);
    }
  }

  const counts = useMemo(() => {
    const c = { all: comments.length, approved: 0, pending: 0, blocked: 0 };
    comments.forEach((x) => {
      if (x.status in c) (c as Record<string, number>)[x.status]++;
    });
    return c;
  }, [comments]);

  const pendingCount = counts.pending;
  const autoBlocked = comments.filter((c) => c.status === "blocked" && c.autoModerated).length;

  const shownComments = comments.filter(
    (c) =>
      (cStatus === "all" || c.status === cStatus) &&
      (q.trim() === "" ||
        c.body.toLowerCase().includes(q.toLowerCase()) ||
        c.author.toLowerCase().includes(q.toLowerCase()) ||
        c.ip.includes(q)),
  );

  /* ---- comment actions ---- */
  const approve = async (id: number) => {
    if ((await act("comment.approve", { id })).ok)
      setComments((cs) => cs.map((c) => (c.id === id ? { ...c, status: "approved" } : c)));
  };
  const block = async (id: number) => {
    if ((await act("comment.block", { id })).ok)
      setComments((cs) => cs.map((c) => (c.id === id ? { ...c, status: "blocked" } : c)));
  };
  const del = async (id: number) => {
    if ((await act("comment.delete", { id })).ok)
      setComments((cs) => cs.filter((c) => c.id !== id));
  };
  const banFromComment = async (ip: string, scope: "7d" | "30d" | "permanent") => {
    if (!ip) return;
    const r = await act("ip.ban", { ip, scope, reason: "কমেন্ট থেকে ম্যানুয়াল ব্যান" });
    if (r.ok && r.ban) {
      setBans((b) => [r.ban as IpBanLite, ...b]);
      setComments((cs) => cs.map((c) => (c.ip === ip ? { ...c, status: "blocked" } : c)));
    }
  };

  /* ---- ban actions ---- */
  const unban = async (id: number) => {
    if ((await act("ip.unban", { id })).ok) setBans((b) => b.filter((x) => x.id !== id));
  };
  const manualBan = async () => {
    if (!banIp.trim()) return;
    const r = await act("ip.ban", { ip: banIp.trim(), scope: banScope, reason: "ম্যানুয়াল ব্যান" });
    if (r.ok && r.ban) {
      setBans((b) => [r.ban as IpBanLite, ...b]);
      setBanIp("");
    }
  };

  /* ---- word actions ---- */
  const addWord = async () => {
    if (!newWord.trim()) return;
    const r = await act("word.add", { word: newWord.trim(), severity: newSev });
    if (r.ok && r.word) {
      const w = r.word as BannedWordLite;
      setWords((ws) => [w, ...ws.filter((x) => x.id !== w.id)]);
      setNewWord("");
    }
  };
  const removeWord = async (id: number) => {
    if ((await act("word.remove", { id })).ok) setWords((ws) => ws.filter((w) => w.id !== id));
  };

  const isBusy = (k: string) => busy?.startsWith(k);

  return (
    <div className="panel overflow-hidden rounded-2xl">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300">
          <ShieldAlert size={15} />
        </span>
        <div>
          <p className="font-serif-bn text-[17px] font-bold text-white">কমেন্ট মডারেশন</p>
          <p className="font-mono-x text-[9px] tracking-[0.22em] text-white/35 uppercase">
            AUTO-FILTER + ESCALATING IP BANS + MANUAL REVIEW
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 font-mono-x text-[10px]">
          <span className="rounded-full bg-amberx/15 px-2.5 py-1 text-amberx">
            {toBn(pendingCount)} অপেক্ষমাণ
          </span>
          <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-rose-300">
            <Bot size={9} className="mb-0.5 mr-1 inline" />
            {toBn(autoBlocked)} অটো-ব্লকড
          </span>
          <span className="rounded-full bg-white/8 px-2.5 py-1 text-white/60">
            {toBn(bans.length)} IP ব্যান
          </span>
        </div>
      </div>

      {/* tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-white/8 px-5 py-3">
        {([
          ["queue", "কমেন্ট সারি", MessageSquare],
          ["bans", "IP ব্যান", Globe],
          ["words", "শব্দ ডিকশনারি", BookLock],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-medium transition-all duration-300 ${
              tab === id ? "bg-white text-night" : "text-white/50 hover:bg-white/8 hover:text-white"
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* ===================== COMMENT QUEUE ===================== */}
      {tab === "queue" && (
        <div>
          <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-5 py-3">
            {(["all", "pending", "approved", "blocked"] as CStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setCStatus(s)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  cStatus === s ? "bg-white text-night" : "text-white/50 hover:bg-white/8"
                }`}
              >
                {s === "all" ? "সব" : STATUS_META[s].bn}{" "}
                <span className="font-mono-x text-[9.5px] opacity-70">
                  {toBn((counts as Record<string, number>)[s] ?? 0)}
                </span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <Search size={12} className="text-white/40" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="টেক্সট / নাম / IP…"
                className="w-40 bg-transparent text-[11.5px] text-white/85 outline-none placeholder:text-white/30"
              />
            </div>
          </div>

          <div className="scroll-slim max-h-[560px] divide-y divide-white/6 overflow-y-auto">
            {shownComments.map((c) => (
              <div key={c.id} className="grid-pop px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white/90">
                        <User size={11} className="text-white/40" />
                        {c.author}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${STATUS_META[c.status]?.cls}`}>
                        {STATUS_META[c.status]?.bn}
                      </span>
                      {c.autoModerated && (
                        <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] font-semibold text-rose-300">
                          <Bot size={9} /> অটো
                        </span>
                      )}
                      <span className="font-mono-x text-[9.5px] text-white/35">{agoBn(c.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-white/75">{c.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 font-mono-x text-[9.5px] text-white/35">
                      <span className="flex items-center gap-1">
                        <Globe size={9} /> {c.ip || "—"}
                      </span>
                      {c.flagged && (
                        <span className="flex items-center gap-1 text-rose-300/80">
                          <AlertTriangle size={9} /> শনাক্ত: {c.flagged}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="flex gap-1.5">
                      {c.status !== "approved" && (
                        <button
                          onClick={() => approve(c.id)}
                          disabled={isBusy("comment.approve")}
                          className="flex h-7 items-center gap-1 rounded-md border border-lime/40 px-2 text-[10px] font-semibold text-lime transition-colors hover:bg-lime/10"
                          title="অনুমোদন"
                        >
                          <Check size={11} /> অনুমোদন
                        </button>
                      )}
                      {c.status !== "blocked" && (
                        <button
                          onClick={() => block(c.id)}
                          className="flex h-7 items-center gap-1 rounded-md border border-amberx/40 px-2 text-[10px] font-semibold text-amberx transition-colors hover:bg-amberx/10"
                          title="ব্লক"
                        >
                          <Ban size={11} /> ব্লক
                        </button>
                      )}
                      <button
                        onClick={() => del(c.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/50 transition-colors hover:border-rose-400/50 hover:text-rose-300"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    {c.ip && (
                      <div className="flex items-center gap-1">
                        <span className="font-mono-x text-[8.5px] tracking-wider text-white/25 uppercase">IP ব্যান:</span>
                        {(["7d", "30d", "permanent"] as const).map((sc) => (
                          <button
                            key={sc}
                            onClick={() => banFromComment(c.ip, sc)}
                            className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/50 transition-colors hover:border-rose-400/50 hover:text-rose-300"
                          >
                            {SCOPE_META[sc].bn}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {shownComments.length === 0 && (
              <p className="py-16 text-center text-[12.5px] text-white/35">
                এই ফিল্টারে কোনো মন্তব্য নেই।
              </p>
            )}
          </div>
        </div>
      )}

      {/* ===================== IP BANS ===================== */}
      {tab === "bans" && (
        <div>
          <div className="flex flex-wrap items-end gap-2 border-b border-white/8 bg-white/[0.02] px-5 py-3">
            <div>
              <label className="block font-mono-x text-[9px] tracking-[0.18em] text-white/40 uppercase">IP অ্যাড্রেস</label>
              <input
                value={banIp}
                onChange={(e) => setBanIp(e.target.value)}
                placeholder="103.24.xx.xx"
                className="mt-1 w-44 rounded-lg border border-white/10 bg-night px-3 py-2 font-mono-x text-[12px] text-white outline-none focus:border-rose-400/50"
              />
            </div>
            <div>
              <label className="block font-mono-x text-[9px] tracking-[0.18em] text-white/40 uppercase">মেয়াদ</label>
              <select
                value={banScope}
                onChange={(e) => setBanScope(e.target.value as "7d" | "30d" | "permanent")}
                className="mt-1 rounded-lg border border-white/10 bg-night px-3 py-2 text-[12px] text-white outline-none"
              >
                <option value="7d">৭ দিন</option>
                <option value="30d">৩০ দিন</option>
                <option value="permanent">স্থায়ী</option>
              </select>
            </div>
            <button
              onClick={manualBan}
              disabled={isBusy("ip.ban")}
              className="flex items-center gap-1.5 rounded-lg bg-rose-500/90 px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-rose-500"
            >
              {isBusy("ip.ban") ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
              IP ব্যান করুন
            </button>
            <p className="ml-auto max-w-[220px] text-[10px] leading-relaxed text-white/35">
              অটো-এস্কেলেশন: ১ম লঙ্ঘন ৭ দিন → ২য় ৩০ দিন → ৩য়+ স্থায়ী।
            </p>
          </div>

          <div className="scroll-slim max-h-[520px] overflow-y-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="font-mono-x text-[9.5px] tracking-[0.18em] text-white/35 uppercase">
                  <th className="px-5 py-3 font-medium">IP</th>
                  <th className="px-3 py-3 font-medium">মেয়াদ</th>
                  <th className="px-3 py-3 font-medium">স্ট্রাইক</th>
                  <th className="px-3 py-3 font-medium">উৎস</th>
                  <th className="px-3 py-3 font-medium">শেষ হবে</th>
                  <th className="px-3 py-3 font-medium">কারণ</th>
                  <th className="px-5 py-3 text-right font-medium">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {bans.map((b) => {
                  const sm = SCOPE_META[b.scope];
                  const Icon = sm.icon;
                  return (
                    <tr key={b.id} className="hover:bg-white/[0.03]">
                      <td className="px-5 py-3 font-mono-x text-[11.5px] text-white/85">{b.ip}</td>
                      <td className="px-3 py-3">
                        <span className={`flex items-center gap-1 text-[11px] font-semibold ${sm.cls}`}>
                          <Icon size={11} /> {sm.bn}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono-x text-[11px] text-white/70">{toBn(b.strikes)}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${b.auto ? "bg-rose-500/12 text-rose-300" : "bg-sky-400/12 text-sky-300"}`}>
                          {b.auto ? "অটো" : "ম্যানুয়াল"}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono-x text-[10.5px] text-white/50">
                        {b.expiresAt ? bnDate(b.expiresAt) : "কখনো না (স্থায়ী)"}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-3 text-[10.5px] text-white/45">{b.reason}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => unban(b.id)}
                          className="rounded-md border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/60 transition-colors hover:border-lime/50 hover:text-lime"
                        >
                          আনব্যান
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {bans.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-[12.5px] text-white/35">
                      কোনো সক্রিয় IP ব্যান নেই।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== BANNED WORDS ===================== */}
      {tab === "words" && (
        <div>
          <div className="flex flex-wrap items-end gap-2 border-b border-white/8 bg-white/[0.02] px-5 py-3">
            <div>
              <label className="block font-mono-x text-[9px] tracking-[0.18em] text-white/40 uppercase">আপত্তিকর শব্দ</label>
              <input
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="শব্দ লিখুন…"
                className="mt-1 w-48 rounded-lg border border-white/10 bg-night px-3 py-2 text-[12px] text-white outline-none focus:border-rose-400/50"
              />
            </div>
            <div>
              <label className="block font-mono-x text-[9px] tracking-[0.18em] text-white/40 uppercase">তীব্রতা</label>
              <select
                value={newSev}
                onChange={(e) => setNewSev(Number(e.target.value))}
                className="mt-1 rounded-lg border border-white/10 bg-night px-3 py-2 text-[12px] text-white outline-none"
              >
                <option value={1}>১ · নরম (রিভিউ)</option>
                <option value={2}>২ · কড়া (অটো-ব্লক + ব্যান)</option>
                <option value={3}>৩ · সর্বোচ্চ (অটো-ব্লক + ব্যান)</option>
              </select>
            </div>
            <button
              onClick={addWord}
              disabled={isBusy("word.add")}
              className="flex items-center gap-1.5 rounded-lg bg-lime px-4 py-2 text-[12px] font-bold text-night transition-all hover:brightness-110"
            >
              {isBusy("word.add") ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              যোগ করুন
            </button>
            <p className="ml-auto max-w-[240px] text-[10px] leading-relaxed text-white/35">
              তীব্রতা ১ = মন্তব্য অপেক্ষমাণ সারিতে যায়; ২–৩ = তাৎক্ষণিক অটো-ডিলিট + IP এস্কেলেটিং ব্যান।
            </p>
          </div>

          <div className="scroll-slim max-h-[520px] overflow-y-auto p-5">
            <div className="flex flex-wrap gap-2">
              {words.map((w) => (
                <span
                  key={w.id}
                  className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] ${
                    w.severity >= 2
                      ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
                      : "border-amberx/40 bg-amberx/10 text-amberx"
                  }`}
                >
                  <span className="font-mono-x text-[9px] opacity-60">S{toBn(w.severity)}</span>
                  {w.word}
                  <button
                    onClick={() => removeWord(w.id)}
                    className="opacity-50 transition-opacity hover:text-white hover:opacity-100"
                    title="মুছুন"
                  >
                    <Trash2 size={11} />
                  </button>
                </span>
              ))}
              {words.length === 0 && (
                <p className="py-10 text-center text-[12.5px] text-white/35">
                  ডিকশনারি খালি — বিল্ট-ইন সিড তালিকা সক্রিয় আছে। উপরে শব্দ যোগ করলে তা এখানে দেখা যাবে।
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
