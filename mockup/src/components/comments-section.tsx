"use client";

import { useRef, useState } from "react";
import { MessageCircle, Heart, Send, ShieldCheck, Loader2 } from "lucide-react";
import { agoBn, toBn } from "@/lib/format";
import type { CommentLite } from "@/lib/data";

type RichComment = CommentLite;

const likedKey = (id: number) => `hoichoi-liked-${id}`;

export default function CommentsSection({
  articleId,
  initial,
}: {
  articleId: number;
  initial: RichComment[];
}) {
  const [comments, setComments] = useState<RichComment[]>(initial);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, author: author.trim(), body: body.trim() }),
      });
      const json = (await res.json()) as { ok: boolean; comment?: CommentLite; error?: string };
      if (!json.ok || !json.comment) throw new Error(json.error ?? "ব্যর্থ");
      setComments((c) => [json.comment!, ...c]);
      setBody("");
      setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "মন্তব্য পাঠানো যায়নি");
    } finally {
      setBusy(false);
    }
  };

  const like = (id: number) => {
    setComments((cs) =>
      cs.map((c) => {
        if (c.id !== id) return c;
        const liked = typeof window !== "undefined" && localStorage.getItem(likedKey(id)) === "1";
        if (liked) localStorage.removeItem(likedKey(id));
        else if (typeof window !== "undefined") localStorage.setItem(likedKey(id), "1");
        return { ...c, likes: Math.max(0, c.likes + (liked ? -1 : 1)) };
      }),
    );
  };

  const isLiked = (id: number) =>
    typeof window !== "undefined" && localStorage.getItem(likedKey(id)) === "1";

  return (
    <section className="mx-auto mt-20 max-w-4xl border-t-2 border-ink pt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-serif-bn text-[26px] font-black text-ink">
          <MessageCircle size={20} className="text-alizarin" />
          পাঠকের মন্তব্য
          <span className="font-mono-x text-[13px] text-ink-soft">
            ({toBn(comments.length)})
          </span>
        </h2>
        <span className="flex items-center gap-1.5 rounded-full border border-ink/20 px-3 py-1 text-[10.5px] font-semibold text-ink-soft">
          <ShieldCheck size={11.5} className="text-alizarin" />
          পাবলিক · অটো-মডারেশন চালু
        </span>
      </div>

      {/* form */}
      <form
        onSubmit={submit}
        className="mt-6 border-[1.5px] border-ink bg-paper-deep/50 p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={60}
            placeholder="আপনার নাম"
            className="border border-ink/25 bg-paper px-3.5 py-2.5 text-[13px] outline-none transition-colors focus:border-ink"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={800}
            rows={2}
            placeholder="সম্মানজনক ভাষায় আপনার মন্তব্য লিখুন… (সর্বোচ্চ ৮০০ অক্ষর)"
            className="flex-1 resize-none border border-ink/25 bg-paper px-3.5 py-2.5 text-[13px] leading-relaxed outline-none transition-colors focus:border-ink"
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[10.5px] text-ink-soft">
            {error ? (
              <span className="font-semibold text-alizarin">⚠ {error}</span>
            ) : (
              "প্রতিবেদনের সত্যতা-যাচাই নীতি অনুযায়ী আপত্তিকর মন্তব্য অপসারিত হয়।"
            )}
          </p>
          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="flex items-center gap-2 bg-ink px-5 py-2.5 text-[12.5px] font-bold text-paper transition-colors duration-300 hover:bg-alizarin disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            মন্তব্য পাঠান
          </button>
        </div>
      </form>

      {/* list */}
      <div ref={listRef} className="mt-6 space-y-4">
        {comments.map((c) => (
          <article key={c.id} className="border border-ink/15 bg-paper p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-serif-bn text-[13px] font-black text-paper">
                  {c.author.slice(0, 1)}
                </span>
                <div>
                  <p className="text-[13px] font-bold text-ink">{c.author}</p>
                  <p className="font-mono-x text-[9.5px] tracking-wide text-ink-soft">
                    {agoBn(c.createdAt)} · মডারেটেড ✓
                  </p>
                </div>
              </div>
              <button
                onClick={() => like(c.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-all duration-300 ${
                  isLiked(c.id)
                    ? "border-alizarin bg-alizarin/10 text-alizarin"
                    : "border-ink/20 text-ink-soft hover:border-alizarin hover:text-alizarin"
                }`}
              >
                <Heart
                  size={12}
                  className={isLiked(c.id) ? "fill-alizarin text-alizarin" : ""}
                />
                {toBn(c.likes)}
              </button>
            </div>
            <p className="mt-3 text-[13.5px] leading-[1.85] whitespace-pre-line text-ink/85">
              {c.body}
            </p>
          </article>
        ))}
        {comments.length === 0 && (
          <p className="border border-dashed border-ink/25 py-10 text-center text-[13px] text-ink-soft">
            এখনো কোনো মন্তব্য নেই — প্রথম মন্তব্যটি আপনিই করুন।
          </p>
        )}
      </div>
    </section>
  );
}
