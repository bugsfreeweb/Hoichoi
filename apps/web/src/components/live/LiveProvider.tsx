"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import type { LiveFeed, ReactionKind } from "@/lib/live-types";
import { REACTIONS } from "@/lib/live-types";
import { getReferrer, getSid, postJSON } from "@/lib/live-client";

type Burst = { id: number; emoji: string; dx: number };
export type ActionResult = { ok?: boolean; error?: string; status: number; wait?: number; moderation?: "pending" | "approved" };
type Feedback = { text: string; error: boolean } | null;

type LiveContextValue = {
  feed: LiveFeed;
  sid: string;
  connected: boolean;
  lastSync: number;
  fresh: string[];
  bursts: Burst[];
  follow: boolean;
  refresh: () => Promise<void>;
  react: (kind: ReactionKind) => void;
  comment: (name: string, body: string) => Promise<ActionResult>;
  like: (id: string) => void;
  liking: string[];
  vote: (pollId: string, optionId: string) => Promise<ActionResult>;
  ask: (name: string, body: string) => Promise<ActionResult>;
  upvote: (id: string) => void;
  share: (network: string) => void;
  play: (label: string) => void;
  toggleFollow: () => Promise<void>;
  notify: (text: string, error?: boolean) => void;
};

const LiveContext = createContext<LiveContextValue | null>(null);
export function useLive(): LiveContextValue {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive must be used inside <LiveProvider>");
  return ctx;
}
let burstSeq = 0;

const API_ERRORS: Record<string, string> = {
  too_fast: "একটু ধীরে — কয়েক সেকেন্ড পর আবার চেষ্টা করুন",
  disabled: "ডেস্ক এই সুবিধাটি আপাতত বন্ধ রেখেছে",
  not_found: "এই লাইভ ইভেন্টটি আর পাওয়া যাচ্ছে না",
  poll_not_found: "পোলটি বদলে গেছে — পাতা রিফ্রেশ করুন",
  bad_option: "পোলের অপশন বদলে গেছে — আবার চেষ্টা করুন",
};

