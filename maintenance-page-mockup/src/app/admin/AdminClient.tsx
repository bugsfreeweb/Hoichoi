"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  Newspaper,
  Palette,
  Radio,
  RotateCcw,
  Save,
  Settings2,
  Type,
  Users,
  X,
} from "lucide-react";
import type { SiteSettings } from "@/lib/types";
import { loc } from "@/lib/types";
import type { Stats } from "@/lib/store";
import type { Message, Subscriber } from "@/db/schema";
import { THEMES, themeName } from "@/lib/themes";
import { FitPreview } from "@/components/themes/registry";
import { Segmented } from "@/app/admin/ui";
import { OverviewTab } from "@/app/admin/tabs/OverviewTab";
import { DesignTab } from "@/app/admin/tabs/DesignTab";
import { ContentTab } from "@/app/admin/tabs/ContentTab";
import { NewsroomTab } from "@/app/admin/tabs/NewsroomTab";
import { AudienceTab } from "@/app/admin/tabs/AudienceTab";
import { SystemTab } from "@/app/admin/tabs/SystemTab";

type TabId = "overview" | "design" | "content" | "newsroom" | "audience" | "system";

const DEVICES = {
  desktop: { w: 1600, h: 1000, label: "Desktop" },
  tablet: { w: 900, h: 1200, label: "Tablet" },
  mobile: { w: 420, h: 860, label: "Mobile" },
} as const;

