import Link from "next/link";
import { listAdSlots } from "@hoichoi/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "বিজ্ঞাপন দিন · হৈচৈ" };

export default async function AdvertisePage() {
  const slots = await listAdSlots();
  const bookable = slots.filter((slot) => slot.enabled && slot.deliveryMode !== "house");

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-site flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/" className="font-serif-bn text-[18px] font-black">হৈচৈ <span className="text-alizarin">বিজ্ঞাপন</span></Link>
          <nav aria-label="বিজ্ঞাপন পৃষ্ঠা" className="flex items-center gap-2">
            <Link href="#inventory" className="hidden px-3 py-2 text-[11px] font-semibold text-ink-soft hover:text-ink sm:inline">স্লট ও রেট</Link>
            <Link href="/portal/login" className="border border-ink/20 px-3 py-2 text-[11px] font-bold hover:border-ink">ক্লায়েন্ট লগইন</Link>
            <Link href="/portal/signup" className="bg-alizarin px-3 py-2 text-[11px] font-bold text-white hover:bg-alizarin-deep">অ্যাকাউন্ট তৈরি</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b-2 border-ink bg-night-grid">
        <div className="pointer-events-none absolute -right-20 -top-32 h-[440px] w-[440px] rounded-full bg-alizarin/15 blur-[120px]" />
        <div className="relative mx-auto grid max-w-site gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
          <div>
            <p className="font-mono-x text-[10px] tracking-[0.25em] text-lime uppercase">▚ HOICHOI · PLATFORM ADVERTISING</p>
            <h1 className="mt-4 max-w-4xl font-serif-bn text-[clamp(2.4rem,6vw,4.7rem)] leading-[1.04] font-black text-ink">
              সঠিক পাঠকের কাছে <span className="text-alizarin">আপনার বার্তা</span>
            </h1>
            <p className="mt-5 max-w-2xl text-[14px] leading-relaxed text-ink-soft">
              ক্যাম্পেইন তৈরি করুন, উপলভ্য বিজ্ঞাপন স্লট দেখুন, creative সংরক্ষণ করুন এবং ক্লায়েন্ট পোর্টাল থেকে বুকিং অনুরোধ পাঠান। প্রকাশের আগে প্রতিটি অ্যাকাউন্ট ও বুকিং প্রশাসক যাচাই করেন।
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/portal/signup" className="bg-alizarin px-5 py-3 text-[12px] font-bold text-white transition-colors hover:bg-alizarin-deep">ক্লায়েন্ট অ্যাকাউন্ট খুলুন →</Link>
              <Link href="/portal/login" className="border border-ink/25 px-5 py-3 text-[12px] font-bold text-ink transition-colors hover:border-ink">পোর্টালে সাইন ইন</Link>
              <Link href="#inventory" className="border border-ink/25 px-5 py-3 text-[12px] font-bold text-ink transition-colors hover:border-ink">স্লট ও রেট দেখুন</Link>
            </div>
          </div>
          <aside className="border border-ink/15 bg-paper/90 p-5 backdrop-blur">
            <p className="font-mono-x text-[9px] tracking-[0.2em] text-alizarin uppercase">INVENTORY SNAPSHOT</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div><p className="font-serif-bn text-[34px] leading-none font-black">{slots.length}</p><p className="mt-1 text-[11px] text-ink-soft">মোট বিজ্ঞাপন স্লট</p></div>
              <div><p className="font-serif-bn text-[34px] leading-none font-black text-lime">{bookable.length}</p><p className="mt-1 text-[11px] text-ink-soft">এখন বুকিংযোগ্য</p></div>
            </div>
            <div className="mt-5 border-t border-ink/12 pt-4 text-[11px] leading-relaxed text-ink-soft">
              মূল্য, slot status এবং delivery mode বর্তমান admin configuration থেকে দেখানো হচ্ছে।
            </div>
          </aside>
        </div>
      </section>

      <section id="inventory" className="mx-auto max-w-site scroll-mt-8 px-4 py-12 md:px-8 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono-x text-[9px] tracking-[0.22em] text-alizarin uppercase">▚ INVENTORY · LIVE CONFIGURATION</p>
            <h2 className="mt-2 font-serif-bn text-[30px] font-black md:text-[38px]">স্লট ও দৈনিক রেট</h2>
          </div>
          <Link href="/portal/book" className="text-[12px] font-bold text-alizarin hover:underline">ক্লায়েন্ট পোর্টালে বুক করুন →</Link>
        </div>

        {slots.length ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {slots.map((slot, index) => {
              const canBook = slot.enabled && slot.deliveryMode !== "house";
              return (
                <article key={slot.slotKey} className="group relative overflow-hidden border border-ink/15 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-[4px_4px_0_0_var(--color-ink)]">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono-x text-[9px] tracking-[0.16em] text-ink-soft uppercase">SLOT {String(index + 1).padStart(2, "0")}</span>
                    <span className={`px-2 py-1 font-mono-x text-[8px] font-bold tracking-[0.12em] uppercase ${canBook ? "bg-lime/15 text-lime" : "bg-ink/8 text-ink-soft"}`}>
                      {canBook ? "বুকিং চলছে" : slot.enabled ? "হাউস অ্যাড" : "বন্ধ"}
                    </span>
                  </div>
                  <h3 className="mt-4 font-serif-bn text-[20px] leading-snug font-bold">{slot.name}</h3>
                  {slot.description && <p className="mt-2 min-h-10 text-[12px] leading-relaxed text-ink-soft">{slot.description}</p>}
                  <div className="mt-5 flex items-end justify-between border-t border-ink/10 pt-4">
                    <div>
                      <p className="font-mono-x text-[8px] tracking-[0.15em] text-ink-soft uppercase">দৈনিক রেট</p>
                      <p className="mt-1 font-serif-bn text-[22px] font-black">৳{slot.dayRateBdt.toLocaleString("bn-BD")}<span className="ml-1 font-sans text-[10px] font-medium text-ink-soft">/দিন</span></p>
                    </div>
                    {canBook ? <Link href={`/portal/book?slot=${encodeURIComponent(slot.slotKey)}`} className="border border-ink/20 px-3 py-2 text-[10px] font-bold transition-colors hover:bg-ink hover:text-paper">বুক করুন</Link> : <span className="text-[10px] text-ink-soft">বর্তমানে অনুপলভ্য</span>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-6 border border-dashed border-ink/20 px-5 py-9 text-center text-[12px] text-ink-soft">স্লট তালিকা এখনো প্রস্তুত নয়। পরে আবার দেখুন।</p>
        )}
      </section>

      <section className="border-y border-ink/15 bg-paper-deep/40">
        <div className="mx-auto grid max-w-site gap-8 px-4 py-12 md:grid-cols-3 md:px-8 md:py-14">
          {[
            ["01", "অ্যাকাউন্ট ও creative", "ইমেইল দিয়ে advertiser account খুলে creative তৈরি ও সংরক্ষণ করুন।"],
            ["02", "স্লট ও সময় বাছুন", "চালু inventory থেকে slot, start date এবং campaign duration দিন।"],
            ["03", "পর্যালোচনা ও প্রকাশ", "প্রশাসক account এবং booking যাচাই করে অনুমোদন বা প্রত্যাখ্যান করেন।"],
          ].map(([number, title, description]) => (
            <article key={number} className="border-l-2 border-alizarin pl-4">
              <p className="font-mono-x text-[9px] tracking-[0.2em] text-alizarin">{number} / CAMPAIGN FLOW</p>
              <h3 className="mt-2 font-serif-bn text-[18px] font-black">{title}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-site flex-wrap items-center justify-between gap-4 px-4 py-8 md:px-8">
        <div>
          <p className="font-serif-bn text-[19px] font-black">শুরু করতে প্রস্তুত?</p>
          <p className="mt-1 text-[11px] text-ink-soft">অ্যাকাউন্ট খুলে client workspace-এ creative ও booking পরিচালনা করুন।</p>
        </div>
        <div className="flex gap-2">
          <Link href="/portal/signup" className="bg-ink px-4 py-2.5 text-[11px] font-bold text-paper hover:bg-alizarin">অ্যাকাউন্ট তৈরি</Link>
          <Link href="/portal/login" className="border border-ink/20 px-4 py-2.5 text-[11px] font-bold hover:border-ink">লগইন</Link>
        </div>
      </footer>
    </main>
  );
}
