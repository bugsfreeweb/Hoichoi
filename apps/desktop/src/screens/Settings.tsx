import { useEffect, useState } from "react";
import {
  Camera,
  GitBranch,
  ShieldCheck,
  Sparkles,
  Timer,
  Sliders,
  Tags,
  Database,
  Palette,
  UserCog,
  Archive,
  KeyRound,
} from "lucide-react";
import {
  getCredential,
  storeCredential,
  removeCredential,
  getRunEnv,
  getEnvFromVault,
  isCloudSync,
  type CredentialName,
} from "../lib/vault";
import {
  settingsGet,
  settingsSet,
  backupExport,
  backupImport,
  resetDb,
  syncDb,
  adminCodes,
  type AdminLoginCode,
  type AdminCodeList,
  type CreatedAdminLoginCode,
} from "../lib/tauri";
import { pushGithubSecret } from "../lib/github";
import DeskCategoryManager from "../components/DeskCategoryManager";

const TABS = [
  { id: "pref", icon: Sliders, label: "প্রেফারেন্স" },
  { id: "categories", icon: Tags, label: "বিভাগ" },
  { id: "sync", icon: Database, label: "ক্লাউড সিঙ্ক" },
  { id: "site", icon: Palette, label: "সাইট ও বিজ্ঞাপন" },
  { id: "admin", icon: UserCog, label: "অ্যাডমিন" },
  { id: "backup", icon: Archive, label: "ব্যাকআপ" },
  { id: "vault", icon: KeyRound, label: "API ভল্ট" },
] as const;

type SettingsTab = (typeof TABS)[number]["id"];

const FIELDS: Array<{ name: CredentialName; label: string; secret: boolean }> = [
  { name: "turso_url", label: "TURSO_DATABASE_URL", secret: false },
  { name: "turso_token", label: "TURSO_AUTH_TOKEN", secret: true },
  { name: "github_pat", label: "GitHub PAT", secret: true },
  { name: "github_repo", label: "GitHub repo (owner/name)", secret: false },
  { name: "GOOGLE_API_KEY", label: "Google Gemini API key", secret: true },
  { name: "GROQ_API_KEY", label: "Groq API key", secret: true },
  { name: "OPENROUTER_API_KEY", label: "OpenRouter API key", secret: true },
  { name: "OLLAMA_BASE_URL", label: "Ollama base URL", secret: false },
];

const BRAND_FIELDS: Array<{ key: string; label: string; secret?: boolean }> = [
  { key: "site_name", label: "সাইট নাম / App name" },
  { key: "slogan_bn", label: "স্লোগান (slogan)" },
  { key: "tagline", label: "ট্যাগলাইন (tagline)" },
  { key: "logo_url", label: "Logo URL (empty = text)" },
  { key: "favicon_url", label: "Favicon URL (empty = default)" },
  { key: "accent_color", label: "Accent color (hex)" },
];

const AD_SLOTS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: "ad_leaderboard_html", label: "Leaderboard (হোমপেজ শীর্ষ)", placeholder: "<!-- AdSense / Adsterra leaderboard code -->" },
  { key: "ad_rect_html", label: "Rectangle 300×250 (পোস্ট পেজ)", placeholder: "<!-- AdSense / Adsterra rectangle code -->" },
  { key: "ad_infeed_html", label: "In-feed (গ্রিড প্রতি ৪য়)", placeholder: "<!-- In-feed ad code -->" },
  { key: "ad_strip_html", label: "Strip (হোমপেজ নিচে)", placeholder: "<!-- Strip ad code -->" },
];

const PREF_DEFAULTS = {
  cron: "0 */2 * * *",
  model: "gemini-2.0-flash",
  temp: 0.3,
  gate: 90,
  shot: true,
  headless: true,
  commit: true,
  deploy: true,
  fact: true,
};
type Prefs = typeof PREF_DEFAULTS;