export function AdminClient({
  initial,
  stats,
  subscribers,
  messages,
}: {
  initial: SiteSettings;
  stats: Stats;
  subscribers: Subscriber[];
  messages: Message[];
}) {
  const [draft, setDraft] = useState<SiteSettings>(initial);
  const savedRef = useRef<SiteSettings>(initial);
  const [tab, setTab] = useState<TabId>("overview");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const [password, setPassword] = useState({ pw: "", pw2: "" });
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);
  const router = useRouter();
  const L = loc(draft);
  const bn = L === "bn";

  const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard; hint: string }[] = [
    { id: "overview", label: bn ? "সংক্ষিপ্ত" : "Overview", icon: LayoutDashboard, hint: bn ? "ট্রাফিক, পাঠক ও লঞ্চ সুইচ" : "Traffic, audience and launch switches" },
    { id: "design", label: bn ? "ডিজাইন" : "Design", icon: Palette, hint: bn ? "মকআপ, প্যালেট, ইফেক্ট ও মোশন" : "Mockups, palette, effects and motion" },
    { id: "content", label: bn ? "কনটেন্ট" : "Content", icon: Type, hint: bn ? "কপি, কাউন্টডাউন, নিউজলেটার, যোগাযোগ, SEO" : "Copy, countdown, newsletter, contact, SEO" },
    { id: "newsroom", label: bn ? "নিউজরুম" : "Newsroom", icon: Radio, hint: bn ? "পাইপলাইন স্ট্যাটাস, সংখ্যা, টিকার, শিডিউল" : "Pipeline status, numbers, ticker, schedule" },
    { id: "audience", label: bn ? "পাঠক" : "Audience", icon: Users, hint: bn ? "সাবস্ক্রাইবার ও ভিজিটর বার্তা" : "Subscribers and visitor messages" },
    { id: "system", label: bn ? "সিস্টেম" : "System", icon: Settings2, hint: bn ? "মোড, নিরাপত্তা, অ্যানালিটিক্স, রিসেট" : "Mode, security, analytics, reset" },
  ];

  const setS: Dispatch<SetStateAction<SiteSettings>> = useCallback((action) => {
    setDraft(action);
    setDirty(true);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(id);
  }, [toast]);

  const save = useCallback(async () => {
    setSaving(true);
    const newPassword = password.pw && password.pw === password.pw2 ? password.pw : undefined;
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ settings: draft, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save settings");
      savedRef.current = data.settings as SiteSettings;
      setDraft(data.settings as SiteSettings);
      setDirty(false);
      setPassword({ pw: "", pw2: "" });
      setToast({ msg: bn ? "প্রকাশিত — ভিজিটর পেজ এখন এই সেটিংস ব্যবহার করছে।" : "Published — the visitor page now uses these settings.", kind: "ok" });
      router.refresh();
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : "Could not save settings", kind: "err" });
    } finally {
      setSaving(false);
    }
  }, [draft, password, router, bn]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const reset = useCallback(async () => {
    const res = await fetch("/api/settings", { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      savedRef.current = data.settings as SiteSettings;
      setDraft(data.settings as SiteSettings);
      setDirty(false);
      setToast({ msg: bn ? "সেটিংস ডিফল্টে ফিরিয়ে আনা হয়েছে।" : "Settings restored to defaults.", kind: "ok" });
      router.refresh();
    } else {
      setToast({ msg: data.error ?? "Reset failed", kind: "err" });
    }
  }, [router, bn]);

  const activeMeta = useMemo(() => THEMES.find((t) => t.id === draft.activeTheme), [draft.activeTheme]);
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="font-sans-bn min-h-[100dvh] bg-[#050608] p-1 text-[#1a140d] md:p-4">
      <div className="hoi-tauri mx-auto flex min-h-[calc(100dvh-8px)] w-full max-w-[1800px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#f3eee1] md:min-h-[calc(100dvh-32px)]">
        {/* Tauri titlebar */}
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[#1a140d]/10 bg-[#e9e2cf] px-3">
          <span className="hoi-traffic bg-[#ff5f57]" title={bn ? "সাইটে ফিরুন" : "Back to site"} />
          <span className="hoi-traffic bg-[#febc2e]" title="Minimize" />
          <span className="hoi-traffic bg-[#28c840]" title="Maximize" />
          <span className="font-serif-bn mx-auto text-[13px] font-bold text-[#1a140d]">
            {bn ? "হৈচৈ ডেস্ক" : "Hoichoi Desk"}
          </span>
          <span className="font-mono-x hidden rounded bg-[#1a140d]/8 px-2 py-0.5 text-[9px] text-[#6b6250] sm:block">
            ISR 300s · EDGE CACHE ON · 1–6 TABS
          </span>
        </div>

        {/* menubar */}
        <header className="shrink-0 border-b-2 border-[#1a140d]/10 bg-[#f3eee1]">
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="font-serif-bn grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-[#1a140d] bg-[#1a140d] text-[16px] font-black text-[#c8f65d]">
                {draft.brand.mark}
              </span>
              <div className="leading-tight">
                <p className="font-serif-bn text-sm font-extrabold">{bn ? "হৈচৈ ডেস্ক" : "Hoichoi Desk"}</p>
                <p className="font-mono-x text-[10px] text-[#6b6250]">
                  {bn ? draft.brand.nameBn : draft.brand.name} · {draft.mode} · {draft.ui.language}
                </p>
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span
                className={`font-mono-x inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] uppercase ${
                  dirty ? "bg-[#ffb454]/30 text-[#9a4208]" : "bg-[#5f8f0e]/15 text-[#4a7009]"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dirty ? "bg-[#b45309] animate-pulse" : "bg-[#5f8f0e]"}`} />
                {dirty ? (bn ? "অসংরক্ষিত" : "Unsaved") : (bn ? "প্রকাশিত" : "Published")}
              </span>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#1a140d]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#1a140d] transition hover:border-[#1a140d]"
              >
                <ExternalLink size={13} /> {bn ? "প্রথম পাতা" : "Front page"}
              </Link>
              <Link
                href="/designs"
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#1a140d]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#1a140d] transition hover:border-[#1a140d]"
              >
                <Newspaper size={13} /> {bn ? "গ্যালারি" : "Gallery"}
              </Link>
              <button
                onClick={() => {
                  setDraft(savedRef.current);
                  setDirty(false);
                }}
                disabled={!dirty || saving}
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#1a140d]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#6b6250] transition hover:border-[#1a140d] disabled:opacity-40"
              >
                <RotateCcw size={13} /> {bn ? "বাতিল" : "Discard"}
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#d2202c] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#a3121d] disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {bn ? "সেভ করুন" : "Save changes"}
                <span className="font-mono-x hidden text-[10px] text-white/60 lg:inline">⌘S</span>
              </button>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-5 p-4 sm:p-5 xl:grid-cols-[200px_minmax(0,1fr)] 2xl:grid-cols-[200px_minmax(0,1fr)_minmax(360px,450px)]">
          {/* sidebar */}
          <nav className="xl:sticky xl:top-4 xl:self-start">
            <ul className="flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0">
              {TABS.map((tb, i) => {
                const Icon = tb.icon;
                const isActive = tab === tb.id;
                return (
                  <li key={tb.id} className="shrink-0 xl:shrink">
                    <button
                      onClick={() => setTab(tb.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border-2 px-3.5 py-2.5 text-left text-sm font-bold transition ${
                        isActive
                          ? "border-[#1a140d] bg-[#1a140d] text-[#f3eee1]"
                          : "border-transparent bg-white/60 text-[#6b6250] hover:border-[#1a140d]/20 hover:text-[#1a140d]"
                      }`}
                    >
                      <span className={`font-mono-x text-[10px] ${isActive ? "text-[#c8f65d]" : "text-[#6b6250]/60"}`}>
                        0{i + 1}
                      </span>
                      <Icon size={16} className={isActive ? "text-[#c8f65d]" : ""} />
                      <span className="whitespace-nowrap">{tb.label}</span>
                      {tb.id === "audience" && (stats.unreadMessages > 0 || subscribers.length > 0) && (
                        <span
                          className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            isActive ? "bg-[#d2202c] text-white" : "bg-[#1a140d]/8 text-[#6b6250]"
                          }`}
                        >
                          {subscribers.length + messages.length}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 hidden rounded-xl border-2 border-[#1a140d]/10 bg-white/70 p-3 text-[11px] leading-relaxed text-[#6b6250] xl:block">
              {current.hint}. {bn ? "সেভ না করা পর্যন্ত পরিবর্তন ড্রাফট থাকে।" : "Changes stay in draft until you hit Save."}
            </p>
            <p className="font-mono-x mt-3 hidden text-[9px] leading-relaxed tracking-[0.2em] text-[#6b6250]/60 xl:block">
              FEED → SHOT → HASH → LLM → GIT → DEPLOY
            </p>
          </nav>

          {/* content */}
          <main className="min-w-0">
            {tab === "overview" && <OverviewTab s={draft} setS={setS} stats={stats} />}
            {tab === "design" && <DesignTab s={draft} setS={setS} />}
            {tab === "content" && <ContentTab s={draft} setS={setS} />}
            {tab === "newsroom" && <NewsroomTab s={draft} setS={setS} />}
            {tab === "audience" && <AudienceTab subscribers={subscribers} messages={messages} />}
            {tab === "system" && <SystemTab s={draft} setS={setS} onReset={reset} password={password} setPassword={setPassword} />}
          </main>

          {/* live preview */}
          <aside className="min-w-0 xl:col-start-2 2xl:col-start-3 2xl:sticky 2xl:top-4 2xl:self-start">
            <div className="overflow-hidden rounded-2xl border-2 border-[#1a140d] bg-white shadow-[4px_4px_0_rgba(26,20,13,0.15)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#1a140d]/10 bg-[#f3eee1] px-4 py-3">
                <div className="leading-tight">
                  <p className="font-serif-bn text-xs font-extrabold text-[#1a140d]">{bn ? "লাইভ প্রিভিউ" : "Live preview"}</p>
                  <p className="font-mono-x text-[9px] tracking-[0.18em] text-[#d2202c] uppercase">
                    {activeMeta ? themeName(activeMeta, L) : ""} · {draft.intensity}
                  </p>
                </div>
                <div className="w-44">
                  <Segmented
                    size="sm"
                    value={device}
                    onChange={setDevice}
                    options={[
                      { id: "desktop", label: "Desktop" },
                      { id: "tablet", label: "Tablet" },
                      { id: "mobile", label: "Mobile" },
                    ]}
                  />
                </div>
              </div>

              <div className="bg-[#0a0c10] p-4">
                <div
                  className="mx-auto overflow-hidden rounded-xl border border-white/10 bg-[#0a0c10]"
                  style={{ maxWidth: device === "mobile" ? 300 : device === "tablet" ? 460 : "100%" }}
                >
                  <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#12161e] px-3 py-2">
                    <span className="hoi-traffic bg-[#ff5f57]" />
                    <span className="hoi-traffic bg-[#febc2e]" />
                    <span className="hoi-traffic bg-[#28c840]" />
                    <span className="font-mono-x ml-2 flex-1 truncate rounded bg-white/8 px-2 py-0.5 text-[9px] text-white/45">
                      https://hoichoifeed.vercel.app
                    </span>
                  </div>
                  <div style={{ aspectRatio: `${DEVICES[device].w} / ${DEVICES[device].h}` }} className="relative">
                    <FitPreview id={draft.activeTheme} s={draft} virtual={DEVICES[device]} className="absolute inset-0" />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t-2 border-[#1a140d]/10 px-4 py-3">
                <Link
                  href={`/preview/${draft.activeTheme}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#1a140d]/15 px-3 py-1.5 text-[11px] font-bold text-[#1a140d] transition hover:border-[#1a140d]"
                >
                  <ExternalLink size={12} /> {bn ? "ফুল স্ক্রিনে খুলুন" : "Open full screen"}
                </Link>
                <span className="font-mono-x ml-auto inline-flex items-center gap-1.5 text-[10px] text-[#6b6250]">
                  {dirty ? (
                    <>
                      <X size={12} className="text-[#b45309]" /> unsaved draft
                    </>
                  ) : (
                    <>
                      <Check size={12} className="text-[#4a7009]" /> in sync
                    </>
                  )}
                </span>
              </div>
            </div>
          </aside>
        </div>

        {/* status bar */}
        <div className="font-mono-x flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#1a140d]/10 bg-[#e9e2cf] px-4 py-1.5 text-[9.5px] text-[#6b6250]">
          <span>© ২০২৬ হৈচৈ · BUGSFREE STUDIO · ASIA/UTC+6</span>
          <span className="hidden sm:block">TURSO:{draft.hoichoi.turso} · API:{draft.hoichoi.api} · COLLECTOR:{draft.hoichoi.collector}</span>
          <span>EDGE CACHE ON</span>
        </div>
      </div>

      {/* toast */}
      {toast && (
        <div
          className={`mc-reveal fixed right-5 bottom-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-bold shadow-xl backdrop-blur ${
            toast.kind === "ok"
              ? "border-[#5f8f0e] bg-[#f3eee1]/95 text-[#1a140d]"
              : "border-[#d2202c] bg-[#f3eee1]/95 text-[#a3121d]"
          }`}
        >
          <span className="mt-0.5">{toast.kind === "ok" ? <Check size={16} /> : <X size={16} />}</span>
          <p className="leading-relaxed">{toast.msg}</p>
          <button onClick={() => setToast(null)} className="ml-auto opacity-50 transition hover:opacity-100">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
