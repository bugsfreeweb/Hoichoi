import { useEffect, useRef, useState } from "react";
import { Cloud, GitBranch, HardDrive, Server, RotateCw, Check, Loader2, X, Plus, Trash2 } from "lucide-react";
import { getRunEnv } from "../lib/vault";
import {
  deskMediaStorage,
  deskMediaCleanup,
  type MediaStorageConfig,
  type MediaStorageAdapterConfig,
  type MediaObjectStat,
} from "../lib/tauri";
import { toast } from "../lib/toast";

/**
 * A fresh install starts with no media target. Repositories are added
 * explicitly by the operator; nothing is hardcoded and media never falls back
 * to the app repository.
 */
const EMPTY: MediaStorageConfig = {
  adapters: [],
  mode: "failover",
  purge_local_after_upload: false,
  retention_months: 1,
  cleanup_enabled: false,
};

const ADAPTER_ICON: Record<string, typeof GitBranch> = {
  github: GitBranch,
  idrivee2: Server,
  backblaze: HardDrive,
};

export default function MediaStoragePanel() {
  const [cfg, setCfg] = useState<MediaStorageConfig | null>(null);
  const [registry, setRegistry] = useState<number>(0);
  const [stats, setStats] = useState<MediaObjectStat[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const persist = async (next: MediaStorageConfig, silent = false) => {
    setSaving(true);
    setErr(null);
    try {
      await deskMediaStorage(await getRunEnv(), JSON.stringify(next));
      setSavedTick((t) => t + 1);
      if (!silent) {
        setMsg("মিডিয়া স্টোরেজ নীতি সংরক্ষিত হয়েছে — পরের রানে অ্যাডাপ্টার চেইন কার্যকর হবে।");
        toast.ok("স্টোরেজ নীতি সংরক্ষিত", "পরের রান থেকেই অ্যাডাপ্টার চেইন কার্যকর হবে।");
      }
    } catch (e) {
      setSaving(false);
      setErr(String(e));
      toast.err("স্টোরেজ সংরক্ষণ ব্যর্থ", String(e));
      return false;
    }
    setSaving(false);
    return true;
  };

  // Auto-save after every edit so toggles never get lost when the panel remounts.
  const enqueuePersist = (next: MediaStorageConfig) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void persist(next, true);
    }, 800);
  };

  const load = async () => {
    if (!isMounted.current) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await deskMediaStorage(await getRunEnv());
      if (!isMounted.current) return;
      setCfg(
        res.config && Array.isArray(res.config.adapters)
          ? { ...EMPTY, ...res.config, adapters: res.config.adapters }
          : { ...EMPTY },
      );
      setRegistry(res.registry ?? 0);
      setStats(Array.isArray(res.stats) ? res.stats : []);
    } catch (e) {
      if (isMounted.current) setErr(String(e));
    } finally {
      if (isMounted.current) setBusy(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    void load();
    return () => {
      isMounted.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const patch = (i: number, p: Partial<MediaStorageAdapterConfig>) => {
    if (!cfg) return;
    const next = { ...cfg, adapters: cfg.adapters.map((a, k) => (k === i ? { ...a, ...p } : a)) };
    setCfg(next);
    enqueuePersist(next);
  };

  const patchGlobal = (p: Partial<MediaStorageConfig>) => {
    if (!cfg) return;
    const next = { ...cfg, ...p };
    setCfg(next);
    enqueuePersist(next);
  };

  const addGithubRepo = () => {
    if (!cfg) return;
    const next: MediaStorageConfig = {
      ...cfg,
      adapters: [
        ...cfg.adapters,
        {
          kind: "github",
          enabled: true,
          label: `GitHub media ${cfg.adapters.filter((a) => a.kind === "github").length + 1}`,
          repo: "",
          branch: "main",
          mediaPath: "media/",
        },
      ],
    };
    setCfg(next);
    enqueuePersist(next);
  };

  const addS3 = (provider: "idrivee2" | "backblaze") => {
    if (!cfg) return;
    const next: MediaStorageConfig = {
      ...cfg,
      adapters: [
        ...cfg.adapters,
        {
          kind: "s3",
          enabled: false,
          label: provider === "backblaze" ? "Backblaze B2" : "IDrive e2",
          provider,
        },
      ],
    };
    setCfg(next);
    enqueuePersist(next);
  };

  const removeAdapter = (index: number) => {
    if (!cfg) return;
    const next = { ...cfg, adapters: cfg.adapters.filter((_, i) => i !== index) };
    setCfg(next);
    enqueuePersist(next);
  };

  const dryRunCleanup = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await deskMediaCleanup(await getRunEnv(), { dryRun: true });
      setMsg(`ক্লিনআপ (dry-run): ${r.considered}টি পুরনো ব্লব মুছে ফেলা হবে (${r.cutoff.slice(0, 10)}-এর আগে)।`);
      toast.info("ক্লিনআপ (dry-run)", `${toBn(r.considered)}টি ব্লব ডিলিট-প্রস্তাবিত · cutoff ${r.cutoff.slice(0, 10)}`);
    } catch (e) {
      setErr(String(e));
      toast.err("ক্লিনআপ ব্যর্থ", String(e));
    } finally {
      setBusy(false);
    }
  };

  const enabledCount = cfg?.adapters.filter((a) => a.enabled).length ?? 0;
  const hasEnabled = (cfg?.adapters.some((a) => a.enabled) ?? false);

  return (
    <div className="panel mt-5">
      {/*
        Media capability is only partly implemented: image posts are fetched and
        converted server-side, while video needs yt-dlp/ffmpeg which the pipeline
        does not call. Stating that up front stops an operator from wondering why
        a video post keeps its Facebook URL forever with no error anywhere.
      */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2.5">
        <span className="rounded-full bg-lime/15 px-2 py-0.5 font-mono-x text-[9.5px] text-lime">
          ছবি — সমর্থিত
        </span>
        <span className="rounded-full bg-white/8 px-2 py-0.5 font-mono-x text-[9.5px] text-white/45">
          ভিডিও — অসমর্থিত
        </span>
        <p className="text-[11px] leading-relaxed text-white/50">
          ছবির পোস্ট স্থানীয়ভাবে <code className="font-mono-x">/uploads</code>-এ সংরক্ষিত হয়। ভিডিও
          ডাউনলোডের জন্য <code className="font-mono-x">yt-dlp</code> ও{" "}
          <code className="font-mono-x">ffmpeg</code> দরকার, যা এখনো যুক্ত হয়নি — তাই ভিডিও পোস্টের
          মিডিয়া আপলোড না হলে সেটি উপেক্ষা করা হয়, ব্যর্থ বলে ধরা হয় না।
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex items-center gap-2 panel-title">
          <Cloud size={14} className="text-lime" /> মিডিয়া স্টোরেজ · fallback চেইন + মাসিক ডিলিট
        </p>
        <span className="rounded-full bg-white/5 px-2 py-1 font-mono-x text-[10px] text-white/45">
          {enabledCount} চালু · {toBn(registry)} ফাইল registry
        </span>
        {saving && (
          <span className="flex items-center gap-1.5 rounded-full bg-sky-400/15 px-2.5 py-1 font-mono-x text-[10px] text-sky-300">
            <Loader2 size={11} className="animate-spin" /> সংরক্ষণ হচ্ছে…
          </span>
        )}
        {!saving && cfg && savedTick > 0 && hasEnabled && (
          <span className="flex items-center gap-1.5 rounded-full bg-lime/15 px-2.5 py-1 font-mono-x text-[10px] text-lime">
            <Check size={11} /> সংরক্ষিত ✓
          </span>
        )}
        {!saving && cfg && !hasEnabled && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 font-mono-x text-[10px] text-amber-300">
            <X size={11} /> কোনো অ্যাডাপ্টার চালু নেই
          </span>
        )}
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-white/50">
        প্রতিটি মিডিয়া ফাইল প্রথমে চালু অ্যাডাপ্টারগুলোর মধ্যে প্রথমটিতে আপলোড হয়; ব্যর্থ হলে পরেরটি
        নেয় (fallback)। সিক্রেট (PAT / Access key) API ভল্ট ট্যাবে রাখা হয়। GitHub রিপো পাবলিক
        হলেই jsDelivr CDN কাজ করে। মিডিয়া কখনোই অ্যাপ রিপোতে ফলব্যাক করে না — রিপো নাম শুধু এখানেই
        কনফিগার হয়।
      </p>

      {msg && <p className="mt-3 rounded-lg bg-lime/10 px-3 py-2 text-[11.5px] font-bold text-lime">✓ {msg}</p>}
      {err && <p className="mt-3 rounded-lg bg-rose-500/12 px-3 py-2 text-[11.5px] font-bold text-rose-300">✕ {err}</p>}

      {cfg && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={addGithubRepo} className="btn-ghost">
            <Plus size={12} /> GitHub মিডিয়া রিপো
          </button>
          <button onClick={() => addS3("idrivee2")} className="btn-ghost">
            <Plus size={12} /> IDrive e2
          </button>
          <button onClick={() => addS3("backblaze")} className="btn-ghost">
            <Plus size={12} /> Backblaze B2
          </button>
        </div>
      )}

      {cfg && cfg.adapters.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-[11.5px] text-white/45">
          এখনো কোনো মিডিয়া টার্গেট নেই। উপরের বোতাম দিয়ে রিপো যোগ করুন — কনফিগার না করা পর্যন্ত
          ছবি শুধু লোকাল ডিস্কে থাকবে।
        </p>
      )}

      {cfg && cfg.adapters.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {cfg.adapters.map((a, i) => {
            const Icon = ADAPTER_ICON[a.provider ?? a.kind] ?? Cloud;
            const enabled = Boolean(a.enabled);
            return (
              <section
                key={`${i}-${a.kind}-${a.provider ?? ""}`}
                className={`rounded-xl border p-4 transition-colors ${enabled ? "border-lime/30 bg-lime/[0.04]" : "border-white/10 bg-white/[0.03]"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-[13px] font-bold text-white">
                    <Icon size={14} className={enabled ? "text-lime" : "text-white/35"} />
                    {a.kind === "s3" && a.provider === "backblaze"
                      ? "Backblaze B2"
                      : a.kind === "s3"
                        ? "IDrive e2"
                        : "GitHub"}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeAdapter(i)}
                      title="অ্যাডাপ্টার সরান"
                      className="text-white/30 transition-colors hover:text-rose-300"
                    >
                      <Trash2 size={13} />
                    </button>
                    <button
                      onClick={() => patch(i, { enabled: !enabled })}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${enabled ? "bg-lime" : "bg-white/15"}`}
                    >
                      <span className="absolute top-0.5 h-4 w-4 rounded-full bg-night transition-all" style={{ left: enabled ? 18 : 2 }} />
                    </button>
                  </div>
                </div>

                {enabled && (
                  <div className="mt-3 space-y-2">
                    <label className="block">
                      <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/40">লেবেল</span>
                      <input
                        value={a.label}
                        onChange={(e) => patch(i, { label: e.target.value })}
                        className="mt-0.5 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-lime/60"
                      />
                    </label>
                    {a.kind === "github" && (
                      <>
                        <label className="block">
                          <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/40">
                            রিপোজিটরি (owner/name) *
                          </span>
                          <input
                            value={a.repo ?? ""}
                            placeholder="owner/media-repo"
                            onChange={(e) => patch(i, { repo: e.target.value.trim() || undefined })}
                            className="mt-0.5 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-2.5 py-1.5 font-mono-x text-[12px] text-white outline-none focus:border-lime/60"
                          />
                          {!(a.repo ?? "").trim() && (
                            <span className="mt-1 block text-[10px] text-amber-300">
                              রিপো খালি — এই অ্যাডাপ্টার আপলোডে অংশ নেবে না।
                            </span>
                          )}
                        </label>
                        <label className="block">
                          <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/40">
                            ব্রাঞ্চ (ঐচ্ছিক)
                          </span>
                          <input
                            value={a.branch ?? "main"}
                            onChange={(e) => patch(i, { branch: e.target.value || undefined })}
                            className="mt-0.5 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-2.5 py-1.5 font-mono-x text-[12px] text-white outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/40">
                            রিপো পাথ (ঐচ্ছিক)
                          </span>
                          <input
                            value={a.mediaPath ?? "media/"}
                            onChange={(e) => patch(i, { mediaPath: e.target.value || "media/" })}
                            className="mt-0.5 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-2.5 py-1.5 font-mono-x text-[12px] text-white outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/40">
                            CDN base (ঐচ্ছিক)
                          </span>
                          <input
                            value={a.cdnBase ?? ""}
                            placeholder="https://cdn.jsdelivr.net/gh/owner/repo@main"
                            onChange={(e) => patch(i, { cdnBase: e.target.value || undefined })}
                            className="mt-0.5 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-2.5 py-1.5 font-mono-x text-[12px] text-white outline-none"
                          />
                        </label>
                      </>
                    )}
                    {a.kind === "s3" && (
                      <>
                        <label className="block">
                          <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/40">
                            Endpoint (ঐচ্ছিক ওভাররাইড)
                          </span>
                          <input
                            value={a.endpoint ?? ""}
                            placeholder={a.provider === "backblaze" ? "https://s3.us-west-004.backblazeb2.com" : "https://www.idrivee2.com"}
                            onChange={(e) => patch(i, { endpoint: e.target.value || undefined })}
                            className="mt-0.5 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-2.5 py-1.5 font-mono-x text-[12px] text-white outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/40">
                            Bucket (ঐচ্ছিক ওভাররাইড)
                          </span>
                          <input
                            value={a.bucket ?? ""}
                            onChange={(e) => patch(i, { bucket: e.target.value || undefined })}
                            className="mt-0.5 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-2.5 py-1.5 font-mono-x text-[12px] text-white outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/40">Region</span>
                          <input
                            value={a.region ?? "us-east-1"}
                            onChange={(e) => patch(i, { region: e.target.value || "us-east-1" })}
                            className="mt-0.5 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-2.5 py-1.5 font-mono-x text-[12px] text-white outline-none"
                          />
                        </label>
                      </>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {stats.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">
            রিপো/টার্গেট ভিত্তিক আপলোড (মাপা ডেটা)
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[11.5px]">
              <thead className="text-white/35">
                <tr>
                  <th className="pb-2 font-medium">টার্গেট</th>
                  <th className="pb-2 text-right font-medium">ফাইল</th>
                  <th className="pb-2 text-right font-medium">আজ</th>
                  <th className="pb-2 text-right font-medium">সাইজ</th>
                  <th className="pb-2 text-right font-medium">শেষ আপলোড</th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                {stats.map((s) => (
                  <tr key={s.adapter} className="border-t border-white/5">
                    <td className="py-1.5 font-mono-x text-[11px] text-sky-300">{s.adapter}</td>
                    <td className="py-1.5 text-right">{toBn(s.files)}</td>
                    <td className="py-1.5 text-right">{toBn(s.todayFiles)}</td>
                    <td className="py-1.5 text-right">{fmtBytes(s.bytes)}</td>
                    <td className="py-1.5 text-right text-white/45">
                      {s.lastUploadAt ? s.lastUploadAt.slice(0, 16).replace("T", " ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-white/30">
            `bytes` কলামের আগে লেখা পুরোনো সারির সাইজ ০ হিসেবে দেখায় — অনুমান করা হয় না।
          </p>
        </div>
      )}

      {cfg && (
        <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-3">
          <label className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-bold text-white">আপলোডের পর লোকাল কপি মুছে ফেলুন</span>
            <button
              onClick={() => patchGlobal({ purge_local_after_upload: !cfg.purge_local_after_upload })}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${cfg.purge_local_after_upload ? "bg-lime" : "bg-white/15"}`}
            >
              <span className="absolute top-0.5 h-4 w-4 rounded-full bg-night transition-all" style={{ left: cfg.purge_local_after_upload ? 18 : 2 }} />
            </button>
          </label>
          <label className="block">
            <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/40">
              Retention (মাস) — মাসিক ডিলিট
            </span>
            <input
              type="number"
              min={1}
              max={120}
              value={cfg.retention_months}
              onChange={(e) => patchGlobal({ retention_months: Math.max(1, Number(e.target.value) || 1) })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-2.5 py-1.5 font-mono-x text-[12px] text-white outline-none"
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-bold text-white">ক্লিনআপ (সূচি) চালু</span>
            <button
              onClick={() => patchGlobal({ cleanup_enabled: !cfg.cleanup_enabled })}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${cfg.cleanup_enabled ? "bg-lime" : "bg-white/15"}`}
            >
              <span className="absolute top-0.5 h-4 w-4 rounded-full bg-night transition-all" style={{ left: cfg.cleanup_enabled ? 18 : 2 }} />
            </button>
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => void persist(cfg!)} disabled={busy || saving || !cfg} className="btn">
          💾 স্টোরেজ নীতি সংরক্ষণ
        </button>
        <button onClick={() => void dryRunCleanup()} disabled={busy || saving || !cfg} className="btn-ghost" title="শুধু দেখাবে, কিছু মুছবে না">
          <RotateCw size={12} /> ক্লিনআপ (dry-run)
        </button>
        <button onClick={() => void load()} disabled={busy || saving} className="btn-ghost">
          Load current
        </button>
      </div>
      <p className="mt-3 text-[10.5px] text-white/35">
        টগল বদলালেই অটো-সংরক্ষিত হয় — ট্যাব পাল্টালেও সেটিং হারাবে না। Access keys vault ট্যাবে:
        IDRIVEE2_ACCESS_KEY/SECRET_KEY/BUCKET/ENDPOINT, B2_ACCESS_KEY/SECRET_KEY/BUCKET/ENDPOINT,
        GitHub PAT + media repo (একাধিক হলে কমা দিয়ে আলাদা করুন)। চলমান{" "}
        <code className="text-lime">media cleanup --dry-run --months N</code> ডি-লিটের প্রিভিউ দেয়।
      </p>
    </div>
  );
}

function toBn(n: number): string {
  try {
    return new Intl.NumberFormat("bn-BD").format(n);
  } catch {
    return String(n);
  }
}

function fmtBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}