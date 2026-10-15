"use client";

import { Field, Section, TextArea, TextInput, NumberInput } from "./ui";
import { useSettings } from "./state";
import type { BrandAnimation, FooterSocialLink } from "@hoichoi/shared-types";

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
          <div key={i} className="grid items-end gap-3 border border-ink/15 bg-ink/[0.03] p-3 md:grid-cols-[9rem_1fr_1fr_auto]">
            <Field label="আইকন">
              <select
                className={SELECT}
                value={(SOCIAL_ICONS as readonly string[]).includes(l.icon) ? l.icon : "link"}
                onChange={(e) =>
                  update(links.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))
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
                  update(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                }
              />
            </Field>
            <Field label="URL">
              <TextInput
                value={l.url}
                placeholder="https://…"
                onChange={(e) =>
                  update(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
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
        onClick={() => update([...links, { label: "", url: "", icon: "facebook" }])}
        className="border-2 border-ink/30 px-4 py-2 text-[12.5px] font-bold text-ink transition hover:border-alizarin hover:text-alizarin"
      >
        + লিংক যোগ করুন
      </button>
    </Section>
  );
}

export function SiteSection() {
  const { identity, setIdentity, cfg, setCfg } = useSettings();
  return (
    <div className="space-y-6">
      <Section kicker="Branding" title="সাইট পরিচয়" hint="হেডার, ফুটার আর মেটা-বিবরণে ব্যবহৃত টেক্সট — ডেস্কটপ অ্যাপও একই settings টেবিল থেকে পড়ে।">
        <Field label="সাইট নাম">
          <TextInput required value={identity.site_name} onChange={(e) => setIdentity({ site_name: e.target.value })} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="স্লোগান (slogan)">
            <TextInput value={identity.slogan_bn} onChange={(e) => setIdentity({ slogan_bn: e.target.value })} />
          </Field>
          <Field label="ট্যাগলাইন (tagline)">
            <TextInput value={identity.tagline} onChange={(e) => setIdentity({ tagline: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Logo URL">
            <TextInput value={identity.logo_url} onChange={(e) => setIdentity({ logo_url: e.target.value })} placeholder="খালি = টেক্সট লোগো" />
          </Field>
          <Field label="Favicon URL">
            <TextInput value={identity.favicon_url} onChange={(e) => setIdentity({ favicon_url: e.target.value })} placeholder="খালি = ডিফল্ট" />
          </Field>
          <Field label="Accent color">
            <div className="flex items-center gap-2">
              <input type="color" className="h-9 w-12 border border-ink/30 bg-paper" value={identity.accent_color} onChange={(e) => setIdentity({ accent_color: e.target.value })} />
              <TextInput value={identity.accent_color} onChange={(e) => setIdentity({ accent_color: e.target.value })} />
            </div>
          </Field>
        </div>
        <Field label="ফুটার 'সম্পর্কে' অনুচ্ছেদ" hint="খালি রাখলে ওয়েব সাইটের নিজস্ব ডিফল্ট টেক্সট দেখাবে।">
          <TextArea rows={3} value={identity.footer_about_bn} onChange={(e) => setIdentity({ footer_about_bn: e.target.value })} placeholder="সাইট/এই ডেস্ক about-অনুচ্ছেদ…" />
        </Field>
      </Section>

      <Section
        kicker="Brand motion & fallback art"
        title="ব্র্যান্ড অ্যানিমেশন ও ডিফল্ট ছবি"
        hint="মাস্টহেডের সাইট-নামে অ্যানিমেশন, এবং যে পোস্টে কোনো ছবি নেই সেসব পোস্টের জন্য একটি ডিফল্ট ছবি।"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="নামের অ্যানিমেশন" hint="মাস্টহেডের সাইট-নামে প্রয়োগ হয় (লোগো থাকলে লোগোতেও)।">
            <select
              className={SELECT}
              value={cfg.brand_animation}
              onChange={(e) => setCfg((c) => ({ ...c, brand_animation: e.target.value as BrandAnimation }))}
            >
              <option value="none">নেই (স্থির)</option>
              <option value="fade">ফেড-ইন</option>
              <option value="typewriter">টাইপরাইটার</option>
              <option value="shimmer">শিমার</option>
              <option value="slide">স্লাইড-ইন</option>
            </select>
          </Field>
          <Field label="ডিফল্ট পোস্ট ছবি (URL)" hint="রিমোট URL বা /uploads/… পাথ। খালি = চলতি প্লেসহোল্ডার টাইল।">
            <TextInput
              value={cfg.default_post_image}
              onChange={(e) => setCfg((c) => ({ ...c, default_post_image: e.target.value }))}
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
              ছবিহীন পোস্টে এই ছবিটি ব্যবহার হবে। ফাইলটি বাইরে হোস্ট করা হলে সরাসরি লিংক দিন।
            </p>
          </div>
        ) : null}
      </Section>

      <SocialLinksEditor />

      <Section kicker="Contact & trust" title="যোগাযোগ ও জরুরি লাইন">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Contact email">
            <TextInput type="email" value={identity.contact_email} onChange={(e) => setIdentity({ contact_email: e.target.value })} />
          </Field>
          <Field label="পুলিশ হেল্পলাইন">
            <TextInput value={identity.police_helpline} onChange={(e) => setIdentity({ police_helpline: e.target.value })} />
          </Field>
          <Field label="শিশু হেল্পলাইন">
            <TextInput value={identity.child_helpline} onChange={(e) => setIdentity({ child_helpline: e.target.value })} />
          </Field>
        </div>
      </Section>

      <Section kicker="Pipeline & archive" title="পাইপলাইন ও আর্কাইভ">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Pipeline (ঘণ্টা)" hint="পুনর্লিখনের মধ্যে বিরতি — GitHub Actions cron প্রতি ২ ঘণ্টায় চলে।">
            <NumberInput min={1} value={identity.pipeline_hours} onChange={(e) => setIdentity({ pipeline_hours: Number(e.target.value) })} />
          </Field>
          <Field label="Visible (দিন)" hint="পাবলিক আর্কাইভ কত দিন দেখাবে।">
            <NumberInput min={1} value={identity.archive_visible_days} onChange={(e) => setIdentity({ archive_visible_days: Number(e.target.value) })} />
          </Field>
          <Field label="Retention (দিন)" hint="ডাটাবেসে কত দিনের রেকর্ড রাখবে।">
            <NumberInput min={1} value={identity.archive_retention_days} onChange={(e) => setIdentity({ archive_retention_days: Number(e.target.value) })} />
          </Field>
        </div>
      </Section>
    </div>
  );
}