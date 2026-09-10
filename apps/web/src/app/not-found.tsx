import Link from "next/link";

const TITLES: Record<string, string> = {
  removed: "এই পোস্টটি সরিয়ে দেওয়া হয়েছে",
  archived: "এই পোস্টটি আর্কাইভে চলে গেছে",
  notfound: "পেজটি খুঁজে পাওয়া যায়নি",
};

export default function NotFound() {
  return (
    <main className="mx-auto max-w-site px-4 py-24 text-center md:px-8">
      <p className="font-mono-x text-[10px] tracking-[0.26em] text-alizarin uppercase">▚ 404 / 410</p>
      <h1 className="mt-3 font-serif-bn text-[44px] font-black text-ink">{TITLES.notfound}</h1>
      <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-ink-soft">
        হৈচৈ-এর প্রতিটি পোস্ট সাত দিনের জানালায় সীমাবদ্ধ — জানালা শেষ হলে তা আর্কাইভ ও নির্দিষ্ট সময় পর স্থায়ীভাবে মুছে যায়। যা খুঁজছেন তা হয়তো এভাবে উবে গেছে।
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="border border-ink bg-ink px-5 py-2.5 text-[13px] font-bold text-paper hover:bg-alizarin">
          ← হোমে ফিরুন
        </Link>
        <Link href="/system" className="border border-ink/30 px-5 py-2.5 text-[13px] font-bold text-ink hover:bg-ink hover:text-paper">
          আর্কাইভ নীতি দেখুন
        </Link>
      </div>
    </main>
  );
}