export type ThemeId =
  | "nebula"
  | "blueprint"
  | "neon"
  | "aurora"
  | "terminal"
  | "flip"
  | "editorial"
  | "orbit";

export type Mode = "maintenance" | "coming-soon" | "under-construction" | "live";
export type Intensity = "subtle" | "balanced" | "bold";
export type CountdownStyle = "digits" | "flip" | "rings" | "inline";
export type HoichoiStatus = "live" | "checking" | "down";
export type Locale = "bn" | "en";

export type CopyBlock = {
  badge: string;
  headline: string;
  subheadline: string;
  body: string;
  footerNote: string;
};

export type SiteSettings = {
  mode: Mode;
  activeTheme: ThemeId;
  brand: {
    name: string;
    nameBn: string;
    tagline: string;
    taglineBn: string;
    mark: string;
  };
  copy: CopyBlock;
  copyBn: CopyBlock;
  colors: {
    primary: string;
    accent: string;
    bg: string;
    surface: string;
    text: string;
  };
  countdown: {
    enabled: boolean;
    target: string;
    style: CountdownStyle;
  };
  schedule: {
    enabled: boolean;
    start: string;
    end: string;
    autoLive: boolean;
  };
  progress: {
    enabled: boolean;
    value: number;
    label: string;
    labelBn: string;
  };
  newsletter: {
    enabled: boolean;
    title: string;
    titleBn: string;
    placeholder: string;
    success: string;
    successBn: string;
  };
  contact: {
    enabled: boolean;
    email: string;
    phone: string;
    formEnabled: boolean;
  };
  socials: {
    facebook: string;
    x: string;
    instagram: string;
    github: string;
    linkedin: string;
    youtube: string;
  };
  socialsEnabled: boolean;
  hoichoi: {
    lastRun: string;
    turso: HoichoiStatus;
    api: HoichoiStatus;
    collector: HoichoiStatus;
    stats: {
      collected: number;
      published: number;
      duplicates: number;
      comments: number;
    };
    ticker: string[];
    tickerBn: string[];
    showPipeline: boolean;
    showStats: boolean;
    showTicker: boolean;
  };
  effects: {
    particles: boolean;
    grain: boolean;
    spotlight: boolean;
    tilt: boolean;
    marquee: boolean;
    meteors: boolean;
    sound: boolean;
  };
  intensity: Intensity;
  seo: {
    title: string;
    description: string;
    noIndex: boolean;
  };
  security: {
    passwordHash: string;
    bypassKey: string;
    allowPreview: boolean;
  };
  analytics: {
    enabled: boolean;
  };
  ui: {
    showDock: boolean;
    showThemeBadge: boolean;
    language: Locale;
  };
};

export const DEFAULT_PASSWORD = "hoichoi2026";

/** The six automation stages, exactly as on hoichoifeed.vercel.app */
export const HOICHOI_PIPELINE = [
  { bn: "ফেসবুক ওয়াচলিস্ট", en: "Facebook watchlist", sub: "১০ সোর্স · GRAPH READ" },
  { bn: "ডেস্কটপ কালেক্টর", en: "Desktop collector", sub: "PLAYWRIGHT SHOT" },
  { bn: "ডুপ্লিকেট গেট", en: "Duplicate gate", sub: "SHA-256 × SIMHASH" },
  { bn: "পুনর্লিখন ডেস্ক", en: "Rewrite desk", sub: "LLM + FACT-GATE ০.৯০" },
  { bn: "AI ইঞ্জিন কমিট", en: "AI engine commit", sub: "CONTENT/*.JSON" },
  { bn: "Web লাইভ", en: "Web live", sub: "ISR · ~৮ সে" },
] as const;

export const PIPELINE_STRIP = "FEED → SHOT → HASH → LLM → GIT → DEPLOY";

