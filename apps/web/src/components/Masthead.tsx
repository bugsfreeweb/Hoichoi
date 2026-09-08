import Link from "next/link";
import { longDateBn } from "@/lib/bn";

export function Masthead() {
  return (
    <header className="mx-auto max-w-site px-4 pt-6 md:px-8">
      <div className="flex items-center justify-between border-b border-ink/20 pb-3 text-[11.5px] font-medium text-ink-soft">
        <span>{longDateBn(new Date().toISOString())} · ঢাকা সংস্করণ</span>
        <span className="hidden font-mono-x tracking-[0.2em] uppercase sm:block">
          AUTONOMOUS NEWS DESK · ISSN-AUTO-24
        </span>
        <span>মূল্য: অবৈতনিক</span>
      </div>
      <div className="flex flex-col items-center py-8 text-center md:py-10">
        <Link className="group inline-flex items-baseline" href="/">
          <h1 className="font-serif-bn text-[64px] font-black leading-[0.95] tracking-tight text-ink md:text-[104px]">
            হইচই
          </h1>
          <span className="ml-1 text-[40px] leading-none text-alizarin md:text-[64px]">।</span>
        </Link>
        <div className="mt-4 flex w-full items-center gap-4">
          <span className="h-px flex-1 bg-ink/25"></span>
          <p className="text-[12px] font-medium tracking-wide text-ink-soft md:text-[13px]">
            ভাইরাল বাংলা, সপ্তাহখানেক
          </p>
          <span className="h-px flex-1 bg-ink/25"></span>
        </div>
        <p className="mt-2 text-[10.5px] text-ink-soft/70 md:text-[11px]">
          ফেসবুকের হইচই — এখন বাংলায়, সাত দিন পর উবে যায়
        </p>
      </div>
    </header>
  );
}