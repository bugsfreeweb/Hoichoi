"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Comment } from "@hoichoi/shared-types";
import { agoBn, toBn } from "@/lib/format";

const Icons = {
  MessageCircle: (
    <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-alizarin" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
  ),
  ShieldCheck: (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
  ),
  Send: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
  ),
  Loader: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
  ),
  Check: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
  ),
  RefreshCw: (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
  ),
};

export function CommentsSection({
  postId,
  initial,
}: {
  postId: string;
  initial: Comment[];
}) {
  const [comments, setComments] = useState<Comment[]>(initial);
  const [author, setAuthor] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => setComments(initial), [postId]);

  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    async function refresh() {
      if (document.hidden || loading) return;
      loading = true;
      try {
        const response = await fetch(`/api/comments?postId=${encodeURIComponent(postId)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unavailable");
        const data = (await response.json()) as { comments?: Comment[] };
        if (Array.isArray(data.comments)) setComments(data.comments);
        setRefreshError(false);
      } catch {
        if (!controller.signal.aborted) setRefreshError(true);
      } finally {
        loading = false;
      }
    }
    refresh();
    const timer = setInterval(refresh, 10_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [postId, retry]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    const website = new FormData(event.currentTarget).get("website");
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          author: author.trim(),
          email: email.trim(),
          body: body.trim(),
          website,
        }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "মন্তব্য পাঠানো যায়নি।");
      setBody("");
      setMessage(data.message ?? "মন্তব্য জমা হয়েছে।");
    } catch (e) {
      setError(e instanceof Error ? e.message : "আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="comments" className="mt-20 border-t-2 border-ink pt-10" aria-label="মন্তব্য">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-serif-bn text-[26px] font-black text-ink">
          {Icons.MessageCircle}
          পাঠকের কথায় <span className="font-mono-x text-[13px] font-normal text-ink-soft">({toBn(comments.length)})</span>
        </h2>
        <span className="flex items-center gap-2 rounded-full border border-ink/20 px-3 py-1 text-[12px] text-ink-soft">
          {Icons.ShieldCheck}অনুমোদনের পর প্রকাশিত
        </span>
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
        মতামত দিন, ব্যক্তিগত আক্রমণ নয়। প্রতিটি নতুন মন্তব্য সম্পাদকীয় পর্যালোচনার পর প্রকাশ করা হয়।
      </p>

      <form onSubmit={submit} className="mt-6 border border-ink/20 bg-paper-deep/40 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[190px_1fr]">
          <label className="text-[13px] font-semibold text-ink">
            আপনার নাম
            <input
              required
              minLength={2}
              maxLength={60}
              autoComplete="name"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="নাম লিখুন"
              className="mt-2 w-full border border-ink/20 bg-paper px-3 py-3 text-[13.5px] outline-none focus:border-alizarin"
            />
          </label>
          <label className="text-[13px] font-semibold text-ink">
            ইমেইল <span className="font-normal text-ink-soft">(প্রকাশিত হয় না)</span>
            <input
              type="email"
              required
              maxLength={120}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full border border-ink/20 bg-paper px-3 py-3 text-[13.5px] outline-none focus:border-alizarin"
            />
          </label>
          <label className="text-[13px] font-semibold text-ink sm:col-span-2">
            আপনার মতামত
            <textarea
              required
              minLength={2}
              maxLength={800}
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="এই প্রতিবেদন নিয়ে আপনি কী ভাবছেন?"
              className="mt-2 w-full resize-y border border-ink/20 bg-paper px-3 py-3 text-[13.5px] outline-none focus:border-alizarin"
            />
          </label>
        </div>
        {/* honeypot — hidden from humans, bots fill it in */}
        <div className="hidden" aria-hidden="true">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11.5px] text-ink-soft">
            {toBn(body.length)} / ৮০০ অক্ষর · ইমেইল প্রকাশ করা হয় না
          </span>
          <button
            disabled={busy}
            className="flex items-center gap-2 bg-ink px-4 py-3 text-[13px] font-semibold text-paper transition-colors hover:bg-alizarin disabled:opacity-50"
          >
            {busy ? Icons.Loader : Icons.Send}
            মন্তব্য জমা দিন
          </button>
        </div>
        {message && (
          <p role="status" className="mt-4 flex items-center gap-2 border border-cat-teal/25 bg-cat-teal/10 p-3 text-[13px] font-semibold text-ink">
            {Icons.Check} {message}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-[13px] text-alizarin">
            {error}
          </p>
        )}
      </form>

      {refreshError && (
        <button
          onClick={() => setRetry((n) => n + 1)}
          className="mt-4 flex items-center gap-2 text-[11.5px] text-alizarin"
        >
          {Icons.RefreshCw}
          সর্বশেষ মন্তব্য লোড হয়নি · আবার চেষ্টা করুন
        </button>
      )}

      <div className="mt-6 divide-y divide-ink/15">
        {comments.map((c) => (
          <article key={c.id} className="py-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink font-serif-bn text-[14px] font-bold text-paper">
                {Array.from(c.author)[0]}
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-ink">{c.author}</p>
                <p className="mt-0.5 text-[12px] text-ink-soft">
                  {agoBn(c.created_at)} · সম্পাদক অনুমোদিত
                </p>
              </div>
            </div>
            <p className="mt-3 text-[15px] leading-7 break-words whitespace-pre-wrap text-ink/85">
              {c.body}
            </p>
          </article>
        ))}
        {!comments.length && (
          <div className="py-10 text-center text-[13px] text-ink-soft">
            এখনো কোনো অনুমোদিত মন্তব্য নেই। আপনার মতামত দিয়ে আলোচনা শুরু করুন।
          </div>
        )}
      </div>
    </section>
  );
}