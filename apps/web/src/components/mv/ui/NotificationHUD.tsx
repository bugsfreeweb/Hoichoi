"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellOff,
  CheckCircle2,
  ChevronRight,
  Radio,
  Settings2,
  ShieldCheck,
  Trash2,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import clsx from "clsx";
import TactileToggle from "@/components/mv/ui/TactileToggle";
import { playNotificationChime, isSoundEnabled, toggleSound, playClick } from "@/lib/mv/sound";
import { bn } from "@/lib/mv/format";

type AlertKind = "breaking" | "fact" | "sync" | "security";

export interface WireAlert {
  id: string;
  type: AlertKind;
  title: string;
  dek: string;
  slug?: string;
  time: string;
}

interface NotifySettings {
  enabled: boolean;
  toasts: boolean;
  breaking: boolean;
  fact: boolean;
  sync: boolean;
  security: boolean;
}

const DEFAULT_SETTINGS: NotifySettings = {
  enabled: true,
  toasts: true,
  breaking: true,
  fact: true,
  sync: true,
  security: true,
};

const STORAGE_KEY = "hoichoi-notify";

function loadSettings(): NotifySettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<NotifySettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: NotifySettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // storage unavailable — session-only settings still apply
  }
}

const SAMPLE_ALERTS: WireAlert[] = [
  {
    id: "alert-1",
    type: "breaking",
    title: "ব্রেকিং নিউজ আপডেট",
    dek: "MrBeast চ্যালেঞ্জে মেক্সিকোর নির্মাণ কর্মীর জয়—নতুন এক্সকাভেটর নিয়ে কাজের মাঠে ফেরা নিশ্চিত।",
    slug: "mrbeast-4-35e7b1",
    time: "এখনই",
  },
  {
    id: "alert-2",
    type: "fact",
    title: "ফ্যাক্ট-গেট ০.৯২ অনুমোদিত",
    dek: "রংপুর নিখোঁজ শিশু সংক্রান্ত ভাইরাল ছবিটি ২০২৩ সালের পুরোনো ঘটনার বলে বাতিল করা হয়েছে।",
    slug: "missing-child-rangpur-8d2c41",
    time: "৩ মিনিট আগে",
  },
  {
    id: "alert-3",
    type: "sync",
    title: "স্বয়ংক্রিয় সিঙ্ক সম্পন্ন",
    dek: "ফেসবুক ওয়াচলিস্ট থেকে ১৪টি নতুন উন্মুক্ত পোস্ট সংগৃহীত ও ডুপ্লিকেট গেট পার হয়েছে।",
    time: "৮ মিনিট আগে",
  },
  {
    id: "alert-4",
    type: "security",
    title: "ডুপ্লিকেট পোস্ট শনাক্ত ও ব্লক",
    dek: "SimHash হ্যামিং দূরত্ব ২ — একই ঘটনার ৩টি পুনরাবৃত্ত পোস্ট সিস্টেমে আটকানো হয়েছে।",
    time: "১২ মিনিট আগে",
  },
];

const KIND_META: Record<AlertKind, { label: string; color: string; Icon: typeof Zap }> = {
  breaking: { label: "ব্রেকিং", color: "var(--accent)", Icon: Zap },
  fact: { label: "ফ্যাক্ট-গেট", color: "#4ade80", Icon: ShieldCheck },
  sync: { label: "লাইভ সিঙ্ক", color: "#56c8ff", Icon: Radio },
  security: { label: "সুরক্ষা", color: "#a78bfa", Icon: ShieldCheck },
};

