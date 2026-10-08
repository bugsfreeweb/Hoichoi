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
  Rss,
  Cpu,
  Bell,
  LayoutDashboard,
  Cloud,
  RefreshCw,
} from "lucide-react";
import {
  getCredential,
  storeCredential,
  removeCredential,
  getRunEnv,
  getCloudEnv,
  getEnvFromVault,
  isCloudSync,
  envNameFor,
  type CredentialName,
} from "../lib/vault";
import { SECRET_SPECS, LLM_SECRET_NAMES } from "../lib/secret-specs";
import {
  settingsGet,
  settingsSet,
  backupExport,
  backupImport,
  deskBackupAuto,
  deskBackupVerify,
  resetDb,
  syncDb,
  adminCodes,
  deskLoginLog,
  deskLoginLogDelete,
  deskLoginLogClear,
  deskProviders,
  type DeskLoginLogPage,
  type AdminLoginCode,
  type AdminCodeList,
  type CreatedAdminLoginCode,
} from "../lib/tauri";
import { listGithubSecrets, pushGithubSecret } from "../lib/github";
import { autoPull, autoPush } from "../lib/autosync";
import { toBn } from "../lib/format";
import DeskCategoryManager from "../components/DeskCategoryManager";
import DeskSourceManager from "../components/DeskSourceManager";
import DeskProviderManager from "../components/DeskProviderManager";
import DeskNoticeManager from "../components/DeskNoticeManager";
import MediaStoragePanel from "../components/MediaStoragePanel";
import { SITE_URL } from "../lib/site";

const TABS = [
  { id: "pref", icon: Sliders, label: "প্রেফারেন্স" },
  { id: "sources", icon: Rss, label: "সোর্স" },
  { id: "categories", icon: Tags, label: "বিভাগ" },
  { id: "providers", icon: Cpu, label: "AI প্রোভাইডার" },
  { id: "notices", icon: Bell, label: "নোটিশ" },
  { id: "sync", icon: Database, label: "ক্লাউড সিঙ্ক" },
  { id: "site", icon: Palette, label: "সাইট ও বিজ্ঞাপন" },
  { id: "admin", icon: UserCog, label: "অ্যাডমিন" },
  { id: "backup", icon: Archive, label: "ব্যাকআপ" },
  { id: "media", icon: Cloud, label: "মিডিয়া স্টোরেজ" },
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
  { name: "MISTRAL_API_KEY", label: "Mistral API key", secret: true },
  { name: "OPENAI_API_KEY", label: "OpenAI API key", secret: true },
  { name: "MANIFEST_API_KEY", label: "Manifest API key", secret: true },
  { name: "GITHUB_COPILOT_TOKEN", label: "GitHub Copilot token", secret: true },
  { name: "github_branch", label: "GitHub branch (jsDelivr)", secret: false },
  { name: "github_cdn_url", label: "GitHub CDN base URL (jsDelivr)", secret: false },
  { name: "idrivee2_access_key", label: "IDrive e2 Access key", secret: true },
  { name: "idrivee2_secret_key", label: "IDrive e2 Secret key", secret: true },
  { name: "idrivee2_bucket", label: "IDrive e2 Bucket", secret: false },
  { name: "idrivee2_endpoint", label: "IDrive e2 Endpoint URL", secret: false },
  { name: "b2_access_key", label: "Backblaze B2 keyID", secret: true },
  { name: "b2_secret_key", label: "Backblaze B2 applicationKey", secret: true },
  { name: "b2_bucket", label: "Backblaze B2 bucket", secret: false },
  { name: "b2_endpoint", label: "Backblaze B2 endpoint URL", secret: false },
  { name: "revalidate_secret", label: "Revalidate secret (web)", secret: true },
  { name: "vercel_deploy_hook_url", label: "Vercel deploy hook URL (redeploy web after scrape)", secret: true },
];

const BRAND_FIELDS: Array<{ key: string; label: string; secret?: boolean; multiline?: boolean }> = [
  { key: "site_name", label: "সাইট নাম / App name" },
  { key: "slogan_bn", label: "স্লোগান (slogan)" },
  { key: "tagline", label: "ট্যাগলাইন (tagline)" },
  { key: "logo_url", label: "Logo URL (empty = text)" },
  { key: "favicon_url", label: "Favicon URL (empty = default)" },
  { key: "accent_color", label: "Accent color (hex)" },
  { key: "footer_about_bn", label: "ফুটার \"সম্পর্কে\" অনুচ্ছেদ", multiline: true },
];

const AD_SLOTS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: "ad_leaderboard_html", label: "Leaderboard (হোমপেজ শীর্ষ)", placeholder: "<!-- AdSense / Adsterra leaderboard code -->" },
  { key: "ad_rect_html", label: "Rectangle 300×250 (পোস্ট পেজ)", placeholder: "<!-- AdSense / Adsterra rectangle code -->" },
  { key: "ad_infeed_html", label: "In-feed (গ্রিড প্রতি ৪য়)", placeholder: "<!-- In-feed ad code -->" },
  { key: "ad_strip_html", label: "Strip (হোমপেজ নিচে)", placeholder: "<!-- Strip ad code -->" },
];

