import type { Metadata } from "next";
import Link from "next/link";
import { PageSection } from "@/components/PageSection";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "সম্পাদকীয় নীতি" };

/**
 * Editorial policy — public, and the page the rest of the code must agree with.
 *
 * It states the aggregation rule the pipeline now enforces (`source-overlap.ts`):
 * summarise in our own words, quote briefly, always link the source. If that
 * changes in code, this page changes with it.
 */
export default function EditorialPolicyPage() {
  return (
    <PageSection kicker="EDITORIAL POLICY" title="সম্পাদকীয় নীতি">
      <p>
        {BRAND.bn} একটি সংবাদ-কিউরেশন ডেস্ক। আমরা অন্য প্রতিষ্ঠানের প্রতিবেদন হুবহু প্রকাশ করি না;
        সংক্ষেপে নিজের ভাষায় লিখি, সামান্য অংশ উদ্ধৃতি দিই, আর মূল সূত্রে লিঙ্ক রাখি — যাতে পাঠক
        নিজেই যাচাই করতে পারেন।
      </p>

      <h2>আমরা কী করি</h2>
      <ul>
        <li>প্রতিটি প্রতিবেদনের নিচে মূল সূত্রের নাম ও লিঙ্ক থাকে।</li>
        <li>প্রতিবেদন নিজের ভাষায় সংক্ষেপে লেখা হয়; উদ্ধৃতি ছোট রাখা হয়।</li>
        <li>
          সূত্রের সঙ্গে ৩৫ শব্দের বেশি হুবহু মিল থাকলে পোস্টটি স্বয়ংক্রিয়ভাবে প্রকাশ না হয়ে
          <strong> মানুষ-পর্যালোচনার কিউতে</strong> যায়।
        </li>
        <li>শিরোনাম, সারসংক্ষেপ ও মূল লেখক — যেখানে পাওয়া যায় — উল্লেখ করা হয়।</li>
      </ul>

      <h2>আমরা কী করি না</h2>
      <ul>
        <li>অন্য কারও সম্পূর্ণ প্রতিবেদন আমাদের নিজের লেখা বলে প্রকাশ করি না।</li>
        <li>কোনও ব্যক্তির বিরুদ্ধে প্রমাণ ছাড়া অভিযোগকে তথ্য হিসেবে উপস্থাপন করি না।</li>
        <li>শিশু বা নির্যাতনের শিকার ব্যক্তির পরিচয় প্রকাশ করি না।</li>
        <li>“ফ্যাক্ট-চেকড” ধরণের সিল দিই না — যাচাইয়ের রেকর্ড থাকলে তার ধরন আলাদা করে লেখা হয়।</li>
      </ul>

      <h2>যাচাই কীভাবে দেখানো হয়</h2>
      <p>
        কোনও প্রতিবেদনে যাচাই-লেবেল থাকলে সেটি রেকর্ড থেকে আসে — যেমন <strong>একাধিক সূত্র</strong>{" "}
        (দুই বা তার বেশি স্বতন্ত্র সূত্র মিলে গেছে), <strong>সম্পাদক যাচাইকৃত</strong> (নামযুক্ত সম্পাদক
        দেখেছেন) বা <strong>সংশোধিত</strong> (প্রকাশের পর সংশোধন হয়েছে)। একটি সূত্র থাকলে “একাধিক সূত্র”
        কখনও দেখানো হয় না।
      </p>

      <h2>সংশোধন</h2>
      <p>
        ভুল ধরা পড়লে সংশোধনের ইতিহাস রাখা হয় — কোন লেখা, কী বদলেছে, কেন। বিস্তারিত{" "}
        <Link className="font-bold text-alizarin underline" href="/about/corrections">
          সংশোধন নীতি
        </Link>{" "}
        পৃষ্ঠায়।
      </p>

      <h2>এআই কীভাবে ব্যবহার হয়</h2>
      <p>
        পুনর্লিখনের খসড়া এআই তৈরি করে, কিন্তু প্রকাশের আগে নিয়ম-ভিত্তিক গেট (দৈর্ঘ্য, অনুলিপি,
        ঝুঁকি) পেরোতে হয়। বিস্তারিত{" "}
        <Link className="font-bold text-alizarin underline" href="/about/ai">
          এআই ব্যবহার নীতি
        </Link>{" "}
        পৃষ্ঠায়।
      </p>
    </PageSection>
  );
}
