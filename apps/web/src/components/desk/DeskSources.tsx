"use client";

import { useEffect, useState } from "react";
import type { Source } from "@hoichoi/shared-types";
import { CATEGORY_LABEL, CATEGORY_TINT } from "@/lib/format";

function toBn(v: number | string): string {
  return String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
}

function bnTime(d: string) {
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(d));
}

export default function DeskSources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/sources", { cache: "no-store" });
        const j = (await r.json()) as { sources?: Source[] };
        setSources(j.sources ?? []);
      } catch (e) {
        setErr(String(e));
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="font-serif-bn text-[15px] font-bold text-[var(--ds-t1)]">ওয়াচলিস্ট</p>
        <span className="font-mono-x text-[9px] tracking-[0.16em] text-[var(--ds-t5)] uppercase">
          {toBn(sources.length)} সোর্স
        </span>
      </div>

      {busy && (
        <div className="rounded-xl border border-[var(--ds-bd)] bg-[var(--ds-card)] p-8 text-center font-mono-x text-[11px] text-[var(--ds-t5)] uppercase">
          লোড হচ্ছে…
        </div>
      )}

      {!busy && err && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-[12px] text-rose-300">
          সোর্স লোড করা যায়নি: {err}
        </div>
      )}

      {!busy && !err && (
        <div className="grid gap-3 md:grid-cols-2">
          {sources.map((s) => {
            const slugs = [...new Set(s.categories.length ? s.categories : s.category ? [s.category] : [])];
            return (
              <div key={s.id} className="rounded-xl border border-[var(--ds-bd)] bg-[var(--ds-card)] p-4">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-mono-x text-[9px] font-bold uppercase ${
                      s.is_active ? "border-lime/30 bg-lime/10 text-lime" : "border-[var(--ds-bd)] text-[var(--ds-t5)]"
                    }`}
                  >
                    {s.is_verified ? "OK" : "PG"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <a
                      href={s.page_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-[13.5px] font-bold text-[var(--ds-t1)] hover:text-lime"
                    >
                      {s.page_name}
                    </a>
                    <p className="mt-0.5 truncate font-mono-x text-[10px] text-[var(--ds-t5)]">{s.page_url}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {slugs.map((slug) => (
                        <span
                          key={slug}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ds-bd-2)] px-2 py-0.5 text-[9.5px] text-[var(--ds-t4)]"
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: CATEGORY_TINT[slug] ?? "#fbbf24" }} />
                          {CATEGORY_LABEL[slug] ?? slug}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 font-mono-x text-[8.5px] ${
                      s.is_active
                        ? "border-lime/30 text-lime"
                        : "border-[var(--ds-bd-2)] text-[var(--ds-t5)]"
                    }`}
                  >
                    {s.is_active ? "WATCHING" : "PAUSED"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-x-4 gap-y-1 font-mono-x text-[10px] text-[var(--ds-t5)]">
                  <span>{s.is_verified ? "VERIFIED" : "UNVERIFIED"}</span>
                  {s.is_active && <span className="text-lime">ACTIVE</span>}
                  <span className="ml-auto">যোগ: {bnTime(s.created_at)}</span>
                </div>
              </div>
            );
          })}
          {sources.length === 0 && (
            <div className="col-span-full rounded-xl border border-[var(--ds-bd)] bg-[var(--ds-card)] p-10 text-center font-mono-x text-[11px] tracking-[0.14em] text-[var(--ds-t5)] uppercase">
              কোনো সোর্স নেই
            </div>
          )}
        </div>
      )}
    </div>
  );
}