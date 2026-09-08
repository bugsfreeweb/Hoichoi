"use client";

import { useState } from "react";
import type { Source } from "@hoichoi/shared-types";

export function SourceRow({ source }: { source: Source }) {
  const [active, setActive] = useState(source.is_active);
  const [verified, setVerified] = useState(source.is_verified);
  const [busy, setBusy] = useState(false);

  async function patch(next: { is_active?: boolean; is_verified?: boolean }) {
    setBusy(true);
    try {
      const res = await fetch(`/api/sources/${source.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        if (typeof next.is_active === "boolean") setActive(next.is_active);
        if (typeof next.is_verified === "boolean") setVerified(next.is_verified);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-ink/20 bg-paper-deep px-4 py-3">
      <div className="min-w-0">
        <a href={source.page_url} target="_blank" rel="noreferrer" className="truncate text-[13.5px] font-bold text-ink hover:text-alizarin">
          {source.page_name}
        </a>
        <p className="truncate font-mono-x text-[11px] text-ink-soft">{source.page_url}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
          {source.category}
        </span>
        <Tag active={verified} onClick={() => patch({ is_verified: !verified })} busy={busy} label="Verified" />
        <Tag active={active} onClick={() => patch({ is_active: !active })} busy={busy} label={active ? "Active" : "Paused"} />
      </div>
    </div>
  );
}

function Tag({ active, onClick, busy, label }: { active: boolean; onClick: () => void; busy: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-paper transition disabled:opacity-50 ${active ? "bg-cat-teal" : "bg-ink-soft"}`}
    >
      {label}
    </button>
  );
}