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
        <Field label="সাইট নাম">
          <input required className={field} value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} />
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