import Link from "next/link";

export const metadata = { title: "বিজ্ঞাপন দিন" };

export default function AdvertisePage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-16 md:px-8">
      <Link href="/" className="font-mono-x text-[10px] tracking-[0.18em] text-alizarin uppercase hover:underline">হৈচৈ · হোম</Link>
      <section className="mt-8 border border-ink/15 bg-paper p-6 md:p-10">
        <p className="font-mono-x text-[9px] tracking-[0.2em] text-alizarin uppercase">PLATFORM AD MANAGEMENT</p>
        <h1 className="mt-2 max-w-3xl font-serif-bn text-[34px] leading-tight font-black md:text-[46px]">হৈচৈ-এর পাঠকদের কাছে আপনার বিজ্ঞাপন পৌঁছে দিন</h1>
        <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-ink-soft">ক্লায়েন্ট পোর্টালে অ্যাকাউন্ট তৈরি করে বিজ্ঞাপন ক্রিয়েটিভ ও স্লট বুকিংয়ের অনুরোধ পাঠান। প্রকাশের আগে প্রতিটি অ্যাকাউন্ট ও বুকিং প্রশাসক অনুমোদন করেন।</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/portal/signup" className="bg-alizarin px-5 py-3 text-[12px] font-bold text-white hover:bg-alizarin-deep">ক্লায়েন্ট অ্যাকাউন্ট তৈরি করুন</Link>
          <Link href="/portal/login" className="border border-ink/25 px-5 py-3 text-[12px] font-bold text-ink hover:border-ink">ক্লায়েন্ট লগইন</Link>
        </div>
      </section>
    </main>
  );
}
