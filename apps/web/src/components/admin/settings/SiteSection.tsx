"use client";

import { useState } from "react";
import { Field, Section, TextArea, TextInput, NumberInput } from "./ui";
import { useSettings } from "./state";
import {
  HERO_HEADLINE_MOTIONS,
  HERO_SCENE_STYLES,
  SIDEBAR_STYLES,
  type BrandAnimation,
  type FooterSocialLink,
} from "@hoichoi/shared-types";
import HeroPanels from "@/components/home/HeroPanels";

const SOCIAL_ICONS = [
  "facebook",
  "x",
  "youtube",
  "instagram",
  "tiktok",
  "linkedin",
  "whatsapp",
  "telegram",
  "github",
  "rss",
  "mail",
  "link",
] as const;

/** Stand-ins for the picker only. The real home page passes the lead stories,
 *  the live event stream and the source switches; here the shapes and the
 *  labels are what the operator is choosing between, and every number below is
 *  marked as a sample by `PREVIEW_STATS`. */
const PREVIEW_POSTS = [
  {
    id: "p1",
    slug: "preview-1",
    title: "সরকারি চাকরিতে বয়সসীমা বাড়ানোর সুপারিশ",
    category: "জাতীয়",
    source: "প্রথম আলো",
    image: null,
    summary: "কমিশনের প্রতিবেদনে তিন বছরের বেশি সময়ের সুপারিশ।",
    minutes: 3,
    hash: "A1B2C3",
    at: "2026-01-01T09:20:00.000Z",
  },
  {
    id: "p2",
    slug: "preview-2",
    title: "ঢাকায় নতুন মেট্রোরেল স্টেশনের উদ্বোধন",
    category: "রাজধানী",
    source: "বাংলা নিউজ",
    image: null,
    summary: "দুই স্টেশন চালু হলে যাত্রীসংখ্যা বাড়বে।",
    minutes: 2,
    hash: "D4E5F6",
    at: "2026-01-01T09:05:00.000Z",
  },
  {
    id: "p3",
    slug: "preview-3",
    title: "বিশ্বকাপ বাছাইয়ে বাংলাদেশের সহজ জয়",
    category: "খেলা",
    source: "ঢাকা পোস্ট",
    image: null,
    summary: "পাঁচ উইকেটে জিতে সিরিজ নিশ্চিত করল টাইগাররা।",
    minutes: 4,
    hash: "778899",
    at: "2026-01-01T08:40:00.000Z",
  },
  {
    id: "p4",
    slug: "preview-4",
    title: "পদ্মা সেতুতে যান চলাচল বেড়েছে ২৩ শতাংশ",
    category: "অর্থনীতি",
    source: "বণিক বার্তা",
    image: null,
    summary: "সেতু কর্তৃপক্ষের ছয় মাসের হিসাব।",
    minutes: 3,
    hash: "CC1122",
    at: "2026-01-01T08:10:00.000Z",
  },
];

const SELECT =
  "w-full border border-ink/30 bg-paper px-2 py-2 text-[13px] text-ink focus:border-alizarin focus:outline-none";