const PREF_DB_KEY = "hoichoi.desk.prefs.v1";

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREF_DB_KEY);
    if (raw) return { ...PREF_DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    /* ignore */
  }
  return PREF_DEFAULTS;
}

export default function Settings({
  refresh,
  refreshBrand,
}: {
  refresh: () => Promise<void>;
  refreshBrand: () => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<SettingsTab>("pref");

  const [brand, setBrand] = useState<Record<string, string>>({});
  const [cloud, setCloud] = useState<boolean | null>(null);
  const [brandMsg, setBrandMsg] = useState<string | null>(null);
  const [brandErr, setBrandErr] = useState<string | null>(null);

  const [bkPass, setBkPass] = useState("");
  const [bkMsg, setBkMsg] = useState<string | null>(null);
  const [bkErr, setBkErr] = useState<string | null>(null);

  const [admEmail, setAdmEmail] = useState("");
  const [admLabel, setAdmLabel] = useState("");
  const [admCodes, setAdmCodes] = useState<AdminLoginCode[]>([]);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [admMsg, setAdmMsg] = useState<string | null>(null);
  const [admErr, setAdmErr] = useState<string | null>(null);

  const [adSlots, setAdSlots] = useState<Record<string, string>>({});
  const [adSlotsMsg, setAdSlotsMsg] = useState<string | null>(null);
  const [adSlotsErr, setAdSlotsErr] = useState<string | null>(null);

  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncErr, setSyncErr] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const updatePref = <K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [k]: v };
      try {
        localStorage.setItem(PREF_DB_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const saveCron = async () => {
    const m = prefs.cron.match(/^(?:0|\*)\s+\*\/(\d{1,2})\s+\*\s+\*\s+\*$/);
    if (!m) {
      fail("cron ফরম্যাট হবে: 0 */N * * * — যেখানে N ঘণ্টার ব্যবধান (যেমন */2)");
      return;
    }
    try {
      await settingsSet(await getRunEnv(), { pipeline_hours: Number(m[1]) });
      show(`শিডিউল সংরক্ষিত — pipeline_hours = ${m[1]} (${prefs.cron})`);
      setErr(null);
      await loadBrand();
    } catch (e) {
      fail(e);
    }
  };

  const show = (m: string) => {
    setMsg(m);
    setErr(null);
  };
  const fail = (e: unknown) => {
    setErr(String(e));
    setMsg(null);
  };

  const save = async (f: (typeof FIELDS)[number]) => {
    const v = values[f.name];
    if (v == null || v === "") return;
    try {
      if (f.secret) {
        await storeCredential(f.name, v.trim());
        await pushGithubSecret(f.name, v.trim()).catch(() => {});
      } else {
        await storeCredential(f.name, v.trim());
      }
      show(`${f.label} saved`);
      setValues((prev) => ({ ...prev, [f.name]: "" }));
      await refresh();
    } catch (e) {
      fail(e);
    }
  };

  const clear = async (f: (typeof FIELDS)[number]) => {
    await removeCredential(f.name);
    show(`${f.label} removed`);
    await refresh();
  };

  const refreshMode = async () => {
    setCloud(await isCloudSync());
  };

  const loadBrand = async () => {
    try {
      const s = await settingsGet(await getRunEnv());
      const rec: Record<string, string> = {};
      for (const f of BRAND_FIELDS) {
        const v = s[f.key];
        if (typeof v === "string") rec[f.key] = v;
      }
      setBrand(rec);
      const hours = Number(s.pipeline_hours ?? 2);
      if (hours > 0) updatePref("cron", `0 */${hours} * * *`);
    } catch {
      /* ব্যান্ডিং লোড ব্যর্থ — ফিল্ড খালি থাকবে */
    }
  };

  const toggleCloud = async (on: boolean) => {
    await storeCredential("use_cloud", on ? "1" : "0");
    setCloud(on);
    show(on ? "Cloud sync ON — desktop writes to the shared Turso DB" : "Local mode — desktop uses its own file DB");
    await refresh();
    await loadBrand();
  };

  const loadAdSlots = async () => {
    try {
      const s = await settingsGet(await getRunEnv());
      const rec: Record<string, string> = {};
      for (const f of AD_SLOTS) {
        const v = s[f.key];
        if (typeof v === "string") rec[f.key] = v;
      }
      setAdSlots(rec);
      setAdSlotsErr(null);
    } catch {
      setAdSlotsErr("Ad slots লোড ব্যর্থ");
    }
  };

  const saveAdSlots = async () => {
    try {
      const fields: Record<string, string> = {};
      for (const f of AD_SLOTS) if ((adSlots[f.key] ?? "").trim() !== "") fields[f.key] = adSlots[f.key].trim();
      if (Object.keys(fields).length === 0) return;
      await settingsSet(await getRunEnv(), fields);
      setAdSlotsMsg("সংরক্ষিত — web ও desktop-এ তাৎক্ষণিক কার্যকর");
      setAdSlotsErr(null);
      await refreshBrand();
    } catch (e) {
      setAdSlotsErr(String(e));
    }
  };

  const doSync = async (direction: "push" | "pull") => {
    try {
      setSyncMsg(null);
      setSyncErr(null);
      const res = await syncDb(direction, await getRunEnv());
      setSyncMsg(`${direction === "push" ? "Push" : "Pull"} সম্পন্ন — ${res.syncedTables ?? res.tablesSynced ?? 0} টেবিল সিঙ্ক, ${res.rowsAffected ?? 0} রো, ${res.conflicts ?? 0} конфликт সমাধান`);
      setSyncErr(null);
      await refresh();
      await loadBrand();
    } catch (e) {
      setSyncErr(String(e));
    }
  };

  // Auto-load branding and ad slots on mount
  useEffect(() => {
    void loadBrand();
    void loadAdminCodes();
    void loadAdSlots();
  }, []);

  const loadAdminCodes = async () => {
    try {
      const res = (await adminCodes("list", await getRunEnv())) as AdminCodeList;
      setAdmCodes(res.codes ?? []);
      setAdmErr(null);
    } catch {
      setAdmCodes([]);
    }
  };

  const createCode = async () => {
    if (!admEmail.trim()) {
      setAdmErr("ওয়ান-টাইম কোডের জন্য ইমেইল দিতে হবে (admin_users-এর মেলে)");
      return;
    }
    try {
      setAdmErr(null);
      const res = (await adminCodes("create", await getRunEnv(), {
        email: admEmail.trim(),
        label: admLabel.trim() || null,
      })) as CreatedAdminLoginCode;
      setNewCode(res.code);
      setAdmMsg(`কোড তৈরি হয়েছে — ${res.expires_at.slice(0, 16).replace("T", " ")} পর্যন্ত বৈধ, একবারই ব্যবহারযোগ্য।`);
      await loadAdminCodes();
    } catch (e) {
      setAdmErr(String(e));
    }
  };

  const revokeCode = async (id: string) => {
    try {
      await adminCodes("revoke", await getRunEnv(), { id });
      await loadAdminCodes();
      setAdmMsg("কোড বাতিল হয়েছে।");
    } catch (e) {
      setAdmErr(String(e));
    }
  };

  const saveBrand = async () => {
    try {
      const fields: Record<string, string> = {};
      for (const f of BRAND_FIELDS) if ((brand[f.key] ?? "").trim() !== "") fields[f.key] = brand[f.key].trim();
      if (Object.keys(fields).length === 0) return;
      await settingsSet(await getRunEnv(), fields);
      setBrandMsg("সংরক্ষিত — web ও desktop-এ সঙ্গে সঙ্গে কার্যকর");
      setBrandErr(null);
      // Tell the parent (App) to re-load branding so the sidebar + other screens
      // pick up the new site_name / slogan immediately.
      await refreshBrand();
    } catch (e) {
      setBrandErr(String(e));
    }
  };

  const needBkPass = (): string | null => {
    if (bkPass.trim().length < 4) return "ব্যাকআপ passphrase দিতে হবে (কমপক্ষে ৪ অক্ষর)";
    return null;
  };

  const doExport = async () => {
    const missing = needBkPass();
    if (missing) {
      setBkMsg(null);
      setBkErr(missing);
      return;
    }
    try {
      setBkMsg(null);
      setBkErr(null);
      const path = await backupExport(bkPass, await getEnvFromVault());
      setBkMsg(`ব্যাকআপ লেখা হয়েছে:\n${path}`);
    } catch (e) {
      setBkErr(String(e));
    }
  };

  const doImport = async () => {
    const missing = needBkPass();
    if (missing) {
      setBkMsg(null);
      setBkErr(missing);
      return;
    }
    try {
      setBkMsg(null);
      setBkErr(null);
      await backupImport(bkPass, await getEnvFromVault());
      setBkMsg("ব্যাকআপ পুনরুদ্ধার হয়েছে — content ও settings এখন backup-এর মতো।");
      await refresh();
    } catch (e) {
      setBkErr(String(e));
    }
  };

  const doReset = async () => {
    const missing = needBkPass();
    if (missing) {
      setBkMsg(null);
      setBkErr(missing);
      return;
    }
    if (!window.confirm("সব কন্টেন্ট মুছে যাবে এবং settings/config default-এ ফিরবে (admin রাখা হবে)। নিশ্চিত?")) return;
    try {
      setBkMsg(null);
      setBkErr(null);
      await resetDb(await getRunEnv());
      setBkMsg("রিসেট সম্পন্ন — content wiped, settings default-এ।");
      await refresh();
    } catch (e) {
      setBkErr(String(e));
    }
  };

  const Show = ({ name }: { name: CredentialName }) => {
    const [has, setHas] = useState<boolean | null>(null);
    void getCredential(name).then((v) => setHas(v !== null));
    return has === null ? (
      <span className="font-mono text-[10px] text-ink-soft/60">…</span>
    ) : has ? (
      <button onClick={() => void edit(name)} className="font-mono text-[10px] text-lime bg-ink px-2 py-0.5">
        ✓ set — edit
      </button>
    ) : (
      <span className="font-mono text-[10px] text-ink-soft/60">○ empty</span>
    );
  };

  const edit = async (name: CredentialName) => {
    const existing = await getCredential(name);
    setValues((prev) => ({ ...prev, [name]: existing ?? "" }));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl px-8 pt-8">
        <p className="font-mono-x text-[9.5px] tracking-[0.26em] text-lime uppercase">
          DESKTOP CONTROLLER · LOCAL PREFERENCES
        </p>
        <h2 className="mt-1 font-serif-bn text-[30px] font-black text-white">সেটিংস</h2>
        <p className="mt-1 text-[12.5px] text-white/50">
          মানগুলো Stronghold-এ এনক্রিপ্টেড; UI-তে কখনো প্লেইনটেক্সট দেখানো হয় না। নিচের
          বিভাগগুলো ট্যাবে সাজানো — প্রতিটি ট্যাব একেকটি সেটিংস গ্রুপ।
        </p>

        {msg && <p className="mt-3 bg-lime px-3 py-2 text-[12px] font-bold">✓ {msg}</p>}
        {err && <p className="mt-3 bg-alizarin px-3 py-2 text-[12px] font-bold text-paper">✕ {err}</p>}

        <div className="settings-tabs">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={tab === t.id ? "active" : ""}
                onClick={() => setTab(t.id)}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scroll-slim flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-3xl px-8 py-8">
        {tab === "pref" && (
          <div className="panel mt-5">
            <p className="panel-title">ডেস্ক প্রেফারেন্স · local</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="flex items-center gap-2 text-[13px] font-bold text-white">
                  <Timer size={14} className="text-amberx" /> শিডিউল
                </p>
                <label className="mt-4 block text-[11px] text-white/45">Cron (Asia/Dhaka)</label>
                <input
                  value={prefs.cron}
                  onChange={(e) => updatePref("cron", e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-3 py-2 font-mono-x text-[16px] text-white outline-none focus:border-lime/60"
                />
                <button
                  onClick={() => void saveCron()}
                  className="mt-2 flex items-center gap-1.5 rounded-lg bg-lime px-3 py-1.5 text-[11px] font-bold text-night hover:brightness-110"
                >
                  pipeline_hours আপডেট
                </button>
                <p className="mt-2 text-[11.5px] text-white/40">
                  প্রতি দুই ঘণ্টায় স্বয়ংক্রিয় রান। খালি রাখলে শুধু ম্যানুয়াল।
                </p>
              </section>

              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="flex items-center gap-2 text-[13px] font-bold text-white">
                  <Sparkles size={14} className="text-rose-300" /> রিরাইট মডেল
                </p>
                <label className="mt-4 block text-[11px] text-white/45">LLM</label>
                <select
                  value={prefs.model}
                  onChange={(e) => updatePref("model", e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-3 py-2 text-[13px] text-white outline-none"
                >
                  <option value="gemini-2.0-flash">gemini-2.0-flash · সাশ্রয়ী</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro · উচ্চ গুণমান</option>
                  <option value="groq-llama-3.3-70b">groq llama · দ্রুত</option>
                  <option value="openrouter-free">openrouter · বিকল্প</option>
                  <option value="ollama-local">ollama · লোকাল</option>
                </select>
                <label className="mt-4 flex items-center justify-between text-[11px] text-white/45">
                  Temperature <span className="font-mono-x text-white/70">{prefs.temp.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={prefs.temp}
                  onChange={(e) => updatePref("temp", Number(e.target.value))}
                  className="mt-1 w-full accent-[#c8f65d]"
                />
              </section>

              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="flex items-center gap-2 text-[13px] font-bold text-white">
                  <ShieldCheck size={14} className="text-lime" /> ফ্যাক্ট-গেট
                </p>
                <label className="mt-4 flex items-center justify-between text-[11px] text-white/45">
                  থ্রেশহোল্ড{" "}
                  <span className="font-mono-x text-lime">০.{String(prefs.gate).padStart(2, "০")}</span>
                </label>
                <input
                  type="range"
                  min={70}
                  max={99}
                  value={prefs.gate}
                  onChange={(e) => updatePref("gate", Number(e.target.value))}
                  className="mt-1 w-full accent-[#c8f65d]"
                />
                <p className="mt-3 text-[12px] leading-relaxed text-white/45">
                  স্কোর এর নিচে গেলে আইটেম <span className="text-amberx">pending</span> সারিতে
                  যায় — লাইভে নয়। সংবেদনশীল অপরাধ/শিশু কনটেন্টে ০.৯০+ রাখুন।
                </p>
              </section>

              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="flex items-center gap-2 text-[13px] font-bold text-white">
                  <Camera size={14} className="text-sky-300" /> পাইপলাইন টগল
                </p>
                <ul className="mt-4 space-y-3">
                  {(
                    [
                      ["shot", "স্ক্রিনশট আর্কাইভ"],
                      ["headless", "Playwright headless"],
                      ["fact", "ফ্যাক্ট-গেট বাধ্যতামূলক"],
                      ["commit", "অটো-কমিট GitHub"],
                      ["deploy", "Vercel অটো-ডিপ্লয়"],
                    ] as const
                  ).map(([k, label]) => (
                    <li key={k} className="flex items-center justify-between text-[12.5px]">
                      <span className="text-white/70">{label}</span>
                      <button
                        onClick={() => updatePref(k as keyof Prefs, !prefs[k as keyof Prefs])}
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          prefs[k as keyof Prefs] ? "bg-lime" : "bg-white/15"
                        }`}
                      >
                        <span
                          className="absolute top-0.5 h-4 w-4 rounded-full bg-night transition-all"
                          style={{ left: prefs[k as keyof Prefs] ? 18 : 2 }}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex items-center gap-2 font-mono-x text-[10px] text-white/35">
                  <GitBranch size={11} /> repo: hoichoi-content · branch: main
                </p>
              </section>
            </div>
            <p className="mt-3 font-mono-x text-[10px] tracking-[0.14em] text-white/30 uppercase">
              এই প্রেফারেন্স শুধু এই মেশিনে থাকবে (localStorage) — অ্যাকচুয়াল কী ও সেটিংস ভল্ট + settings দিয়ে চলে।
            </p>
          </div>
        )}

        {tab === "categories" && <DeskCategoryManager />}

        {tab === "sync" && (
          <>
            <div className="panel mt-5">
              <p className="panel-title">Database sync · cloud ↔ local</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button className={cloud !== false ? "btn bg-lime" : "btn-ghost"} onClick={() => void toggleCloud(true)}>
                  ☁ Cloud sync (default)
                </button>
                <button className={cloud === false ? "btn bg-lime" : "btn-ghost"} onClick={() => void toggleCloud(false)}>
                  ◌ Local only
                </button>
                <button className="btn-ghost" onClick={() => void refreshMode()}>
                  ↻ refresh
                </button>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
                {cloud === null
                  ? "Cloud সিঙ্ক: desktop পাইপলাইন সরাসরি shared Turso DB-তে লেখে → web অ্যাডমিন তাৎক্ষণিক দেখে। GitHub-এ কিছুই আপলোড লাগে না।"
                  : cloud
                    ? "বর্তমান: ☁ Cloud sync — runs + settings shared Turso DB (web)-এ যায়।"
                    : "বর্তমান: ◌ Local only — desktop নিজের file DB-তে চলে; ম্যানুয়াল resync হবে।"}
              </p>
            </div>

            <div className="panel mt-5">
              <p className="panel-title">One-Click Sync · Web ↔ Desktop</p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
                Shared Turso DB-এ পরিবর্তন merge করুন। Conflict সমাধান: updated_at time-based
                (newer wins)। এখন source_categories, comments ও reader_reports-ও সিঙ্ক হয়।
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn" onClick={() => void doSync("push")}>
                  ☁ Push Local → Cloud
                </button>
                <button className="btn-ghost" onClick={() => void doSync("pull")}>
                  ⬇ Pull Cloud → Local
                </button>
                <button className="btn-ghost" onClick={() => void doSync("push")}>
                  ↻ Full Sync (Push then Pull)
                </button>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
                Push = এই ডেস্কটপের file DB → Shared Turso (web দেখে)। Pull = Turso → এই ডেস্কটপের file DB।
              </p>
              {syncMsg && <p className="mt-2 whitespace-pre-line text-[11.5px] font-bold text-ink">✓ {syncMsg}</p>}
              {syncErr && <p className="mt-2 text-[11.5px] font-bold text-alizarin">✕ {syncErr}</p>}
            </div>
          </>
        )}

        {tab === "site" && (
          <>
            <div className="panel mt-5">
              <p className="panel-title">Site branding · web & desktop</p>
              <div className="mt-3 grid gap-3">
                {BRAND_FIELDS.map((f) => (
                  <label key={f.key} className="flex items-center gap-3">
                    <span className="w-48 shrink-0 text-[11px] font-bold uppercase tracking-wide text-ink-soft">{f.label}</span>
                    <input
                      className="field flex-1"
                      value={brand[f.key] ?? ""}
                      onChange={(e) => setBrand((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn" onClick={() => void saveBrand()}>
                  💾 Save branding
                </button>
                <button className="btn-ghost" onClick={() => void loadBrand()}>
                  Load current
                </button>
              </div>
              {brandMsg && <p className="mt-2 text-[11.5px] font-bold text-ink">✓ {brandMsg}</p>}
              {brandErr && <p className="mt-2 text-[11.5px] font-bold text-alizarin">✕ {brandErr}</p>}
            </div>

            <div className="panel mt-5">
              <p className="panel-title">বিজ্ঞাপন স্লট (Ad Slots) · Web & Desktop</p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
                প্রতিটি স্লটে আপনার অ্যাড নেটওয়ার্কের (AdSense, Adsterra ইত্যাদি) HTML/JS কোড পেস্ট করুন। খালি থাকলে ডিফল্ট স্পন্সর কার্ড দেখাবে।
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {AD_SLOTS.map((s) => (
                  <label key={s.key} className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wide">{s.label}</span>
                    <textarea
                      className="field h-20 resize-none font-mono text-[10px]"
                      placeholder={s.placeholder}
                      value={adSlots[s.key] ?? ""}
                      onChange={(e) => setAdSlots((prev) => ({ ...prev, [s.key]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn" onClick={() => void saveAdSlots()}>
                  💾 Save ad slots
                </button>
                <button className="btn-ghost" onClick={() => void loadAdSlots()}>
                  Load current
                </button>
              </div>
              {adSlotsMsg && <p className="mt-2 text-[11.5px] font-bold text-ink">✓ {adSlotsMsg}</p>}
              {adSlotsErr && <p className="mt-2 text-[11.5px] font-bold text-alizarin">✕ {adSlotsErr}</p>}
            </div>
          </>
        )}

        {tab === "admin" && (
          <div className="panel mt-5">
            <p className="panel-title">Admin access · one-time login codes</p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
              কোড ১০ মিনিটের জন্য বৈধ, একবার ব্যবহারেই শেষ। ওয়েব অ্যাডমিনে
              password-এর বদলে এই কোড দিয়ে ঢোকা যায় — পাসওয়ার্ড আর ব্যবহার হয় না।
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                className="field min-w-48 flex-1"
                placeholder="admin ইমেইল (admin_user)"
                value={admEmail}
                onChange={(e) => setAdmEmail(e.target.value)}
              />
              <input
                className="field min-w-48 flex-1"
                placeholder="লেবেল (যেমন desktop-chrome)"
                value={admLabel}
                onChange={(e) => setAdmLabel(e.target.value)}
              />
              <button className="btn" onClick={() => void createCode()}>
                ✦ কোড তৈরি
              </button>
              <button className="btn-ghost" onClick={() => void loadAdminCodes()}>
                ↻ refresh
              </button>
            </div>
            {newCode && (
              <div className="mt-3 border-2 border-dashed border-lime bg-paper-deep px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-ink-soft">
                  ইমেইল + কোড দিয়ে লগইন করুন →
                </p>
                <p className="mt-1 font-mono text-[28px] font-black tracking-[0.18em] text-lime">{newCode}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className="btn"
                    onClick={() => {
                      void navigator.clipboard.writeText(newCode);
                      setAdmMsg("কোড কপি হয়েছে — clipboard-এ।");
                    }}
                  >
                    ⧉ Copy code
                  </button>
                  <button className="btn-ghost" onClick={() => setNewCode(null)}>
                    ✕ লুকাও
                  </button>
                </div>
              </div>
            )}
            {admCodes.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[11.5px]">
                  <thead>
                    <tr className="border-b border-ink/20 text-[10px] uppercase tracking-wider text-ink-soft">
                      <th className="py-1 pr-2">email</th>
                      <th className="py-1 pr-2">label</th>
                      <th className="py-1 pr-2">created</th>
                      <th className="py-1 pr-2">expires</th>
                      <th className="py-1 pr-2">state</th>
                      <th className="py-1 pr-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {admCodes.map((c) => {
                      const state = c.used_at
                        ? "✓ used"
                        : c.revoked_at
                          ? "✕ revoked"
                          : new Date(c.expires_at) < new Date()
                            ? "expired"
                            : "active";
                      return (
                        <tr key={c.id} className="border-b border-ink/10">
                          <td className="py-1 pr-2 font-mono text-[10.5px]">{c.email}</td>
                          <td className="py-1 pr-2">{c.label ?? "—"}</td>
                          <td className="py-1 pr-2 text-[10.5px]">{c.created_at.slice(0, 16).replace("T", " ")}</td>
                          <td className="py-1 pr-2 text-[10.5px]">{c.expires_at.slice(0, 16).replace("T", " ")}</td>
                          <td className="py-1 pr-2">
                            <span
                              className={
                                state === "active" ? "bg-lime px-1.5 py-0.5 text-[10px] font-bold" : "px-1.5 py-0.5 text-[10px] font-bold text-ink-soft/70"
                              }
                            >
                              {state}
                            </span>
                          </td>
                          <td className="py-1 pr-2">
                            {state === "active" && (
                              <button className="text-[10px] font-bold text-alizarin underline" onClick={() => void revokeCode(c.id)}>
                                বাতিল
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {admMsg && <p className="mt-2 text-[11.5px] font-bold text-ink">✓ {admMsg}</p>}
            {admErr && <p className="mt-2 text-[11.5px] font-bold text-alizarin">✕ {admErr}</p>}
          </div>
        )}

        {tab === "backup" && (
          <div className="panel mt-5">
            <p className="panel-title">ব্যাকআপ, রিসেট ও সিঙ্ক</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="password"
                className="field min-w-56 flex-1"
                placeholder="backup passphrase (encryption key)"
                value={bkPass}
                onChange={(e) => setBkPass(e.target.value)}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn" onClick={() => void doExport()}>
                ⬇ Export backup
              </button>
              <button className="btn-ghost" onClick={() => void doImport()}>
                ⬆ Restore backup
              </button>
              <button className="btn-ghost" onClick={() => void doReset()}>
                ⟲ Reset content
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn" onClick={() => void doSync("push")}>
                ☁ Push local → cloud
              </button>
              <button className="btn-ghost" onClick={() => void doSync("pull")}>
                ⬇ Pull cloud → local
              </button>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
              ব্যাকআপ ফাইল AES-256-GCM দিয়ে এনক্রিপ্ট হয়; passphrase কখনো ডিস্কে লেখা হয় না। Restore
              আগের ডেটা REPLACE করে। Push = local file DB → shared Turso; Pull = cloud → local।
            </p>
            {bkMsg && <p className="mt-2 whitespace-pre-line text-[11.5px] font-bold text-ink">✓ {bkMsg}</p>}
            {bkErr && <p className="mt-2 text-[11.5px] font-bold text-alizarin">✕ {bkErr}</p>}
          </div>
        )}

        {tab === "vault" && (
          <div className="mt-5 space-y-3">
            {FIELDS.map((f) => (
              <div key={f.name} className="panel flex items-center gap-3">
                <div className="w-64 shrink-0">
                  <p className="font-mono text-[10.5px] font-bold">{f.label}</p>
                  <Show name={f.name} />
                </div>
                <div className="flex flex-1 items-center gap-2">
                  <input
                    className="field flex-1"
                    type={f.secret ? "password" : "text"}
                    placeholder={f.secret ? "henry… (hidden)" : "value"}
                    value={values[f.name] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                  />
                  <button className="btn" disabled={!(values[f.name] ?? "").trim()} onClick={() => void save(f)}>
                    Save
                  </button>
                  <button className="btn-ghost" onClick={() => void clear(f)}>
                    Clear
                  </button>
                </div>
              </div>
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}