/**
 * The bilingual dictionary — one table, three surfaces.
 *
 * The web site, the admin console and the desktop app show the same objects
 * (a desk, a queue, an archive) under different names, and they used to invent
 * their strings separately: "কনটেন্ট সারি" in the desk, "পোস্ট এডিটর" in the
 * console, "সর্বশেষ" on the site, none of them translatable because each was a
 * literal inside a component. This file is the single place a phrase exists, in
 * both languages, for all three.
 *
 * Rules:
 *
 *   • Bangla is required and so is English. A half-translated entry is a bug, not
 *     a work in progress: `t()` would otherwise print Bangla at an English
 *     reader, which is exactly what "bilingual" is supposed to end.
 *   • Keys are dotted and grouped by surface: `site.nav.*`, `admin.nav.*`,
 *     `desk.rail.*`. A grep for a key finds both its use and its translations.
 *   • `{name}` placeholders are substituted by `t()`; keep them identical in the
 *     two languages, because a translator dropping `{count}` is a silent bug.
 *   • The Bangla is the product's voice; the English is a faithful rendering of
 *     it, not a different sentence.
 */
export type Locale = "bn" | "en";

export interface Entry {
  /** Bangla — the primary string. */
  bn: string;
  /** English — required, never empty. */
  en: string;
}

