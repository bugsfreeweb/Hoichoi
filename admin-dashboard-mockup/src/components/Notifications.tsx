import { useEffect, useRef, useState } from "react";
import { TAB_LABEL, useApp, type Notif, type TabId } from "../context/AppContext";
import { toBn } from "../lib/hooks";
import { cn } from "../utils/cn";

const TONE: Record<Notif["tone"], string> = {
  good: "#34d399",
  warn: "#f5a524",
  bad: "#fb7185",
  info: "#22d3ee",
  brand: "#a855f7",
};

/** Functional notification bell with dropdown, unread badge, filters and actions. */
export function NotificationBell({ onNavigate }: { onNavigate: (t: TabId) => void }) {
  const { state, markRead, markAll, clearAll, removeNotif } = useApp();
  const { notifs } = state;
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [shake, setShake] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.read).length;
  const prevUnread = useRef(unread);

  // ring the bell whenever a new unread notification arrives
  useEffect(() => {
    if (unread > prevUnread.current) {
      setShake(true);
      prevUnread.current = unread;
      const t = window.setTimeout(() => setShake(false), 900);
      return () => window.clearTimeout(t);
    }
    prevUnread.current = unread;
    return undefined;
  }, [unread]);

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const list = filter === "unread" ? notifs.filter((n) => !n.read) : notifs;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="notifications"
        className={cn(
          "relative grid h-9 w-9 place-items-center rounded-xl border bg-white/[0.03] text-[15px] transition-colors duration-300",
          open ? "border-amber-brand/50 bg-amber-brand/10" : "border-white/10 hover:border-amber-brand/40",
          shake && "bell-ring",
        )}
      >
        🔔
        {unread > 0 && (
          <span
            key={unread}
            className="anim-pop absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-brand px-1 text-[9.5px] font-bold text-white shadow-[0_0_12px_rgba(251,113,133,0.7)]"
          >
            {unread > 9 ? "৯+" : toBn(unread)}
          </span>
        )}
      </button>

      {open && (
        <div className="anim-pop absolute right-0 top-[calc(100%+10px)] z-50 w-[370px] max-w-[calc(100vw-2rem)] origin-top-right">
          <div className="panel overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]">
            <div className="flex items-center gap-2 border-b border-white/7 px-4 py-3">
              <div>
                <div className="bn text-[13.5px] font-semibold">নোটিফিকেশন</div>
                <div className="mono text-[9px] uppercase tracking-widest text-white/35">
                  {unread} unread · live feed
                </div>
              </div>
              <div className="ml-auto flex gap-1">
                <button
                  onClick={markAll}
                  disabled={unread === 0}
                  className="bn rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-300 transition hover:bg-emerald-400/20 disabled:opacity-30"
                >
                  সব পড়া
                </button>
                <button
                  onClick={clearAll}
                  disabled={notifs.length === 0}
                  className="bn rounded-md border border-rose-400/25 bg-rose-400/10 px-2 py-1 text-[10px] text-rose-300 transition hover:bg-rose-400/20 disabled:opacity-30"
                >
                  মুছুন
                </button>
              </div>
            </div>

            <div className="flex gap-1 border-b border-white/5 px-3 py-2">
              {(["all", "unread"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "mono rounded-md px-2.5 py-1 text-[10px] uppercase tracking-wider transition",
                    filter === f ? "bg-white/10 text-white" : "text-white/40 hover:text-white/75",
                  )}
                >
                  {f === "all" ? `All · ${notifs.length}` : `Unread · ${unread}`}
                </button>
              ))}
            </div>

            <div className="max-h-[380px] overflow-y-auto p-2">
              {list.length === 0 && (
                <div className="anim-fade py-10 text-center">
                  <div className="text-2xl">✨</div>
                  <div className="bn mt-2 text-[12px] text-white/40">
                    {filter === "unread" ? "কোনো অপঠিত নোটিফিকেশন নেই" : "সব পরিষ্কার — নতুন কিছু নেই"}
                  </div>
                </div>
              )}
              {list.map((n, i) => {
                const c = TONE[n.tone];
                return (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      markRead(n.id);
                      if (n.tab) {
                        onNavigate(n.tab);
                        setOpen(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        markRead(n.id);
                        if (n.tab) {
                          onNavigate(n.tab);
                          setOpen(false);
                        }
                      }
                    }}
                    className={cn(
                      "group relative mb-1 flex w-full cursor-pointer gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.06]",
                      !n.read && "bg-white/[0.03]",
                    )}
                    style={{ animation: `floatUp .4s ease ${i * 40}ms both` }}
                  >
                    {!n.read && (
                      <span
                        className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
                        style={{ background: c, boxShadow: `0 0 8px ${c}` }}
                      />
                    )}
                    <span
                      className="ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[14px]"
                      style={{ background: `${c}1f`, color: c }}
                    >
                      {n.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={cn("bn truncate text-[12.5px]", n.read ? "text-white/55" : "font-semibold text-white/92")}>
                        {n.title}
                      </div>
                      <p className="bn mt-0.5 text-[11px] leading-snug text-white/45">{n.body}</p>
                      <div className="mono mt-1 flex items-center gap-2 text-[9px] text-white/30">
                        <span>{n.time}</span>
                        {n.tab && (
                          <span className="uppercase tracking-wider" style={{ color: c }}>
                            → {TAB_LABEL[n.tab]}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotif(n.id);
                      }}
                      aria-label="dismiss"
                      className="self-start rounded-md px-1.5 py-0.5 text-[11px] text-white/25 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mono flex justify-between border-t border-white/7 px-4 py-2 text-[9px] uppercase tracking-widest text-white/25">
              <span>auto-refresh · 24s</span>
              <span>{notifs.length} total</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
