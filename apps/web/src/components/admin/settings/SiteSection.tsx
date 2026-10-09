"use client";

import { Field, Section, TextArea, TextInput, NumberInput } from "./ui";
import { useSettings } from "./state";

export function SiteSection() {
  const { identity, setIdentity } = useSettings();
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