export const DICTIONARY = {
  // ── Common verbs ─────────────────────────────────────────────────────────
  "common.save": { bn: "সংরক্ষণ", en: "Save" },
  "common.cancel": { bn: "বাতিল", en: "Cancel" },
  "common.close": { bn: "বন্ধ", en: "Close" },
  "common.retry": { bn: "আবার চেষ্টা করুন", en: "Try again" },
  "common.refresh": { bn: "রিফ্রেশ", en: "Refresh" },
  "common.search": { bn: "খুঁজুন", en: "Search" },
  "common.edit": { bn: "সম্পাদনা", en: "Edit" },
  "common.delete": { bn: "মুছুন", en: "Delete" },
  "common.back": { bn: "পেছনে", en: "Back" },
  "common.next": { bn: "পরের", en: "Next" },
  "common.previous": { bn: "আগের", en: "Previous" },
  "common.loading": { bn: "লোড হচ্ছে…", en: "Loading…" },
  "common.none": { bn: "কিছু নেই", en: "Nothing yet" },
  "common.failed": { bn: "ব্যর্থ", en: "Failed" },
  "common.all": { bn: "সব", en: "All" },
  "common.yes": { bn: "হ্যাঁ", en: "Yes" },
  "common.no": { bn: "না", en: "No" },
  "common.more": { bn: "আরও", en: "More" },
  "common.copy": { bn: "কপি", en: "Copy" },
  "common.copied": { bn: "কপি হয়েছে", en: "Copied" },
  "common.open": { bn: "খুলুন", en: "Open" },
  "common.apply": { bn: "প্রয়োগ", en: "Apply" },
  "common.reset": { bn: "রিসেট", en: "Reset" },
  "common.confirm": { bn: "নিশ্চিত করুন", en: "Confirm" },
  "common.total": { bn: "মোট", en: "Total" },
  "common.today": { bn: "আজ", en: "Today" },

  // ── Language switch ──────────────────────────────────────────────────────
  "lang.label": { bn: "ভাষা", en: "Language" },
  "lang.bn": { bn: "বাংলা", en: "Bangla" },
  "lang.en": { bn: "ইংরেজি", en: "English" },
  "lang.both": { bn: "বাংলা ও ইংরেজি", en: "Bangla and English" },
  "lang.switchToEn": { bn: "Read in English", en: "Read in Bangla" },
  "lang.current": { bn: "এখন: বাংলা", en: "Now: English" },
  "lang.saved": { bn: "ভাষা সংরক্ষিত হয়েছে", en: "Language saved" },

  // ── Public site: navigation ──────────────────────────────────────────────
  "site.nav.home": { bn: "হোম", en: "Home" },
  "site.nav.latest": { bn: "সর্বশেষ", en: "Latest" },
  "site.nav.data": { bn: "তথ্যচিত্র", en: "Data" },
  "site.nav.verify": { bn: "যাচাই-পথ", en: "How we verify" },
  "site.nav.system": { bn: "সিস্টেম", en: "System" },
  "site.nav.menu": { bn: "মেনু", en: "Menu" },
  "site.nav.closeMenu": { bn: "মেনু বন্ধ", en: "Close menu" },
  "site.nav.search": { bn: "খুঁজুন", en: "Search" },
  "site.nav.theme": { bn: "থিম", en: "Theme" },
  "site.nav.admin": { bn: "অ্যাডমিন", en: "Admin" },
  "site.nav.editorialDesk": { bn: "সম্পাদকীয় ডেস্ক", en: "Editorial desk" },
  "site.nav.promise": {
    bn: "সংগৃহীত খবর · যাচাই করা তথ্য · পাঠকের অংশগ্রহণ",
    en: "Collected news · verified facts · reader participation",
  },
  "site.nav.live": { bn: "লাইভ", en: "Live" },
  "site.nav.liveBadge": { bn: "সরাসরি", en: "Live" },
  "site.nav.adminAria": { bn: "প্রশাসন", en: "Administration" },
  "site.nav.pipelineActive": {
    bn: "সংগ্রহ পাইপলাইন সক্রিয়",
    en: "Collection pipeline active",
  },
  "site.nav.categories": { bn: "ক্যাটাগরি", en: "Categories" },
  "site.nav.deskLaunch": { bn: "ডেস্ক লঞ্চ", en: "Desk launch" },
  "site.nav.records": { bn: "{n} রেকর্ড", en: "{n} records" },
  "site.nav.viewAll": { bn: "সব দেখুন", en: "View all" },
  "site.nav.updates": { bn: "আপডেট", en: "updates" },
  "site.topbar.public": { bn: "পাবলিক সাইট", en: "Public site" },
  "site.topbar.admin": { bn: "ওয়েব অ্যাডমিন", en: "Web admin" },
  "site.topbar.blueprint": { bn: "ব্লুপ্রিন্ট", en: "Blueprint" },
  "site.topbar.home": { bn: "ওয়েবসাইট হোমপেজ", en: "Website home page" },
  "site.footer.col.sections": { bn: "সেকশন", en: "Sections" },
  "site.footer.col.desk": { bn: "ডেস্ক", en: "Desk" },
  "site.footer.col.connect": { bn: "সংযোগ", en: "Connect" },
  "site.footer.item.collect": { bn: "সর্বশেষ সংগ্রহ", en: "Latest collection" },
  "site.footer.item.insights": { bn: "লাইভ ইনসাইটস", en: "Live insights" },
  "site.footer.item.pipeline": {
    bn: "অটোমেশন পাইপলাইন",
    en: "Automation pipeline",
  },
  "site.footer.item.health": { bn: "সিস্টেম হেলথ", en: "System health" },
  "site.footer.item.adminConsole": { bn: "অ্যাডমিন কনসোল", en: "Admin console" },
  "site.footer.item.factGate": { bn: "কোয়ালিটি গেট নীতি", en: "Fact-gate policy" },
  "site.footer.item.duplicateGate": { bn: "ডুপ্লিকেট গেট", en: "Duplicate gate" },
  "site.footer.item.dataApi": { bn: "ডেটা API", en: "Data API" },
  "site.footer.item.rss": { bn: "RSS ফিড", en: "RSS feed" },
  "site.footer.item.newsletter": { bn: "নিউজলেটার", en: "Newsletter" },
  "site.footer.item.repository": { bn: "রিপোজিটরি", en: "Repository" },
  "site.footer.nl.already": {
    bn: "এই ইমেইল আগেই যুক্ত আছে",
    en: "This address is already subscribed",
  },
  "site.footer.nl.thanks": {
    bn: "যুক্ত হয়েছে — ধন্যবাদ!",
    en: "You are in — thank you!",
  },
  "site.footer.nl.failed": {
    bn: "সম্পন্ন করা যায়নি",
    en: "That did not go through",
  },
  "site.footer.nl.placeholder": { bn: "আপনার ইমেইল", en: "Your email" },
  "site.footer.nl.emailAria": { bn: "ইমেইল ঠিকানা", en: "Email address" },
  "site.footer.nl.sending": { bn: "পাঠানো হচ্ছে…", en: "Sending…" },
  "site.footer.nl.joined": { bn: "যুক্ত হয়েছে", en: "Subscribed" },
  "site.footer.nl.subscribe": { bn: "সাবস্ক্রাইব", en: "Subscribe" },
  "site.footer.copyright": {
    bn: "হৈচৈ · ফিড থেকে সংগ্রহ, সম্পাদকীয় নীতিতে প্রকাশ।",
    en: "Hoichoi · collected from feeds, published under our editorial policy.",
  },
  "site.footer.copyrightRoom": { bn: "হৈচৈ নিউজরুম", en: "Hoichoi newsroom" },
  "site.footer.location": { bn: "ঢাকা, বাংলাদেশ", en: "Dhaka, Bangladesh" },
  "site.footer.mission": {
    bn: "ফিডের দাবি আমরা যাচাইয়ের প্রক্রিয়ায় লিখি। প্রতিটি প্রতিবেদনে সূত্র, সময় ও যাচাইয়ের অবস্থা দেখা যায়; AI স্কোর স্বতন্ত্র ফ্যাক্ট-চেক নয়।",
    en: "We write from feed claims through a verification process. Every report shows its source, time and verification state; an AI score is not an independent fact-check.",
  },
  "site.footer.digest": {
    bn: "দৈনিক ডাইজেস্ট · সকাল ৭টা",
    en: "Daily digest · 7 am",
  },
  "site.footer.subscribers": {
    bn: "ইতিমধ্যে {n} জন সাবস্ক্রাইবার",
    en: "{n} subscribers already",
  },
  "site.footer.pipelineHeading": { bn: "পাইপলাইন", en: "Pipeline" },
  "site.footer.systemOk": { bn: "সিস্টেম স্বাভাবিক", en: "Systems normal" },
  "site.footer.runLog": { bn: "সর্বশেষ রান-লগ", en: "Latest run log" },
  "site.footer.opsInfo": { bn: "পরিচালন তথ্য", en: "Operations" },
  "site.footer.ops.db": { bn: "টার্সো ডাটাবেস", en: "Turso database" },
  "site.footer.ops.factGate": { bn: "কোয়ালিটি গেট", en: "Fact gate" },
  "site.footer.ops.gitBot": { bn: "গিট কমিট বট", en: "Git commit bot" },
  "site.footer.ops.isr": { bn: "আইএসআর ডিপ্লয়", en: "ISR deploy" },
  "site.footer.closing": { bn: "ঢাকা", en: "Dhaka" },
  "site.card.readMore": { bn: "পুরোটা পড়ুন", en: "Read the full story" },
  "site.card.minutes": { bn: "{n} মিনিট", en: "{n} min read" },
  "site.card.illustrative": {
    bn: "পুনর্লিখন · প্রতীকী",
    en: "Rewrite · illustrative",
  },
  "site.card.source": { bn: "সোর্স · {name}", en: "Source · {name}" },
  "site.card.aiRewrite": { bn: "AI সহায়তায় প্রস্তুত", en: "AI-assisted" },
  "site.card.originalPost": { bn: "মূল পোস্ট দেখুন", en: "View original post" },
  "site.card.originalNews": { bn: "মূল সংবাদ পড়ুন", en: "Read original story" },
  "site.verify.unverified": { bn: "যাচাই বাকি", en: "Unverified" },
  "site.verify.sourceClaimed": {
    bn: "সোশ্যাল মিডিয়া দাবি",
    en: "Social-media claim",
  },
  "site.verify.partiallyVerified": {
    bn: "আংশিক যাচাইকৃত",
    en: "Partially verified",
  },
  "site.verify.verified": { bn: "যাচাইকৃত", en: "Verified" },
  "site.verify.disputed": { bn: "বিতর্কিত", en: "Disputed" },
  "site.verify.retracted": { bn: "প্রত্যাহৃত", en: "Retracted" },
  "site.verify.singleSource": { bn: "একক সূত্র", en: "Single source" },
  "site.verify.multiSource": { bn: "একাধিক সূত্র", en: "Multi-source" },
  "site.verify.humanVerified": { bn: "সম্পাদক যাচাইকৃত", en: "Editor verified" },
  "site.verify.corrected": { bn: "সংশোধিত", en: "Corrected" },
  "site.source.facebook": { bn: "ফেসবুক পোস্ট", en: "Facebook post" },
  "site.source.news": { bn: "সংবাদমাধ্যম", en: "News outlet" },
  "site.source.government": { bn: "সরকারি সূত্র", en: "Government source" },
  "site.source.user": { bn: "ইউজার সাবমিশন", en: "User submission" },
  "site.source.unknown": { bn: "অজানা সূত্র", en: "Unknown source" },
  "site.verify.aiGate": {
    bn: "AI পুনর্লিখন গেট: {score}",
    en: "AI rewrite quality: {score}",
  },
  "site.verify.aiGateTip": {
    bn: "এই স্কোর AI-পুনর্লিখনের গুণগত যাচাই নির্দেশ করে; এটি স্বতন্ত্র ফ্যাক্ট-চেক নয়।",
    en: "This score measures AI rewrite quality; it is not an independent fact-check.",
  },
  "site.verify.humanReviewed": { bn: "মানব যাচাই", en: "Human reviewed" },
  "site.verify.needsReview": {
    bn: "মানব যাচাই বাকি",
    en: "Human review pending",
  },
  "site.ad.sponsor": { bn: "হৈচৈ লাইভ", en: "Hoichoi Live" },
  "site.ad.headline": { bn: "আপনার বিজ্ঞাপন এখানে", en: "Your ad goes here" },
  "site.ad.sub": {
    bn: "হৈচৈ পাঠকের কাছে সরাসরি পৌঁছান — ads@hoichoi.example",
    en: "Reach Hoichoi readers directly — ads@hoichoi.example",
  },
  "site.ad.label": { bn: "বিজ্ঞাপন · AD", en: "Advertisement · AD" },
  "site.ad.sponsorUs": { bn: "স্পনসর হোন", en: "Sponsor us" },
  "site.ad.details": { bn: "বিস্তারিত", en: "Details" },
  "site.ad.metrics": { bn: "মেট্রিক্স", en: "Metrics" },
  "site.ad.clicks": { bn: "ক্লিক #{n} ✓", en: "Click #{n} ✓" },

  // ── Public site: masthead ────────────────────────────────────────────────
  "site.masthead.onlineEdition": { bn: "অনলাইন সংস্করণ", en: "Online edition" },
  "site.masthead.price": { bn: "মূল্য: অবৈতনিক", en: "Price: free" },
  "site.masthead.desk": {
    bn: "স্বয়ংক্রিয় নিউজ ডেস্ক",
    en: "Autonomous news desk",
  },

  // ── Public site: footer ──────────────────────────────────────────────────
  "site.footer.about": { bn: "আমাদের সম্পর্কে", en: "About" },
  "site.footer.contact": { bn: "যোগাযোগ", en: "Contact" },
  "site.footer.fontCredit": {
    bn: "বাংলা ফন্ট: লিপিঘর",
    en: "Bangla type: Lipighor",
  },
  "site.footer.privacy": { bn: "গোপনীয়তা", en: "Privacy" },
  "site.footer.cookies": { bn: "কুকি নীতি", en: "Cookies" },
  "site.footer.dmca": { bn: "ডিএমসিএ", en: "DMCA" },
  "site.footer.advertise": { bn: "বিজ্ঞাপন দিন", en: "Advertise" },
  "site.footer.sections": { bn: "বিভাগ", en: "Sections" },
  "site.footer.pages": { bn: "পাতা", en: "Pages" },
  "site.footer.rights": { bn: "সর্বস্বত্ব সংরক্ষিত", en: "All rights reserved" },
  "site.footer.independent": {
    bn: "স্বতন্ত্র, বিজ্ঞাপন-সমর্থিত সংবাদ",
    en: "Independent, ad-supported news",
  },
  "site.footer.submitSource": { bn: "সোর্স জমা দিন", en: "Submit a source" },
  "site.footer.reportError": { bn: "ভুল রিপোর্ট", en: "Report an error" },
  "site.footer.aboutUs": { bn: "সম্পর্কে", en: "About us" },
  "site.footer.editorialPolicy": {
    bn: "সম্পাদকীয় নীতি",
    en: "Editorial policy",
  },
  "site.footer.aiPolicy": { bn: "এআই নীতি", en: "AI policy" },
  "site.footer.corrections": { bn: "সংশোধন নীতি", en: "Corrections" },
  "site.footer.securityPolicy": { bn: "নিরাপত্তা নীতি", en: "Security policy" },
  "site.footer.retention": { bn: "ধারণ নীতি", en: "Retention policy" },
  "site.footer.terms": { bn: "শর্তাবলি", en: "Terms" },
  "site.footer.sectionsHeading": { bn: "বিভাগসমূহ", en: "Sections" },
  "site.footer.noSections": {
    bn: "কোনো বিভাগ এখনো যোগ হয়নি।",
    en: "No sections have been added yet.",
  },
  "site.footer.wantHeading": {
    bn: "আপনি কি এমন কোনো ফেসবুক পেজ বা গ্রুপ জানেন?",
    en: "Do you know a Facebook page or group we should follow?",
  },
  "site.footer.wantBody": {
    bn: "সংবাদ-ধাঁচের গুরুত্বপূর্ণ পোস্ট প্রকাশ করে এমন সব পেজ ও গ্রুপ আমাদের কাছে জানান। অ্যাডমিন যাচাই করে অনুমোদন করলেই সেটি সোর্স হিসেবে যুক্ত হয়।",
    en: "Tell us about pages and groups that publish important news-shaped posts. Once an editor verifies and approves one, it joins our sources.",
  },
  "site.footer.submitSourceCta": {
    bn: "সোর্স জমা দিন →",
    en: "Submit a source →",
  },
  "site.footer.blueprint": { bn: "সিস্টেম ব্লুপ্রিন্ট →", en: "System blueprint →" },
  "site.footer.credit": {
    bn: "ছবি: সংবাদমাধ্যম ও উন্মুক্ত উৎস · প্রতিবেদনগুলো AI সহায়তায় পুনর্লিখিত; প্রকাশের আগে সম্পাদকীয় যাচাই প্রযোজ্য।",
    en: "Photographs: news outlets and open sources · Stories are AI-assisted rewrites; editorial verification applies before publication.",
  },
  "site.footer.newAdvertiser": {
    bn: "নতুন বিজ্ঞাপনদাতা? নিবন্ধন",
    en: "New advertiser? Sign up",
  },
  "site.footer.aboutFallback": {
    bn: "ফেসবুক পেজ ও গ্রুপ, অনলাইন সংবাদপত্র, ম্যাগাজিন এবং সামাজিক মাধ্যমে ছড়িয়ে পড়া গল্প সংগ্রহ করে যাচাই, ডুপ্লিকেট-ফিল্টার ও এআই-সম্পাদনার পর বাংলায় প্রকাশিত সংবাদ-ধাঁচের সাইট।",
    en: "A news-shaped site in Bangla that collects stories spreading through Facebook pages and groups, newspapers, magazines and social media, then verifies, de-duplicates and AI-edits them before publishing.",
  },

  // ── Admin console: shell navigation ──────────────────────────────────────
  "admin.nav.dashboard": { bn: "ড্যাশবোর্ড", en: "Dashboard" },
  "admin.nav.sources": { bn: "সোর্স ও বিভাগ", en: "Sources & desks" },
  "admin.nav.posts": { bn: "পোস্ট এডিটর", en: "Post editor" },
  "admin.nav.live": { bn: "লাইভ, নোটিশ ও পোল", en: "Live, notices & polls" },
  "admin.nav.ads": { bn: "বিজ্ঞাপন", en: "Advertising" },
  "admin.nav.archive": { bn: "আর্কাইভ", en: "Archive" },
  "admin.nav.moderation": { bn: "মডারেশন", en: "Moderation" },
  "admin.nav.submissions": { bn: "ইনবক্স ও রিপোর্ট", en: "Inbox & reports" },
  "admin.nav.providers": { bn: "AI প্রোভাইডার", en: "AI providers" },
  "admin.nav.media": { bn: "মিডিয়া ও কোটা", en: "Media & quota" },
  "admin.nav.backup": { bn: "ব্যাকআপ ও রিসেট", en: "Backup & reset" },
  "admin.nav.logs": { bn: "লগ", en: "Logs" },
  "admin.nav.security": { bn: "নিরাপত্তা ও ডিভাইস", en: "Security & devices" },
  "admin.nav.setup": { bn: "সেটআপ গাইড", en: "Setup guide" },
  "admin.nav.settings": { bn: "সেটিংস", en: "Settings" },
  "admin.nav.logout": { bn: "লগআউট", en: "Log out" },
  "admin.nav.online": { bn: "অনলাইন", en: "Online" },

  // ── Desktop desk: the rail ───────────────────────────────────────────────
  "desk.rail.dashboard": { bn: "মনিটর", en: "Monitor" },
  "desk.rail.traffic": { bn: "ট্রাফিক", en: "Traffic" },
  "desk.rail.watchlist": { bn: "ওয়াচলিস্ট", en: "Watchlist" },
  "desk.rail.queue": { bn: "কনটেন্ট সারি", en: "Content queue" },
  "desk.rail.collector": { bn: "কালেক্টর", en: "Collector" },
  "desk.rail.vault": { bn: "API ভল্ট", en: "API vault" },
  "desk.rail.settings": { bn: "সেটিংস", en: "Settings" },
  "desk.rail.moderation": { bn: "মন্তব্য মডারেশন", en: "Comment moderation" },
  "desk.rail.ads": { bn: "বিজ্ঞাপন", en: "Advertising" },
  "desk.rail.archive": { bn: "আর্কাইভ", en: "Archive" },

  // ── Desktop desk: chrome ─────────────────────────────────────────────────
  "desk.chrome.tabs": { bn: "ট্যাব", en: "Tabs" },
  "desk.chrome.controllerOnline": {
    bn: "কন্ট্রোলার অনলাইন",
    en: "Controller online",
  },
  "desk.chrome.controllerOffline": {
    bn: "কন্ট্রোলার অফলাইন",
    en: "Controller offline",
  },
  "desk.chrome.local": { bn: "লোকাল", en: "Local" },
  "desk.chrome.connected": { bn: "সংযুক্ত", en: "Connected" },
  "desk.chrome.disconnected": { bn: "বিচ্ছিন্ন", en: "Disconnected" },
  "desk.chrome.quit": { bn: "বন্ধ করুন", en: "Quit" },
  "desk.chrome.language": { bn: "ভাষা", en: "Language" },
  "desk.chrome.name": { bn: "হৈচৈ ডেস্ক", en: "Hoichoi Desk" },
  "desk.chrome.tauriOnly": {
    bn: "এই UI টি শুধু Tauri ডেস্কটপ অ্যাপের ভেতরে চলে।",
    en: "This interface only runs inside the Tauri desktop app.",
  },
  "desk.chrome.switchLanguage": { bn: "ভাষা বদলান", en: "Switch language" },
  "desk.chrome.minimize": { bn: "মিনিমাইজ", en: "Minimise" },
  "desk.chrome.maximize": {
    bn: "ম্যাক্সিমাইজ / পুনরুদ্ধার",
    en: "Maximise / restore",
  },

  // ── Migrated from the web dictionary ─────────────────────────────────
  // These keys were the first attempt at bilingual text (media dashboard,
  // notifications, privacy tooling, poll integrity). They move here so
  // there is one table, and apps/web/src/i18n re-exports this one.
  // ── Common ────────────────────────────────────────────────────────────────

  // ── Media dashboard ───────────────────────────────────────────────────────
  "media.heading": { bn: "মিডিয়া ও কোটা", en: "Media & quota" },
  "media.bytes": { bn: "সংরক্ষিত আকার", en: "Stored bytes" },
  "media.quotaHeadroom": { bn: "কোটা বাকি", en: "Quota headroom" },
  "media.failureTrend": {
    bn: "ব্যর্থতার ধারা (১৪ দিন)",
    en: "Failure trend (14 days)",
  },
  "media.noQuota": { bn: "কোটা নির্ধারিত হয়নি", en: "No quota set" },
  "media.reconcile": { bn: "ফাইল পুনর্মিলন", en: "File reconciliation" },

  // ── Notifications ─────────────────────────────────────────────────────────
  "notify.empty": { bn: "কোনো ঘটনা নেই।", en: "No events." },
  "notify.markAll": { bn: "সব পড়া হয়েছে", en: "Mark all read" },
  "notify.events": { bn: "ঘটনা", en: "Events" },
  "notify.queues": { bn: "কিউ আপডেট", en: "Queue updates" },
  "notify.stale": {
    bn: "সংযোগ ব্যর্থ — আপডেট আনা যায়নি।",
    en: "Connection failed — updates unavailable.",
  },
  "notify.desktopTitle": { bn: "হৈচৈ — {title}", en: "Hoichoi — {title}" },
  "notify.desktopCritical": {
    bn: "হৈচৈ · জরুরি — {title}",
    en: "Hoichoi · Critical — {title}",
  },

  // ── Privacy / data-subject ────────────────────────────────────────────────
  "privacy.heading": {
    bn: "ডেটা-সাবজেক্ট · এক্সপোর্ট / মুছে ফেলা",
    en: "Data subject · export / erase",
  },
  "privacy.explain": {
    bn: "পাঠকের গেস্ট আইডি দিন। শুধু ওই পাঠকের মন্তব্য, রিপোর্ট, সাবমিশন ও সরানোর অনুরোধ প্রযোজ্য।",
    en: "Enter the reader's guest id. Only that reader's comments, reports, submissions and removals are affected.",
  },
  "privacy.export": { bn: "এক্সপোর্ট (JSON)", en: "Export (JSON)" },
  "privacy.erase": { bn: "মুছে ফেলুন", en: "Erase" },
  "privacy.eraseWarn": {
    bn: "এটা ফেরানো যাবে না। নিশ্চিত করতে ERASE লিখুন।",
    en: "This cannot be undone. Type ERASE to confirm.",
  },
  "privacy.eraseConfirm": { bn: "হ্যাঁ, মুছে ফেলুন", en: "Yes, erase" },
  "privacy.erased": {
    bn: "{n}টি সারি মুছে ফেলা হয়েছে।",
    en: "{n} rows erased.",
  },
  "privacy.exported": { bn: "{n}টি সারি পাওয়া গেছে।", en: "{n} rows found." },
  "privacy.none": { bn: "কোনো সারি পাওয়া যায়নি।", en: "No rows found." },

  // ── Poll integrity ────────────────────────────────────────────────────────
  "poll.verdict.clean": { bn: "পরিষ্কার", en: "Clean" },
  "poll.verdict.flagged": { bn: "সন্দেহজনক", en: "Flagged" },
  "poll.verdict.suspicious": { bn: "অসততা সনাক্ত", en: "Suspicious" },
  "poll.riskScore": {
    bn: "রিস্ক স্কোর {score}/১০০",
    en: "Risk score {score}/100",
  },
  "poll.validVotes": { bn: "বৈধ ভোট {n}", en: "{n} valid votes" },
  "poll.invalidated": { bn: "বাতিল {n}", en: "{n} invalidated" },
  "poll.networks": {
    bn: "নেটওয়ার্কভিত্তিক ভোট (শীর্ষ {n})",
    en: "Votes by network (top {n})",
  },
  "poll.invalidateNetwork": {
    bn: "এই নেটওয়ার্কের ভোট বাতিল",
    en: "Invalidate this network",
  },
  "poll.reason": {
    bn: "বাতিলের কারণ (অডিটে লেখা থাকবে)",
    en: "Reason (recorded in the audit log)",
  },
  "poll.reasonTooShort": {
    bn: "বাতিল করার কারণ লিখুন (কমপক্ষে ৩ অক্ষর)।",
    en: "Give a reason (at least 3 characters).",
  },
  "poll.methodHeading": {
    bn: "ভোট কীভাবে গোনা হয়",
    en: "How votes are counted",
  },
} as const satisfies Record<string, Entry>;

export type MessageKey = keyof typeof DICTIONARY;

/** Every key in the table, in a stable order. */
export const MESSAGE_KEYS = Object.keys(DICTIONARY) as MessageKey[];

export const LOCALES = ["bn", "en"] as const;

/** Bangla first: the product is Bangla-first and English is the second edition. */
export const DEFAULT_LOCALE: Locale = "bn";

/** The cookie both the site and the console read; the desk mirrors it locally. */
export const LOCALE_COOKIE = "hoichoi_lang";

/** Disk key for the desktop app (localStorage). */
export const LOCALE_STORAGE_KEY = "hoichoi.lang";
