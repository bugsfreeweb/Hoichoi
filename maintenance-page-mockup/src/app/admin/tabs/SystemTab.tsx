"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, KeyRound, LogOut, RotateCcw, Save, ShieldAlert, TriangleAlert } from "lucide-react";
import type { SiteSettings } from "@/lib/types";
import { loc } from "@/lib/types";
import { MODES } from "@/lib/themes";
import { Card, Field, TextInput, Toggle } from "@/app/admin/ui";

export function SystemTab({
  s,
  setS,
  onReset,
  password,
  setPassword,
}: {
  s: SiteSettings;
  setS: Dispatch<SetStateAction<SiteSettings>>;
  onReset: () => Promise<void>;
  password: { pw: string; pw2: string };
  setPassword: (v: { pw: string; pw2: string }) => void;
}) {
  const L = loc(s);
  const bn = L === "bn";
  const { pw, pw2 } = password;
  const setPw = (v: string) => setPassword({ pw: v, pw2 });
  const setPw2 = (v: string) => setPassword({ pw, pw2: v });
  const [note, setNote] = useState("");
  const [resetting, setResetting] = useState(false);
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card title={bn ? "পেজ মোড" : "Page mode"} desc={bn ? "হোম পেজে এলে ভিজিটর কী দেখবে তা নির্ধারণ করে।" : "Decides what a visitor sees when they land on the home page."}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setS((p) => ({ ...p, mode: m.id }))}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                s.mode === m.id
                  ? "border-[#1a140d] bg-[#1a140d] text-[#f3eee1]"
                  : "border-[#1a140d]/12 bg-white text-[#1a140d] hover:border-[#1a140d]/45"
              }`}
            >
              <span className="font-serif-bn block text-sm font-extrabold">{bn ? m.nameBn : m.name}</span>
              <span className={`mt-1.5 block text-[11px] leading-relaxed ${s.mode === m.id ? "text-[#f3eee1]/65" : "text-[#6b6250]"}`}>
                {bn ? m.hintBn : m.hint}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title={bn ? "অ্যাক্সেস ও নিরাপত্তা" : "Access & security"} desc={bn ? "ড্যাশবোর্ড স্বাক্ষরিত, http-only সেশন কুকি দিয়ে সুরক্ষিত।" : "The dashboard is protected by a signed, http-only session cookie."}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={bn ? "নতুন অ্যাডমিন পাসওয়ার্ড" : "New admin password"} hint="min 4 chars">
                <TextInput type="password" value={pw} onChange={setPw} placeholder="••••••••" />
              </Field>
              <Field label={bn ? "পাসওয়ার্ড নিশ্চিত করুন" : "Confirm password"}>
                <TextInput type="password" value={pw2} onChange={setPw2} placeholder="••••••••" />
              </Field>
            </div>
            {pw && pw !== pw2 && <p className="text-xs font-bold text-[#d2202c]">{bn ? "পাসওয়ার্ড এখনও মিলছে না।" : "Passwords do not match yet."}</p>}
            {pw && pw === pw2 && (
              <p className="inline-flex items-center gap-2 text-xs text-[#6b6250]">
                <Save size={13} /> {bn ? "বাকি সেটিংসের সাথে একসাথে সেভ হবে।" : "Saved together with the rest of the settings."}
              </p>
            )}
            <Field label={bn ? "ভিজিটর বাইপাস কী" : "Visitor bypass key"} hint="/?bypass=KEY">
              <TextInput
                mono
                value={s.security.bypassKey}
                onChange={(v) => setS((p) => ({ ...p, security: { ...p.security, bypassKey: v.replace(/\s/g, "-") } }))}
              />
            </Field>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Toggle
                label={bn ? "ডিজাইন প্রিভিউ অনুমতি" : "Allow design previews"}
                hint="Public /preview/:design routes"
                checked={s.security.allowPreview}
                onChange={(v) => setS((p) => ({ ...p, security: { ...p.security, allowPreview: v } }))}
              />
              <Toggle
                label={bn ? "অ্যানালিটিক্স বিকন" : "Analytics beacon"}
                hint={bn ? "ডিজাইন অনুযায়ী ভিজিটর ভিউ লগ করুন" : "Log visitor page views per design"}
                checked={s.analytics.enabled}
                onChange={(v) => setS((p) => ({ ...p, analytics: { ...p.analytics, enabled: v } }))}
              />
            </div>
          </div>
        </Card>

        <Card title={bn ? "ডেটা ও ডেঞ্জার জোন" : "Data & danger zone"} desc={bn ? "সব Postgres-এ জমা — মুছার আগে এক্সপোর্ট করুন।" : "Everything is stored in Postgres — export before you wipe."}>
          <div className="space-y-3">
            <Link
              href="/api/subscribers/export"
              className="flex items-center justify-between gap-3 rounded-xl border-2 border-[#1a140d]/12 bg-white px-4 py-3 text-sm font-bold text-[#1a140d] transition hover:border-[#1a140d]"
            >
              <span className="inline-flex items-center gap-2.5">
                <Download size={15} /> {bn ? "সাবস্ক্রাইবার CSV এক্সপোর্ট" : "Export subscribers as CSV"}
              </span>
              <span className="font-mono-x text-[11px] text-[#6b6250]">.csv</span>
            </Link>

            <button
              onClick={async () => {
                setResetting(true);
                await onReset();
                setResetting(false);
                setNote(bn ? "সব সেটিংস ডিফল্টে ফিরিয়ে আনা হয়েছে।" : "All settings restored to the shipped defaults.");
              }}
              className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-[#b45309]/40 bg-[#ffb454]/10 px-4 py-3 text-sm font-bold text-[#9a4208] transition hover:border-[#b45309]"
            >
              <span className="inline-flex items-center gap-2.5">
                <RotateCcw size={15} className={resetting ? "animate-spin" : ""} /> {bn ? "সেটিংস রিসেট করুন" : "Reset settings to defaults"}
              </span>
              <span className="font-mono-x text-[11px] text-[#b45309]">destructive</span>
            </button>

            <div className="rounded-xl border-2 border-[#d2202c]/30 bg-[#d2202c]/5 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-bold text-[#a3121d]">
                <TriangleAlert size={14} /> {bn ? "লাইভে যাওয়ার আগে" : "Before you go live"}
              </p>
              <ul className="mt-2.5 space-y-1.5 text-[11px] leading-relaxed text-[#a3121d]/80">
                <li>· {bn ? "পেজ মোড “সাইট লাইভ”-এ বদলান — ভিজিটররা আসল হোম পেজ পাবে।" : "Switch the page mode to “Site live” so visitors reach the real home page."}</li>
                <li>· {bn ? "noindex বন্ধ করুন যাতে সার্চ ইঞ্জিন আবার ক্রল করতে পারে।" : "Turn off noindex so search engines can crawl again."}</li>
                <li>· {bn ? "সাবস্ক্রাইবার তালিকা এক্সপোর্ট করে ইমেইল টুলে দিন।" : "Export the subscriber list and hand it to your email tool."}</li>
              </ul>
            </div>

            <button
              onClick={logout}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#1a140d]/12 bg-white px-4 py-3 text-sm font-bold text-[#1a140d] transition hover:border-[#1a140d]"
            >
              <LogOut size={15} /> {bn ? "ড্যাশবোর্ড থেকে সাইন আউট" : "Sign out of the dashboard"}
            </button>

            {note && (
              <p className="inline-flex items-center gap-2 text-xs font-bold text-[#4a7009]">
                <ShieldAlert size={13} /> {note}
              </p>
            )}
            <p className="inline-flex items-center gap-2 text-[11px] text-[#6b6250]">
              <KeyRound size={12} /> {bn ? "সেশন ১২ ঘণ্টা থাকে, সাইন-ইনে নবায়ন হয়।" : "Session lasts 12 hours and is re-issued on sign-in."}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