const VIS_ITEMS: Array<{ key: keyof SiteAppConfig; label: string; hint: string }> = [
  { key: "show_hero", label: "হিরো সেকশন", hint: "শীর্ষের বড় ক্যাটাগরি-কার্ড" },
  { key: "show_live_graph", label: "Live Analytics গ্রাফ", hint: "প্রবন্ধ-card-এর উপরে ট্রেন্ডগ্রাফ" },
  { key: "show_categories", label: "বিভাগ স্ট্রিপ", hint: "হোমপেজ গ্রিডের আগে ক্যাটাগরি-বোতাম" },
  { key: "show_ads", label: "বিজ্ঞাপন স্লট", hint: "সব ad slot জায়গা" },
  { key: "show_rewrite_engine", label: "রিরাইট ইঞ্জিন ব্যাজ", hint: "ডেস্কটপ অ্যাপ প্রচার-কার্ড" },
  { key: "show_footer", label: "ফুটার", hint: "নিচের ফুটার প্যানেল" },
  { key: "ai_hero_images", label: "AI Fallback Image", hint: "মিডিয়া ছাড়া পোস্টে AI হিরো ছবি (Gemini)" },
];

interface SiteAppConfig {
  show_hero: boolean;
  show_live_graph: boolean;
  show_categories: boolean;
  show_ads: boolean;
  show_rewrite_engine: boolean;
  show_footer: boolean;
  maintenance_mode: boolean;
  ai_hero_images: boolean;
  theme_default: "light" | "dark";
  surge_threshold: number;
}

