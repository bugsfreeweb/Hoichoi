"use client";

import { useState } from "react";
import type { LLMProviderRow } from "@hoichoi/shared-types";

export function ProviderRow({ provider, index }: { provider: LLMProviderRow; index: number }) {
  const [active, setActive] = useState(provider.is_active);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/providers/${provider.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: !active }),
      });
      if (res.ok) setActive(!active);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-ink/20 bg-paper-deep px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="font-grotesk text-lg font-bold text-ink-soft">{String(index).padStart(2, "0")}</span>
        <div>
          <p className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
            {provider.display_name}
            {provider.is_free_tier && (
              <span className="rounded-full bg-lime px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-ink">FREE</span>
            )}
          </p>
          <p className="font-mono-x text-[11px] text-ink-soft">
            {provider.provider_key} · {provider.model_name} · prio {provider.priority}
          </p>
          <p className="font-mono-x text-[10px] text-ink-soft/70">
            key: <span className={provider.api_key ? "text-cat-teal" : "text-ink-soft/50"}>{provider.api_key ? "DB override ✓" : `env → ${provider.api_key_env_var}`}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-mono-x text-[10.5px] ${provider.supports_embeddings ? "text-cat-blue" : "text-ink-soft/60"}`}>
          {provider.supports_embeddings ? "embed" : ""}
        </span>
        <button
          onClick={toggle}
          disabled={busy}
          className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-paper transition disabled:opacity-50 ${active ? "bg-cat-teal" : "bg-ink-soft"}`}
        >
          {active ? "Active" : "Paused"}
        </button>
      </div>
    </div>
  );
}