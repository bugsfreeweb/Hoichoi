import type { Metadata } from "next";
import Link from "next/link";
import { PageSection } from "@/components/PageSection";

export const metadata: Metadata = { title: "সংশোধন ও সংরক্ষণ নীতি" };

/**
 * Corrections + retention.
 *
 * Retention is the part readers and ad networks actually care about: aggregated
 * stories are windowed and disappear, original editorial does not. That split is
 * made explicit here because the code has two different lifetimes.
 */
export default function CorrectionsPolicyPage() {
  return (
    <PageSection kicker="CORRECTIONS & RETENTION" title="সংশোধন ও সংরক্ষণ নীতি">
      <h2>সংশোধন কীভাবে হয়</h2>
      <ol>
        <li>ভুল ধরা পড়লে লেখাটি সম্পাদনা করা হয় এবং পুরনো লেখা সংশোধন-রেকর্ডে সংরক্ষিত থাকে।</li>
        <li>প্রতিবেদনের উপর <strong>সংশোধিত</strong> লেবেল বসে, যাতে পাঠক বুঝতে পারেন কিছু বদলেছে।</li>
        <li>রেকর্ডে থাকে: কোন অংশ, আগের লেখা, নতুন লেখা, কারণ এবং কে সংশোধন করেছেন।</li>
      </ol>
      <p>
        গুরুতর ভুলের ক্ষেত্রে সংশোধনী আলাদা নোটিশ হিসেবেও প্রকাশ করা হয়। সংশোধন চাইতে আমাদের{" "}
        <Link className="font-bold text-alizarin underline" href="/report">
          ভুল রিপোর্ট
        </Link>{" "}
        ফর্ম ব্যবহার করুন — প্রতিটি রিপোর্ট পর্যালোচনার কিউতে যায়।
      </p>

      <h2>কত দিন সংরক্ষণ থাকে</h2>
      <ul>
        <li>
          <strong>সংগৃহীত/সংক্ষিপ্ত প্রতিবেদন:</strong> নির্দিষ্ট জানালা শেষ হলে সাইট থেকে সরিয়ে ফেলা
          হয়। পুরনো সংবাদ অপরিবর্তিত আকারে অনির্দিষ্টকাল রাখা হয় না।
        </li>
        <li>
          <strong>মৌলিক সম্পাদকীয় লেখা</strong> (নিজস্ব প্রতিবেদন, ব্যাখ্যা, তদন্ত): দীর্ঘ সময় রাখা
          হয়, কারণ এগুলো অনুসন্ধান ও আর্কাইভের জন্য গুরুত্বপূর্ণ।
        </li>
        <li>
          <strong>উদ্ধৃতি/সূত্রের লিঙ্ক:</strong> প্রতিবেদন সরানোর পরও লিঙ্কটি আর্কাইভে থাকতে পারে,
          যাতে পাঠক মূল সূত্র খুঁজে পান।
        </li>
        <li>
          <strong>আইনি কারণ</strong>: কোনও বিষয় তদন্তাধীন বা আইনি নোটিশের অধীনে থাকলে সংশ্লিষ্ট
          প্রতিবেদনে <em>legal hold</em> বসে — তখন স্বয়ংক্রিয় মেয়াদ সেটিতে প্রযোজ্য হয় না।
        </li>
      </ul>

      <h2>অভিযোগ ও অপসারণ</h2>
      <p>
        কোনও ব্যক্তি বা প্রতিষ্ঠান নিজের সম্পর্কে প্রকাশিত তথ্য নিয়ে আপত্তি জানাতে পারেন। আমাদের{" "}
        <Link className="font-bold text-alizarin underline" href="/dmca">
          অপসারণ নীতি
        </Link>{" "}
        অনুযায়ী দাবি যাচাই করে সিদ্ধান্ত নেওয়া হয়, এবং সিদ্ধান্তের কারণ রেকর্ডে থাকে।
      </p>

      <h2>কেন এই নীতি প্রকাশ্য</h2>
      <p>
        পাঠকের আস্থা নিয়মের উপর নির্ভর করে, দাবির উপর নয়। আমরা কী লিখি, কীভাবে যাচাই করি এবং কত দিন
        রাখি — তিনটাই এখানে খোলাখুলি বলা আছে, যাতে আমাদের কাজ যাচাইযোগ্য হয়।
      </p>
    </PageSection>
  );
}
