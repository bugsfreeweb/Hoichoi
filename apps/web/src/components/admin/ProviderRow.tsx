"use client";

import { useState } from "react";
import type { LLMProviderRow } from "@hoichoi/shared-types";
import { useRouter } from "next/navigation";
import { metaFor, purposeLabelBn, looksLikeImageModel } from "@/lib/provider-catalog";
import { toBn } from "@/lib/format";

const fieldBase =
  "mt-1 w-full border border-ink/30 bg-paper px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-ink";

export function ProviderRow({
  provider,
  index,
  envKeyPresent,
}: {
  provider: LLMProviderRow;
  index: number;
  /** True when the row's env var exists on the server (value is never exposed). */
  envKeyPresent?: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(provider.is_active);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testRes, setTestRes] = useState<{ ok: boolean; text: string; preview?: string } | null>(null);
  const [form, setForm] = useState({
    display_name: provider.display_name,
    model_name: provider.model_name,
    base_url: provider.base_url ?? "",
    api_key: provider.api_key ?? "",
    api_key_env_var: provider.api_key_env_var,
    priority: provider.priority,
    is_free_tier: provider.is_free_tier,
    is_active: provider.is_active,
    supports_rewrite: provider.supports_rewrite,
    supports_embeddings: provider.supports_embeddings,
    purpose: provider.purpose,
  });

  const meta = metaFor(provider.provider_key);
  const hasKey = Boolean(provider.api_key) || Boolean(envKeyPresent);
  const isImage = provider.purpose === "image";
  const modelFitsPurpose = isImage ? looksLikeImageModel(provider.model_name) : !looksLikeImageModel(provider.model_name);
  const canImage = meta.kinds.includes("image");

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/providers/${provider.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: !active }),
      });
      if (res.ok) {
        setActive(!active);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/providers/${provider.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          display_name: form.display_name.trim() || undefined,
          model_name: form.model_name.trim() || undefined,
          base_url: form.base_url.trim() || null,
          api_key: form.api_key.trim() || null,
          api_key_env_var: form.api_key_env_var.trim() || undefined,
          priority: Number(form.priority),
          is_free_tier: form.is_free_tier,
          is_active: form.is_active,
          supports_rewrite: form.supports_rewrite,
          supports_embeddings: form.supports_embeddings,
          purpose: form.purpose,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setActive(form.is_active);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Run THIS row only (no chain fallback) so its real error is visible.
   * Without this, a broken Gemini row silently fell through to the keyless
   * Pollinations host and the only symptom was a watermark on every image.
   */
  async function testProvider() {
    setTesting(true);
    setTestRes(null);
    const started = Date.now();
    try {
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: provider.id }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        model?: string;
        contentType?: string;
        bytes?: number;
        ms?: number;
        preview?: string;
      };
      if (data.ok) {
        setTestRes({
          ok: true,
          text: `✓ ${data.model ?? provider.model_name} · ${data.contentType} · ${Math.round((data.bytes ?? 0) / 1024)}KB · ${toBn(data.ms ?? Date.now() - started)}ms`,
          preview: data.preview,
        });
      } else {
        setTestRes({ ok: false, text: data.error ?? "ব্যর্থ (কারণ পাওয়া যায়নি)" });
      }
    } catch (e) {
      setTestRes({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete provider "${provider.display_name}"?`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/providers/${provider.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="grid gap-3 border border-ink/30 bg-paper-deep px-4 py-3">
        <p className="flex flex-wrap items-center gap-2 font-mono-x text-[10px] uppercase tracking-[0.2em] text-ink-soft">
          {provider.provider_key} · ID {provider.id.slice(0, 8)}
          <span className="rounded-full bg-ink/10 px-1.5 py-0.5 text-[9px] normal-case tracking-normal text-ink">
            বর্তমানে: {purposeLabelBn(provider.purpose)}
          </span>
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label>
            <span className="text-[10px] uppercase tracking-wide text-ink-soft">Display name</span>
            <input className={fieldBase} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </label>
          <label>
            <span className="text-[10px] uppercase tracking-wide text-ink-soft">Model</span>
            <input className={fieldBase} value={form.model_name} onChange={(e) => setForm({ ...form, model_name: e.target.value })} />
          </label>
        </div>
        <label>
          <span className="text-[10px] uppercase tracking-wide text-ink-soft">Base URL</span>
          <input className={fieldBase} value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label>
            <span className="text-[10px] uppercase tracking-wide text-ink-soft">API key (override)</span>
            <input type="password" className={fieldBase} value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} />
          </label>
          <label>
            <span className="text-[10px] uppercase tracking-wide text-ink-soft">API key env var</span>
            <input className={fieldBase} value={form.api_key_env_var} onChange={(e) => setForm({ ...form, api_key_env_var: e.target.value })} />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label>
            <span className="text-[10px] uppercase tracking-wide text-ink-soft">Priority</span>
            <input type="number" className={fieldBase} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
          </label>
          <label>
            <span className="text-[10px] uppercase tracking-wide text-ink-soft">কী কাজে (purpose)</span>
            <select className={fieldBase} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value as "text" | "image" })}>
              <option value="text">✍️ লেখা (text)</option>
              <option value="image">🎨 ছবি (image)</option>
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex items-center gap-1.5 px-1 py-1 text-[11px]">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
            <label className="flex items-center gap-1.5 px-1 py-1 text-[11px]">
              <input type="checkbox" checked={form.is_free_tier} onChange={(e) => setForm({ ...form, is_free_tier: e.target.checked })} />
              Free
            </label>
            <label className="flex items-center gap-1.5 px-1 py-1 text-[11px]">
              <input type="checkbox" checked={form.supports_rewrite} onChange={(e) => setForm({ ...form, supports_rewrite: e.target.checked })} />
              Rewrite
            </label>
            <label className="flex items-center gap-1.5 px-1 py-1 text-[11px]">
              <input type="checkbox" checked={form.supports_embeddings} onChange={(e) => setForm({ ...form, supports_embeddings: e.target.checked })} />
              Embed
            </label>
          </div>
        </div>
        {err && <p className="border border-alizarin bg-alizarin/10 px-2 py-1 text-[11px] text-ink">{err}</p>}
        <div className="flex items-center gap-2">
          <button type="button" onClick={save} disabled={busy} className="border border-ink bg-ink px-3 py-1.5 text-[12px] font-bold text-paper disabled:opacity-40">
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} disabled={busy} className="border border-ink/30 px-3 py-1.5 text-[12px]">
            Cancel
          </button>
          <button type="button" onClick={remove} disabled={busy} className="ml-auto border border-alizarin px-3 py-1.5 text-[12px] text-alizarin hover:bg-alizarin hover:text-white disabled:opacity-40">
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-ink/20 bg-paper-deep">
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="font-grotesk text-lg font-bold text-ink-soft">{String(index).padStart(2, "0")}</span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-bold text-ink">
            {provider.display_name}
            {/* The purpose is the thing operators kept getting wrong, so it is a
                loud badge instead of a faint grey tag. */}
            <span
              className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${
                isImage ? "bg-alizarin/15 text-alizarin" : "bg-cat-blue/10 text-cat-blue"
              }`}
            >
              {isImage ? "🎨 ছবি" : "✍️ লেখা"}
            </span>
            {provider.is_free_tier && (
              <span className="rounded-full bg-lime px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-ink">FREE</span>
            )}
            {provider.purpose && provider.provider_key && !canImage && isImage && (
              <span className="rounded-full bg-amberx/20 px-2 py-0.5 text-[9.5px] font-bold text-ink">⚠ এই প্রোভাইডার ছবি পারে না</span>
            )}
          </p>
          <p className="font-mono-x text-[11px] text-ink-soft">
            {provider.provider_key} · {provider.model_name} · অগ্রাধিকার {provider.priority}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10.5px]">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-bold ${
                hasKey ? "bg-cat-teal/15 text-cat-teal" : "bg-alizarin/15 text-alizarin"
              }`}
              title={provider.api_key ? "কী ডেটাবেসে সংরক্ষিত" : `এনভায়রনমেন্ট: ${provider.api_key_env_var}`}
            >
              {hasKey ? "✓ কী আছে" : "✗ কী নেই"}
            </span>
            <span className="font-mono-x text-ink-soft/70">
              {provider.api_key ? "DB-তে সংরক্ষিত" : `env · ${provider.api_key_env_var}`}
            </span>
            {!modelFitsPurpose && (
              <span className="text-amberx" title="Purpose-এর সঙ্গে মডেলের ধরন মিলছে না">
                ⚠ মডেলের ধরন মিলছে না
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {provider.supports_embeddings && (
          <span className="font-mono-x text-[10.5px] text-cat-blue">embed</span>
        )}
        {provider.supports_rewrite && (
          <span className="font-mono-x text-[10.5px] text-ink-soft/70">rewrite</span>
        )}
        {isImage && (
          <button
            type="button"
            onClick={() => void testProvider()}
            disabled={busy || testing}
            title="শুধু এই প্রোভাইডার দিয়ে একটি ছবি বানিয়ে দেখুন"
            className="border border-ink/30 px-2.5 py-1 text-[11px] hover:border-ink disabled:opacity-40"
          >
            {testing ? "টেস্ট হচ্ছে…" : "টেস্ট"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={busy}
          className="border border-ink/30 px-2.5 py-1 text-[11px] hover:border-ink disabled:opacity-40"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-paper transition disabled:opacity-50 ${active ? "bg-cat-teal" : "bg-ink-soft"}`}
        >
          {active ? "Active" : "Paused"}
        </button>
      </div>
    </div>
    {testRes && (
      <div
        className={`flex flex-wrap items-center gap-3 border-t px-4 py-2 text-[11.5px] ${
          testRes.ok ? "border-cat-teal/30 bg-cat-teal/[0.06] text-ink" : "border-alizarin/40 bg-alizarin/[0.06] text-ink"
        }`}
      >
        {testRes.preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={testRes.preview} alt="টেস্ট ছবি" className="h-14 w-24 border border-ink/20 object-cover" />
        )}
        <span className="min-w-0 flex-1 font-mono-x text-[11px] break-words">{testRes.text}</span>
        <button type="button" onClick={() => setTestRes(null)} className="text-[11px] text-ink-soft hover:text-ink">
          ✕
        </button>
      </div>
    )}
    </div>
  );
}