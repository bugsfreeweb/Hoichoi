"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { CopyBlock, SiteSettings } from "@/lib/types";
import { loc } from "@/lib/types";
import { Card, Field, Segmented, Slider, TextArea, TextInput, Toggle, fromLocalInput, toLocalInput } from "@/app/admin/ui";

export function ContentTab({
  s,
  setS,
}: {
  s: SiteSettings;
  setS: Dispatch<SetStateAction<SiteSettings>>;
}) {
  const L = loc(s);
  const bn = L === "bn";
  const [copyLang, setCopyLang] = useState<"bn" | "en">(bn ? "bn" : "en");
  const copy: CopyBlock = copyLang === "bn" ? s.copyBn : s.copy;
  const setCopy = (key: keyof CopyBlock, value: string) =>
    setS((p) => (copyLang === "bn" ? { ...p, copyBn: { ...p.copyBn, [key]: value } } : { ...p, copy: { ...p.copy, [key]: value } }));

  const setBrand = (key: keyof SiteSettings["brand"], value: string) =>
    setS((p) => ({ ...p, brand: { ...p.brand, [key]: value } }));
  const setContact = <K extends keyof SiteSettings["contact"]>(key: K, value: SiteSettings["contact"][K]) =>
    setS((p) => ({ ...p, contact: { ...p.contact, [key]: value } }));
  const setSeo = (key: keyof SiteSettings["seo"], value: string | boolean) =>
    setS((p) => ({ ...p, seo: { ...p.seo, [key]: value } }));

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title={bn ? "ব্র্যান্ড" : "Brand"} desc={bn ? "হেডার, ফুটার ও লাইভ সাইটে দেখা যায়।" : "Shown in headers, footers and the live site fallback."}>
          <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
            <Field label={bn ? "ব্র্যান্ড নাম (বাংলা)" : "Brand name (Bangla)"}>
              <TextInput value={s.brand.nameBn} onChange={(v) => setBrand("nameBn", v)} />
            </Field>
            <Field label={bn ? "লোগো চিহ্ন" : "Logo mark"} hint="১ অক্ষর">
              <TextInput value={s.brand.mark} onChange={(v) => setBrand("mark", v.slice(0, 2))} />
            </Field>
          </div>
          <div className="mt-4 grid gap-4">
            <Field label="Brand name (English)">
              <TextInput value={s.brand.name} onChange={(v) => setBrand("name", v)} />
            </Field>
            <Field label={bn ? "ট্যাগলাইন (বাংলা)" : "Tagline (Bangla)"}>
              <TextInput value={s.brand.taglineBn} onChange={(v) => setBrand("taglineBn", v)} />
            </Field>
            <Field label="Tagline (English)">
              <TextInput value={s.brand.tagline} onChange={(v) => setBrand("tagline", v)} />
            </Field>
          </div>
        </Card>

        <Card title={bn ? "লঞ্চ সময়সূচি" : "Launch schedule"} desc={bn ? "কাউন্টডাউন, ফ্লিপ ঘড়ি ও ETA কপি চালায়।" : "Drives the countdown, the flip clock and the ETA copy."}>
          <div className="space-y-4">
            <Field label={bn ? "ফিরছি" : "Back online at"} hint={bn ? "স্থানীয় সময়" : "local time"}>
              <TextInput
                type="datetime-local"
                value={toLocalInput(s.countdown.target)}
                onChange={(v) => v && setS((p) => ({ ...p, countdown: { ...p.countdown, target: fromLocalInput(v) } }))}
              />
            </Field>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Toggle
                label={bn ? "কাউন্টডাউন" : "Countdown"}
                hint={bn ? "বাকি সময় দেখান" : "Show time remaining"}
                checked={s.countdown.enabled}
                onChange={(v) => setS((p) => ({ ...p, countdown: { ...p.countdown, enabled: v } }))}
              />
              <Toggle
                label={bn ? "অগ্রগতি বার" : "Progress bar"}
                hint={bn ? "পুনর্নির্মাণের সম্পূর্ণতা দেখান" : "Show rebuild completion"}
                checked={s.progress.enabled}
                onChange={(v) => setS((p) => ({ ...p, progress: { ...p.progress, enabled: v } }))}
              />
            </div>
            {s.progress.enabled && (
              <>
                <Slider
                  label={bn ? "সম্পূর্ণ" : "Completion"}
                  value={s.progress.value}
                  onChange={(v) => setS((p) => ({ ...p, progress: { ...p.progress, value: v } }))}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={bn ? "অগ্রগতি লেবেল (বাংলা)" : "Progress label (BN)"}>
                    <TextInput
                      value={s.progress.labelBn}
                      onChange={(v) => setS((p) => ({ ...p, progress: { ...p.progress, labelBn: v } }))}
                    />
                  </Field>
                  <Field label="Progress label (EN)">
                    <TextInput
                      value={s.progress.label}
                      onChange={(v) => setS((p) => ({ ...p, progress: { ...p.progress, label: v } }))}
                    />
                  </Field>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <Card
        title={bn ? "পেজ কপি" : "Page copy"}
        desc={bn ? "সাইট বন্ধ থাকাকালীন ভিজিটররা যা পড়ে — দুই ভাষায়।" : "The words visitors read while the site is unavailable — in both languages."}
        actions={
          <div className="w-44">
            <Segmented
              size="sm"
              value={copyLang}
              onChange={setCopyLang}
              options={[
                { id: "bn", label: "বাংলা" },
                { id: "en", label: "English" },
              ]}
            />
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={bn ? "স্ট্যাটাস ব্যাজ" : "Status badge"}>
              <TextInput value={copy.badge} onChange={(v) => setCopy("badge", v)} />
            </Field>
            <Field label={bn ? "সাব-হেডলাইন" : "Sub-headline"}>
              <TextInput value={copy.subheadline} onChange={(v) => setCopy("subheadline", v)} />
            </Field>
          </div>
          <Field label={bn ? "হেডলাইন" : "Headline"} hint={`${copy.headline.length} chars`}>
            <TextInput value={copy.headline} onChange={(v) => setCopy("headline", v)} />
          </Field>
          <Field label={bn ? "বডি কপি" : "Body copy"}>
            <TextArea rows={4} value={copy.body} onChange={(v) => setCopy("body", v)} />
          </Field>
          <Field label={bn ? "ফুটার নোট" : "Footer note"}>
            <TextInput value={copy.footerNote} onChange={(v) => setCopy("footerNote", v)} />
          </Field>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title={bn ? "নোটিফিকেশন সংগ্রহ" : "Notification capture"} desc={bn ? "ইমেইল Postgres-এ জমা হয়, CSV-তে এক্সপোর্ট করা যায়।" : "Emails are stored in Postgres and exportable as CSV."}>
          <div className="space-y-4">
            <Toggle
              label={bn ? "সাইন-আপ ফর্ম চালু" : "Enable sign-up form"}
              hint={bn ? "সমর্থিত ডিজাইনে নোটিফাই-মি ইনপুট দেখায়" : "Renders the notify-me input on supported designs"}
              checked={s.newsletter.enabled}
              onChange={(v) => setS((p) => ({ ...p, newsletter: { ...p.newsletter, enabled: v } }))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={bn ? "শিরোনাম (বাংলা)" : "Title (BN)"}>
                <TextInput value={s.newsletter.titleBn} onChange={(v) => setS((p) => ({ ...p, newsletter: { ...p.newsletter, titleBn: v } }))} />
              </Field>
              <Field label="Title (EN)">
                <TextInput value={s.newsletter.title} onChange={(v) => setS((p) => ({ ...p, newsletter: { ...p.newsletter, title: v } }))} />
              </Field>
            </div>
            <Field label={bn ? "ইনপুট প্লেসহোল্ডার" : "Input placeholder"}>
              <TextInput value={s.newsletter.placeholder} onChange={(v) => setS((p) => ({ ...p, newsletter: { ...p.newsletter, placeholder: v } }))} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={bn ? "সফল বার্তা (বাংলা)" : "Success (BN)"}>
                <TextInput value={s.newsletter.successBn} onChange={(v) => setS((p) => ({ ...p, newsletter: { ...p.newsletter, successBn: v } }))} />
              </Field>
              <Field label="Success (EN)">
                <TextInput value={s.newsletter.success} onChange={(v) => setS((p) => ({ ...p, newsletter: { ...p.newsletter, success: v } }))} />
              </Field>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title={bn ? "যোগাযোগ" : "Contact"} desc={bn ? "সাইট বন্ধ থাকাকালীন যোগাযোগের উপায়।" : "Ways for visitors to reach you while the site is down."}>
            <div className="space-y-4">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Toggle
                  label={bn ? "যোগাযোগ ব্লক দেখান" : "Show contact block"}
                  checked={s.contact.enabled}
                  onChange={(v) => setContact("enabled", v)}
                />
                <Toggle
                  label={bn ? "যোগাযোগ ফর্ম" : "Contact form"}
                  hint={bn ? "বার্তা অ্যাডমিন ইনবক্সে জমা হয়" : "Messages land in the admin inbox"}
                  checked={s.contact.formEnabled}
                  onChange={(v) => setContact("formEnabled", v)}
                />
              </div>
              <Field label={bn ? "সাপোর্ট ইমেইল" : "Support email"}>
                <TextInput value={s.contact.email} onChange={(v) => setContact("email", v)} />
              </Field>
              <Field label={bn ? "সাপোর্ট ফোন" : "Support phone"}>
                <TextInput value={s.contact.phone} onChange={(v) => setContact("phone", v)} />
              </Field>
            </div>
          </Card>

          <Card title="SEO & robots" desc={bn ? "রক্ষণাবেক্ষণের সময় ক্রলার ও সোশ্যাল আনফার্ল যা দেখে।" : "What crawlers and social unfurls see during maintenance."}>
            <div className="space-y-4">
              <Field label={bn ? "মেটা টাইটেল" : "Meta title"}>
                <TextInput value={s.seo.title} onChange={(v) => setSeo("title", v)} />
              </Field>
              <Field label={bn ? "মেটা বিবরণ" : "Meta description"}>
                <TextArea rows={2} value={s.seo.description} onChange={(v) => setSeo("description", v)} />
              </Field>
              <Toggle
                label="noindex / nofollow"
                hint={bn ? "আসল কনটেন্ট অফলাইনে থাকাকালীন প্রস্তাবিত" : "Recommended while the real content is offline"}
                checked={s.seo.noIndex}
                onChange={(v) => setSeo("noIndex", v)}
              />
            </div>
          </Card>
        </div>
      </div>

      <Card title={bn ? "সোশ্যাল লিংক" : "Social links"} desc={bn ? "খালি রাখলে সেই আইকন লুকিয়ে যাবে।" : "Leave a field empty to hide that icon."}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(Object.keys(s.socials) as (keyof SiteSettings["socials"])[]).map((key) => (
            <Field key={key} label={key === "x" ? "X / Twitter" : key.charAt(0).toUpperCase() + key.slice(1)}>
              <TextInput
                value={s.socials[key]}
                placeholder="https://"
                mono
                onChange={(v) => setS((p) => ({ ...p, socials: { ...p.socials, [key]: v } }))}
              />
            </Field>
          ))}
          <div className="sm:col-span-2 xl:col-span-3">
            <Toggle
              label={bn ? "সোশ্যাল সারি দেখান" : "Show social row"}
              checked={s.socialsEnabled}
              onChange={(v) => setS((p) => ({ ...p, socialsEnabled: v }))}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