export function defaultSettings(): SiteSettings {
  const target = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  target.setUTCHours(4, 0, 0, 0);
  const start = new Date();
  start.setUTCHours(2, 0, 0, 0);
  return {
    mode: "maintenance",
    activeTheme: "editorial",
    brand: {
      name: "HOICHOI।",
      nameBn: "হৈচৈ।",
      tagline: "City noise, in the language of news",
      taglineBn: "শহরের হৈচৈ, সংবাদের ভাষায়",
      mark: "হ",
    },
    copy: {
      badge: "Scheduled maintenance",
      headline: "The newsroom is reloading the press",
      subheadline: "Hoichoi is verifying the pipeline — back in a moment",
      body: "We are syncing the collector, re-checking hashes against Turso and warming the edge cache. Your reading list is safe. Leave your email and we will ping you the second the front page is live again.",
      footerNote: "© ২০২৬ হৈচৈ · BUGSFREE STUDIO · ASIA/UTC+6 · EDGE CACHE ON",
    },
    copyBn: {
      badge: "জরুরি আপডেট",
      headline: "ছাপাখানা থামেনি — কালি বদলাচ্ছে",
      subheadline: "হৈচৈ পাইপলাইন যাচাই করছে — একটু পরেই ফিরছি",
      body: "কালেক্টর সিঙ্ক হচ্ছে, Turso-তে হ্যাশ মিলিয়ে দেখা হচ্ছে আর এজ ক্যাশ গরম হচ্ছে। আপনার পড়ার তালিকা নিরাপদে আছে। ইমেইল রেখে যান — প্রথম পাতা লাইভ হওয়ামাত্র জানিয়ে দেব।",
      footerNote: "© ২০২৬ হৈচৈ · BUGSFREE STUDIO · ASIA/UTC+6 · EDGE CACHE ON",
    },
    colors: {
      primary: "#d2202c",
      accent: "#c8f65d",
      bg: "#f3eee1",
      surface: "#ffffff",
      text: "#1a140d",
    },
    countdown: {
      enabled: true,
      target: target.toISOString(),
      style: "digits",
    },
    schedule: {
      enabled: false,
      start: start.toISOString(),
      end: target.toISOString(),
      autoLive: true,
    },
    progress: { enabled: true, value: 68, label: "Sync progress", labelBn: "সিঙ্ক অগ্রগতি" },
    newsletter: {
      enabled: true,
      title: "Get notified when we're back",
      titleBn: "ফিরে এলে জানিয়ে দেব",
      placeholder: "you@example.com",
      success: "You're on the list. See you on the front page.",
      successBn: "তালিকায় উঠে গেছেন। প্রথম পাতায় দেখা হচ্ছে।",
    },
    contact: {
      enabled: true,
      email: "desk@hoichoi.example",
      phone: "",
      formEnabled: true,
    },
    socials: {
      facebook: "https://facebook.com",
      x: "",
      instagram: "",
      github: "",
      linkedin: "",
      youtube: "",
    },
    socialsEnabled: true,
    hoichoi: {
      lastRun: "১০:৪০ AM",
      turso: "checking",
      api: "checking",
      collector: "down",
      stats: { collected: 52, published: 25, duplicates: 0, comments: 0 },
      ticker: [
        "DATA VERIFICATION IN PROGRESS",
        "HOICHOI NEWSROOM",
        "HUMAN REVIEW",
        "FEED → SHOT → HASH → LLM → GIT → DEPLOY",
      ],
      tickerBn: [
        "ডেটা যাচাই চলছে",
        "হৈচৈ নিউজরুম",
        "মানব পর্যালোচনা",
        "ফিড → শট → হ্যাশ → LLM → গিট → ডিপ্লয়",
      ],
      showPipeline: true,
      showStats: true,
      showTicker: true,
    },
    effects: {
      particles: true,
      grain: true,
      spotlight: true,
      tilt: true,
      marquee: true,
      meteors: true,
      sound: false,
    },
    intensity: "balanced",
    seo: {
      title: "হৈচৈ · রক্ষণাবেক্ষণ চলছে — শীঘ্রই ফিরছি",
      description:
        "হৈচৈ নিউজরুম এখন পাইপলাইন যাচাই করছে। প্রথম পাতা লাইভ হওয়ামাত্র জানতে ইমেইল রেখে যান।",
      noIndex: true,
    },
    security: {
      passwordHash: "",
      bypassKey: "hoichoi-live",
      allowPreview: true,
    },
    analytics: { enabled: true },
    ui: { showDock: true, showThemeBadge: true, language: "bn" },
  };
}

/** Deep-merge stored JSON over the defaults so older rows never break. */
export function withDefaults(stored: unknown): SiteSettings {
  const base = defaultSettings();
  if (!stored || typeof stored !== "object") return base;
  const merge = (a: any, b: any): any => {
    if (Array.isArray(a)) return Array.isArray(b) ? b : a;
    if (a && typeof a === "object") {
      const out: any = { ...a };
      for (const k of Object.keys(a)) out[k] = merge(a[k], b?.[k]);
      for (const k of Object.keys(b ?? {})) if (!(k in a)) out[k] = b[k];
      return out;
    }
    return b === undefined ? a : b;
  };
  return merge(base, stored) as SiteSettings;
}

export const INTENSITY_SCALE: Record<Intensity, number> = {
  subtle: 0.45,
  balanced: 1,
  bold: 1.7,
};

