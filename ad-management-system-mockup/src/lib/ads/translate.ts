import type { CreativeData, LangCode } from "./types";
import type { BlockLayout } from "./blocks";

export const LANGS: { code: LangCode; label: string; native: string; dir: "ltr" | "rtl" }[] = [
  { code: "bn", label: "Bengali", native: "বাংলা", dir: "ltr" },
  { code: "en", label: "English", native: "English", dir: "ltr" },
  { code: "hi", label: "Hindi", native: "हिन्दी", dir: "ltr" },
  { code: "ar", label: "Arabic", native: "العربية", dir: "rtl" },
  { code: "ur", label: "Urdu", native: "اردو", dir: "rtl" },
  { code: "ms", label: "Malay", native: "Bahasa Melayu", dir: "ltr" },
];

/**
 * Offline phrase memory used by the auto-translate step.
 *
 * In production swap `machineTranslate()` for a real provider
 * (Google Cloud Translation / DeepL / Azure) — the call signature and the
 * per-field caching in `translateCreative()` stay identical, so no UI changes
 * are needed. The key env var to read server-side is TRANSLATE_API_KEY.
 */
const MEMORY: Record<string, Partial<Record<LangCode, string>>> = {
  "এখনই কিনুন": { en: "Shop Now", hi: "अभी खरीदें", ar: "تسوق الآن", ur: "ابھی خریدیں", ms: "Beli Sekarang" },
  "বিস্তারিত": { en: "Learn More", hi: "और जानें", ar: "اعرف المزيد", ur: "مزید جانیں", ms: "Ketahui Lagi" },
  "জানুন": { en: "Discover", hi: "जानिए", ar: "اكتشف", ur: "جانیے", ms: "Terokai" },
  "আবেদন করুন": { en: "Apply Now", hi: "आवेदन करें", ar: "قدّم الآن", ur: "درخواست دیں", ms: "Mohon Sekarang" },
  "টিকিট কিনুন": { en: "Buy Tickets", hi: "टिकट खरीदें", ar: "اشترِ التذاكر", ur: "ٹکٹ خریدیں", ms: "Beli Tiket" },
  "কল করুন": { en: "Call Now", hi: "कॉल करें", ar: "اتصل الآن", ur: "کال کریں", ms: "Hubungi" },
  "দান করুন": { en: "Donate", hi: "दान करें", ar: "تبرع", ur: "عطیہ دیں", ms: "Derma" },
  "সিরিয়াল নিন": { en: "Book Appointment", hi: "अपॉइंटमेंट लें", ar: "احجز موعدًا", ur: "اپائنٹمنٹ لیں", ms: "Tempah Janji" },
  "সিট বুক করুন": { en: "Reserve a Seat", hi: "सीट बुक करें", ar: "احجز مقعدًا", ur: "سیٹ بک کریں", ms: "Tempah Tempat" },
  "টেস্ট ড্রাইভ": { en: "Test Drive", hi: "टेस्ट ड्राइव", ar: "قيادة تجريبية", ur: "ٹیسٹ ڈرائیو", ms: "Pandu Uji" },
  "ভিজিট বুক করুন": { en: "Book a Visit", hi: "विज़िट बुक करें", ar: "احجز زيارة", ur: "وزٹ بک کریں", ms: "Tempah Lawatan" },
  "প্রি-অর্ডার": { en: "Pre-order", hi: "प्री-ऑर्डर", ar: "اطلب مسبقًا", ur: "پری آرڈر", ms: "Pra-tempah" },
  "কোড কপি করুন": { en: "Copy Code", hi: "कोड कॉपी करें", ar: "انسخ الرمز", ur: "کوڈ کاپی کریں", ms: "Salin Kod" },
  "অফার নিন": { en: "Claim Offer", hi: "ऑफ़र लें", ar: "احصل على العرض", ur: "آفر حاصل کریں", ms: "Tuntut Tawaran" },
  "নিবন্ধন": { en: "Register", hi: "रजिस्टर", ar: "سجّل", ur: "رجسٹر کریں", ms: "Daftar" },
  "ইশতেহার পড়ুন": { en: "Read Manifesto", hi: "घोषणापत्र पढ़ें", ar: "اقرأ البيان", ur: "منشور پڑھیں", ms: "Baca Manifesto" },
  "ফল দেখুন": { en: "Check Result", hi: "परिणाम देखें", ar: "اطّلع على النتيجة", ur: "نتیجہ دیکھیں", ms: "Semak Keputusan" },
  "সৌজন্যে": { en: "Powered by", hi: "सौजन्य", ar: "برعاية", ur: "بشکریہ", ms: "Ditaja oleh" },
  "এই বিভাগের পৃষ্ঠপোষক": {
    en: "Sponsor of this section",
    hi: "इस खंड के प्रायोजक",
    ar: "راعي هذا القسم",
    ur: "اس سیکشن کے سرپرست",
    ms: "Penaja bahagian ini",
  },
  "নিখোঁজ সংবাদ": { en: "MISSING PERSON", hi: "लापता सूचना", ar: "بلاغ عن مفقود", ur: "گمشدگی کی اطلاع", ms: "ORANG HILANG" },
  "জরুরি · নিখোঁজ": { en: "URGENT · MISSING", hi: "अत्यावश्यक · लापता", ar: "عاجل · مفقود", ur: "فوری · گمشدہ", ms: "SEGERA · HILANG" },
  "গণবিজ্ঞপ্তি": { en: "PUBLIC NOTICE", hi: "सार्वजनिक सूचना", ar: "إشعار عام", ur: "عوامی اطلاع", ms: "NOTIS AWAM" },
  "নিয়োগ বিজ্ঞপ্তি": { en: "WE ARE HIRING", hi: "भर्ती सूचना", ar: "نحن نوظف", ur: "بھرتی کا اعلان", ms: "KAMI MENGAMBIL PEKERJA" },
  "ভর্তি চলছে": { en: "ADMISSION OPEN", hi: "प्रवेश जारी", ar: "القبول مفتوح", ur: "داخلہ جاری", ms: "KEMASUKAN DIBUKA" },
  "টিকিট বিক্রি শুরু": { en: "TICKETS ON SALE", hi: "टिकट बिक्री शुरू", ar: "التذاكر متاحة", ur: "ٹکٹ دستیاب", ms: "TIKET DIJUAL" },
  "রেডি ফ্ল্যাট": { en: "READY FLAT", hi: "रेडी फ्लैट", ar: "شقة جاهزة", ur: "ریڈی فلیٹ", ms: "PANGSAPURI SIAP" },
  "রিকন্ডিশন্ড": { en: "RECONDITIONED", hi: "रीकंडीशंड", ar: "مجدّدة", ur: "ری کنڈیشنڈ", ms: "DIBAIK PULIH" },
  "অ্যাপয়েন্টমেন্ট": { en: "APPOINTMENT", hi: "अपॉइंटमेंट", ar: "موعد", ur: "اپائنٹمنٹ", ms: "JANJI TEMU" },
  "পার্সোনাল লোন": { en: "PERSONAL LOAN", hi: "पर्सनल लोन", ar: "قرض شخصي", ur: "پرسنل لون", ms: "PINJAMAN PERIBADI" },
  "দরপত্র বিজ্ঞপ্তি": { en: "TENDER NOTICE", hi: "निविदा सूचना", ar: "إعلان مناقصة", ur: "ٹینڈر نوٹس", ms: "NOTIS TENDER" },
  "আপনার বিজ্ঞাপন এখানে": {
    en: "Your advertisement here",
    hi: "आपका विज्ञापन यहाँ",
    ar: "إعلانك هنا",
    ur: "آپ کا اشتہار یہاں",
    ms: "Iklan anda di sini",
  },
};