function SocialLinksEditor() {
  const { cfg, setCfg } = useSettings();
  const links = cfg.footer_socials;
  const update = (next: FooterSocialLink[]) =>
    setCfg((c) => ({ ...c, footer_socials: next }));
  return (
    <Section
      kicker="Footer socials"
      title="ফুটার সোশ্যাল লিংক"
      hint="ফুটারের লোগো/সম্পর্কে অংশের নিচে দেখানো হয় — খালি রাখলে কিছুই দেখা যাবে না।"
    >
      {links.length === 0 && (
        <p className="text-[12.5px] text-ink-soft">এখনো কোনো লিংক নেই।</p>
      )}
      <div className="space-y-3">
        {links.map((l, i) => (
          <div
            key={i}
            className="grid items-end gap-3 border border-ink/15 bg-ink/[0.03] p-3 md:grid-cols-[9rem_1fr_1fr_auto]"
          >
            <Field label="আইকন">
              <select
                className={SELECT}
                value={
                  (SOCIAL_ICONS as readonly string[]).includes(l.icon)
                    ? l.icon
                    : "link"
                }
                onChange={(e) =>
                  update(
                    links.map((x, j) =>
                      j === i ? { ...x, icon: e.target.value } : x,
                    ),
                  )
                }
              >
                {SOCIAL_ICONS.map((ic) => (
                  <option key={ic} value={ic}>
                    {ic}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="লেবেল">
              <TextInput
                value={l.label}
                placeholder="আমাদের ফেসবুক"
                onChange={(e) =>
                  update(
                    links.map((x, j) =>
                      j === i ? { ...x, label: e.target.value } : x,
                    ),
                  )
                }
              />
            </Field>
            <Field label="URL">
              <TextInput
                value={l.url}
                placeholder="https://…"
                onChange={(e) =>
                  update(
                    links.map((x, j) =>
                      j === i ? { ...x, url: e.target.value } : x,
                    ),
                  )
                }
              />
            </Field>
            <button
              type="button"
              onClick={() => update(links.filter((_, j) => j !== i))}
              className="mb-0.5 border border-ink/30 px-3 py-2 text-[12px] font-bold text-ink-soft transition hover:border-alizarin hover:text-alizarin"
              title="লিংক মুছুন"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          update([...links, { label: "", url: "", icon: "facebook" }])
        }
        className="border-2 border-ink/30 px-4 py-2 text-[12.5px] font-bold text-ink transition hover:border-alizarin hover:text-alizarin"
      >
        + লিংক যোগ করুন
      </button>
    </Section>
  );
}

/**
 * Sample numbers for the template previews only. They are deliberately NOT fed
 * from a real post: the picker should show the layout, not pretend to be live.
 */
const PREVIEW_STATS = {
  collected: 148,
  published: 96,
  dups: 52,
  lastRunIso: null,
};

/** The Site tab is six screens' worth of settings in one column, which made the
 *  save button a scroll away from whatever was being edited. These four views
 *  are the same sections, grouped by what an operator changes together — no
 *  setting was moved to another tab or hidden behind another click. */
const SITE_VIEWS = [
  { key: "identity", bn: "পরিচয়", en: "Identity" },
  { key: "brand", bn: "ব্র্যান্ড ও মিডিয়া", en: "Brand & media" },
  { key: "hero", bn: "হিরো", en: "Home hero" },
  { key: "ops", bn: "সেটআপ ও অপারেশন", en: "Setup & ops" },
] as const;

type SiteView = (typeof SITE_VIEWS)[number]["key"];

export function SiteSection() {
  const { identity, setIdentity, cfg, setCfg } = useSettings();
  const [view, setView] = useState<SiteView>("identity");
  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="সাইট সেটিংসের অংশ"
        className="flex flex-wrap items-center gap-1.5 border border-ink/20 bg-paper-deep p-1.5"
      >
        {SITE_VIEWS.map((v) => (
          <button
            key={v.key}
            role="tab"
            type="button"
            aria-selected={view === v.key}
            aria-controls={`site-view-${v.key}`}
            onClick={() => setView(v.key)}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
              view === v.key
                ? "bg-ink text-paper"
                : "text-ink-soft hover:bg-ink/8 hover:text-ink"
            }`}
          >
            {v.bn}
            <span className="font-mono-x text-[9px] tracking-[0.12em] uppercase opacity-70">
              {v.en}
            </span>
          </button>
        ))}
      </div>

      <div
        id="site-view-identity"
        role="tabpanel"
        hidden={view !== "identity"}
        className="space-y-6"
      >
        <Section
          kicker="Branding"
          title="সাইট পরিচয়"
          hint="হেডার, ফুটার আর মেটা-বিবরণে ব্যবহৃত টেক্সট — ডেস্কটপ অ্যাপও একই settings টেবিল থেকে পড়ে।"
        >
          <Field label="সাইট নাম">
            <TextInput
              required
              value={identity.site_name}
              onChange={(e) => setIdentity({ site_name: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="স্লোগান (slogan)">
              <TextInput
                value={identity.slogan_bn}
                onChange={(e) => setIdentity({ slogan_bn: e.target.value })}
              />
            </Field>
            <Field label="ট্যাগলাইন (tagline)">
              <TextInput
                value={identity.tagline}
                onChange={(e) => setIdentity({ tagline: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Logo URL">
              <TextInput
                value={identity.logo_url}
                onChange={(e) => setIdentity({ logo_url: e.target.value })}
                placeholder="খালি = টেক্সট লোগো"
              />
            </Field>
            <Field label="Favicon URL">
              <TextInput
                value={identity.favicon_url}
                onChange={(e) => setIdentity({ favicon_url: e.target.value })}
                placeholder="খালি = ডিফল্ট"
              />
            </Field>
            <Field label="Accent color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-9 w-12 border border-ink/30 bg-paper"
                  value={identity.accent_color}
                  onChange={(e) =>
                    setIdentity({ accent_color: e.target.value })
                  }
                />
                <TextInput
                  value={identity.accent_color}
                  onChange={(e) =>
                    setIdentity({ accent_color: e.target.value })
                  }
                />
              </div>
            </Field>
          </div>
          <Field
            label="ফুটার 'সম্পর্কে' অনুচ্ছেদ"
            hint="খালি রাখলে ওয়েব সাইটের নিজস্ব ডিফল্ট টেক্সট দেখাবে।"
          >
            <TextArea
              rows={3}
              value={identity.footer_about_bn}
              onChange={(e) => setIdentity({ footer_about_bn: e.target.value })}
              placeholder="সাইট/এই ডেস্ক about-অনুচ্ছেদ…"
            />
          </Field>
        </Section>

        <SocialLinksEditor />

        <Section kicker="Contact & trust" title="যোগাযোগ ও জরুরি লাইন">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Contact email">
              <TextInput
                type="email"
                value={identity.contact_email}
                onChange={(e) => setIdentity({ contact_email: e.target.value })}
              />
            </Field>
            <Field label="পুলিশ হেল্পলাইন">
              <TextInput
                value={identity.police_helpline}
                onChange={(e) =>
                  setIdentity({ police_helpline: e.target.value })
                }
              />
            </Field>
            <Field label="শিশু হেল্পলাইন">
              <TextInput
                value={identity.child_helpline}
                onChange={(e) =>
                  setIdentity({ child_helpline: e.target.value })
                }
              />
            </Field>
          </div>
        </Section>
      </div>

      <div
        id="site-view-brand"
        role="tabpanel"
        hidden={view !== "brand"}
        className="space-y-6"
      >
        <Section
          kicker="Brand motion & fallback art"
          title="ব্র্যান্ড অ্যানিমেশন ও ডিফল্ট ছবি"
          hint="মাস্টহেডের সাইট-নামে অ্যানিমেশন, এবং যে পোস্টে কোনো ছবি নেই সেসব পোস্টের জন্য একটি ডিফল্ট ছবি।"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="নামের অ্যানিমেশন"
              hint="মাস্টহেডের সাইট-নামে প্রয়োগ হয় (লোগো থাকলে লোগোতেও)।"
            >
              <select
                className={SELECT}
                value={cfg.brand_animation}
                onChange={(e) =>
                  setCfg((c) => ({
                    ...c,
                    brand_animation: e.target.value as BrandAnimation,
                  }))
                }
              >
                <option value="none">নেই (স্থির)</option>
                <option value="fade">ফেড-ইন</option>
                <option value="typewriter">টাইপরাইটার</option>
                <option value="shimmer">শিমার</option>
                <option value="slide">স্লাইড-ইন</option>
              </select>
            </Field>
            <Field
              label="ডিফল্ট পোস্ট ছবি (URL)"
              hint="রিমোট URL বা /uploads/… পাথ। খালি = চলতি প্লেসহোল্ডার টাইল।"
            >
              <TextInput
                value={cfg.default_post_image}
                onChange={(e) =>
                  setCfg((c) => ({ ...c, default_post_image: e.target.value }))
                }
                placeholder="https://… অথবা /uploads/…"
              />
            </Field>
          </div>
          {cfg.default_post_image ? (
            <div className="flex items-center gap-3 border border-ink/15 bg-ink/[0.03] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cfg.default_post_image}
                alt="ডিফল্ট পোস্ট ছবির প্রিভিউ"
                className="h-16 w-28 border border-ink/20 object-cover"
              />
              <p className="text-[11.5px] text-ink-soft">
                ছবিহীন পোস্টে এই ছবিটি ব্যবহার হবে। ফাইলটি বাইরে হোস্ট করা হলে
                সরাসরি লিংক দিন।
              </p>
            </div>
          ) : null}
        </Section>

        <Section
          kicker="Admin sidebar template"
          title="সাইডবার টেমপ্লেট"
          hint="কনসোলের বাম মেনুর চেহারা — বারোটি টেমপ্লেট, একই মেনু ও একই শর্টকাট। মেনুর ক্রম, নাম বা লিংক বদলায় না, শুধু প্যানেলের রূপ; ডেস্কটপ অ্যাপও এই একই পছন্দ পড়ে।"
        >
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {SIDEBAR_STYLES.map((st) => {
              const active = cfg.admin_sidebar_style === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() =>
                    setCfg((c) => ({ ...c, admin_sidebar_style: st.id }))
                  }
                  aria-pressed={active}
                  className={`flex items-start gap-2.5 border p-2.5 text-left transition-colors ${
                    active
                      ? "border-alizarin bg-alizarin/[0.06]"
                      : "border-ink/20 hover:border-ink/50"
                  }`}
                >
                  {/* The swatch is decoration for the picker only. The real panel
                    is the sidebar itself, so a swatch can never promise a look
                    the CSS does not produce. */}
                  <span
                    aria-hidden="true"
                    className="grid h-[46px] w-[62px] shrink-0 content-start gap-[3px] p-[6px]"
                    style={{
                      background: st.swatch.bg,
                      borderRadius: st.swatch.radius,
                      border: `1px solid ${st.swatch.bar}`,
                    }}
                  >
                    <span
                      style={{
                        background: st.swatch.accent,
                        height: 4,
                        width: "52%",
                        borderRadius: st.swatch.radius,
                      }}
                    />
                    <span
                      style={{
                        background: st.swatch.bar,
                        height: 3,
                        width: "92%",
                        opacity: 0.85,
                      }}
                    />
                    <span
                      style={{
                        background: st.swatch.bar,
                        height: 3,
                        width: "78%",
                        opacity: 0.6,
                      }}
                    />
                    <span
                      style={{
                        background: st.swatch.bar,
                        height: 3,
                        width: "86%",
                        opacity: 0.45,
                      }}
                    />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-[12px] font-bold ${active ? "text-alizarin" : "text-ink"}`}
                    >
                      {st.name}
                      {active ? " · নির্বাচিত" : ""}
                    </span>
                    <span className="block font-mono-x text-[9px] tracking-[0.12em] text-ink-soft uppercase">
                      {st.latin} · {st.tone === "dark" ? "গাঢ়" : "হালকা"}
                    </span>
                    <span className="mt-0.5 block text-[10.5px] leading-snug text-ink-soft">
                      {st.note}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11.5px] leading-snug text-ink-soft">
            পছন্দ সংরক্ষণ করার পর কনসোলের প্যানেল সঙ্গে সঙ্গে বদলে যাবে — এই পাতায়
            থাকতেই।
          </p>
        </Section>

        <Section
          kicker="Hero decorative effects"
          title="হোম হিরো ডেকোরেটিভ ইফেক্ট"
          hint="হোম পেজের হিরো সেকশনের ডেকোরেটিভ অ্যানিমেশন ও গ্রাফিক টগল — প্রয়োজনে বন্ধ করুন।"
        >
          <div className="grid gap-3 md:grid-cols-2">
            {(
              [
                ["drift", "ড্রিফট ব্লব (blur blobs)"],
                ["floaty", "ফ্লোটিং কার্ড"],
                ["beam", "বিম লাইট"],
                ["headline_grad", "গ্রেডিয়েন্ট হেডলাইন"],
                ["kin_mask", "কাইনেটিক মাস্ক"],
                ["tauri_win", "উইন্ডো ক্রোম"],
                ["ping", "লাইভ পিং ডট"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 border border-ink/15 bg-ink/[0.03] px-3 py-2"
              >
                <span className="text-[12.5px] font-medium text-ink">
                  {label}
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-alizarin"
                  checked={cfg.hero_effects[key]}
                  onChange={(e) =>
                    setCfg((c) => ({
                      ...c,
                      hero_effects: {
                        ...c.hero_effects,
                        [key]: e.target.checked,
                      },
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </Section>
      </div>

      <div
        id="site-view-hero"
        role="tabpanel"
        hidden={view !== "hero"}
        className="space-y-6"
      >
        <Section
          kicker="Hero headline motion"
          title="হিরো হেডলাইন অ্যানিমেশন"
          hint="হোম পেজের বড় হেডলাইনে কোন মোশন স্টাইল চলবে। এটি ম্যাস্টহেডের লোগো অ্যানিমেশন থেকে আলাদা — একটি বদলালে অন্যটি বদলাবে না।"
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {HERO_HEADLINE_MOTIONS.map((m) => {
              const active = cfg.hero_headline_motion === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() =>
                    setCfg((c) => ({ ...c, hero_headline_motion: m.key }))
                  }
                  aria-pressed={active}
                  className={`group relative overflow-hidden border px-3 py-2 text-left transition-colors ${
                    active
                      ? "border-alizarin bg-alizarin/[0.06]"
                      : "border-ink/20 bg-ink/[0.02] hover:border-ink/50"
                  }`}
                >
                  <span
                    className={`headline-grad hl-preview hlfx hlfx--${m.key} block font-serif-bn text-[22px] leading-none font-black`}
                  >
                    হৈচৈ!
                  </span>
                  <span className="mt-1 flex items-baseline justify-between gap-2">
                    <span
                      className={`text-[11.5px] font-bold ${active ? "text-alizarin" : "text-ink"}`}
                    >
                      {m.bn}
                    </span>
                    <span className="font-mono-x text-[9px] tracking-[0.12em] text-ink-soft uppercase">
                      {m.en}
                    </span>
                  </span>
                  {active && (
                    <span className="absolute top-1.5 right-1.5 font-mono-x text-[9px] font-bold text-alizarin">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-3">
            <span className="font-mono-x text-[9.5px] tracking-[0.16em] text-ink-soft uppercase">
              প্রিভিউ
            </span>
            <span
              className={`${cfg.hero_effects.headline_grad ? "headline-grad " : ""}hl-preview hlfx hlfx--${cfg.hero_headline_motion} font-serif-bn text-[40px] leading-none font-black text-ink`}
            >
              হৈচৈ<span className="text-alizarin">!</span>
            </span>
            <span className="ml-auto text-[11px] text-ink-soft">
              গ্রেডিয়েন্ট হেডলাইন বন্ধ থাকলে এই মোশনগুলো শুধু অবস্থান/আলো নাড়ায়, রং
              বদলায় না।
            </span>
          </div>
        </Section>

        <Section
          kicker="Hero scene template"
          title="হিরো সিন টেমপ্লেট"
          hint="হোম পেজের ডান কলামে “কনটেন্ট কীভাবে সংগ্রহ হয়” দৃশ্যের লেআউট। সব টেমপ্লেট একই আসল ডেটা (উৎস প্ল্যাটফর্ম, সংগ্রহ/ডুপ্লিকেট/প্রকাশিত সংখ্যা) দেখায় — শুধু সাজানো আলাদা। ডেস্কটপ অ্যাপেও একই পছন্দ আছে।"
        >
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {HERO_SCENE_STYLES.map((st) => {
              const active = cfg.hero_scene_style === st.key;
              // A picker cell holds the real panel, and several panels contain
              // their own links and tabs. A `<button>` around them is invalid
              // HTML (React refuses to hydrate it), so the cell is a div with
              // button semantics: same click, same Enter/Space, same aria-pressed.
              return (
                <div
                  key={st.key}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setCfg((c) => ({ ...c, hero_scene_style: st.key }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setCfg((c) => ({ ...c, hero_scene_style: st.key }));
                    }
                  }}
                  aria-pressed={active}
                  className={`group cursor-pointer overflow-hidden border text-left transition-colors ${
                    active
                      ? "border-alizarin"
                      : "border-ink/20 hover:border-ink/50"
                  }`}
                >
                  {/* Scaled-down real scene, so the picker shows the actual layout. */}
                  {/* The scene is rendered at double size and scaled down, so it
                    has to be clipped by its own box — `overflow-hidden` alone
                    still let a wide template paint past the card and swallow
                    the grid around it. `contain: paint` plus a fixed aspect
                    keeps every preview inside its own cell. */}
                  <div
                    className="relative aspect-[16/9] w-full overflow-hidden bg-ink/[0.04] [contain:paint]"
                    aria-hidden="true"
                  >
                    <div
                      className="pointer-events-none absolute top-0 left-0 origin-top-left select-none"
                      style={{
                        width: "200%",
                        height: "220%",
                        transform: "scale(0.5)",
                      }}
                    >
                      <HeroPanels
                        style={st.key}
                        posts={PREVIEW_POSTS}
                        stats={PREVIEW_STATS}
                        preview
                      />
                    </div>
                  </div>
                  <div
                    className={`px-2.5 py-1.5 ${active ? "bg-alizarin/[0.06]" : ""}`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`text-[11.5px] font-bold ${active ? "text-alizarin" : "text-ink"}`}
                      >
                        {st.bn}
                      </span>
                      <span className="font-mono-x text-[9px] tracking-[0.1em] text-ink-soft uppercase">
                        {active ? "✓ " : ""}
                        {st.en}
                      </span>
                    </div>
                    {/* The prototype's own one-line note, so the picker explains
                      what each template is for instead of only naming it. */}
                    <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-ink-soft">
                      {st.noteBn}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 border-t border-ink/10 pt-3">
            <p className="mb-2 font-mono-x text-[9.5px] tracking-[0.16em] text-ink-soft uppercase">
              পূর্ণ প্রিভিউ ·{" "}
              {HERO_SCENE_STYLES.find((x) => x.key === cfg.hero_scene_style)
                ?.bn ?? " rail"}
            </p>
            <div className="relative max-h-[420px] w-full max-w-[560px] overflow-hidden border border-ink/15 [contain:paint]">
              <HeroPanels
                style={cfg.hero_scene_style}
                posts={PREVIEW_POSTS}
                stats={PREVIEW_STATS}
                preview
              />
            </div>
          </div>
        </Section>
      </div>

      <div
        id="site-view-ops"
        role="tabpanel"
        hidden={view !== "ops"}
        className="space-y-6"
      >
        <Section kicker="Pipeline & archive" title="পাইপলাইন ও আর্কাইভ">
          <div className="grid gap-4 md:grid-cols-3">
            <Field
              label="Pipeline (ঘণ্টা)"
              hint="পুনর্লিখনের মধ্যে বিরতি — GitHub Actions cron প্রতি ৮ ঘণ্টায় চলে।"
            >
              <NumberInput
                min={1}
                value={identity.pipeline_hours}
                onChange={(e) =>
                  setIdentity({ pipeline_hours: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Visible (দিন)" hint="পাবলিক আর্কাইভ কত দিন দেখাবে।">
              <NumberInput
                min={1}
                value={identity.archive_visible_days}
                onChange={(e) =>
                  setIdentity({ archive_visible_days: Number(e.target.value) })
                }
              />
            </Field>
            <Field
              label="Retention (দিন)"
              hint="ডাটাবেসে কত দিনের রেকর্ড রাখবে।"
            >
              <NumberInput
                min={1}
                value={identity.archive_retention_days}
                onChange={(e) =>
                  setIdentity({
                    archive_retention_days: Number(e.target.value),
                  })
                }
              />
            </Field>
          </div>
        </Section>
      </div>
    </div>
  );
}
