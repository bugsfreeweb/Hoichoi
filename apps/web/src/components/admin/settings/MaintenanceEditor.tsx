"use client";

import { MaintenanceScreen } from "@/components/maintenance/MaintenanceScreen";
import type { MaintenanceCopy, MaintenanceSiteConfig } from "@hoichoi/shared-types";
import { Field, Section, Segmented, TextArea, TextInput, ColorInput, ToggleRow } from "./ui";
import { useSettings } from "./state";

/** ISO → <input type="datetime-local"> value (yyyymmddThh:mm). */
function isoToLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(v: string): string {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

const THEMES: Array<{ value: MaintenanceSiteConfig["theme"]; label: string }> = [
  { value: "editorial", label: "Editorial" },
  { value: "newsprint", label: "Newsprint" },
  { value: "midnight", label: "Midnight" },
  { value: "aurora", label: "Aurora" },
];

export function MaintenanceEditor() {
  const { cfg, setCfg } = useSettings();
  const m = cfg.maintenance;

  const patch = <K extends keyof MaintenanceSiteConfig>(k: K, v: MaintenanceSiteConfig[K]) =>
    setCfg((c) => ({ ...c, maintenance: { ...c.maintenance, [k]: v } }));

  const setCopy = (lang: "copyBn" | "copyEn", slot: keyof MaintenanceCopy, v: string) =>
    patch(lang, { ...m[lang], [slot]: v } as never);

  /** Nested-object patchers need explicit spread chains. */
  const patchCountdown = (k: "enabled" | "target", v: boolean | string) =>
    setCfg((c) => ({ ...c, maintenance: { ...c.maintenance, countdown: { ...c.maintenance.countdown, [k]: v } } }));
  const patchProgress = (k: "enabled" | "value", v: boolean | number) =>
    setCfg((c) => ({ ...c, maintenance: { ...c.maintenance, progress: { ...c.maintenance.progress, [k]: v } } }));
  const patchSchedule = (k: "enabled" | "start" | "end" | "autoLive", v: boolean | string) =>
    setCfg((c) => ({ ...c, maintenance: { ...c.maintenance, schedule: { ...c.maintenance.schedule, [k]: v } } }));
  const patchSocial = (k: keyof MaintenanceSiteConfig["socials"], v: string) =>
    setCfg((c) => ({ ...c, maintenance: { ...c.maintenance, socials: { ...c.maintenance.socials, [k]: v } } }));
  const patchEffect = (k: keyof MaintenanceSiteConfig["effects"], v: boolean) =>
    setCfg((c) => ({ ...c, maintenance: { ...c.maintenance, effects: { ...c.maintenance.effects, [k]: v } } }));
  const patchColor = (k: keyof MaintenanceSiteConfig["colors"], v: string) =>
    setCfg((c) => ({ ...c, maintenance: { ...c.maintenance, colors: { ...c.maintenance.colors, [k]: v } } }));
  const patchSeo = (k: keyof MaintenanceSiteConfig["seo"], v: string | boolean) =>
    setCfg((c) => ({ ...c, maintenance: { ...c.maintenance, seo: { ...c.maintenance.seo, [k]: v } } }));

  return (
    <div className="space-y-6">
      <Section kicker="Look & language" title="রকম ও ভাষা" hint="মেইনটেন্যান্স পেজের থিম ও ডিফল্ট ভাষা — ভিজিটররা বাংলা বা ইংরেজিতে কপি দেখবে।">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="থিম">
            <Segmented value={m.theme} options={THEMES} onChange={(v) => patch("theme", v)} />
          </Field>
          <Field label="ভাষা">
            <Segmented<"bn" | "en">
              value={m.language}
              options={[
                { value: "bn", label: "বাংলা" },
                { value: "en", label: "English" },
              ]}
              onChange={(v) => patch("language", v)}
            />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Brand mark">
            <TextInput value={m.brand.mark} onChange={(e) => patch("brand", { ...m.brand, mark: e.target.value })} />
          </Field>
          <Field label="Brand name (EN)">
            <TextInput value={m.brand.name} onChange={(e) => patch("brand", { ...m.brand, name: e.target.value })} />
          </Field>
          <Field label="Brand name (BN)">
            <TextInput value={m.brand.nameBn} onChange={(e) => patch("brand", { ...m.brand, nameBn: e.target.value })} />
          </Field>
        </div>
      </Section>

      <Section kicker="Hero copy" title="হিরো কপি" hint="badge → হেডলাইন → সাবহেড → বডি। বাংলা আর ইংরেজি আলাদা — যে ভাষা সক্রিয়, ভিজিটর সেইটা দেখে।">
        <CopyEditor
          title="বাংলা"
          copy={m.copyBn}
          onChange={(slot, v) => setCopy("copyBn", slot, v)}
        />
        <CopyEditor
          title="English"
          copy={m.copyEn}
          onChange={(slot, v) => setCopy("copyEn", slot, v)}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="ফুটার নোট (BN)">
            <TextInput value={m.footerNoteBn} onChange={(e) => patch("footerNoteBn", e.target.value)} />
          </Field>
          <Field label="ফুটার নোট (EN)">
            <TextInput value={m.footerNoteEn} onChange={(e) => patch("footerNoteEn", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section kicker="Pipeline & newsroom" title="নিউজরুম অনুষঙ্গ" hint="পাইপলাইন চার্ট, লাইভ স্ট্যাটস আর চলমান টিকার স্ট্রিপ — দেখাবেন কিনা।">
        <div className="grid gap-3 sm:grid-cols-3">
          <ToggleRow on={m.showPipeline} onChange={(v) => patch("showPipeline", v)} label="পাইপলাইন চার্ট" />
          <ToggleRow on={m.showStats} onChange={(v) => patch("showStats", v)} label="লাইভ স্ট্যাটস" />
          <ToggleRow on={m.showTicker} onChange={(v) => patch("showTicker", v)} label="টিকার স্ট্রিপ" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Ticker (BN — প্রতিটি লাইন একটি আইটেম)">
            <TextArea rows={4} className="font-mono-x text-[12px]" value={m.tickerBn.join("\n")} onChange={(e) => patch("tickerBn", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} />
          </Field>
          <Field label="Ticker (EN — প্রতিটি লাইন একটি আইটেম)">
            <TextArea rows={4} className="font-mono-x text-[12px]" value={m.tickerEn.join("\n")} onChange={(e) => patch("tickerEn", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} />
          </Field>
        </div>
      </Section>

      <Section kicker="Wait-support" title="নিউজলেটার ও যোগাযোগ" hint="লোকেরা ইমেইল রেখে যেতে বা বার্তা পাঠাতে পারবে — দুটোই DB-তে জমে (অপারেশন ট্যাবে দেখা যায়)।">
        <div className="grid gap-3 sm:grid-cols-3">
          <ToggleRow on={m.showNewsletter} onChange={(v) => patch("showNewsletter", v)} label="নিউজলেটার ফর্ম" />
          <ToggleRow on={m.showContact} onChange={(v) => patch("showContact", v)} label="যোগাযোগ ফর্ম" />
          <ToggleRow on={m.socialsEnabled} onChange={(v) => patch("socialsEnabled", v)} label="সোশ্যাল আইকন" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="নিউজলেটার নোট (BN)">
            <TextInput value={m.newsletterNoteBn} onChange={(e) => patch("newsletterNoteBn", e.target.value)} />
          </Field>
          <Field label="নিউজলেটার নোট (EN)">
            <TextInput value={m.newsletterNoteEn} onChange={(e) => patch("newsletterNoteEn", e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Contact email">
            <TextInput value={m.contactEmail} onChange={(e) => patch("contactEmail", e.target.value)} />
          </Field>
          <Field label="Contact phone">
            <TextInput value={m.contactPhone} onChange={(e) => patch("contactPhone", e.target.value)} />
          </Field>
        </div>
        {m.socialsEnabled && (
          <div className="grid gap-4 md:grid-cols-3">
            {(["facebook", "x", "instagram", "youtube", "github", "linkedin"] as const).map((k) => (
              <Field key={k} label={k}>
                <TextInput value={m.socials[k]} onChange={(e) => patchSocial(k, e.target.value)} placeholder="https://…" />
              </Field>
            ))}
          </div>
        )}
      </Section>

      <Section kicker="Timing" title="কাউন্টডাউন, প্রগ্রেস ও শিডিউল" hint="কাউন্টডাউন একটি তারিখ পর্যন্ত 'বাকি সময়'; প্রগ্রেস-বার সিঙ্ক শতাংশ; শিডিউল একটি জানালা — যদি 'autoLive' চালু থাকে, জানালা পেরোলে ওয়েব সাময়িকভাবে লাইভ হয়ে যায়।">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-ink/15 bg-ink/5 p-4">
            <ToggleRow on={m.countdown.enabled} onChange={(v) => patchCountdown("enabled", v)} label="কাউন্টডাউন দেখাও" />
            <Field label="টার্গেট (স্থানীয় সময়)">
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 text-[13px] outline-none focus:border-alizarin"
                value={isoToLocal(m.countdown.target)}
                onChange={(e) => patchCountdown("target", localToIso(e.target.value))}
              />
            </Field>
          </div>
          <div className="space-y-3 rounded-lg border border-ink/15 bg-ink/5 p-4">
            <ToggleRow on={m.progress.enabled} onChange={(v) => patchProgress("enabled", v)} label="প্রগ্রেস-বার দেখাও" />
            <Field label={`সিঙ্ক শতাংশ · ${Math.round(m.progress.value)}%`}>
              <input
                type="range"
                min={0}
                max={100}
                className="w-full"
                value={m.progress.value}
                onChange={(e) => patchProgress("value", Number(e.target.value))}
              />
            </Field>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-ink/15 bg-ink/5 p-4">
            <ToggleRow on={m.schedule.enabled} onChange={(v) => patchSchedule("enabled", v)} label="শিডিউল জানালা" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="শুরু">
                <input type="datetime-local" className="w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 text-[13px] outline-none focus:border-alizarin" value={isoToLocal(m.schedule.start)} onChange={(e) => patchSchedule("start", localToIso(e.target.value))} />
              </Field>
              <Field label="শেষ">
                <input type="datetime-local" className="w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 text-[13px] outline-none focus:border-alizarin" value={isoToLocal(m.schedule.end)} onChange={(e) => patchSchedule("end", localToIso(e.target.value))} />
              </Field>
            </div>
            <ToggleRow on={m.schedule.autoLive} onChange={(v) => patchSchedule("autoLive", v)} label="জানালা পেরোলে অটো-লাইভ" />
          </div>
          <div className="space-y-3 rounded-lg border border-ink/15 bg-ink/5 p-4">
            <p className="font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">ইফেক্ট</p>
            <ToggleRow on={m.effects.grain} onChange={(v) => patchEffect("grain", v)} label="গ্রেইন টেক্সচার" />
            <ToggleRow on={m.effects.particles} onChange={(v) => patchEffect("particles", v)} label="ভাসমান কণা" />
            <ToggleRow on={m.effects.marquee} onChange={(v) => patchEffect("marquee", v)} label="মার্কি ব্যং" />
          </div>
        </div>
      </Section>

      <Section kicker="Editorial colors" title="কালার প্যালেট" hint="মেইনটেন্যান্স পেজের নিজস্ব রঙ — সাইটের accent-এর সাথে মিলিয়ে রাখার দরকার নেই।">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Background">
            <ColorInput value={m.colors.bg} onChange={(v) => patchColor("bg", v)} />
          </Field>
          <Field label="Surface (কার্ড)">
            <ColorInput value={m.colors.surface} onChange={(v) => patchColor("surface", v)} />
          </Field>
          <Field label="Text">
            <ColorInput value={m.colors.text} onChange={(v) => patchColor("text", v)} />
          </Field>
          <Field label="Primary">
            <ColorInput value={m.colors.primary} onChange={(v) => patchColor("primary", v)} />
          </Field>
          <Field label="Accent">
            <ColorInput value={m.colors.accent} onChange={(v) => patchColor("accent", v)} />
          </Field>
        </div>
      </Section>

      <Section kicker="SEO" title="সার্চ ও মেটা" hint="চালু অবস্থায় সাইট ডি-ইনডেক্স থাকে; title/description দর্শক ও প্রিভিউ শেয়ারে দেখায়।">
        <Field label="Title">
          <TextInput value={m.seo.title} onChange={(e) => patchSeo("title", e.target.value)} />
        </Field>
        <Field label="Description">
          <TextArea rows={2} value={m.seo.description} onChange={(e) => patchSeo("description", e.target.value)} />
        </Field>
        <ToggleRow
          accent="alizarin"
          on={m.seo.noIndex}
          onChange={(v) => patchSeo("noIndex", v)}
          label="noindex (search engines)"
          hint="মোড মেইনটেন্যান্সে decked; এখানে আলাদা noindex ওভাররাইড।"
        />
      </Section>

      <Section kicker="Live preview" title="প্রিভিউ" hint="উপরের সব সেটিংস এখানে পর্দার মতো দেখতে পাবেন — ক্লিকযোগ্য নয়, শুধু লাইভ আপডেট।">
        <div className="h-[520px] overflow-y-auto overflow-x-hidden rounded-lg border border-ink/20">
          <MaintenanceScreen config={cfg.maintenance} preview />
        </div>
      </Section>
    </div>
  );
}

function CopyEditor({
  title,
  copy,
  onChange,
}: {
  title: string;
  copy: MaintenanceCopy;
  onChange: (slot: keyof MaintenanceCopy, v: string) => void;
}) {
  return (
    <div className="rounded-lg border border-ink/15 bg-ink/5 p-4">
      <p className="font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">{title}</p>
      <div className="mt-3 grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Badge">
            <TextInput value={copy.badge} onChange={(e) => onChange("badge", e.target.value)} />
          </Field>
          <Field label="Subheadline">
            <TextInput value={copy.subheadline} onChange={(e) => onChange("subheadline", e.target.value)} />
          </Field>
        </div>
        <Field label="Headline">
          <TextInput value={copy.headline} onChange={(e) => onChange("headline", e.target.value)} />
        </Field>
        <Field label="Body">
          <TextArea rows={3} value={copy.body} onChange={(e) => onChange("body", e.target.value)} />
        </Field>
      </div>
    </div>
  );
}