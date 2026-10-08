import type { Metadata } from "next";
import Link from "next/link";
import { PageSection } from "@/components/PageSection";
import { listCategories } from "@hoichoi/db";
import { BRAND } from "@/lib/brand";
import { toBn } from "@/lib/format";

export const metadata: Metadata = { title: "আমাদের সম্পর্কে" };

export const revalidate = 300;

export default async function AboutPage() {
  // Categories are DB-owned: adding or renaming one in /admin/categories must
  // flow straight into this page instead of leaving a stale hardcoded trio.
  const categories = await listCategories().catch(() => []);
  const active = categories.filter((c) => c.slug);

  return (
    <PageSection kicker="ABOUT THE DESK" title="আমাদের সম্পর্কে">
      <img
        src="/logo.png"
        alt=""
        className="h-16 w-16 rounded-full object-cover ring-2 ring-alizarin/30"
      />
      <p>
        {BRAND.bn} — একটি <strong>স্বয়ংক্রিয় সংবাদ কিউরেশন ডেস্ক</strong>। ফেসবুকের অনুমোদিত পেজ ও
        গ্রুপ, অনলাইন সংবাদপত্র, ম্যাগাজিন এবং এক্স/টুইটার সূত্র থেকে গল্প সংগ্রহ করে সেগুলো সম্পাদকীয়
        সংবাদ আকারে বাংলায় সাজিয়ে প্রকাশ করা হয়, তারপর নির্দিষ্ট জানালা শেষ হলে সরিয়ে ফেলা হয়।
        আমাদের ট্যাগলাইন — <em>“{BRAND.tagline}”</em>।
      </p>
      <p>
        প্রতিটি রানে নির্ধারিত সূত্রের তালিকা থেকে কনটেন্ট সংগ্রহ করা হয়, হ্যাশ ও এম্বেডিং
        ফিঙ্গারপ্রিন্টে ডুপ্লিকেট ঠেকানো হয়, এবং কেবল অনুমোদিত AI প্রোভাইডারে বাংলা সম্পাদকীয়
        শৈলীতে পুনর্লিখন করা হয়। বর্তমানে সাইটে{" "}
        <strong>{toBn(active.length)}টি</strong> বিভাগ সক্রিয়:
      </p>
      {active.length > 0 ? (
        <ul>
          {active.map((cat) => (
            <li key={cat.slug}>
              <Link className="font-bold text-alizarin hover:underline" href={`/category/${cat.slug}`}>
                {cat.displayNameBn || cat.displayNameEn || cat.slug}
              </Link>
              {cat.descriptionBn ? ` — ${cat.descriptionBn}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p>বিভাগের তালিকা এখনো প্রকাশিত হয়নি — অ্যাডমিন কনসোল থেকে যোগ করুন।</p>
      )}
      <h2>সাইটের কাঠামো</h2>
      <ul>
        <li>
          <strong>সূত্রসমূহ</strong> — প্রতিটি সূত্রের একটি ধরন থাকে (ফেসবুক পেজ/গ্রুপ, সংবাদ,
          ম্যাগাজিন, সামাজিক) ও একটি বিভাগ; অ্যাডমিন অনুমোদন দিলেই তালিকায় যুক্ত হয়।
        </li>
        <li>
          <strong>সংগ্রহ → ডেডুপ → পুনর্লিখন → মান-গেট</strong> — কেবল পাস করা কনটেন্ট কিউতে ওঠে, তারপর
          প্রকাশ পায়।
        </li>
        <li>
          <strong>আর্কাইভ জানালা</strong> — সম্পূর্ণ প্রতিবেদন আর্কাইভ পাতায় থাকে; নির্দিষ্ট সময় পরে
          স্থায়ীভাবে মুছে ফেলা হয়।
        </li>
      </ul>
      <p>
        যেকোনো পোস্ট তার প্রকাশের জানালা শেষ হলে স্বয়ংক্রিয়ভাবে আর্কাইভে চলে যায় এবং নির্ধারিত সময় পর
        স্থায়ীভাবে মুছে যায় — এটাই আমাদের স্বচ্ছতার অঙ্গীকার।
      </p>
      <Link className="mt-4 inline-block border border-ink bg-ink px-5 py-2.5 text-[13px] font-bold text-paper hover:bg-alizarin" href="/system">
        সিস্টেম ব্লুপ্রিন্ট দেখুন →
      </Link>
    </PageSection>
  );
}