const VIS_DEFAULTS: SiteAppConfig = {
  show_hero: true,
  show_live_graph: true,
  show_categories: true,
  show_ads: true,
  show_rewrite_engine: true,
  show_footer: true,
  maintenance_mode: false,
  ai_hero_images: true,
  theme_default: "dark",
  surge_threshold: 12,
};

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
  const [bkAuto, setBkAuto] = useState(() => {
    try {
      const raw = localStorage.getItem("hoichoi.desk.autobk");
      if (!raw) return { enabled: false, folder: "", keep: 7, pass: "" };
      const p = JSON.parse(raw) as { enabled?: boolean; folder?: string; keep?: number; pass?: string } | null;
      return { enabled: Boolean(p?.enabled), folder: p?.folder ?? "", keep: p?.keep ?? 7, pass: p?.pass ?? "" };
    } catch {
      return { enabled: false, folder: "", keep: 7, pass: "" };
    }
  });
  const [bkMsg, setBkMsg] = useState<string | null>(null);
  const [bkErr, setBkErr] = useState<string | null>(null);

  const [admEmail, setAdmEmail] = useState("");
  const [admLabel, setAdmLabel] = useState("");
  const [admCodes, setAdmCodes] = useState<AdminLoginCode[]>([]);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [admMsg, setAdmMsg] = useState<string | null>(null);
  const [admErr, setAdmErr] = useState<string | null>(null);

  const [logLog, setLogLog] = useState<DeskLoginLogPage | null>(null);
  const [logBusy, setLogBusy] = useState(false);
  const [logMsg, setLogMsg] = useState<string | null>(null);
  const [logErr, setLogErr] = useState<string | null>(null);

  const [adSlots, setAdSlots] = useState<Record<string, string>>({});
  const [adSlotsMsg, setAdSlotsMsg] = useState<string | null>(null);
  const [adSlotsErr, setAdSlotsErr] = useState<string | null>(null);

  const [vis, setVis] = useState<SiteAppConfig>(VIS_DEFAULTS);
  const [visLoaded, setVisLoaded] = useState(false);
  const [visMsg, setVisMsg] = useState<string | null>(null);
  const [visErr, setVisErr] = useState<string | null>(null);

  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncErr, setSyncErr] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<"push" | "pull" | null>(null);

  const [ghSecrets, setGhSecrets] = useState<Array<{ name: string; updated_at: string }> | null>(null);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghErr, setGhErr] = useState<string | null>(null);
  const loadGithubSecrets = async () => {
    setGhLoading(true);
    setGhErr(null);
    try {
      setGhSecrets(await listGithubSecrets());
    } catch (e) {
      setGhErr(e instanceof Error ? e.message : String(e));
    } finally {
      setGhLoading(false);
    }
  };

  const [webMsg, setWebMsg] = useState<string | null>(null);
  const [webErr, setWebErr] = useState<string | null>(null);

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
      await autoPush();
    } catch (e) {
      fail(e);
    }
  };

  const saveTemp = async () => {
    try {
      await settingsSet(await getRunEnv(), { llm_temperature: prefs.temp });
      show(`রিরাইট তাপমাত্রা সংরক্ষিত — ${prefs.temp.toFixed(2)}`);
      setErr(null);
      await loadBrand();
      await autoPush();
    } catch (e) {
      fail(e);
    }
  };

  const saveGate = async () => {
    try {
      await settingsSet(await getRunEnv(), { fact_gate: prefs.gate });
      show(`ফ্যাক্ট-গেট থ্রেশহোল্ড সংরক্ষিত — ${prefs.gate}%`);
      setErr(null);
      await loadBrand();
      await autoPush();
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
        // Push under the *env* name, not the vault key: workflows read
        // `secrets.VERCEL_DEPLOY_HOOK_URL` / `secrets.TURSO_AUTH_TOKEN`, so
        // pushing `vercel_deploy_hook_url` would store a secret nothing reads.
        const envName = envNameFor(f.name) ?? f.name;
        // Never swallow this: a silently-failed push leaves the cron workflow
        // reading an empty secret, which looks exactly like "I saved it but
        // nothing happens".
        await pushGithubSecret(envName, v.trim());
        show(`${f.label} সংরক্ষিত — GitHub secret ${envName} হিসেবেও পাঠানো হয়েছে`);
      } else {
        await storeCredential(f.name, v.trim());
        show(`${f.label} saved`);
      }
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

      // The rewrite temperature and fact gate are the two prefs the scraper
      // actually reads, and they live in the shared `settings` table so the web
      // admin and the GitHub pipeline use the same values. They used to hydrate
      // from localStorage only, which meant this machine showed a default that
      // had nothing to do with the value the pipeline was really using — and a
      // change made on the web admin never showed up here.
      const temp = Number(s.llm_temperature);
      if (Number.isFinite(temp) && temp >= 0 && temp <= 2) updatePref("temp", temp);
      const gate = Number(s.fact_gate);
      if (Number.isFinite(gate) && gate >= 0 && gate <= 100) updatePref("gate", gate);
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

      const raw = s.app_config_json;
      if (raw) {
        try {
          const parsed = JSON.parse(raw as string) as Partial<SiteAppConfig>;
          setVis({ ...VIS_DEFAULTS, ...parsed });
        } catch {
          setVis(VIS_DEFAULTS);
        }
      } else {
        setVis(VIS_DEFAULTS);
      }
      setVisLoaded(true);
    } catch {
      setAdSlotsErr("Ad slots লোড ব্যর্থ");
    }
  };

  const saveVis = async () => {
    try {
      await settingsSet(await getRunEnv(), { app_config_json: JSON.stringify(vis) });
      setVisMsg("সংরক্ষিত — web সাইট এখনই নতুন ভিজিবিলিটি/থিম ব্যবহার করবে");
      setVisErr(null);
      await autoPush();
    } catch (e) {
      setVisErr(String(e));
    }
  };

  const doRefreshWeb = async () => {
    setWebMsg(null);
    setWebErr(null);
    try {
      const env = await getRunEnv();
      const u = new URL("/api/revalidate", SITE_URL);
      const secret = env["REVALIDATE_SECRET"];
      if (secret) u.searchParams.set("secret", secret);
      const res = await fetch(u.toString());
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && body?.ok) {
        setWebMsg("ওয়েব ক্যাশ রিফ্রেশ হয়েছে — হোমপেজ ও ক্যাটাগরি পেজ এখন নতুন কনটেন্ট দেখাবে।");
      } else {
        setWebErr(body?.error ? body.error : `HTTP ${res.status}`);
      }
    } catch (e) {
      setWebErr(String(e));
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
      await autoPush();
    } catch (e) {
      setAdSlotsErr(String(e));
    }
  };

  /**
   * Runs one resync hop and returns true on success.
   *
   * Returns a boolean instead of only writing to state so callers can chain:
   * the full-sync button must abort if the push leg fails, otherwise it would
   * pull production back over the very data it just failed to send.
   */
  const doSync = async (direction: "push" | "pull"): Promise<boolean> => {
    if (syncing !== null) return false;
    setSyncMsg(null);
    setSyncErr(null);
    setSyncing(direction);
    try {
      // A manual resync is the local-file-DB ⇄ Turso hop, so it must carry the
      // cloud credentials even when the vault's cloud-sync toggle is off.
      const res = await syncDb(direction, await getCloudEnv());
      setSyncMsg(
        `${direction === "push" ? "ডেস্ক → ওয়েব" : "ওয়েব → ডেস্ক"} সম্পন্ন — ${toBn(res.tablesSynced ?? 0)} টেবিল, ${toBn(res.rowsAffected ?? 0)} রো কপি হয়েছে।`,
      );
      setSyncErr(null);
      await refresh();
      await loadBrand();
      return true;
    } catch (e) {
      setSyncErr(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setSyncing(null);
    }
  };

  /** Push then pull, stopping the moment a leg fails. */
  const doFullSync = async () => {
    if (syncing !== null) return;
    setSyncErr(null);
    setSyncMsg("সিঙ্ক শুরু — ধাপ ১/২: ডেস্ক → ওয়েব…");
    setSyncing("push");
    try {
      const res = await syncDb("push", await getCloudEnv());
      setSyncMsg(
        `ধাপ ১/২ সম্পন্ন — ${toBn(res.tablesSynced ?? 0)} টেবিল, ${toBn(res.rowsAffected ?? 0)} রো পাঠানো হয়েছে। এখন ধাপ ২/২: ওয়েব → ডেস্ক…`,
      );
      const back = await syncDb("pull", await getCloudEnv());
      setSyncMsg(
        `পূর্ণ সিঙ্ক সম্পন্ন — ${toBn(res.tablesSynced ?? 0)} টেবিল/ ${toBn(res.rowsAffected ?? 0)} রো পাঠানো, ${toBn(back.tablesSynced ?? 0)} টেবিল/ ${toBn(back.rowsAffected ?? 0)} রো আনা হয়েছে।`,
      );
      setSyncErr(null);
      await refresh();
      await loadBrand();
    } catch (e) {
      setSyncErr(
        `পূর্ণ সিঙ্ক বন্ধ হয়েছে: ${e instanceof Error ? e.message : String(e)} — ওয়েব থেকে ডেস্কে আনা হয়নি, যাতে ত্রুটিপূর্ণ অবস্থায় ডেটা উল্টে না যায়।`,
      );
      setSyncMsg(null);
    } finally {
      setSyncing(null);
    }
  };

  // Auto-load branding and ad slots on mount
  useEffect(() => {
    void loadBrand();
    void loadAdminCodes();
    void loadAdSlots();
    void loadLoginLog();
    void loadProviderKeys();
    // Local-only mode: pull web-side config (categories/sources/branding)
    // down to the desk so both admin surfaces show the same data.
    void autoPull();
  }, []);

  const [providerKeys, setProviderKeys] = useState<Record<string, boolean>>({});
  const loadProviderKeys = async () => {
    try {
      const provs = await deskProviders(await getRunEnv());
      const map: Record<string, boolean> = {};
      for (const p of provs) {
        if (p.api_key_env_var && p.api_key) map[p.api_key_env_var] = true;
      }
      setProviderKeys(map);
    } catch {
      /* provider keys are optional */
    }
  };

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

  const logoutAllWebSessions = async () => {
    const email = admEmail.trim();
    if (!email) {
      setAdmErr("ইমেইল দিতে হবে — কাকে লগ আউট করবেন (admin_users-এর মেলে)।");
      return;
    }
    if (!window.confirm(`"${email}" ইমেইলের সব ওয়েব অ্যাডমিন সেশন + অপেক্ষমান কোড বাতিল করবেন? ব্রাউজার থেকে নতুন কোড ছাড়া ঢোকা যাবে না।`)) {
      return;
    }
    try {
      setAdmErr(null);
      const res = (await adminCodes("logout-sessions", await getRunEnv(), { email })) as { ok: boolean };
      if (!res.ok) throw new Error("runner did not acknowledge");
      setAdmMsg(`ওয়েব লগ আউট হয়েছে — সেশন ও কোড বাতিল (${email})। ফেরার জন্য নতুন কোড তৈরি করুন।`);
      await loadAdminCodes();
    } catch (e) {
      setAdmErr(String(e));
    }
  };

  const loadLoginLog = async () => {
    setLogBusy(true);
    try {
      setLogErr(null);
      setLogLog(await deskLoginLog(await getRunEnv()));
    } catch (e) {
      setLogLog(null);
      setLogErr(String(e));
    } finally {
      setLogBusy(false);
    }
  };

  const removeLog = async (id: string) => {
    if (!window.confirm("এই লগ-এন্ট্রিটি মুছবেন?")) return;
    setLogBusy(true);
    try {
      await deskLoginLogDelete(await getRunEnv(), id);
      await loadLoginLog();
      setLogMsg("মুছে ফেলা হয়েছে।");
    } catch (e) {
      setLogErr(String(e));
    } finally {
      setLogBusy(false);
    }
  };

  const clearLog = async () => {
    if (!window.confirm("পুরো লগইন লগ মুছে ফেলবেন? এটি ফিরে পাওয়া যাবে না।")) return;
    setLogBusy(true);
    try {
      const n = await deskLoginLogClear(await getRunEnv());
      await loadLoginLog();
      setLogMsg(`${n}টি এন্ট্রি মুছে ফেলা হয়েছে।`);
    } catch (e) {
      setLogErr(String(e));
    } finally {
      setLogBusy(false);
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
      await autoPush();
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

  const saveBkAuto = (next: typeof bkAuto) => {
    setBkAuto(next);
    try {
      localStorage.setItem("hoichoi.desk.autobk", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const doAutoBackupNow = async () => {
    if (!bkAuto.folder || !bkAuto.pass) {
      setBkErr("স্বয়ংক্রিয় ব্যাকআপের জন্য ফোল্ডার ও পাসফ্রেজ দিতে হবে।");
      return;
    }
    try {
      setBkMsg(null);
      setBkErr(null);
      const res = await deskBackupAuto(bkAuto.pass, bkAuto.folder, bkAuto.keep, await getRunEnv());
      setBkMsg(`স্বয়ংক্রিয় ব্যাকআপ সফল:\n${res.file} (kept ${res.kept}, pruned ${res.pruned})`);
    } catch (e) {
      setBkErr(String(e));
    }
  };

  const doVerifyBackup = async () => {
    if (!bkAuto.folder || !bkAuto.pass) {
      setBkErr("যাচাইয়ের জন্য পাসফ্রেজ ও ব্যাকআপ ফোল্ডার নির্দিষ্ট করুন।");
      return;
    }
    try {
      setBkMsg(null);
      setBkErr(null);
      const pathPrompt = window.prompt("যাচাই করতে চাওয়া ব্যাকআপ ফাইলের পুরো পাথ দিন:", `${bkAuto.folder}\\hoichoi-backup.bak`);
      if (!pathPrompt) return;
      const res = await deskBackupVerify(bkAuto.pass, pathPrompt.trim(), await getRunEnv());
      setBkMsg(`যাচাইকরণ সফল: ${JSON.stringify(res)}`);
    } catch (e) {
      setBkErr(String(e));
    }
  };

  const Show = ({ name }: { name: CredentialName }) => {
    const [has, setHas] = useState<boolean | null>(null);
    void getCredential(name).then((v) => setHas(v !== null || Boolean(providerKeys[name])));
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
      <div className="w-full border-b border-white/8 px-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 pt-6">
          <div className="min-w-0">
            <p className="font-mono-x text-[9.5px] tracking-[0.26em] text-lime uppercase">
              DESKTOP CONTROLLER · LOCAL PREFERENCES
            </p>
            <h2 className="mt-1 font-serif-bn text-[28px] font-black text-white">সেটিংস</h2>
            <p className="mt-1 max-w-3xl text-[12.5px] text-white/50">
              মানগুলো Stronghold-এ এনক্রিপ্টেড; UI-তে কখনো প্লেইনটেক্সট দেখানো হয় না। প্রতিটি
              ট্যাব একেকটি সেটিংস গ্রুপ।
            </p>
          </div>
          <div className="flex min-w-56 shrink-0 flex-col items-stretch gap-2">
            {msg && <p className="rounded-lg bg-lime px-3 py-2 text-[11.5px] font-bold text-night">✓ {msg}</p>}
            {err && <p className="rounded-lg bg-alizarin px-3 py-2 text-[11.5px] font-bold text-paper">✕ {err}</p>}
          </div>
        </div>

        <div className="settings-tabs pb-3">
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
        <div className="w-full px-6 pb-8">
        {tab === "pref" && (
          <div className="panel mt-5">
            <p className="panel-title">ডেস্ক প্রেফারেন্স · local</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
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
                <button
                  onClick={() => void saveTemp()}
                  className="mt-2 flex items-center gap-1.5 rounded-lg bg-lime px-3 py-1.5 text-[11px] font-bold text-night hover:brightness-110"
                >
                  তাপমাত্রা সংরক্ষিত করুন
                </button>
                <p className="mt-2 text-[11.5px] text-white/40">
                  LLM-এর স্যাম্পলিং তাপমাত্রা। এটি সেভ করলে ওয়েব অ্যাডমিন ও নির্ধারিত
                  GitHub Actions রান — সবাই একই মান পাবে।
                </p>
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
                  ক্লাসিফায়ারের নিশ্চয়তা এই থ্রেশহোল্ডের নিচে নামলে পোস্টটি{" "}
                  <span className="text-amberx">pending</span> সারিতে যায় — লাইভে নয়। সংবেদনশীল
                  অপরাধ/শিশু কনটেন্টে ৯০+ রাখুন।
                </p>
                <button
                  onClick={() => void saveGate()}
                  className="mt-3 flex items-center gap-1.5 rounded-lg bg-lime px-3 py-1.5 text-[11px] font-bold text-night hover:brightness-110"
                >
                  থ্রেশহোল্ড সংরক্ষিত করুন
                </button>
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
              রিরাইট তাপমাত্রা ও ফ্যাক্ট-গেট সেভ করলে সেগুলো shared settings টেবিলে যায় — ওয়েব অ্যাডমিন ও
              GitHub পাইপলাইন একই ভ্যালু ব্যবহার করবে। বাকি প্রেফারেন্স শুধু এই মেশিনে (localStorage) থাকে।
            </p>
          </div>
        )}

        {/* Sources / Categories stay mounted: data loads once when Settings
            opens, and switching tabs is instant (CSS visibility only) instead
            of respawning a runner subprocess + re-fetch on every tab switch. */}
        <div className={tab === "sources" ? "" : "hidden"}>
          <DeskSourceManager />
        </div>

        <div className={tab === "categories" ? "" : "hidden"}>
          <DeskCategoryManager />
        </div>

        <div className={tab === "providers" ? "" : "hidden"}>
          <DeskProviderManager />
        </div>

        <div className={tab === "notices" ? "" : "hidden"}>
          <DeskNoticeManager />
        </div>

        {tab === "sync" && (
          <>
            <div className="panel mt-5">
              <p className="panel-title">GitHub Actions · অটো কালেকশনের জন্য</p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
                ডেস্ক বন্ধ থাকলেও GitHub Actions-এর cron একই কাজ করে — কিন্তু সেটি
                শুধু রিপোজিটরি সিক্রেট পড়তে পারে। নিচে যেগুলো নেই, সেগুলো না
                যোগ করা পর্যন্ত ক্রন ব্যর্থ হবে।
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-ghost" disabled={ghLoading} onClick={() => void loadGithubSecrets()}>
                  {ghLoading ? "⏳ যাচাই হচ্ছে…" : "↻ GitHub সিক্রেট চেক করুন"}
                </button>
              </div>
              {ghErr && <p className="mt-2 text-[11.5px] font-bold text-alizarin">✕ {ghErr}</p>}
              {ghSecrets && (
                <div className="mt-3 space-y-1.5">
                  {ghSecrets.length === 0 && (
                    <p className="text-[11.5px] font-bold text-alizarin">
                      রিপোজিটরিতে একটিও Actions secret নেই — উপরের ফিল্ডগুলো সেভ করলে
                      সেগুলো নিজে থেকেই GitHub-এ চলে যাবে।
                    </p>
                  )}
                  {SECRET_SPECS.map((spec) => {
                    // An LLM key is satisfied by any of its variants.
                    const variants =
                      spec.name === "LLM_PROVIDER_KEY" ? LLM_SECRET_NAMES : [spec.name];
                    const found = variants
                      .map((v) => ghSecrets.find((s) => s.name === v))
                      .find(Boolean);
                    const blocking = spec.requirement === "required" && !found;
                    return (
                      <details
                        key={spec.name}
                        className={`rounded-lg border px-3 py-2 ${
                          blocking ? "border-alizarin/40 bg-alizarin/5" : "border-ink/10"
                        }`}
                      >
                        <summary className="flex cursor-pointer list-none items-center gap-2 text-[11.5px]">
                          <span className={found ? "text-lime" : blocking ? "text-alizarin" : "text-ink-soft"}>
                            {found ? "✓" : blocking ? "✕" : "–"}
                          </span>
                          <span className="font-mono-x text-[11px] text-ink">{spec.name}</span>
                          <span className="text-ink-soft">
                            {found
                              ? `— GitHub-এ আছে (${new Date(found.updated_at).toLocaleString("bn-BD")})`
                              : blocking
                                ? "— আবশ্যক, GitHub-এ নেই"
                                : spec.requirement === "recommended"
                                  ? "— প্রস্তাবিত, GitHub-এ নেই"
                                  : "— ঐচ্ছিক, GitHub-এ নেই"}
                          </span>
                        </summary>
                        <div className="mt-2 space-y-2 border-t border-ink/10 pt-2">
                          <p className="text-[11.5px] leading-relaxed text-ink-soft">
                            {spec.purposeBn}
                          </p>
                          <ol className="list-inside list-decimal space-y-1 text-[11.5px] leading-relaxed text-ink-soft">
                            {spec.howToBn.map((step, i) => (
                              <li key={i} className="whitespace-pre-wrap">{step}</li>
                            ))}
                          </ol>
                          <code className="block overflow-x-auto rounded bg-ink/5 px-2 py-1 font-mono-x text-[10.5px] whitespace-pre-wrap text-ink">
                            {spec.envExample}
                          </code>
                          <p className="text-[11px] text-alizarin">
                            না দিলে: {spec.ifMissingBn}
                          </p>
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
              {!ghSecrets && (
                <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
                  উপরের চেক বাটনে চাপলে প্রতিটি সিক্রেটের বর্তমান অবস্থা দেখা যাবে এবং
                  প্রতিটির নিচে ধাপে ধাপে কোথা থেকে পাবেন তা লেখা থাকবে।
                </p>
              )}
            </div>

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
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
                Local-only মোডে স্বয়ংক্রিয় সিঙ্ক চালু: সেটিংস খুললেই Pull, এবং সোর্স/বিভাগ/
                ব্র্যান্ডিং পরিবর্তন করলে Push — web অ্যাডমিন ও ডেস্কটপ একই কনফিগার দেখাবে।
                Cloud sync মোডে একই DB ব্যবহার হয় বলে অতিরিক্ত সিঙ্ক লাগে না।
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn" disabled={syncing !== null || cloud === true} onClick={() => void doSync("push")}>
                  {syncing === "push" ? "⏳ পাঠানো হচ্ছে…" : "☁ ডেস্ক → ওয়েব"}
                </button>
                <button className="btn-ghost" disabled={syncing !== null || cloud === true} onClick={() => void doSync("pull")}>
                  {syncing === "pull" ? "⏳ আনা হচ্ছে…" : "⬇ ওয়েব → ডেস্ক"}
                </button>
                <button
                  className="btn-ghost"
                  disabled={syncing !== null || cloud === true}
                  onClick={() => void doFullSync()}
                >
                  ↻ পূর্ণ সিঙ্ক (আগে পাঠান, পরে আনুন)
                </button>
              </div>
              {cloud === true && (
                <p className="mt-2 text-[11.5px] font-bold text-amber-300">
                  ⚠ Cloud sync মোড সক্রিয় — ডেস্কটপ সরাসরি shared Turso DB-তেই লেখে, তাই
                  এই সিঙ্ক বাটনগুলো বন্ধ। স্থানীয় file DB এখন অব্যবহৃত ও পুরোনো, তাই এটি
                  পাঠালে shared ডেটা মুছে যেত। ◌ Local only মোডে ফিরে গেলে সিঙ্ক চালু হবে।
                </p>
              )}
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
                ডেস্ক → ওয়েব = এই ডেস্কটপের file DB থেকে shared Turso DB-তে কপি। ওয়েব → ডেস্ক = উল্টো।
                সিঙ্কের জন্য API Vault-এ Turso URL ও টোকেন থাকতে হবে — Cloud sync মোড বন্ধ
                থাকলেও এই বাটনগুলো কাজ করে, কারণ এগুলোই cloud DB-তে লেখার পথ। তবে Cloud sync
                মোড চালু থাকলে ডেস্কটপ ইতিমধ্যেই cloud DB ব্যবহার করছে, তাই push/pull
                অপ্রয়োজনীয় ও ঝুঁকিপূর্ণ — সেক্ষেত্রে বাটন বন্ধ থাকে।
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
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {BRAND_FIELDS.map((f) => {
                  const Render = "multiline" in f && f.multiline ? "textarea" : "input";
                  return (
                    <label key={f.key} className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">{f.label}</span>
                      <Render
                        className="field mt-1 w-full"
                        rows={3}
                        value={brand[f.key] ?? ""}
                        onChange={(e) => setBrand((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      />
                    </label>
                  );
                })}
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
              <div className="mt-3 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                {AD_SLOTS.map((s) => (
                  <label key={s.key} className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wide">{s.label}</span>
                    <textarea
                      className="field h-24 resize-none font-mono text-[10px]"
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

            <div className="panel mt-5">
              <p className="flex items-center gap-2 panel-title">
                <LayoutDashboard size={14} className="text-lime" /> ওয়েব ভিজিবিলিটি ও থিম · app_config_json
              </p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
                কোন সেকশন ওয়েবসাইটে দেখাবে, না দেখাবে — তা ঠিক করুন। Web অ্যাডমিনের settings
                পেজ এই একই কনফিগ নিয়ন্ত্রণ করে; দুদিক থেকেই একই JSON আপডেট হয়। ডিফল্ট থিম
                প্রথম লোডে দর্শকের ব্রাউজারে বসে (localStorage পছন্দ থাকলে সেটি জিতে)।
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {VIS_ITEMS.map((v) => (
                  <label key={v.key} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-bold text-white">{v.label}</span>
                      <span className="block text-[10.5px] text-white/40">{v.hint}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setVis({ ...vis, [v.key]: !vis[v.key] })}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${vis[v.key] ? "bg-lime" : "bg-white/15"}`}
                    >
                      <span
                        className="absolute top-0.5 h-4 w-4 rounded-full bg-night transition-all"
                        style={{ left: vis[v.key] ? 18 : 2 }}
                      />
                    </button>
                  </label>
                ))}
              </div>
              <label className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-alizarin/45 bg-alizarin/10 px-3 py-2.5">
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold text-alizarin">
                    {vis.maintenance_mode ? "মেইনটেন্যান্স চলছে" : "মেইনটেন্যান্স মোড"}
                  </span>
                  <span className="block text-[10.5px] text-white/40">
                    চালু করলে সাধারণ দর্শকরা মেইনটেন্যান্স পেজ দেখবে; লগ-ইন করা অ্যাডমিনদের জন্য সাইট খোলা থাকবে।
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setVis({ ...vis, maintenance_mode: !vis.maintenance_mode })}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${vis.maintenance_mode ? "bg-alizarin" : "bg-white/15"}`}
                  aria-pressed={vis.maintenance_mode === true}
                  aria-label="মেইনটেন্যান্স মোড"
                >
                  <span
                    className="absolute top-0.5 h-4 w-4 rounded-full bg-night transition-all"
                    style={{ left: vis.maintenance_mode ? 18 : 2 }}
                  />
                </button>
              </label>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">ডিফল্ট থিম</span>
                  <select
                    className="field mt-1 w-44"
                    value={vis.theme_default}
                    onChange={(e) => setVis({ ...vis, theme_default: e.target.value as "light" | "dark" })}
                  >
                    <option value="light">light</option>
                    <option value="dark">dark</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Surge threshold</span>
                  <input
                    type="number"
                    className="field mt-1 w-32"
                    value={vis.surge_threshold}
                    onChange={(e) => setVis({ ...vis, surge_threshold: Number(e.target.value) })}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button className="btn" onClick={() => void saveVis()}>
                    💾 Save visibility & theme
                  </button>
                  <button className="btn-ghost" onClick={() => void loadAdSlots()}>
                    Load current
                  </button>
                </div>
              </div>
              {visMsg && <p className="mt-2 text-[11.5px] font-bold text-ink">✓ {visMsg}</p>}
              {visErr && <p className="mt-2 text-[11.5px] font-bold text-alizarin">✕ {visErr}</p>}
              {!visLoaded && (
                <p className="mt-2 text-[11.5px] text-ink-soft/60">
                  ⟳ লোড হচ্ছে… settings-এ ক্লিক করলে ডিফল্ট মান দেখাবে।
                </p>
              )}
            </div>

            <div className="panel mt-5">
              <p className="flex items-center gap-2 panel-title">
                <RefreshCw size={14} className="text-lime" /> ওয়েব রিফ্রেশ (revalidate)
              </p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
                ব্রাউজারের Vercel ক্যাশ দ্রুত ফুটিয়ে নতুন পোস্ট/এডিট তাৎক্ষণিক দেখাতে
                <code className="text-lime"> /api/revalidate</code> কল করুন। secret খালি রাখলে শুধু
                <code className="text-white"> secret </code> params ছাড়াই রান করবে (সাইট পাবলিক হলে
                ঝুঁকি আছে — ভল্ট ট্যাবে <code className="text-lime">revalidate_secret</code> সেট করুন)।
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={() => void doRefreshWeb()} className="btn">
                  <RefreshCw size={13} /> এখনই রিফ্রেশ করুন
                </button>
                <code className="rounded bg-white/[0.05] px-2 py-1 font-mono-x text-[10.5px] text-white/50">
                  {SITE_URL}/api/revalidate?secret=…
                </code>
              </div>
              {webMsg && <p className="mt-2 text-[11.5px] font-bold text-ink">✓ {webMsg}</p>}
              {webErr && <p className="mt-2 text-[11.5px] font-bold text-alizarin">✕ {webErr}</p>}
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
              <button className="btn-ghost" onClick={() => void logoutAllWebSessions()}>
                ⏻ সব ওয়েব সেশন লগ আউট
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

            <div className="mt-8 border-t border-ink/15 pt-5">
              <p className="flex items-center gap-2 text-[13px] font-bold text-white">
                <ShieldCheck size={14} className="text-lime" /> লগইন লগ (কোন ইমেইল/আইপি থেকে ঢোকার চেষ্টা)
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                ওয়েব অ্যাডমিন কনসোলে প্রতিটি সাইন-ইন attempt (সফল + ব্যর্থ) রেকর্ড হয়
                (`loginlog list` রানারের একই তথ্য)। ডেস্কটপ ও ওয়েব একই টেবিল দেখে।
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-ghost" disabled={logBusy} onClick={() => void loadLoginLog()}>
                  ↻ রিফ্রেশ
                </button>
                <button className="text-[11px] font-bold text-alizarin underline" disabled={logBusy} onClick={() => void clearLog()}>
                  সব মুছুন
                </button>
              </div>
              {logErr && <p className="mt-2 text-[11.5px] font-bold text-alizarin">✕ {logErr}</p>}
              {logMsg && <p className="mt-2 text-[11.5px] font-bold text-ink">✓ {logMsg}</p>}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[11.5px]">
                  <thead>
                    <tr className="border-b border-ink/20 text-[10px] uppercase tracking-wider text-ink-soft">
                      <th className="py-1 pr-2">state</th>
                      <th className="py-1 pr-2">email</th>
                      <th className="py-1 pr-2">IP</th>
                      <th className="py-1 pr-2">বার্তা</th>
                      <th className="py-1 pr-2">সময়</th>
                      <th className="py-1 pr-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(logLog?.rows ?? []).map((row) => (
                      <tr key={row.id} className="border-b border-ink/10">
                        <td className="py-1 pr-2">
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold ${
                              row.ok ? "bg-lime text-night" : "bg-alizarin text-paper"
                            }`}
                          >
                            {row.ok ? "সফল" : "ব্যর্থ"}
                          </span>
                        </td>
                        <td className="py-1 pr-2 font-mono text-[10.5px]">{row.email}</td>
                        <td className="py-1 pr-2 font-mono text-[10.5px] text-ink-soft">{row.ip ?? "—"}</td>
                        <td className="py-1 pr-2">{row.message ?? "—"}</td>
                        <td className="py-1 pr-2 font-mono-x text-[10px] text-ink-soft">
                          {row.created_at.slice(0, 16).replace("T", " ")}
                        </td>
                        <td className="py-1 pr-2 text-right">
                          <button
                            className="text-[10px] font-bold text-alizarin underline"
                            disabled={logBusy}
                            onClick={() => void removeLog(row.id)}
                          >
                            মুছুন
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logLog && logLog.rows.length === 0 && (
                  <p className="py-4 text-center text-[11.5px] text-ink-soft">কোনো লগইন এন্ট্রি নেই।</p>
                )}
              </div>
              {logLog && logLog.total > 0 && (
                <p className="mt-2 font-mono-x text-[10px] tracking-wide text-ink-soft uppercase">
                  মোট {logLog.total} · পৃষ্ঠা {logLog.page}/{logLog.pages} · নতুন—পুরনো
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "backup" && (
          <>
            <div className="panel mt-5">
              <p className="panel-title">ম্যানুয়াল ব্যাকআপ, রিসেট ও সিঙ্ক</p>
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
            </div>

            <div className="panel mt-5">
              <p className="panel-title">স্বয়ংক্রিয় ব্যাকআপ ও রোটেশন (Auto Backup)</p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
                পাইপলাইন সফলভাবে শেষ হলে নির্দিষ্ট ফোল্ডারে স্বয়ংক্রিয় ব্যাকআপ রাখা হয় এবং পুরনো ব্যাকআপ
                ছাঁটাই (rotation) করা হয়।
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">ব্যাকআপ ফোল্ডার</span>
                  <input
                    className="field mt-1 w-full"
                    placeholder="C:\Backups\Hoichoi"
                    value={bkAuto.folder}
                    onChange={(e) => saveBkAuto({ ...bkAuto, folder: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">সর্বোচ্চ সংখ্যা (Keep)</span>
                  <input
                    type="number"
                    className="field mt-1 w-full"
                    min={1}
                    max={100}
                    value={bkAuto.keep}
                    onChange={(e) => saveBkAuto({ ...bkAuto, keep: Number(e.target.value) || 7 })}
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-bold text-white">রান শেষে অটো-ব্যাকআপ চালু</span>
                  <button
                    type="button"
                    onClick={() => saveBkAuto({ ...bkAuto, enabled: !bkAuto.enabled })}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${bkAuto.enabled ? "bg-lime" : "bg-white/15"}`}
                  >
                    <span className="absolute top-0.5 h-4 w-4 rounded-full bg-night transition-all" style={{ left: bkAuto.enabled ? 18 : 2 }} />
                  </button>
                </div>
                <input
                  type="password"
                  className="field w-56 text-[11px]"
                  placeholder="অটো-ব্যাকআপ পাসফ্রেজ"
                  value={bkAuto.pass}
                  onChange={(e) => saveBkAuto({ ...bkAuto, pass: e.target.value })}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn" onClick={() => void doAutoBackupNow()}>
                  ⚡ এখনই ফোল্ডারে ব্যাকআপ নিন
                </button>
                <button className="btn-ghost" onClick={() => void doVerifyBackup()}>
                  🔍 ব্যাকআপ ফাইল যাচাই (Verify)
                </button>
              </div>
            </div>

            {bkMsg && <p className="mt-3 whitespace-pre-line text-[11.5px] font-bold text-ink">✓ {bkMsg}</p>}
            {bkErr && <p className="mt-3 text-[11.5px] font-bold text-alizarin">✕ {bkErr}</p>}
          </>
        )}

        {tab === "media" && <MediaStoragePanel />}

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