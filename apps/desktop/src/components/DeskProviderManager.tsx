import { useCallback, useEffect, useState } from "react";
import { Bot, Check, Plus, Pencil, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import {
  deskProviders,
  deskUpsertProvider,
  deskToggleProvider,
  deskRemoveProvider,
  deskProviderModels,
  type DeskProvider,
  type DeskProviderModel,
} from "../lib/tauri";
import { getRunEnv } from "../lib/vault";
import { autoPush } from "../lib/autosync";

const KEYS: Array<{ v: string; label: string }> = [
  { v: "google", label: "Google Gemini" },
  { v: "groq", label: "Groq" },
  { v: "openrouter", label: "OpenRouter" },
  { v: "ollama", label: "Ollama (local)" },
  { v: "anthropic", label: "Anthropic" },
  { v: "openai", label: "OpenAI" },
  { v: "mistral", label: "Mistral" },
  { v: "github", label: "GitHub Copilot" },
  { v: "github-models", label: "GitHub Models (free)" },
  { v: "custom", label: "Custom" },
];

interface Form {
  id: string;
  providerKey: string;
  displayName: string;
  modelName: string;
  baseUrl: string;
  envVar: string;
  apiKey: string;
  priority: number;
  free: boolean;
  embed: boolean;
}

const EMPTY: Form = {
  id: "",
  providerKey: "google",
  displayName: "",
  modelName: "",
  baseUrl: "",
  envVar: "",
  apiKey: "",
  priority: 100,
  free: true,
  embed: false,
};

/** AI provider manager for the desk — mirrors the web admin's provider panel. */
export default function DeskProviderManager() {
  const [providers, setProviders] = useState<DeskProvider[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [models, setModels] = useState<DeskProviderModel[] | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const refresh = useCallback(async () => {
    try {
      setProviders(await deskProviders(await getRunEnv()));
    } catch (e) {
      flash("err", String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
    setOpen(false);
    setModels(null);
    setFetchError("");
  };

  const startEdit = (p: DeskProvider) => {
    setEditingId(p.id);
    setForm({
      id: p.id,
      providerKey: p.provider_key,
      displayName: p.display_name || p.provider_key,
      modelName: p.model_name ?? "",
      baseUrl: p.base_url ?? "",
      envVar: p.api_key_env_var ?? "",
      apiKey: p.api_key ?? "",
      priority: p.priority,
      free: p.is_free_tier,
      embed: p.supports_embeddings,
    });
    setOpen(true);
    setModels(null);
    setFetchError("");
  };

  const fetchModelList = async () => {
    setFetching(true);
    setFetchError("");
    setModels(null);
    try {
      setModels(
        await deskProviderModels(await getRunEnv(), {
          providerKey: form.providerKey,
          baseUrl: form.baseUrl.trim() || undefined,
          apiKey: form.apiKey.trim() || undefined,
        }),
      );
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "ফেচ ব্যর্থ");
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!form.modelName.trim()) {
      flash("err", "মডেল নাম আবশ্যক");
      return;
    }
    setBusy(true);
    try {
      await deskUpsertProvider(await getRunEnv(), {
        id: editingId || undefined,
        providerKey: form.providerKey,
        displayName: form.displayName.trim() || form.providerKey,
        modelName: form.modelName.trim(),
        baseUrl: form.baseUrl.trim() || undefined,
        envVar: form.envVar.trim() || undefined,
        apiKey: form.apiKey.trim() || undefined,
        priority: Number(form.priority),
        free: form.free,
        embed: form.embed,
      });
      resetForm();
      await refresh();
      await autoPush();
      flash("ok", editingId ? "প্রোভাইডার আপডেট হয়েছে" : "প্রোভাইডার যোগ হয়েছে");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "সংরক্ষণ ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (p: DeskProvider) => {
    try {
      await deskToggleProvider(await getRunEnv(), p.id);
      await refresh();
      await autoPush();
    } catch (e) {
      flash("err", String(e));
    }
  };

  const handleRemove = async (p: DeskProvider) => {
    if (!window.confirm(`"${p.display_name}" প্রোভাইডারটি মুছতে চান?`)) return;
    setBusy(true);
    try {
      await deskRemoveProvider(await getRunEnv(), p.id);
      await refresh();
      await autoPush();
      flash("ok", "মুছে ফেলা হয়েছে");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "মুছতে ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel mt-5">
      <p className="flex items-center gap-2 panel-title">
        <Bot size={14} className="text-lime" /> AI প্রোভাইডার · free-tier-first resolver
      </p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
        রিরাইট + এমবেডিং ইঞ্জিনের fallback চেইন। ফ্রি টিয়ার সবার আগে চেষ্টা হয়, তারপর priority ক্রমে।
        চাবি ডিফল্টে API ভল্ট/env-এ থাকে; "DB override" কী দিলে সেটি প্রাধান্য পায়। GitHub Models
        ফ্রি tier-এর জন্য Copilot টোকেনই যথেষ্ট।
      </p>

      {msg && (
        <p className={`mt-3 px-3 py-2 text-[12px] font-bold ${msg.type === "ok" ? "bg-lime text-night" : "bg-alizarin text-paper"}`}>
          {msg.type === "ok" ? "✓ " : "✕ "}
          {msg.text}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!open && (
          <button className="btn" onClick={() => setOpen(true)}>
            <Plus size={14} /> প্রোভাইডার যোগ / সম্পাদনা
          </button>
        )}
        <button className="btn-ghost" onClick={() => void refresh()}>
          <RefreshCw size={13} /> refresh
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 rounded-xl border border-lime/30 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <p className="font-serif-bn text-[15px] font-bold text-white">
              {editingId ? "প্রোভাইডার সম্পাদনা" : "নতুন প্রোভাইডার"}
            </p>
            <button className="rounded p-1 text-white/50 hover:text-white" onClick={resetForm}>
              <X size={14} />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">প্রোভাইডার</span>
              <select
                className="field mt-1 w-full"
                value={form.providerKey}
                onChange={(e) => setForm({ ...form, providerKey: e.target.value })}
                disabled={Boolean(editingId)}
              >
                {KEYS.map((k) => (
                  <option key={k.v} value={k.v}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">মডেল নাম</span>
              <input
                className="field mt-1 w-full"
                value={form.modelName}
                onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                placeholder="gpt-4o-mini"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">চালু নাম</span>
              <input
                className="field mt-1 w-full"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="খালি রাখলে provider_key"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Base URL</span>
              <input
                className="field mt-1 w-full font-mono text-[10.5px]"
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="খালি রাখলে প্রিসেট"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Env var</span>
              <input
                className="field mt-1 w-full font-mono text-[10.5px]"
                value={form.envVar}
                onChange={(e) => setForm({ ...form, envVar: e.target.value })}
                placeholder="GOOGLE_API_KEY"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">API key (DB override)</span>
              <input
                type="password"
                className="field mt-1 w-full font-mono text-[10.5px]"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="খালি = vault/env"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Priority</span>
              <input
                type="number"
                className="field mt-1 w-full"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              />
            </label>
            <label className="flex items-center gap-2 text-[12px] text-white/70">
              <input
                type="checkbox"
                checked={form.free}
                onChange={(e) => setForm({ ...form, free: e.target.checked })}
              />
              Free-tier (সবার আগে)
            </label>
            <label className="flex items-center gap-2 text-[12px] text-white/70">
              <input
                type="checkbox"
                checked={form.embed}
                onChange={(e) => setForm({ ...form, embed: e.target.checked })}
              />
              Embeddings সমর্থন
            </label>
          </div>

          <div className="border-t border-white/10 pt-3">
            <button
              type="button"
              className="btn-ghost"
              disabled={fetching}
              onClick={() => void fetchModelList()}
            >
              <Sparkles size={13} /> {fetching ? "··· ফেচ হচ্ছে" : "মডেল তালিকা অটো-ফেচ"}
            </button>
            {fetchError && <p className="mt-2 text-[11.5px] font-bold text-alizarin">✕ {fetchError}</p>}
            {models && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {models.length === 0 && <p className="text-[11.5px] text-ink-soft">কোনো মডেল পাওয়া যায়নি।</p>}
                {models.slice(0, 60).map((m) => (
                  <button
                    key={m.id}
                    className="rounded-lg bg-white/[0.06] px-2.5 py-1 font-mono-x text-[10.5px] text-white/80 transition-colors hover:bg-lime hover:text-night"
                    onClick={() => setForm((f) => ({ ...f, modelName: m.id }))}
                  >
                    {m.id}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn-ghost" onClick={resetForm}>
              বাতিল
            </button>
            <button className="btn" disabled={busy} onClick={() => void handleSave()}>
              <Check size={14} /> {editingId ? "সংরক্ষণ" : "যোগ করুন"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {providers.map((p) => (
          <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-black text-night" style={{ background: p.is_free_tier ? "#c8f65d" : "#ffb454" }}>
                #{String(p.priority).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[13.5px] font-bold text-white">
                  {p.display_name}
                  {p.is_free_tier && (
                    <span className="rounded-full bg-lime px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-night">FREE</span>
                  )}
                </p>
                <p className="font-mono-x text-[10px] text-white/40">
                  {p.provider_key} · {p.model_name}
                </p>
                <p className="font-mono-x text-[10px] text-white/35">
                  key:{" "}
                  <span className={p.api_key ? "text-lime" : "text-white/50"}>
                    {p.api_key ? "DB override ✓" : `env → ${p.api_key_env_var}`}
                  </span>
                </p>
              </div>
              <button
                onClick={() => void handleToggle(p)}
                className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-night transition-colors ${p.is_active ? "bg-lime hover:brightness-110" : "bg-white/20 text-white/60"}`}
              >
                {p.is_active ? "Active" : "Paused"}
              </button>
              <button
                onClick={() => startEdit(p)}
                disabled={busy}
                className="rounded-lg p-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                title="সম্পাদনা"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => void handleRemove(p)}
                disabled={busy}
                className="rounded-lg p-2 text-alizarin transition-colors hover:bg-alizarin/12"
                title="মুছুন"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {providers.length === 0 && !open && (
        <div className="py-10 text-center text-ink-soft">কোনো প্রোভাইডার নেই। একটি যোগ করুন।</div>
      )}
    </div>
  );
}