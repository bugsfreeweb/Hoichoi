"use client";

import { useState } from "react";
import type { SiteSettings } from "@hoichoi/shared-types";

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const [form, setForm] = useState({
    site_name: initial.site_name,
    contact_email: initial.contact_email,
    police_helpline: initial.police_helpline,
    child_helpline: initial.child_helpline,
    pipeline_hours: initial.pipeline_hours,
    archive_visible_days: initial.archive_visible_days,
    archive_retention_days: initial.archive_retention_days,
    slogan_bn: initial.slogan_bn,
    tagline: initial.tagline,
    logo_url: initial.logo_url ?? "",
    favicon_url: initial.favicon_url ?? "",
    accent_color: initial.accent_color,
    footer_about_bn: initial.footer_about_bn ?? "",
    ad_leaderboard_html: initial.ad_leaderboard_html ?? "",
    ad_rect_html: initial.ad_rect_html ?? "",
    ad_infeed_html: initial.ad_infeed_html ?? "",
    ad_strip_html: initial.ad_strip_html ?? "",
  });
  const [status, setStatus] = useState<null | "ok" | "err" | "denied">(null);

  const field = "mt-1 w-full border border-ink/30 bg-paper px-3 py-2 text-[13px] focus:outline-none";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.status === 401 || res.status === 403) return setStatus("denied");
      if (!res.ok) return setStatus("err");
      setStatus("ok");
    } catch {
      setStatus("err");
    }
  }

  const num = (v: number | string) => Number(v);

  return (
    <form onSubmit={onSubmit} className="grid gap-5 border border-ink/20 bg-paper-deep p-6">
      <h3 className="font-sans-bn text-[15px] font-bold text-ink">সাইট / সিস্টেম সেটিংস</h3>
      <div className="grid gap-4">
        <Field label="সাইট নাম (web + desktop title)">
          <input required className={field} value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="স্লোগান (slogan)">
            <input className={field} value={form.slogan_bn} onChange={(e) => setForm({ ...form, slogan_bn: e.target.value })} />
          </Field>
          <Field label="ট্যাগলাইন (tagline)">
            <input className={field} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Logo URL (empty = text wordmark)">
            <input className={field} value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
          </Field>
          <Field label="Favicon URL (empty = default)">
            <input className={field} value={form.favicon_url} onChange={(e) => setForm({ ...form, favicon_url: e.target.value })} />
          </Field>
          <Field label="Accent color">
            <div className="mt-1 flex items-center gap-2">
              <input type="color" className="h-9 w-12 border border-ink/30 bg-paper" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} />
              <input className={field} value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} />
            </div>
          </Field>
        </div>
        <Field label="ফুটার “সম্পর্কে” অনুচ্ছেদ (footer_about_bn — খালি = সাইট ডিফল্ট)">
          <textarea rows={3} className={`${field} resize-y leading-relaxed`} value={form.footer_about_bn} onChange={(e) => setForm({ ...form, footer_about_bn: e.target.value })} placeholder="সাইট/এই ডেস্ক about-অনুচ্ছেদ…" />
        </Field>
        <Field label="Contact email">
          <input type="email" className={field} value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="পুলিশ হেল্পলাইন">
            <input className={field} value={form.police_helpline} onChange={(e) => setForm({ ...form, police_helpline: e.target.value })} />
          </Field>
          <Field label="শিশু হেল্পলাইন">
            <input className={field} value={form.child_helpline} onChange={(e) => setForm({ ...form, child_helpline: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Pipeline (ঘণ্টা)">
            <input type="number" min={1} className={field} value={form.pipeline_hours} onChange={(e) => setForm({ ...form, pipeline_hours: num(e.target.value) })} />
          </Field>
          <Field label="Visible (দিন)">
            <input type="number" min={1} className={field} value={form.archive_visible_days} onChange={(e) => setForm({ ...form, archive_visible_days: num(e.target.value) })} />
          </Field>
          <Field label="Retention (দিন)">
            <input type="number" min={1} className={field} value={form.archive_retention_days} onChange={(e) => setForm({ ...form, archive_retention_days: num(e.target.value) })} />
          </Field>
        </div>
      </div>

      <h3 className="border-t border-ink/15 pt-5 font-sans-bn text-[15px] font-bold text-ink">বিজ্ঞাপন স্লট (Ad slots)</h3>
      <p className="-mt-2 text-[12px] leading-relaxed text-ink-soft">
        প্রতিটি স্লটে যেকোনো অ্যাড-নেটওয়ার্ক কোড / HTML / <code className="font-mono-x text-[11px]">{"<script>"}</code> ব্লক পেস্ট
        করুন (AdSense, Adsterra, ইন-হাউজ ব্যানার…)। খালি রাখলে ডিফল্ট স্পনসর কার্ড দেখাবে। সংরক্ষণের পর সরাসরি সাইটে
        লাইভ হয়।
      </p>
      <div className="grid gap-4">
        <Field label="Leaderboard (হোমপেজের শীর্ষ · ~728×90)">
          <textarea rows={3} className={`${field} resize-y font-mono-x text-[12px] leading-relaxed`} placeholder={'<ins class="adsbygoogle" ... /> অথবা ব্যানার HTML'} value={form.ad_leaderboard_html} onChange={(e) => setForm({ ...form, ad_leaderboard_html: e.target.value })} />
        </Field>
        <Field label="Strip (হোমপেজের নিচের ডার্ক ব্যানার · ~970×64)">
          <textarea rows={3} className={`${field} resize-y font-mono-x text-[12px] leading-relaxed`} placeholder={'<a href="..."><img src="..." /></a>'} value={form.ad_strip_html} onChange={(e) => setForm({ ...form, ad_strip_html: e.target.value })} />
        </Field>
        <Field label="Infeed (গ্রিডে প্রতি ৪র্থ আইটেমে)">
          <textarea rows={4} className={`${field} resize-y font-mono-x text-[12px] leading-relaxed`} placeholder={"নিউজফিড-স্টাইলের বিজ্ঞাপন কোড"} value={form.ad_infeed_html} onChange={(e) => setForm({ ...form, ad_infeed_html: e.target.value })} />
        </Field>
        <Field label="Rect (আর্টিকেল পেজে · ~300×250)">
          <textarea rows={4} className={`${field} resize-y font-mono-x text-[12px] leading-relaxed`} placeholder={"আর্টিকেল ভেতরের বক্স বিজ্ঞাপন"} value={form.ad_rect_html} onChange={(e) => setForm({ ...form, ad_rect_html: e.target.value })} />
        </Field>
      </div>
      {status === "ok" && <p className="border border-cat-teal bg-cat-teal/10 px-3 py-2 text-[12.5px] font-bold text-ink">✓ সংরক্ষিত।</p>}
      {status === "err" && <p className="border border-alizarin bg-alizarin/10 px-3 py-2 text-[12.5px] font-bold text-ink">✗ ব্যর্থ।</p>}
      {status === "denied" && <p className="border border-alizarin bg-alizarin/10 px-3 py-2 text-[12.5px] font-bold text-ink">অনুমতি নেই — admin প্রয়োজন।</p>}
      <button className="w-fit border-2 border-ink bg-ink px-6 py-2.5 text-[13px] font-bold text-paper transition hover:bg-alizarin">
        সংরক্ষণ করুন →
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{label}</span>
      {children}
    </label>
  );
}