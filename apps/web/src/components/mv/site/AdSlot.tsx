import clsx from "clsx";
import { ArrowUpRight, BadgeCheck, Megaphone } from "lucide-react";
import { Btn, SectionShell } from "@/components/mv/ui/primitives";

export interface AdConfig {
  advertiser: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  disclosure: string;
}

const DEFAULTS: AdConfig = {
  advertiser: "হৈচৈ পাঠক-সহযোগী",
  title: "বিশ্বস্ত তথ্যের পাশে থাকুন",
  description: "পাঠকের জন্য নির্ভরযোগ্য সংবাদ ও যাচাই-সেবায় সহায়তা করুন।",
  cta: "আরও জানুন",
  href: "#newsletter",
  disclosure: "এটি একটি প্রদর্শনী বিজ্ঞাপন। বিজ্ঞাপনের অর্থ সম্পাদকীয় সিদ্ধান্তে প্রভাব ফেলে না।",
};

function safeHref(value: string) {
  return value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/") || value.startsWith("#")
    ? value
    : "#newsletter";
}

export default function AdSlot({
  variant,
  config,
  density,
}: {
  variant: string;
  config?: Record<string, unknown>;
  density: "compact" | "comfortable" | "spacious";
}) {
  const ad = { ...DEFAULTS, ...(config ?? {}) } as AdConfig;
  const href = safeHref(ad.href);

  const disclosure = (
    <p className="mt-3 text-[11.5px] leading-relaxed text-mist-400">
      <span className="mr-1 rounded border border-white/12 px-1.5 py-0.5 text-[10px] font-semibold text-mist-300">বিজ্ঞাপন</span>
      {ad.disclosure}
    </p>
  );
  const sponsor = (
    <span className="flex items-center gap-1.5 text-[12px] text-mist-400">
      <BadgeCheck className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} /> {ad.advertiser}
    </span>
  );

  let content;
  if (variant === "native") {
    content = (
      <div className="surface card-lift flex flex-col gap-5 rounded-2xl p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><Megaphone className="h-5 w-5" /></span>
          <div>{sponsor}<h3 className="font-display-bn mt-1.5 text-xl text-mist-100">{ad.title}</h3><p className="mt-1 text-[13.5px] text-mist-400">{ad.description}</p>{disclosure}</div>
        </div>
        <Btn href={href} variant="outline">{ad.cta}</Btn>
      </div>
    );
  } else if (variant === "billboard") {
    content = (
      <div className="relative overflow-hidden rounded-3xl border border-white/12 p-7 md:p-10" style={{ background: "linear-gradient(115deg, color-mix(in srgb, var(--accent) 26%, var(--color-ink-900)), var(--color-ink-900) 70%)" }}>
        <div aria-hidden className="absolute -right-16 -top-24 h-72 w-72 rounded-full opacity-25 blur-3xl" style={{ background: "var(--accent)" }} />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>{sponsor}<h3 className="font-display-bn mt-4 max-w-3xl text-[clamp(1.6rem,4vw,2.8rem)] leading-tight text-mist-100">{ad.title}</h3><p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-mist-300">{ad.description}</p>{disclosure}</div>
          <Btn href={href}>{ad.cta}</Btn>
        </div>
      </div>
    );
  } else if (variant === "inline") {
    content = (
      <div className="flex flex-col gap-3 border-y border-white/10 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><Megaphone className="mt-1 h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} /><div>{sponsor}<h3 className="font-display-bn mt-1 text-lg text-mist-100">{ad.title}</h3><p className="text-[13px] text-mist-400">{ad.description}</p></div></div>
        <a href={href} className="group inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-mist-100 hover:text-white">{ad.cta}<ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a>
        <span className="sr-only">{ad.disclosure}</span>
      </div>
    );
  } else if (variant === "sponsored") {
    content = (
      <div className="surface-hi grid gap-5 overflow-hidden rounded-2xl md:grid-cols-[0.35fr_1fr_auto] md:items-center">
        <div className="flex h-full min-h-24 items-center justify-center p-5" style={{ background: "var(--accent-soft)" }}><Megaphone className="h-8 w-8" style={{ color: "var(--accent)" }} /></div>
        <div className="px-5 md:px-0">{sponsor}<h3 className="font-display-bn mt-1 text-xl text-mist-100">{ad.title}</h3><p className="mt-1 text-[13.5px] text-mist-400">{ad.description}</p>{disclosure}</div>
        <div className="px-5 pb-5 md:py-5 md:pl-0 md:pr-5"><Btn href={href} variant="outline">{ad.cta}</Btn></div>
      </div>
    );
  } else {
    content = (
      <div className="surface relative overflow-hidden rounded-2xl p-6 md:p-8">
        <div className="absolute inset-y-0 left-0 w-1" style={{ background: "var(--accent)" }} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="pl-2">{sponsor}<h3 className="font-display-bn mt-2 text-2xl leading-snug text-mist-100">{ad.title}</h3><p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-mist-400">{ad.description}</p>{disclosure}</div>
          <Btn href={href} variant="outline">{ad.cta}</Btn>
        </div>
      </div>
    );
  }

  return (
    <SectionShell density={density} className={clsx(variant === "inline" ? "!py-4 md:!py-6" : "!py-8 md:!py-12")}>
      <div className="mx-auto max-w-[1120px]">{content}</div>
    </SectionShell>
  );
}
