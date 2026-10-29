import "dotenv/config";
import { db } from "./index";
import { advertisers, campaigns, creatives, bookings, payments, slotConfig, activity, customTemplates } from "./schema";
import { TEMPLATE_MAP } from "@/lib/ads/templates";
import { SLOTS, quotePrice } from "@/lib/ads/slots";
import { buildI18n } from "@/lib/ads/translate";
import type { CreativeData } from "@/lib/ads/types";
import type { CreativeStyle } from "@/lib/ads/style";
import { layoutFromTemplate, type BlockLayout } from "@/lib/ads/blocks";
import { buildLayoutI18n } from "@/lib/ads/translate";

function days(n: number) {
  return n * 24 * 60 * 60 * 1000;
}

async function main() {
  console.log("→ seeding ad platform…");

  await db.delete(customTemplates);
  await db.delete(activity);
  await db.delete(payments);
  await db.delete(bookings);
  await db.delete(creatives);
  await db.delete(campaigns);
  await db.delete(advertisers);
  await db.delete(slotConfig);

  /* ---------------- slot config ---------------- */
  await db.insert(slotConfig).values(
    SLOTS.map((s) => ({ slotKey: s.key, enabled: true, dayRateBdt: s.dayRate }))
  );

  /* ---------------- accounts ---------------- */
  const people = await db
    .insert(advertisers)
    .values([
      {
        name: "হৈচৈ অ্যাডমিন",
        company: "Hoichoi Media",
        email: "admin@hoichoi.example",
        phone: "+8801700000000",
        role: "admin",
        lang: "bn",
        status: "approved",
        creditBdt: 0,
      },
      {
        name: "তানভীর আহমেদ",
        company: "রঙ বাংলাদেশ",
        email: "tanvir@rang.example",
        phone: "+8801711111111",
        role: "client",
        lang: "bn",
        status: "approved",
        creditBdt: 12000,
        address: "১২৩, ধানমন্ডি ২৭, ঢাকা",
      },
      {
        name: "Sabrina Hossain",
        company: "TechNova Ltd.",
        email: "sabrina@technova.example",
        phone: "+8801822222222",
        role: "client",
        lang: "en",
        status: "approved",
        creditBdt: 4000,
        address: "Banani, Dhaka",
      },
      {
        name: "মিরপুর থানা জনসংযোগ",
        company: "Dhaka Metropolitan Police",
        email: "psa@dmp.example",
        phone: "+8801933333333",
        role: "client",
        lang: "bn",
        status: "approved",
        creditBdt: 0,
      },
      {
        name: "ইমরান কবির",
        company: "বিটিআই রিয়েল এস্টেট",
        email: "imran@bti.example",
        phone: "+8801644444444",
        role: "client",
        lang: "bn",
        status: "pending",
        creditBdt: 0,
      },
    ])
    .returning();

  const byEmail = Object.fromEntries(people.map((p) => [p.email, p]));
  const rang = byEmail["tanvir@rang.example"];
  const nova = byEmail["sabrina@technova.example"];
  const dmp = byEmail["psa@dmp.example"];

  /* ---------------- campaigns ---------------- */
  const camps = await db
    .insert(campaigns)
    .values([
      {
        advertiserId: rang.id,
        name: "ঈদ কালেকশন ২০২৬",
        objective: "traffic",
        landingUrl: "https://rang.example/eid",
        budgetBdt: 90000,
      },
      {
        advertiserId: nova.id,
        name: "Q4 Hiring Push",
        objective: "conversion",
        landingUrl: "https://technova.example/careers",
        budgetBdt: 60000,
      },
      {
        advertiserId: dmp.id,
        name: "নিখোঁজ শিশু সতর্কতা",
        objective: "awareness",
        landingUrl: "https://dmp.example/missing",
        budgetBdt: 0,
      },
    ])
    .returning();

  /* ---------------- creatives ---------------- */
  function mkCreative(
    advertiserId: number,
    templateId: string,
    name: string,
    override: CreativeData,
    palette?: string,
    style: CreativeStyle = {},
    baseLang = "bn",
    layout?: BlockLayout | null
  ) {
    const tpl = TEMPLATE_MAP[templateId];
    const data = { ...tpl.data, ...override };
    return {
      advertiserId,
      templateId,
      name,
      palette: palette ?? tpl.palette,
      data,
      style,
      layout: layout ?? {},
      i18n: buildI18n(data, baseLang as "bn"),
      baseLang,
      autoTranslate: true,
    };
  }

  const crs = await db
    .insert(creatives)
    .values([
      mkCreative(rang.id, "pr-01", "ঈদ কালেকশন — প্রাইস ট্যাগ", {
        brand: "রঙ বাংলাদেশ",
        badge: "ঈদ কালেকশন",
        headline: "পাঞ্জাবি ও শাড়ি — ৪০% পর্যন্ত ছাড়",
        sub: "দেশজুড়ে ফ্রি ডেলিভারি · ক্যাশ অন ডেলিভারি",
        price: "৳১,৪৯০",
        strikePrice: "৳২,৪৯০",
        discount: "৪০%",
        cta: "এখনই কিনুন",
        url: "https://rang.example/eid",
        imageUrl: "https://picsum.photos/seed/hoichoi1/900/600",
      },
      "sand",
      {
        headFont: "serif-bn", headSize: 19, headWeight: 900, letterSpacing: 2,
        accent: "#d2202c", border: "thick", shadow: "press", padding: 16,
        texture: "newsprint", imageFilter: "vintage", imageZoom: 118,
        anim: "fade-up", animIdle: "shine", animSpeed: 650, hoverLift: true,
      }),
      mkCreative(rang.id, "pr-02", "ঈদ কুপন — HOICHOI300", {
        brand: "রঙ বাংলাদেশ",
        headline: "প্রথম অর্ডারে ৩০০৳ ছাড়",
        sub: "ন্যূনতম অর্ডার ১৫০০৳ · ৩১ ডিসেম্বর পর্যন্ত",
        code: "HOICHOI300",
        cta: "কোড কপি করুন",
        url: "https://rang.example/eid",
      },
      "alizarin",
      {
        headFont: "display", headSize: 20, headWeight: 900, align: "left",
        border: "dashed", radius: 4, shadow: "hard", texture: "halftone",
        anim: "pop", animIdle: "pulse", animSpeed: 520,
      }),
      mkCreative(
        nova.id,
        "jb-01",
        "Senior Engineer — Vacancy",
        {
          brand: "TechNova Ltd.",
          badge: "নিয়োগ বিজ্ঞপ্তি",
          headline: "সিনিয়র সফটওয়্যার ইঞ্জিনিয়ার",
          cta: "আবেদন করুন",
          url: "https://technova.example/careers",
        },
        "royal",
        {
          headFont: "sans-bn", headSize: 17, headWeight: 800, lineHeight: 130,
          border: "ruled", shadow: "soft", radius: 2, padding: 18,
          anim: "slide-left", animIdle: "none", animSpeed: 700,
        }
      ),
      mkCreative(dmp.id, "mc-01", "নিখোঁজ — রাফিদ হাসান (৮)", {
        badge: "নিখোঁজ সংবাদ",
        headline: "রাফিদ হাসান (৮)",
        sub: "সর্বশেষ দেখা: ১০ অক্টোবর, বিকেল ৪টা · মিরপুর ১০",
        phone: "০১৭১১-০০০০০০",
        cta: "কল করুন",
        url: "tel:999",
      },
      "alizarin",
      {
        headFont: "serif-bn", headSize: 20, headWeight: 900,
        border: "thick", borderColor: "#d2202c", shadow: "none",
        anim: "zoom-in", animIdle: "shake", animSpeed: 500, padding: 16,
      }),
      mkCreative(
        nova.id,
        "sp-02",
        "TechNova — Section Sponsor",
        {
          brand: "TechNova",
          logoText: "T",
          headline: "প্রযুক্তি বিভাগের পৃষ্ঠপোষক",
          sub: "বাংলাদেশের ক্লাউড পার্টনার",
          cta: "জানুন",
          url: "https://technova.example",
        },
        "ink",
        {
          headFont: "mono", headSize: 15, headWeight: 700, letterSpacing: 6,
          headTransform: "uppercase", border: "hairline", radius: 0,
          gradient: true, gradientTo: "#1f2a12", gradientAngle: 115,
          anim: "fade-in", animIdle: "glow", animSpeed: 800,
        }
      ),
      mkCreative(rang.id, "sp-03", "রঙ — টিকার সৌজন্য", {
        brand: "রঙ বাংলাদেশ",
        logoText: "র",
        headline: "সৌজন্যে",
        sub: "ঈদ কালেকশন এখন অনলাইনে",
        cta: "বিস্তারিত",
        url: "https://rang.example",
      },
      "ink",
      {
        headFont: "serif-bn", headSize: 13, headWeight: 800,
        border: "none", padding: 7, anim: "slide-right", animIdle: "none", animSpeed: 450,
      }),
    ])
    .returning();

  /* a creative assembled in the drag-and-drop builder */
  const builderLayout = layoutFromTemplate("pr-05");
  builderLayout.cols = 3;
  builderLayout.gap = 8;
  const [builderCr] = await db
    .insert(creatives)
    .values([
      mkCreative(
        nova.id,
        "pr-05",
        "বিল্ডারে সাজানো — ফ্ল্যাশ সেল",
        { url: "https://technova.example/flash" },
        "alizarin",
        {
          headFont: "serif-bn", headSize: 20, headWeight: 900,
          border: "thick", shadow: "hard", texture: "halftone",
          anim: "zoom-in", animIdle: "shine", animSpeed: 620, hoverLift: true,
        },
        "bn",
        { ...builderLayout, i18n: buildLayoutI18n(builderLayout, "bn") }
      ),
    ])
    .returning();
  crs.push(builderCr);

  const now = Date.now();

  /* ---------------- bookings ---------------- */
  function mkBooking(
    ref: string,
    advertiserId: number,
    campaignId: number | null,
    creativeId: number,
    slotKey: string,
    d: number,
    status: string,
    offsetDays = 0,
    manual = false,
    priority = 0
  ) {
    const tplUplift = 0;
    const q = quotePrice(slotKey, d, tplUplift);
    return {
      ref,
      advertiserId,
      campaignId,
      creativeId,
      slotKey,
      startsAt: new Date(now + days(offsetDays)),
      endsAt: new Date(now + days(offsetDays + d)),
      days: d,
      status,
      priority,
      grossBdt: q.gross,
      discountBdt: q.discount,
      vatBdt: q.vat,
      totalBdt: q.total,
      manual,
      impressions: status === "active" ? 12000 + Math.floor(Math.random() * 40000) : 0,
      clicks: status === "active" ? 240 + Math.floor(Math.random() * 900) : 0,
    };
  }

  const bks = await db
    .insert(bookings)
    .values([
      mkBooking("HC-AD-1001", rang.id, camps[0].id, crs[0].id, "home_hero_below", 30, "active", -3, false, 5),
      mkBooking("HC-AD-1002", rang.id, camps[0].id, crs[1].id, "home_feed_1", 15, "active", -2),
      mkBooking("HC-AD-1003", nova.id, camps[1].id, crs[2].id, "post_sidebar_rect", 30, "active", -5),
      mkBooking("HC-AD-1004", dmp.id, camps[2].id, crs[3].id, "home_prefooter_strip", 7, "active", -1, true, 9),
      mkBooking("HC-AD-1005", nova.id, camps[1].id, crs[4].id, "post_header_leaderboard", 30, "active", -4),
      mkBooking("HC-AD-1006", rang.id, camps[0].id, crs[5].id, "home_ticker_sponsor", 30, "active", -6, false, 3),
      mkBooking("HC-AD-1007", nova.id, camps[1].id, crs[2].id, "category_infeed", 7, "pending_payment", 1),
      mkBooking("HC-AD-1008", rang.id, camps[0].id, crs[0].id, "post_inarticle", 15, "in_review", 2),
      mkBooking("HC-AD-1009", nova.id, camps[1].id, crs[4].id, "global_mobile_anchor", 30, "scheduled", 4),
      mkBooking("HC-AD-1010", rang.id, camps[0].id, crs[1].id, "home_feed_2", 7, "expired", -20),
      mkBooking("HC-AD-1011", dmp.id, camps[2].id, crs[3].id, "post_sidebar_sticky", 3, "draft", 3),
      mkBooking("HC-AD-1012", nova.id, camps[1].id, builderCr.id, "home_insights_below", 30, "active", -2, false, 6),
      mkBooking("HC-AD-1013", nova.id, camps[1].id, builderCr.id, "post_endcap", 15, "active", -1),
    ])
    .returning();

  /* ---------------- payments ---------------- */
  const paid = bks.filter((b) => ["active", "scheduled", "expired"].includes(b.status));
  const methods = ["bkash", "nagad", "card", "paypal", "crypto", "bank", "manual"];
  await db.insert(payments).values(
    paid.map((b, i) => ({
      bookingId: b.id,
      advertiserId: b.advertiserId,
      method: methods[i % methods.length],
      amountBdt: b.totalBdt,
      status: "paid",
      trxId: `TRX${(90210 + i * 37).toString()}`,
      payerRef: methods[i % methods.length] === "bkash" ? "01711******" : "—",
      meta: { gateway: "sandbox", settled: true },
    }))
  );

  await db.insert(payments).values([
    {
      bookingId: bks.find((b) => b.status === "pending_payment")!.id,
      advertiserId: nova.id,
      method: "card",
      amountBdt: bks.find((b) => b.status === "pending_payment")!.totalBdt,
      status: "initiated",
      trxId: null,
      meta: { gateway: "sandbox" },
    },
  ]);

  /* ---------------- activity log ---------------- */
  await db.insert(activity).values([
    { actor: "system", action: "booking.activated", subject: "HC-AD-1001", detail: "পেমেন্ট নিশ্চিত হওয়ার পর স্বয়ংক্রিয়ভাবে লাইভ" },
    { actor: "system", action: "payment.captured", subject: "TRX90210", detail: "bKash · ৳৬২,৮৬৫" },
    { actor: "admin@hoichoi.example", action: "booking.manual_create", subject: "HC-AD-1004", detail: "জনস্বার্থ বিজ্ঞাপন — ম্যানুয়ালি বিনামূল্যে বসানো হয়েছে" },
    { actor: "system", action: "creative.translated", subject: "ঈদ কালেকশন — প্রাইস ট্যাগ", detail: "en, hi, ar, ur, ms তৈরি হয়েছে" },
    { actor: "system", action: "booking.expired", subject: "HC-AD-1010", detail: "মেয়াদ শেষ — স্লট খালি হয়েছে" },
  ]);

  /* ---------------- saved custom templates ---------------- */
  const savedLayoutA = layoutFromTemplate("pr-05");
  savedLayoutA.cols = 3;
  const savedLayoutB = layoutFromTemplate("mc-01");
  await db.insert(customTemplates).values([
    {
      advertiserId: rang.id,
      name: "রঙ — ফ্ল্যাশ সেল লেআউট",
      sourceTemplateId: "pr-05",
      palette: "alizarin",
      layout: savedLayoutA,
      style: { anim: "zoom-in", animIdle: "shine", border: "thick", shadow: "hard", texture: "halftone" },
    },
    {
      advertiserId: null,
      name: "হাউস — জরুরি সতর্কতা (শেয়ারড)",
      sourceTemplateId: "mc-01",
      palette: "ink",
      layout: savedLayoutB,
      style: { anim: "fade-in", animIdle: "pulse", border: "thick" },
    },
  ]);

  console.log(`✓ ${people.length} accounts, ${crs.length} creatives, ${bks.length} bookings`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