export default function NotificationHUD() {
  const [settings, setSettings] = useState<NotifySettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [activeAlert, setActiveAlert] = useState<WireAlert | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [alerts, setAlerts] = useState<WireAlert[]>(SAMPLE_ALERTS);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [filter, setFilter] = useState<"all" | AlertKind>("all");
  const settingsRef = useRef(settings);

  settingsRef.current = settings;

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setSoundOn(isSoundEnabled());
    setHydrated(true);
  }, []);

  const allows = useCallback((kind: AlertKind) => {
    const s = settingsRef.current;
    return s.enabled && s.toasts && s[kind];
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const push = (alert: WireAlert) => {
      if (!allows(alert.type)) return;
      setActiveAlert(alert);
      playNotificationChime();
    };

    const initial = (() => {
      const a = SAMPLE_ALERTS[0];
      if (a) return setTimeout(() => push(a), 3500);
      return undefined;
    })();
    let idx = 1;
    const interval = setInterval(() => {
      const a = SAMPLE_ALERTS[idx % SAMPLE_ALERTS.length];
      if (a) push(a);
      idx += 1;
    }, 28000);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [hydrated, allows]);

  // Dismiss any visible toast the moment the reader turns notifications off.
  useEffect(() => {
    if (!settings.enabled || !settings.toasts) setActiveAlert(null);
  }, [settings.enabled, settings.toasts]);

  const update = (patch: Partial<NotifySettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const dismissToast = useCallback(() => setActiveAlert(null), []);

  const visibleAlerts = alerts.filter((a) => settings[a.type] && (filter === "all" || a.type === filter));
  const unread = settings.enabled ? visibleAlerts.filter((a) => !readIds.includes(a.id)).length : 0;

  const openDrawer = () => {
    playClick(720);
    setDrawerOpen(true);
    setReadIds(alerts.map((a) => a.id));
  };

  const closeDrawer = () => {
    playClick(520);
    setDrawerOpen(false);
    setShowSettings(false);
  };

  return (
    <>
      {/* ── Floating bell ── */}
      <div className="fixed bottom-6 right-6 z-[80]">
        <motion.button
          type="button"
          onClick={openDrawer}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          aria-label={settings.enabled ? "সংবাদকক্ষ লাইভ বিজ্ঞপ্তি" : "বিজ্ঞপ্তি বন্ধ আছে — সেটিংস খুলুন"}
          className={clsx(
            "relative grid h-12 w-12 place-items-center rounded-2xl border backdrop-blur-xl transition-all",
            settings.enabled
              ? "border-white/20 bg-ink-900/90 text-mist-100 shadow-[0_12px_32px_rgba(0,0,0,0.5)] hover:border-[var(--accent)]"
              : "border-white/10 bg-ink-900/70 text-mist-400 hover:text-mist-200",
          )}
        >
          {settings.enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}

          {unread > 0 ? (
            <>
              <span className="pulse-live absolute -right-1 -top-1 h-5 w-5 rounded-full bg-ember-500 opacity-75" />
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-ember-500 text-[10px] font-bold text-ink-950 shadow-md">
                {bn(unread)}
              </span>
            </>
          ) : null}

          <span
            className={clsx(
              "absolute bottom-1 right-1 h-2 w-2 rounded-full ring-2 ring-ink-900",
              settings.enabled ? "bg-mint-400" : "bg-mist-500",
            )}
          />
        </motion.button>
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {activeAlert && settings.enabled && settings.toasts ? (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="fixed bottom-24 right-6 z-[85] w-[calc(100vw-3rem)] max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-ink-900/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
          >
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: "linear-gradient(90deg, var(--accent), #f5a524, #4ade80)" }}
            >
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 9, ease: "linear" }}
                onAnimationComplete={dismissToast}
                className="ml-auto h-full bg-ink-950/80"
              />
            </div>

            <div className="flex items-start gap-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink-950"
                style={{ background: KIND_META[activeAlert.type].color }}
              >
                {(() => {
                  const I = KIND_META[activeAlert.type].Icon;
                  return <I className="h-4.5 w-4.5 stroke-[2.5]" />;
                })()}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="mono-label flex items-center gap-1.5" style={{ color: KIND_META[activeAlert.type].color }}>
                    <span className="h-1.5 w-1.5 animate-ping rounded-full bg-current" />
                    {activeAlert.title}
                  </span>
                  <span className="mono-label text-mist-400">{activeAlert.time}</span>
                </div>

                <p className="mt-1 line-clamp-2 font-display-bn text-[14.5px] leading-snug text-mist-100">
                  {activeAlert.dek}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-2.5">
                  {activeAlert.slug ? (
                    <Link
                      href={`/post/${activeAlert.slug}`}
                      onClick={dismissToast}
                      className="group inline-flex items-center gap-1 text-[12.5px] font-semibold text-mist-100"
                    >
                      প্রতিবেদনটি পড়ুন
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  ) : (
                    <span className="mono-label flex items-center gap-1 text-mint-400">
                      <CheckCircle2 className="h-3 w-3" /> ডেটাবেসে সিঙ্কড
                    </span>
                  )}
                  <button
                    onClick={() => {
                      playClick(560);
                      update({ toasts: false });
                    }}
                    className="mono-label text-mist-400 transition-colors hover:text-mist-200"
                  >
                    পপ-আপ বন্ধ করুন
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={dismissToast}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-mist-400 hover:bg-white/10 hover:text-mist-100"
                aria-label="বিজ্ঞপ্তি বন্ধ করুন"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── Drawer ── */}
      <AnimatePresence>
        {drawerOpen ? (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="absolute inset-0 bg-ink-950/80 backdrop-blur-md"
            />

            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/15 bg-ink-900 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl text-ink-950" style={{ background: "var(--accent)" }}>
                    <Radio className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h2 className="font-display-bn text-xl text-mist-100">হৈচৈ লাইভ ওয়্যার</h2>
                    <p className="mono-label text-mist-400">
                      {settings.enabled ? "বিজ্ঞপ্তি সক্রিয়" : "বিজ্ঞপ্তি বন্ধ"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playClick(680);
                      setShowSettings((v) => !v);
                    }}
                    aria-label="বিজ্ঞপ্তি সেটিংস"
                    className={clsx(
                      "grid h-8 w-8 place-items-center rounded-lg border transition-colors",
                      showSettings
                        ? "border-transparent text-ink-950"
                        : "border-white/10 text-mist-300 hover:bg-white/5",
                    )}
                    style={showSettings ? { background: "var(--accent)" } : undefined}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={closeDrawer}
                    aria-label="বন্ধ করুন"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-mist-300 hover:bg-white/5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Settings panel */}
              <AnimatePresence initial={false}>
                {showSettings ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-b border-white/10 bg-ink-950/50"
                  >
                    <div className="space-y-4 p-5">
                      <p className="mono-label text-mist-400">পাঠকের বিজ্ঞপ্তি নিয়ন্ত্রণ</p>

                      <div className="surface flex items-center justify-between gap-3 rounded-xl p-3.5">
                        <div>
                          <p className="text-[13.5px] font-semibold text-mist-100">বিজ্ঞপ্তি চালু রাখুন</p>
                          <p className="mt-0.5 text-[12px] text-mist-400">বন্ধ করলে ঘণ্টা ও সব পপ-আপ নিষ্ক্রিয় হবে</p>
                        </div>
                        <TactileToggle
                          checked={settings.enabled}
                          onChange={(v) => update({ enabled: v })}
                          size="sm"
                        />
                      </div>

                      <div className="surface flex items-center justify-between gap-3 rounded-xl p-3.5">
                        <div>
                          <p className="text-[13.5px] font-semibold text-mist-100">স্বয়ংক্রিয় পপ-আপ</p>
                          <p className="mt-0.5 text-[12px] text-mist-400">পর্দার কোণে ভাসমান বার্তা দেখাবে</p>
                        </div>
                        <TactileToggle
                          checked={settings.toasts}
                          onChange={(v) => update({ toasts: v })}
                          size="sm"
                          disabled={!settings.enabled}
                        />
                      </div>

                      <div className="surface flex items-center justify-between gap-3 rounded-xl p-3.5">
                        <div>
                          <p className="text-[13.5px] font-semibold text-mist-100">বিজ্ঞপ্তির শব্দ</p>
                          <p className="mt-0.5 text-[12px] text-mist-400">নতুন খবর এলে মৃদু চাইম বাজবে</p>
                        </div>
                        <TactileToggle
                          checked={soundOn}
                          onChange={() => setSoundOn(toggleSound())}
                          size="sm"
                          disabled={!settings.enabled}
                        />
                      </div>

                      <div>
                        <p className="mono-label mb-2.5 text-mist-400">কোন ধরনের খবর পেতে চান</p>
                        <div className="space-y-2">
                          {(Object.keys(KIND_META) as AlertKind[]).map((kind) => (
                            <div
                              key={kind}
                              className="flex items-center justify-between gap-3 rounded-lg border border-white/8 px-3.5 py-2.5"
                            >
                              <span className="flex items-center gap-2 text-[13px] text-mist-200">
                                <span className="h-2 w-2 rounded-full" style={{ background: KIND_META[kind].color }} />
                                {KIND_META[kind].label}
                              </span>
                              <TactileToggle
                                checked={settings[kind]}
                                onChange={(v) => update({ [kind]: v } as Partial<NotifySettings>)}
                                size="sm"
                                disabled={!settings.enabled}
                                activeColor={KIND_META[kind].color}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          playClick(500);
                          update(DEFAULT_SETTINGS);
                        }}
                        className="mono-label w-full rounded-lg border border-white/12 py-2.5 text-mist-300 transition-colors hover:border-white/25 hover:text-mist-100"
                      >
                        ডিফল্ট সেটিংসে ফিরুন
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Filters */}
              <div className="flex gap-1.5 overflow-x-auto border-b border-white/8 p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {([
                  { id: "all", label: "সব আপডেট" },
                  { id: "breaking", label: "ব্রেকিং" },
                  { id: "fact", label: "ফ্যাক্ট-গেট" },
                  { id: "sync", label: "লাইভ সিঙ্ক" },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      playClick(680);
                      setFilter(tab.id as typeof filter);
                    }}
                    className={clsx(
                      "shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-all",
                      filter === tab.id ? "font-semibold text-ink-950" : "text-mist-400 hover:bg-white/5 hover:text-mist-100",
                    )}
                    style={{ background: filter === tab.id ? "var(--accent)" : undefined }}
                  >
                    {tab.label}
                  </button>
                ))}

                <button
                  onClick={() => {
                    playClick(460);
                    setAlerts([]);
                  }}
                  className="mono-label ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-mist-400 hover:text-mist-100"
                >
                  <Trash2 className="h-3 w-3" /> সাফ
                </button>
              </div>

              {/* List */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {!settings.enabled ? (
                  <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center">
                    <BellOff className="mx-auto h-6 w-6 text-mist-400" />
                    <p className="mt-3 text-[14px] font-semibold text-mist-200">বিজ্ঞপ্তি বন্ধ আছে</p>
                    <p className="mt-1 text-[12.5px] text-mist-400">
                      উপরের সেটিংস আইকনে চাপ দিয়ে আবার চালু করতে পারেন।
                    </p>
                  </div>
                ) : visibleAlerts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-[13px] text-mist-400">
                    এই মুহূর্তে নতুন কোনো আপডেট নেই।
                  </div>
                ) : (
                  visibleAlerts.map((alert) => {
                    const meta = KIND_META[alert.type];
                    return (
                      <div key={alert.id} className="surface card-lift rounded-2xl p-4">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className="mono-label rounded-md px-2 py-0.5"
                            style={{ background: `${meta.color}22`, color: meta.color }}
                          >
                            {alert.title}
                          </span>
                          <span className="mono-label text-mist-400">{alert.time}</span>
                        </div>
                        <p className="mt-2.5 font-display-bn text-[14.5px] leading-relaxed text-mist-200">{alert.dek}</p>
                        {alert.slug ? (
                          <Link
                            href={`/post/${alert.slug}`}
                            onClick={closeDrawer}
                            className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-mist-100"
                          >
                            বিস্তারিত প্রতিবেদন <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between border-t border-white/10 bg-ink-950/60 p-4">
                <p className="mono-label text-mist-400">প্রতি ১০ সেকেন্ডে স্বয়ংক্রিয় রান</p>
                <span className="mono-label flex items-center gap-1.5 text-mist-400">
                  {soundOn ? <Volume2 className="h-3 w-3 text-mint-400" /> : <VolumeX className="h-3 w-3" />}
                  {soundOn ? "শব্দ চালু" : "শব্দ বন্ধ"}
                </span>
              </div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