/* ------------------------------ localisation ------------------------------ */

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function bnNum(n: number | string, locale: Locale): string {
  const s = String(n);
  if (locale !== "bn") return s;
  return s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

export function loc(s: SiteSettings): Locale {
  return s.ui.language === "en" ? "en" : "bn";
}

export function copyFor(s: SiteSettings): CopyBlock {
  return loc(s) === "bn" ? s.copyBn : s.copy;
}

export function brandName(s: SiteSettings): string {
  return loc(s) === "bn" ? s.brand.nameBn : s.brand.name;
}

export function tagline(s: SiteSettings): string {
  return loc(s) === "bn" ? s.brand.taglineBn : s.brand.tagline;
}

export const STR: Record<Locale, Record<string, string>> = {
  bn: {
    notifyMe: "জানিয়ে দিন",
    oneEmail: "ফিরে এলেই একটি ইমেইল। স্প্যাম নয়, এক ক্লিকে আনসাবস্ক্রাইব।",
    invalidEmail: "সঠিক ইমেইল ঠিকানা দিন।",
    disabled: "নোটিফিকেশন এখন বন্ধ আছে।",
    collected: "সংগৃহীত রেকর্ড",
    published: "প্রকাশিত প্রতিবেদন",
    duplicates: "ডুপ্লিকেট চিহ্নিত",
    comments: "অনুমোদিত মন্তব্য",
    days: "দিন",
    hours: "ঘণ্টা",
    minutes: "মিনিট",
    seconds: "সেকেন্ড",
    backOnline: "ফিরছি",
    lastRun: "সর্বশেষ নথিভুক্ত রান",
    liveGraph: "লাইভ গ্রাফ দেখুন",
    pipelineTitle: "ফিড থেকে লাইভ — ছয় ধাপ, শূন্য ছোঁয়া",
    turso: "TURSO ডাটাবেস",
    api: "পাবলিক ডেটা API",
    collector: "ডেস্কটপ কালেক্টর",
    waiting: "অপেক্ষা",
    connected: "সংযুক্ত",
    disconnected: "সংযুক্ত নয়",
    checking: "পরীক্ষা চলছে",
    yourName: "আপনার নাম",
    email: "ইমেইল",
    howHelp: "অফলাইন থাকাকালীন কীভাবে সাহায্য করতে পারি?",
    send: "পাঠান",
    replyDay: "সাধারণত এক কর্মদিবসে উত্তর দিই।",
    sentOk: "ধন্যবাদ — বার্তা আমাদের ইনবক্সে পৌঁছেছে।",
    gallery: "গ্যালারি",
    admin: "অ্যাডমিন",
    design: "ডিজাইন",
    pickLook: "লাইভ ডিজাইন — অন্য লুক বেছে নিন",
    useDesign: "এই ডিজাইন ব্যবহার করুন",
    liveNow: "এখন লাইভ",
    makeActive: "সক্রিয় করুন",
    activeDesign: "সক্রিয় ডিজাইন",
    fullScreen: "ফুল স্ক্রিন",
    openFull: "ফুল স্ক্রিনে খুলুন",
    visitorPage: "ভিজিটর পেজ",
    editSettings: "সেটিংস সম্পাদনা",
    currentlyLive: "এখন লাইভ",
    status: "অবস্থা",
    reachUs: "যোগাযোগ",
    elsewhere: "অন্যান্য",
    timeRemaining: "বাকি সময়",
    estimatedHandover: "সম্ভাব্য হস্তান্তর",
    breakingNews: "জরুরি",
    hashStamp: "হ্যাশ স্ট্যাম্প",
    verifiedRewrite: "যাচাই করা, পুনর্লিখিত সংস্করণ",
    every2h: "প্রতি ২ ঘণ্টায় অটোমেশন পাইপলাইন",
    factGate: "ফ্যাক্ট-গেট পার হওয়া",
    heartbeatLost: "Heartbeat পাওয়া যায়নি",
    retrying: "পুনরায় চেষ্টা চলছে…",
    backSoon: "শীঘ্রই ফিরছি",
  },
  en: {
    notifyMe: "Notify me",
    oneEmail: "One email at launch. No spam, unsubscribe in a click.",
    invalidEmail: "Please enter a valid email address.",
    disabled: "Notifications are currently disabled.",
    collected: "Collected records",
    published: "Published reports",
    duplicates: "Duplicates flagged",
    comments: "Approved comments",
    days: "Days",
    hours: "Hours",
    minutes: "Minutes",
    seconds: "Seconds",
    backOnline: "Back online",
    lastRun: "Last recorded run",
    liveGraph: "View live graph",
    pipelineTitle: "Feed to live — six steps, zero touch",
    turso: "TURSO database",
    api: "Public data API",
    collector: "Desktop collector",
    waiting: "Waiting",
    connected: "Connected",
    disconnected: "Offline",
    checking: "Checking",
    yourName: "Your name",
    email: "Email",
    howHelp: "How can we help while we're offline?",
    send: "Send",
    replyDay: "We usually reply within one business day.",
    sentOk: "Thanks — your message landed in our inbox.",
    gallery: "Gallery",
    admin: "Admin",
    design: "Design",
    pickLook: "Live design — pick another look",
    useDesign: "Use this design",
    liveNow: "Live now",
    makeActive: "Make active",
    activeDesign: "Active design",
    fullScreen: "Full screen",
    openFull: "Open full screen",
    visitorPage: "Visitor page",
    editSettings: "Edit settings",
    currentlyLive: "Currently live",
    status: "Status",
    reachUs: "Reach us",
    elsewhere: "Elsewhere",
    timeRemaining: "Time remaining",
    estimatedHandover: "Estimated hand-over",
    breakingNews: "Breaking",
    hashStamp: "Hash stamp",
    verifiedRewrite: "Verified, rewritten edition",
    every2h: "Automation pipeline · every 2 hours",
    factGate: "Fact-gate passed",
    heartbeatLost: "No heartbeat received",
    retrying: "Retrying…",
    backSoon: "Back soon",
  },
};

export function t(s: SiteSettings, key: keyof (typeof STR)["bn"]): string {
  return STR[loc(s)][key];
}
