"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MessageCircle, Send, ShieldCheck, Loader2, Check, RefreshCw } from "lucide-react";
import { agoBn, toBn } from "@/lib/format";
import type { PublicComment } from "@/lib/moderation-types";

export default function CommentsSection({ articleId, initial }: { articleId: number; initial: PublicComment[] }) {
  const [comments, setComments] = useState(initial);
  const [author, setAuthor] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    async function refresh() {
      if (document.hidden || loading) return;
      loading = true;
      try {
        const response = await fetch(`/api/comments?articleId=${articleId}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Unavailable");
        const data = await response.json();
        setComments(data.comments);
        setRefreshError(false);
      } catch { if (!controller.signal.aborted) setRefreshError(true); }
      finally { loading = false; }
    }
    refresh();
    const timer = setInterval(refresh, 10_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [articleId, retry]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    const website = new FormData(event.currentTarget).get("website");
    try {
      const response = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleId, author: author.trim(), email: email.trim(), body: body.trim(), website }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "মন্তব্য পাঠানো যায়নি।");
      setBody(""); setMessage(data.message);
    } catch (e) { setError(e instanceof Error ? e.message : "আবার চেষ্টা করুন।"); }
    finally { setBusy(false); }
  }

  return <section id="comments" className="mx-auto mt-20 max-w-4xl scroll-mt-20 border-t-2 border-ink pt-10">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-3 font-serif-bn text-[26px] font-black"><MessageCircle size={23} className="text-alizarin" />পাঠকের কথায় <span className="font-mono-x text-sm text-ink-soft">({toBn(comments.length)})</span></h2>
      <span className="flex items-center gap-2 rounded-full border border-ink/20 px-3 py-1 text-xs text-ink-soft"><ShieldCheck size={13} />অনুমোদনের পর প্রকাশিত</span>
    </div>
    <p className="mt-3 text-sm leading-relaxed text-ink-soft">মতামত দিন, ব্যক্তিগত আক্রমণ নয়। প্রতিটি নতুন মন্তব্য সম্পাদকীয় পর্যালোচনার পর প্রকাশ করা হয়।</p>
    <form onSubmit={submit} className="mt-6 border border-ink/20 bg-paper-deep/40 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-[190px_1fr]">
        <label className="text-sm font-semibold">আপনার নাম<input required minLength={2} maxLength={60} autoComplete="name" value={author} onChange={e => setAuthor(e.target.value)} placeholder="নাম লিখুন" className="mt-2 w-full border border-ink/20 bg-paper px-3 py-3 outline-none focus:border-alizarin" /></label>
        <label className="text-sm font-semibold">ইমেইল <span className="font-normal text-ink-soft">(প্রকাশিত হয় না)</span><input type="email" required maxLength={120} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="mt-2 w-full border border-ink/20 bg-paper px-3 py-3 outline-none focus:border-alizarin" /></label>
        <label className="text-sm font-semibold sm:col-span-2">আপনার মতামত<textarea required minLength={2} maxLength={800} rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder="এই প্রতিবেদন নিয়ে আপনি কী ভাবছেন?" className="mt-2 w-full resize-y border border-ink/20 bg-paper px-3 py-3 outline-none focus:border-alizarin" /></label>
      </div>
      <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-ink-soft">{toBn(body.length)} / ৮০০ অক্ষর · ইমেইল প্রকাশ করা হয় না</span><button disabled={busy} className="flex items-center gap-2 bg-ink px-4 py-3 text-sm font-semibold text-paper transition-colors hover:bg-alizarin disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}মন্তব্য জমা দিন</button></div>
      {message && <p role="status" className="mt-4 flex items-center gap-2 border border-green-700/20 bg-green-700/5 p-3 text-sm text-green-800"><Check size={16} />{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-alizarin">{error}</p>}
    </form>
    {refreshError && <button onClick={() => setRetry(n => n + 1)} className="mt-4 flex items-center gap-2 text-xs text-alizarin"><RefreshCw size={12} />সর্বশেষ মন্তব্য লোড হয়নি · আবার চেষ্টা করুন</button>}
    <div className="mt-6 divide-y divide-ink/15">
      {comments.map(c => <article key={c.id} className="py-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-serif-bn font-bold text-paper">{Array.from(c.author)[0]}</span><div><p className="text-sm font-semibold">{c.author}</p><p className="mt-0.5 text-xs text-ink-soft">{agoBn(c.createdAt)} · সম্পাদক অনুমোদিত</p></div></div><p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-7 text-ink/85">{c.body}</p></article>)}
      {!comments.length && <div className="py-10 text-center text-sm text-ink-soft">এখনো কোনো অনুমোদিত মন্তব্য নেই। আপনার মতামত দিয়ে আলোচনা শুরু করুন।</div>}
    </div>
  </section>;
}
