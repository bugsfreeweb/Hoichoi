"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Trash2 } from "lucide-react";
import type { AdminNotification } from "@hoichoi/db";
import { Card, CardHead } from "./ui/Card";

/**
 * The full alert list, one line per event.
 *
 * The bell only holds the newest handful. This is the screen you open when you
 * want to know what happened while you were away — and it exists because the
 * dropdown had become that screen by accident: it rendered every alert ever
 * written, bodies and all, until it was long enough that nothing in it could be
 * found.
 *
 * A row is: severity, title, age. The body and its link open on demand. Clearing
 * removes what has been read, and removing one row is a deliberate click rather
 * than a side effect of reading it.
 */

const SEVERITY: Record<string, { dot: string; label: string }> = {
  critical: { dot: "bg-alizarin", label: "জরুরি" },
  warn: { dot: "bg-amberx", label: "সতর্কতা" },
  info: { dot: "bg-cat-blue", label: "তথ্য" },
};

function ageBn(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return iso.slice(0, 10);
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (mins < 1) return "এইমাত্র";
  if (mins < 60) return `${mins} মিনিট আগে`;
  if (mins < 1440) return `${Math.round(mins / 60)} ঘণ্টা আগে`;
  return `${Math.round(mins / 1440)} দিন আগে`;
}

export function NotificationList({
  alerts,
  total,
  unread,
}: {
  alerts: AdminNotification[];
  total: number;
  unread: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function call(fn: () => Promise<Response>, done: string): Promise<void> {
    setBusy(true);
    try {
      const res = await fn();
      if (res.ok) {
        setMsg(done);
        router.refresh();
      } else {
        setMsg("ব্যর্থ হয়েছে — আবার চেষ্টা করুন।");
      }
    } catch {
      setMsg("ব্যর্থ হয়েছে — সংযোগ দেখুন।");
    } finally {
      setBusy(false);
      window.setTimeout(() => setMsg(null), 3500);
    }
  }

  const post = (body: Record<string, unknown>) =>
    fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  return (
    <Card>
      <CardHead
        emoji="🔔"
        title="সব নোটিফিকেশন"
        kicker={`${total} TOTAL · ${unread} UNREAD`}
        note="এক লাইনেই সব — বিস্তারিত দেখতে সারিতে ক্লিক করুন। পুরোনো, পড়া হয়ে যাওয়া সারি “পরিষ্কার” দিয়ে সরিয়ে ফেলা যায়।"
        actions={
          <>
            {unread > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void call(() => post({ all: true }), "সব পড়া হিসেবে চিহ্নিত হয়েছে")}
                className="rounded-lg border border-ink/25 px-3 py-1.5 text-[12px] font-bold text-ink hover:border-ink disabled:opacity-50"
              >
                সব পড়া হয়েছে
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void call(() => post({ clear: true }), "পড়া নোটিফিকেশন মুছে ফেলা হয়েছে")}
              className="rounded-lg border border-alizarin px-3 py-1.5 text-[12px] font-bold text-alizarin hover:bg-alizarin hover:text-on-accent disabled:opacity-50"
            >
              পরিষ্কার (পড়া)
            </button>
          </>
        }
      />
      {msg && (
        <p className="border-b border-ink/10 bg-cat-teal/[0.08] px-4 py-2 text-[12px] font-semibold text-ink">
          {msg}
        </p>
      )}
      <ul className="divide-y divide-ink/10">
        {alerts.length === 0 && (
          <li className="px-4 py-12 text-center text-[13px] text-ink-soft">
            কোনো নোটিফিকেশন নেই। নতুন কিছু ঘটলে এখানে জমা হবে।
          </li>
        )}
        {alerts.map((a) => {
          const sev = SEVERITY[a.severity] ?? SEVERITY.info!;
          const isOpen = open === a.id;
          return (
            <li key={a.id} className={a.read_at ? "opacity-75" : ""}>
              <div className="flex items-start gap-2 px-4 py-2.5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${sev.dot}`} aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : a.id)}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-start gap-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-ink">{a.title_bn}</span>
                      <span className="font-mono-x text-[9px] tracking-[0.14em] text-ink-soft uppercase">
                        {sev.label} · {a.kind}
                      </span>
                      {!a.read_at && (
                        <span className="rounded-full bg-alizarin/15 px-1.5 py-0.5 font-mono-x text-[9px] font-bold text-alizarin">
                          নতুন
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block font-mono-x text-[10px] text-ink-soft">
                      {ageBn(a.created_at)} · {a.created_at.slice(0, 16).replace("T", " ")}
                    </span>
                  </span>
                  <ChevronDown
                    size={13}
                    className={`mt-1 shrink-0 text-ink-soft transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void call(
                      () => fetch(`/api/admin/notifications?id=${encodeURIComponent(a.id)}`, { method: "DELETE" }),
                      "সরিয়ে ফেলা হয়েছে",
                    )
                  }
                  aria-label={`${a.title_bn} — মুছে ফেলুন`}
                  title="মুছে ফেলুন"
                  className="mt-0.5 rounded-lg border border-ink/15 p-1.5 text-ink-soft hover:border-alizarin hover:text-alizarin disabled:opacity-40"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {isOpen && (
                <div className="px-4 pb-3 pl-8">
                  {a.body_bn ? (
                    <p className="text-[12.5px] leading-relaxed text-ink-soft">{a.body_bn}</p>
                  ) : (
                    <p className="text-[12px] text-ink-soft">বিস্তারিত লেখা নেই।</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {a.href && (
                      <Link href={a.href} className="text-[12px] font-bold text-alizarin underline">
                        খুলুন →
                      </Link>
                    )}
                    {!a.read_at && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void call(() => post({ id: a.id }), "পড়া হয়েছে")}
                        className="text-[12px] text-ink-soft underline hover:text-ink disabled:opacity-50"
                      >
                        পড়া হয়েছে
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
