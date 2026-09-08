import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "যোগাযোগ" };

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 md:px-8">
      <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">▚ CONTACT THE DESK</p>
      <h1 className="mt-2 font-serif-bn text-[40px] font-black text-ink md:text-[52px]">যোগাযোগ</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
        রিপোর্ট, অপসারণের অনুরোধ, ভুল সংশোধন বা সাংবাদিকতার প্রশ্ন — সবকিছুর জন্য আমাদের ইমেইল বা সিস্টেম
        ব্লুপ্রিন্ট পেজ ব্যবহার করুন।
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/report" className="border-2 border-ink p-6 transition hover:bg-ink hover:text-paper">
          <p className="font-mono-x text-[10px] tracking-[0.24em] uppercase opacity-70">কনটেন্ট রিপোর্ট</p>
          <p className="mt-2 font-serif-bn text-[18px] font-extrabold">রিপোর্ট করুন →</p>
        </Link>
        <Link href="/system" className="border-2 border-ink p-6 transition hover:bg-ink hover:text-paper">
          <p className="font-mono-x text-[10px] tracking-[0.24em] uppercase opacity-70">সিস্টেম নীতি</p>
          <p className="mt-2 font-serif-bn text-[18px] font-extrabold">ব্লুপ্রিন্ট দেখুন →</p>
        </Link>
      </div>
    </section>
  );
}