export default function LiveProvider({ initial, children, poll = true }: { initial: LiveFeed; children: ReactNode; poll?: boolean }) {
  const [feed, setFeed] = useState(initial);
  const [sid, setSid] = useState("");
  const [connected, setConnected] = useState(true);
  const [lastSync, setLastSync] = useState(0);
  const [fresh, setFresh] = useState<string[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [follow, setFollow] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [liking, setLiking] = useState<string[]>([]);
  const slug = initial.event.slug;
  const feedRef = useRef(feed);
  const followRef = useRef(follow);
  const requestSeq = useRef(0);
  const pending = useRef(new Set<string>());
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => { feedRef.current = feed; }, [feed]);
  useEffect(() => { followRef.current = follow; }, [follow]);
  useEffect(() => { setFeed(initial); feedRef.current = initial; }, [initial]);
  useEffect(() => {
    setSid(getSid());
    setLastSync(Date.now());
    try { setFollow(localStorage.getItem(`hc-follow-${slug}`) === "1"); } catch {}
  }, [slug]);
  useEffect(() => {
    const handles = timers.current;
    return () => {
      handles.forEach(clearTimeout);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  const later = useCallback((fn: () => void, delay: number) => {
    const handle = setTimeout(() => { timers.current.delete(handle); fn(); }, delay);
    timers.current.add(handle);
  }, []);

  const notify = useCallback((text: string, error = false) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback({ text, error });
    feedbackTimer.current = setTimeout(() => setFeedback(null), 5000);
  }, []);

  const spawn = useCallback((emoji: string, count = 1) => {
    const items = Array.from({ length: count }, () => ({ id: ++burstSeq, emoji, dx: Math.round((Math.random() - 0.5) * 90) }));
    setBursts((b) => [...b.slice(-28), ...items]);
    const ids = new Set(items.map((b) => b.id));
    later(() => setBursts((b) => b.filter((x) => !ids.has(x.id))), 2100);
  }, [later]);

  const refresh = useCallback(async () => {
    const seq = ++requestSeq.current;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(`/api/live/${slug}?sid=${encodeURIComponent(sid || getSid())}`, { cache: "no-store", signal: controller.signal });
      if (!res.ok) throw new Error(String(res.status));
      const next = await res.json() as LiveFeed;
      if (seq !== requestSeq.current) return;
      const prev = feedRef.current;
      const oldIds = new Set(prev.updates.map((u) => u.id));
      const added = next.updates.filter((u) => !oldIds.has(u.id));
      if (added.length) {
        const ids = added.map((u) => u.id);
        setFresh((f) => [...new Set([...f, ...ids])]);
        later(() => setFresh((f) => f.filter((id) => !ids.includes(id))), 7000);
        if (followRef.current && typeof Notification !== "undefined" && Notification.permission === "granted") {
          for (const u of added.filter((u) => u.kind === "breaking" || u.kind === "key").slice(0, 2)) {
            try { new Notification(`হৈচৈ লাইভ · ${next.event.kicker}`, { body: u.title || u.body.slice(0, 100), icon: "/logo.png", tag: `hc-${u.id}` }); } catch {}
          }
        }
      }
      for (const r of REACTIONS) {
        const delta = next.reactions[r.kind] - prev.reactions[r.kind];
        if (delta > 0) spawn(r.emoji, Math.min(delta, 4));
      }
      feedRef.current = next;
      setFeed(next);
      setConnected(true);
      setLastSync(Date.now());
    } catch {
      if (seq === requestSeq.current) setConnected(false);
    } finally { clearTimeout(timeout); }
  }, [slug, sid, later, spawn]);

  // Restore this reader's vote / likes immediately, not after the first polling interval.
  useEffect(() => { if (sid) void refresh(); }, [sid, refresh]);
  useEffect(() => {
    if (!poll) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const ms = Math.max(4, feed.refreshSeconds || 8) * 1000;
    const loop = async () => {
      if (!document.hidden) await refresh();
      if (!stopped) timer = setTimeout(loop, ms);
    };
    timer = setTimeout(loop, ms);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => { stopped = true; clearTimeout(timer); document.removeEventListener("visibilitychange", visible); };
  }, [poll, refresh, feed.refreshSeconds]);
  useEffect(() => {
    if (!sid) return;
    const beat = () => { if (!document.hidden) void postJSON(`/api/live/${slug}`, { action: "heartbeat", sid, referrer: getReferrer() }); };
    beat();
    const timer = setInterval(beat, 20_000);
    return () => clearInterval(timer);
  }, [sid, slug]);

  const act = useCallback(async (payload: Record<string, unknown>) => {
    const result = await postJSON<ActionResult>(`/api/live/${slug}`, { ...payload, sid: sid || getSid(), referrer: getReferrer() });
    if (result.error) result.error = API_ERRORS[result.error] || result.error;
    return result;
  }, [sid, slug]);

  const react = useCallback((kind: ReactionKind) => {
    spawn(REACTIONS.find((r) => r.kind === kind)?.emoji || "👍");
    setFeed((f) => ({ ...f, reactions: { ...f.reactions, [kind]: f.reactions[kind] + 1 }, totals: { ...f.totals, reactions: f.totals.reactions + 1 } }));
    void act({ action: "react", kind }).then((r) => {
      if (!r.ok) {
        notify(r.error || "রিঅ্যাকশন সংরক্ষণ করা যায়নি", true);
        setFeed((f) => ({ ...f, reactions: { ...f.reactions, [kind]: Math.max(0, f.reactions[kind] - 1) }, totals: { ...f.totals, reactions: Math.max(0, f.totals.reactions - 1) } }));
      }
    });
  }, [act, spawn, notify]);

  const comment = useCallback(async (name: string, body: string) => {
    const r = await act({ action: "comment", name, body });
    if (r.ok) await refresh();
    return r;
  }, [act, refresh]);

  const like = useCallback((id: string) => {
    const key = `like-${id}`;
    const before = feedRef.current.comments.find((c) => c.id === id);
    if (pending.current.has(key) || !before) return;
    pending.current.add(key);
    setLiking((ids) => [...ids, id]);
    setFeed((f) => ({ ...f, comments: f.comments.map((c) => c.id === id ? { ...c, liked: !c.liked, likes: Math.max(0, c.likes + (c.liked ? -1 : 1)) } : c) }));
    void act({ action: "like", targetId: id }).then(async (r) => {
      if (!r.ok) {
        setFeed((f) => ({ ...f, comments: f.comments.map((c) => c.id === id ? { ...c, liked: before.liked, likes: before.likes } : c) }));
        notify(r.error || "পছন্দ সংরক্ষণ করা যায়নি", true);
      }
      await refresh();
      pending.current.delete(key);
      setLiking((ids) => ids.filter((target) => target !== id));
    });
  }, [act, refresh, notify]);

  const vote = useCallback(async (pollId: string, optionId: string) => {
    const before = feedRef.current.poll;
    setFeed((f) => !f.poll || f.poll.id !== pollId || f.poll.myVote ? f : ({ ...f, poll: { ...f.poll, myVote: optionId, total: f.poll.total + 1, options: f.poll.options.map((o) => o.id === optionId ? { ...o, votes: o.votes + 1 } : o) } }));
    const r = await act({ action: "vote", pollId, optionId });
    if (!r.ok) setFeed((f) => ({ ...f, poll: before }));
    await refresh();
    return r;
  }, [act, refresh]);

  const ask = useCallback(async (name: string, body: string) => {
    const r = await act({ action: "question", name, body });
    if (r.ok) await refresh();
    return r;
  }, [act, refresh]);

  const upvote = useCallback((id: string) => {
    const key = `upvote-${id}`;
    if (pending.current.has(key) || feedRef.current.questions.find((q) => q.id === id)?.voted) return;
    pending.current.add(key);
    setFeed((f) => ({ ...f, questions: f.questions.map((q) => q.id === id ? { ...q, voted: true, upvotes: q.upvotes + 1 } : q) }));
    void act({ action: "upvote", targetId: id }).then(async (r) => {
      pending.current.delete(key);
      if (!r.ok) { notify(r.error || "ভোট সংরক্ষণ করা যায়নি", true); await refresh(); }
    });
  }, [act, refresh, notify]);

  const share = useCallback((network: string) => {
    setFeed((f) => ({ ...f, totals: { ...f.totals, shares: f.totals.shares + 1 } }));
    void act({ action: "share", network });
  }, [act]);
  const play = useCallback((label: string) => { void act({ action: "play", network: label }); }, [act]);

  const toggleFollow = useCallback(async () => {
    const next = !followRef.current;
    followRef.current = next;
    setFollow(next);
    try { localStorage.setItem(`hc-follow-${slug}`, next ? "1" : "0"); } catch {}
    notify(next ? "ইভেন্ট ফলো করছেন — গুরুত্বপূর্ণ আপডেট এখানেই পাবেন" : "এই ইভেন্ট ফলো করা বন্ধ হয়েছে");
    // Don't block the button while the browser's permission prompt is open.
    if (next && typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission().then((p) => {
        if (p !== "granted") notify("ফলো সক্রিয়। ব্রাউজার নোটিফিকেশন বন্ধ থাকায় আপডেট এই পাতাতেই দেখাবে।");
      }).catch(() => {});
    }
  }, [slug, notify]);

  const value = useMemo<LiveContextValue>(() => ({ feed, sid, connected, lastSync, fresh, bursts, follow, refresh, react, comment, like, vote, ask, upvote, share, play, toggleFollow, notify, liking }), [feed, sid, connected, lastSync, fresh, bursts, follow, refresh, react, comment, like, vote, ask, upvote, share, play, toggleFollow, notify, liking]);

  return (
    <LiveContext.Provider value={value}>
      {children}
      {feedback && (
        <div role={feedback.error ? "alert" : "status"} className="toast-in fixed top-14 right-4 z-[68] flex max-w-[min(360px,calc(100vw-32px))] items-start gap-3 border border-ink/20 bg-paper px-4 py-3 text-[13px] text-ink shadow-xl">
          <span className={feedback.error ? "font-bold text-alizarin" : "font-bold text-lime"}>{feedback.error ? "!" : "✓"}</span>
          <p className="flex-1 leading-snug">{feedback.text}</p>
          <button type="button" aria-label="বার্তা বন্ধ করুন" onClick={() => setFeedback(null)} className="text-ink-soft hover:text-ink"><X size={14} /></button>
        </div>
      )}
    </LiveContext.Provider>
  );
}