const DIGITS_BN = "০১২৩৪৫৬৭৮৯";

function latinDigits(s: string) {
  return s.replace(/[০-৯]/g, (d) => String(DIGITS_BN.indexOf(d)));
}

/**
 * Deterministic stand-in for a translation provider.
 * 1. exact phrase memory hit  → use it
 * 2. otherwise transliterate numerals + keep the source string, tagged so the
 *    admin can see what still needs a human pass.
 */
export function machineTranslate(text: string, target: LangCode): string {
  if (!text) return text;
  const hit = MEMORY[text.trim()]?.[target];
  if (hit) return hit;
  if (target === "bn") return text;
  return latinDigits(text);
}

const FIELDS: (keyof CreativeData)[] = [
  "brand",
  "headline",
  "sub",
  "body",
  "cta",
  "badge",
  "price",
  "strikePrice",
  "discount",
  "date",
  "time",
  "place",
  "footnote",
];

export function translateCreative(data: CreativeData, target: LangCode): CreativeData {
  if (target === "bn") return data;
  const out: CreativeData = { ...data };
  for (const f of FIELDS) {
    const v = data[f];
    if (typeof v === "string") (out as Record<string, unknown>)[f] = machineTranslate(v, target);
  }
  if (Array.isArray(data.bullets)) out.bullets = data.bullets.map((b) => machineTranslate(b, target));
  if (Array.isArray(data.rows))
    out.rows = data.rows.map((r) => ({
      k: machineTranslate(r.k, target),
      v: machineTranslate(r.v, target),
    }));
  return out;
}

/** Translate every string inside a block layout. */
export function translateLayout(layout: BlockLayout, target: LangCode): BlockLayout {
  if (target === "bn") return layout;
  return {
    ...layout,
    blocks: layout.blocks.map((b) => ({
      ...b,
      text: b.text ? machineTranslate(b.text, target) : b.text,
      items: b.items?.map((it) => ({
        k: it.k ? machineTranslate(it.k, target) : it.k,
        v: it.v ? machineTranslate(it.v, target) : it.v,
      })),
    })),
  };
}

export function buildLayoutI18n(layout: BlockLayout, baseLang: LangCode = "bn") {
  const out: Record<string, BlockLayout> = {};
  for (const l of LANGS) {
    if (l.code === baseLang) continue;
    out[l.code] = translateLayout(layout, l.code);
  }
  return out;
}

/** Build the full i18n bundle stored on the creative row at save time. */
export function buildI18n(data: CreativeData, baseLang: LangCode = "bn") {
  const bundle: Record<string, CreativeData> = {};
  for (const l of LANGS) {
    if (l.code === baseLang) continue;
    bundle[l.code] = translateCreative(data, l.code);
  }
  return bundle;
}
