"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/admin/ui/toast";

type State = "ok" | "warn" | "down";

interface Service {
  key: string;
  label: string;
  state: State;
  detail: string;
  href: string;
}

interface StatusPayload {
  ok: boolean;
  generatedAt: string;
  latencyMs: number;
  services: Service[];
}

const DOT: Record<State, string> = {
  ok: "bg-cat-teal",
  warn: "bg-amberx",
  down: "bg-alizarin",
};

const LABEL: Record<State, string> = {
  ok: "সক্রিয়",
  warn: "সতর্কতা",
  down: "বন্ধ",
};

/**
 * Service health strip for the console.
 *
 * Every destructive or slow action in the admin depends on something outside the
 * page: the DB, a text provider, an image provider, the pipeline runner and the
 * media store. Previously those were invisible until an action failed; this
 * strip polls one endpoint and announces state changes (down and recovered) as
 * toasts, so a broken dependency is visible before the next click.
 */
export function SystemStatusBar({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const previous = useRef<Map<string, State>>(new Map());

  const load = useCallback(
    async (announce: boolean) => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/system-status", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as StatusPayload | { error?: string } | null;
        if (!res.ok || !json || !("services" in json)) {
          throw new Error((json as { error?: string } | null)?.error ?? `HTTP ${res.status}`);
        }
        setData(json);
        setError(null);
        if (announce) {
          for (const s of json.services) {
            const before = previous.current.get(s.key);
            if (before && before !== s.state && s.state !== "ok") {
              toast.error(`⚠ ${s.label} — ${LABEL[s.state]}`, s.detail);
            } else if (before && before !== "ok" && s.state === "ok") {
              toast.success(`✓ ${s.label} আবার সক্রিয়`, s.detail);
            }
            previous.current.set(s.key, s.state);
          }
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void load(false);
    const t = setInterval(() => void load(true), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const worst: State = !data
    ? "warn"
    : data.services.some((s) => s.state === "down")
      ? "down"
      : data.services.some((s) => s.state === "warn")
        ? "warn"
        : "ok";

  const summary = !data
    ? "সার্ভিস যাচাই হচ্ছে…"
    : worst === "ok"
      ? "সব সার্ভিস সক্রিয়"
      : worst === "warn"
        ? "কিছু সার্ভিসে সতর্কতা"
        : "একটি সার্ভিস বন্ধ";

  return (
    <div className={`border-b border-ink/10 bg-paper-deep/60 ${compact ? "" : "mt-0"}`}>
      <div className="mx-auto flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-1.5 md:px-6">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-[10.5px] font-bold text-ink"
          aria-expanded={open}
        >
          <span className={`h-2 w-2 rounded-full ${DOT[worst]} ${worst !== "ok" ? "animate-pulse" : ""}`} />
          <span className="font-mono-x tracking-[0.14em] uppercase">{summary}</span>
          <span className="text-ink-soft" aria-hidden>
            {open ? "▴" : "▾"}
          </span>
        </button>

        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {(data?.services ?? []).map((s) => (
            <Link
              key={s.key}
              href={s.href}
              title={s.detail}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink/15 bg-paper px-2 py-0.5 text-[10px] text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${DOT[s.state]}`} />
              {s.label}
            </Link>
          ))}
          {!data && !error && (
            <span className="flex items-center gap-1.5 text-[10px] text-ink-soft">
              <Loader2 size={10} className="animate-spin" /> যাচাই হচ্ছে…
            </span>
          )}
          {error && <span className="text-[10px] font-bold text-alizarin">✕ স্ট্যাটাস আনা যায়নি: {error}</span>}
        </div>

        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading}
          className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
          title="এখনই যাচাই করুন"
        >
          <RefreshCw size={10} className={loading ? "animate-spin" : ""} /> যাচাই
        </button>
      </div>

      {open && data && (
        <div className="mx-auto grid w-full gap-1 px-4 pb-2 md:grid-cols-2 md:px-6 xl:grid-cols-3">
          {data.services.map((s) => (
            <Link
              key={s.key}
              href={s.href}
              className="flex items-start gap-2 border border-ink/12 bg-paper px-2.5 py-1.5 transition-colors hover:border-ink/35"
            >
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${DOT[s.state]}`} />
              <span className="min-w-0">
                <span className="block text-[11.5px] font-bold text-ink">
                  {s.label} <span className="font-mono-x text-[9.5px] font-normal text-ink-soft">· {LABEL[s.state]}</span>
                </span>
                <span className="block truncate text-[10.5px] text-ink-soft" title={s.detail}>
                  {s.detail}
                </span>
              </span>
            </Link>
          ))}
          <p className="col-span-full font-mono-x text-[9.5px] text-ink-soft/70">
            শেষ যাচাই {new Date(data.generatedAt).toLocaleTimeString("bn-BD")} · {data.latencyMs} ms · প্রতি ৩০ সেকেন্ডে
            স্বয়ংক্রিয়
          </p>
        </div>
      )}
    </div>
  );
}
