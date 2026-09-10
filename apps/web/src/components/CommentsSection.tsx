"use client";

import { useEffect, useState } from "react";
import type { Comment } from "@hoichoi/shared-types";
import { relativeBn } from "@/lib/bn";

function bn(n: number): string {
  return n.toLocaleString("bn-BD");
}

export function CommentsSection({
  postId,
  initial,
}: {
  postId: string;
  initial: Comment[];
}) {
  const [comments, setComments] = useState<Comment[]>(initial);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => setComments(initial), [postId]);

  const submit = async () => {
    if (busy || author.trim().length < 2 || body.trim().length < 2) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, author: author.trim(), body: body.trim() }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        comment?: Comment;
        error?: string;
      };
      if (!json.ok || !json.comment) throw new Error(json.error ?? "ব্যর্থ");
      setAuthor("");
      setBody("");
      setNote("আপনার মন্তব্য মডারেশন সারিতে গেল — অনুমোদনের পর সবার জন্য দৃশ্যমান হবে।");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "ব্যর্থ — পরে আবার চেষ্টা করুন");
    } finally {
      setBusy(false);
    }
  };

return (
    <section className="mt-12 border-t-2 border-ink pt-6" aria-label="মন্তব্য">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-3 font-serif-bn text-[26px] font-black text-ink">
          <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-alizarin" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          পাঠকের কথায় <span className="font-mono-x text-sm font-normal text-ink-soft">({bn(comments.length)})</span>
        </h2>
        <span className="flex items-center gap-1.5 rounded-full border border-ink/20 px-3 py-1 text-[10.5px] font-semibold text-ink-soft">
          🛡 মন্তব্য অনুমোদনের পর দৃশ্যমান
        </span>
      </div>

      <div className="mt-4 border border-ink/20 bg-paper-deep/40 p-4">
        <div className="grid gap-2">
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="আপনার নাম"
            maxLength={60}
            className="w-full border border-ink/25 bg-paper px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-soft/60 focus:border-ink focus:outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="আপনার মতামত লিখুন…"
            rows={3}
            maxLength={1200}
            className="w-full border border-ink/25 bg-paper px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-soft/60 focus:border-ink focus:outline-none"
          />
        </div>
        {note && <p className="mt-2 text-[12px] font-semibold text-cat-teal">✓ {note}</p>}
        <div className="mt-3 flex items-center justify-between">
          <p className="max-w-md text-[11.5px] text-ink-soft/80">
            আপত্তিকর মন্তব্য অপসারিত হয়। সবার জন্য শালীন ভাষা ব্যবহার করুন।
          </p>
          <button
            onClick={submit}
            disabled={busy || author.trim().length < 2 || body.trim().length < 2}
            className="rounded-lg bg-ink px-4 py-2 text-[12.5px] font-bold text-paper transition-colors hover:bg-alizarin disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "· পাঠাচ্ছি …" : "মন্তব্য পাঠান →"}
          </button>
        </div>
      </div>

      <ul className="mt-6 divide-y divide-ink/10">
        {comments.map((c) => (
          <li key={c.id} className="py-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-serif-bn text-[13px] font-black text-paper">
                {c.author.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-ink">{c.author}</p>
                <p className="font-mono-x text-[9.5px] tracking-wide text-ink-soft">
                  {relativeBn(c.created_at)} · মডারেটেড ✓
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink/90">{c.body}</p>
              </div>
            </div>
          </li>
        ))}
        {comments.length === 0 && (
          <li className="py-10 text-center text-[13px] text-ink-soft">
            এখনো কোনো মন্তব্য নেই — প্রথমটি আপনিই লিখুন।
          </li>
        )}
      </ul>
    </section>
  );
}