"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";

/**
 * Card / list switch for the admin queues.
 *
 * Implemented as two links (not state) so the choice survives a refresh, can be
 * shared, and works in server components — every queue page here is rendered on
 * the server and its rows are client components, so a URL parameter is the only
 * place both halves agree on.
 *
 * `view=list` stays the default: operators asked for cards, not instead of the
 * dense list they already scan.
 */
export function ViewToggle({ labelBn }: { labelBn?: string }) {
  const path = usePathname();
  const params = useSearchParams();
  const current = params.get("view") === "card" ? "card" : "list";

  const href = (view: "card" | "list") => {
    const next = new URLSearchParams(params.toString());
    if (view === "list") next.delete("view");
    else next.set("view", view);
    const qs = next.toString();
    return qs ? `${path}?${qs}` : path;
  };

  const base =
    "flex items-center gap-1.5 border px-2.5 py-1.5 text-[11px] font-bold transition-colors";
  return (
    <div className="flex items-center gap-2">
      {labelBn && <span className="font-mono-x text-[9.5px] tracking-[0.16em] text-ink-soft uppercase">{labelBn}</span>}
      <div className="flex border border-ink/25">
        <Link
          href={href("card")}
          aria-current={current === "card"}
          className={`${base} ${current === "card" ? "border-0 bg-ink text-paper" : "border-0 text-ink-soft hover:bg-ink/[0.06]"}`}
        >
          <LayoutGrid size={12} /> কার্ড
        </Link>
        <Link
          href={href("list")}
          aria-current={current === "list"}
          className={`${base} ${current === "list" ? "border-0 bg-ink text-paper" : "border-0 text-ink-soft hover:bg-ink/[0.06]"}`}
        >
          <List size={12} /> লিস্ট
        </Link>
      </div>
    </div>
  );
}

/** Read the current view from Next's searchParams object (server side). */
export function viewFromSearch(sp: Record<string, string | string[] | undefined>): "card" | "list" {
  return sp.view === "card" ? "card" : "list";
}
