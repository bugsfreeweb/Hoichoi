"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CommentWithPost } from "@hoichoi/shared-types";
import { useAdminAction } from "@/lib/admin-api";
import { mediaUrl } from "@/lib/media";

type Tab = "all" | "pending" | "approved" | "blocked";

const TAB_BN: Record<Tab, string> = {
  all: "সব",
  pending: "অপেক্ষমান",
  approved: "অনুমোদিত",
  blocked: "ব্লকড",
};

const STATUS_CLS: Record<string, string> = {
  pending: "bg-amberx/15 text-amberx",
  approved: "bg-lime/15 text-lime",
  blocked: "bg-rose-500/15 text-rose-300",
};
const STATUS_BN: Record<string, string> = {
  pending: "অপেক্ষমান",
  approved: "অনুমোদিত",
  blocked: "ব্লকড",
};

function bn(n: number): string {
  return n.toLocaleString("bn-BD");
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "এইমাত্র";
  if (mins < 60) return `${bn(mins)} মিনিট আগে`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${bn(hours)} ঘণ্টা আগে`;
  return `${bn(Math.floor(hours / 24))} দিন আগে`;
}

export function ModerationTable({ rows }: { rows: CommentWithPost[] }) {
  const [list, setList] = useState(rows);
  const [tab, setTab] = useState<Tab>("all");
  const [busy, setBusy] = useState<string | null>(null);
  /**
   * Card / list switch. Comments are judged faster with the parent post's
   * picture and title in view (that is the context a reader had), while a big
   * backlog is faster to clear in the dense table.
   */
  const [view, setView] = useState<"card" | "list">("card");

  useEffect(() => setList(rows), [rows]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: list.length, pending: 0, approved: 0, blocked: 0 };
    list.forEach((r) => {
      if (r.status in c) c[r.status as Tab]++;
    });
    return c;
  }, [list]);

  const shown = list.filter((r) => tab === "all" || r.status === tab);

  const run = useAdminAction();

  /**
   * The list used to be mutated optimistically even when the request failed, so
   * a 403 looked like a successful approval until the next reload. Now the row
   * only changes when the server confirms it, and every outcome is announced.
   */
  const act = async (id: string, action: "approve" | "block" | "delete") => {
    setBusy(id);
    const labels = {
      approve: { busy: "মন্তব্য অনুমোদন করা হচ্ছে…", success: "✓ মন্তব্য অনুমোদিত" },
      block: { busy: "মন্তব্য ব্লক করা হচ্ছে…", success: "✓ মন্তব্য ব্লকড" },
      delete: { busy: "মন্তব্য মুছে ফেলা হচ্ছে…", success: "✓ মন্তব্য মুছে ফেলা হয়েছে" },
    }[action];
    const data = await run({
      path: "/api/comments",
      init: {
        method: action === "delete" ? "DELETE" : "PATCH",
        body: JSON.stringify(action === "delete" ? { id } : { id, action }),
      },
      busy: labels.busy,
      success: labels.success,
    });
    setBusy(null);
    if (!data) return;
    if (action === "delete") setList((ls) => ls.filter((r) => r.id !== id));
    else setList((ls) => ls.map((r) => (r.id === id ? { ...r, status: action === "approve" ? "approved" : "blocked" } : r)));
  };  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-panel">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-400/15 text-[15px]">💬</span>
        <div>
          <p className="font-serif-bn text-[17px] font-bold text-white">মন্তব্য মডারেশন</p>
          <p className="font-mono-x text-[9px] tracking-[0.22em] text-white/35 uppercase">
            PUBLIC COMMENTS · QUEUE → LIVE
          </p>
        </div>
        <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-white/12 px-3 py-1 font-mono-x text-[9.5px] tracking-[0.14em] text-white/50 uppercase md:flex">
          🛡 অনুমোদন ছাড়া পাবলিকে না
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-white/8 px-5 py-3">
        {(Object.keys(TAB_BN) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-medium transition-all duration-300 ${
              tab === t ? "bg-white text-night" : "text-white/50 hover:bg-white/8 hover:text-white"
            }`}
          >
            {TAB_BN[t]}{" "}
            <span className={`font-mono-x text-[9.5px] ${tab === t ? "text-night/60" : "text-white/35"}`}>
              {bn(counts[t])}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-5 py-2.5">
        <p className="font-mono-x text-[9px] tracking-[0.18em] text-white/30 uppercase">
          {view === "card" ? "কার্ড ভিউ · ছবি ও শিরোনামসহ" : "লিস্ট ভিউ · দ্রুত স্ক্যান"}
        </p>
        <div className="flex border border-white/12">
          {(["card", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`px-2.5 py-1 text-[10.5px] font-bold transition-colors ${
                view === v ? "bg-white text-night" : "text-white/50 hover:bg-white/8"
              }`}
            >
              {v === "card" ? "কার্ড" : "লিস্ট"}
            </button>
          ))}
        </div>
      </div>

      {view === "card" ? (
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => (
            <CommentCard key={r.id} row={r} busy={busy === r.id} onAct={act} />
          ))}
          {shown.length === 0 && (
            <p className="col-span-full py-12 text-center text-[12.5px] text-white/35">এই সারিতে কোনো মন্তব্য নেই।</p>
          )}
        </div>
      ) : (
      <div className="scroll-slim overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="font-mono-x text-[9.5px] tracking-[0.18em] text-white/35 uppercase">
              <th className="px-5 py-3 font-medium">মন্তব্য</th>
              <th className="px-3 py-3 font-medium">প্রতিবেদন</th>
              <th className="px-3 py-3 font-medium">সময়</th>
              <th className="px-3 py-3 font-medium">স্ট্যাটাস</th>
              <th className="px-5 py-3 text-right font-medium">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {shown.map((r) => (
              <tr key={r.id} className="transition-colors duration-200 hover:bg-white/[0.03]">
                <td className="max-w-[360px] px-5 py-3.5">
                  <p className="text-[12.5px] font-semibold text-white/90">{r.author}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-white/55">{r.body}</p>
                </td>
                <td className="max-w-[220px] px-3 py-3.5">
                  {r.postTitle ? (
                    <Link href={`/post/${r.post_id}`} className="line-clamp-2 text-[11.5px] leading-snug text-sky-300/90 hover:underline">
                      {r.postTitle}
                    </Link>
                  ) : (
                    <span className="text-[11.5px] text-white/35">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 font-mono-x text-[11px] text-white/50">
                  {timeAgo(r.created_at)}
                </td>
                <td className="px-3 py-3.5">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_CLS[r.status] ?? STATUS_CLS.pending}`}>
                    {STATUS_BN[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1.5">
                    {busy === r.id ? (
                      <span className="text-[11px] text-white/40">· চলছে …</span>
                    ) : (
                      <>
                        {r.status !== "approved" && (
                          <button onClick={() => act(r.id, "approve")} title="অনুমোদন করুন"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 transition-colors hover:border-lime/60 hover:text-lime">✓</button>
                        )}
                        {r.status !== "blocked" && (
                          <button onClick={() => act(r.id, "block")} title="ব্লক করুন"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 transition-colors hover:border-amberx/60 hover:text-amberx">⊘</button>
                        )}
                        <button onClick={() => act(r.id, "delete")} title="মুছে ফেলুন"
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 transition-colors hover:border-rose-400/60 hover:text-rose-300">🗑</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center text-[12.5px] text-white/35">এই সারিতে কোনো মন্তব্য নেই।</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      <div className="border-t border-white/8 px-5 py-3 font-mono-x text-[9px] tracking-[0.18em] text-white/30 uppercase">
        অনুমোদিত মন্তব্যই শুধু পাবলিক প্রতিবেদনে দেখা যায় · pending → approved → live
      </div>
    </div>
  );
}

/**
 * One comment as a card: the parent post's picture and headline give the
 * context, the comment itself is the body, and the same three actions are
 * available without switching to the table.
 */
function CommentCard({
  row,
  busy,
  onAct,
}: {
  row: CommentWithPost;
  busy: boolean;
  onAct: (id: string, action: "approve" | "block" | "delete") => void;
}) {
  const img = mediaUrl({
    media_path: row.postMediaPath ?? null,
    media_kind: row.postMediaKind ?? "image",
  } as never);
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" loading="lazy" className="h-11 w-16 shrink-0 rounded border border-white/12 object-cover" />
        ) : (
          <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded border border-dashed border-white/15 text-[9px] text-white/30">
            ছবি নেই
          </span>
        )}
        <div className="min-w-0">
          {row.postTitle ? (
            <Link
              href={`/post/${row.postSlug ?? row.post_id}`}
              className="line-clamp-2 text-[11.5px] leading-snug font-semibold text-sky-300/90 hover:underline"
            >
              {row.postTitle}
            </Link>
          ) : (
            <span className="text-[11.5px] text-white/35">পোস্ট পাওয়া যায়নি</span>
          )}
          <p className="font-mono-x text-[9px] tracking-[0.1em] text-white/30 uppercase">
            {row.postCategory ?? "—"} · {timeAgo(row.created_at)}
          </p>
        </div>
      </div>
      <div className="flex-1 px-3 py-2.5">
        <p className="text-[12px] font-semibold text-white/90">{row.author}</p>
        <p className="mt-0.5 line-clamp-4 text-[11.5px] leading-relaxed text-white/55">{row.body}</p>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-white/8 px-3 py-2">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9.5px] font-semibold ${STATUS_CLS[row.status] ?? STATUS_CLS.pending}`}>
          {STATUS_BN[row.status] ?? row.status}
        </span>
        {busy ? (
          <span className="text-[11px] text-white/40">· চলছে …</span>
        ) : (
          <div className="flex items-center gap-1.5">
            {row.status !== "approved" && (
              <button onClick={() => onAct(row.id, "approve")} title="অনুমোদন করুন"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 hover:border-lime/60 hover:text-lime">✓</button>
            )}
            {row.status !== "blocked" && (
              <button onClick={() => onAct(row.id, "block")} title="ব্লক করুন"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 hover:border-amberx/60 hover:text-amberx">⊘</button>
            )}
            <button onClick={() => onAct(row.id, "delete")} title="মুছে ফেলুন"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 hover:border-rose-400/60 hover:text-rose-300">🗑</button>
          </div>
        )}
      </div>
    </div>
  );
}
