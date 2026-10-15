"use client";

import { useState } from "react";
import clsx from "clsx";
import { Pause, Play } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";
import { LOGO_ENGINES } from "@/lib/logo";
import { bn } from "@/lib/format";

/** Every logo scene side by side, in the two layouts the site actually uses. */
export default function LogoLab({ accent }: { accent: string }) {
  const [live, setLive] = useState(true);

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono-label" style={{ color: accent }}>
            লোগো অ্যানিমেশন ল্যাব
          </p>
          <h2 className="font-display-bn mt-1 text-2xl text-mist-100">
            {bn(LOGO_ENGINES.length)}টি দৃশ্য — প্রতিটিতে একাধিক প্রভাব একসঙ্গে
          </h2>
          <p className="mt-1 max-w-2xl text-[13.5px] text-mist-400">
            হেডার ও ফুটারের জন্য এখান থেকে পছন্দ দেখে নিন। প্রশাসন কনসোলে প্রতিটি সেকশনের নিচে “লোগো অ্যানিমেশন” থেকে বদলানো যায়।
          </p>
        </div>
        <button
          onClick={() => setLive((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-[13px] font-medium text-mist-200 transition-colors hover:border-white/30"
        >
          {live ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {live ? "অ্যানিমেশন থামান" : "অ্যানিমেশন চালান"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {LOGO_ENGINES.map((e) => (
          <article key={e.id} className="surface overflow-hidden rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/8 px-5 py-3.5">
              <div>
                <h3 className="font-display-bn text-lg text-mist-100">{e.name}</h3>
                <p className="mt-0.5 text-[12.5px] text-mist-400">{e.blurb}</p>
              </div>
              <span
                className={clsx(
                  "mono-label shrink-0 rounded-full border px-2.5 py-1",
                  e.panel ? "border-azure-500/35 text-azure-400" : "border-white/12 text-mist-400",
                )}
              >
                {e.panel ? "নিজস্ব পর্দা" : "খোলা লোগো"}
              </span>
            </div>

            <div className="grid min-h-[170px] items-center gap-6 px-5 py-6 sm:grid-cols-2">
              <div className="flex justify-center sm:justify-start">
                <BrandLogo format="full" engine={e.id} size={38} animate={live} href={null} />
              </div>
              <div className="flex justify-center">
                <BrandLogo format="stacked" engine={e.id} size={34} animate={live} href={null} />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 border-t border-white/8 px-5 py-3.5">
              {e.effects.map((fx) => (
                <span
                  key={fx}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11.5px] text-mist-300"
                >
                  {fx}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
