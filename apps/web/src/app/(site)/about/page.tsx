import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "আমাদের সম্পর্কে" };

export default function AboutPage() {
  return (
    <Section title="আমাদের সম্পর্কে" kicker="ABOUT THE DESK">
      <p>
        হৈচৈ। একটি <strong>স্বয়ংক্রিয় সংবাদ কিউরেশন ডেস্ক</strong> — ফেসবুকে ছড়িয়ে পড়া ভাইরাল বাংলা
        পোস্টগুলোকে ৭ দিনের মধ্যে সম্পাদকীয় সংবাদ আকারে সাজিয়ে প্রকাশ করে, তারপর জানালাটা বন্ধ করে দেয়।
        আমাদের ট্যাগলাইন — <em>“ভাইরাল বাংলা, সপ্তাহখানেক।”</em>
      </p>
      <p>
        প্রতিদিন নির্দিষ্ট সূত্রের তালিকা থেকে পোস্ট সংগ্রহ করা হয়, ডুপ্লিকেট ঠেকানো হয় হ্যাশ ও এম্বেডিং
        ফিঙ্গারপ্রিন্টে, এবং প্রতিটি পোস্ট তিনটি ক্যাটাগরিতে শ্রেণিবদ্ধ করে বাংলা সম্পাদকীয় শৈলীতে পুনর্লিখন করা হয়:
      </p>
      <ul>
        <li>শিশু যৌন নির্যাতন — সর্বোচ্চ রিড্যাকশন ও সতর্কতামূলক প্রকাশ</li>
        <li>পরকীয়া অপরাধ — হুমকি/ব্ল্যাকমেইলের অপরাধমূলক দিক, অভিযোগ ভাষায়</li>
        <li>নিখোঁজ শিশু — উদ্ধারযোগ্য তথ্য ও গুজব-সতর্কতা</li>
      </ul>
      <p>
        যেকোনো পোস্ট ৭ দিন পরে স্বয়ংক্রিয়ভাবে আর্কাইভে চলে যায় এবং নির্ধারিত সময় পর স্থায়ীভাবে মুছে যায় —
        এটাই আমাদের সপ্তাহখানেকের অঙ্গীকার।
      </p>
      <Link className="mt-4 inline-block border border-ink bg-ink px-5 py-2.5 text-[13px] font-bold text-paper hover:bg-alizarin" href="/system">
        সিস্টেম ব্লুপ্রিন্ট দেখুন →
      </Link>
    </Section>
  );
}

function Section({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 md:px-8">
      <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">▚ {kicker}</p>
      <h1 className="mt-2 font-serif-bn text-[40px] font-black text-ink md:text-[52px]">{title}</h1>
      <div className="mt-8 space-y-5 text-[15px] leading-[1.8] text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_strong]:font-bold">
        {children}
      </div>
    </section>
  );
}