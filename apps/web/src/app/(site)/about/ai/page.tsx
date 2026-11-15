import type { Metadata } from "next";
import Link from "next/link";
import { PageSection } from "@/components/PageSection";

export const metadata: Metadata = { title: "এআই ব্যবহার নীতি" };

/**
 * AI policy — describes what the pipeline actually does, not an aspiration.
 *
 * Every claim here is checkable in code: the rewrite path (`packages/llm`), the
 * rules gate (`pipeline.ts`), the republication check (`source-overlap.ts`) and
 * the consent/redaction rules for sensitive categories.
 */
export default function AiPolicyPage() {
  return (
    <PageSection kicker="AI POLICY" title="এআই ব্যবহার নীতি">
      <p>
        আমরা এআই ব্যবহার করি <strong>খসড়া লেখার জন্য</strong>, সিদ্ধান্ত নেওয়ার জন্য নয়। এআই-এর
        লেখা সরাসরি প্রকাশ পায় না — নিয়ম-ভিত্তিক গেট পেরোতে হয়, আর ঝুঁকিপূর্ণ বা অস্পষ্ট ক্ষেত্রে
        মানুষ দেখে।
      </p>

      <h2>এআই কী করে</h2>
      <ul>
        <li>সূত্রের লেখা থেকে বাংলায় সংক্ষিপ্ত ও নিরপেক্ষ প্রতিবেদনের খসড়া তৈরি করে।</li>
        <li>বিভাগ ঠিক করার সময় কীওয়ার্ড-ভিত্তিক শ্রেণিবিন্যাস করে, যা মানুষের সম্পাদনাযোগ্য।</li>
        <li>কিছু ক্ষেত্রে প্রতীকী ছবি তৈরি করে; ছবিটি এআই-তৈরি বলে চিহ্নিত থাকে।</li>
      </ul>

      <h2>এআই কী করে না</h2>
      <ul>
        <li>নিজে থেকে প্রকাশ করে না — প্রতিটি রান নির্দিষ্ট নিয়ম পেরোয়।</li>
        <li>সূত্রে না থাকা তথ্য, নাম, তারিখ বা উদ্ধৃতি যোগ করে না (প্রম্পটে নিষিদ্ধ)।</li>
        <li>অন্য প্রতিবেদনের অনুচ্ছেদ হুবহু তুলে নেয় না — ৩৫ শব্দের বেশি মিল ধরা পড়লে পোস্ট হোল্ড হয়।</li>
        <li>শিশু নির্যাতন বা সংবেদনশীল ঘটনার ক্ষেত্রে পরিচয়পূর্ণ তথ্য লিখে না: সেগুলো নিয়মে বাধ্যতামূলকভাবে বাদ যায়।</li>
      </ul>

      <h2>কোথায় মানুষ থাকে</h2>
      <ul>
        <li>শ্রেণিবিন্যাসের আস্থা কম হলে পোস্ট কিউতে অপেক্ষা করে।</li>
        <li>ঝুঁকি-মূল্যায়ন সম্পাদকীয় হস্তক্ষেপ চাইলে একইভাবে হোল্ড হয়।</li>
        <li>সংশোধন ও যাচাইয়ের গ্রেড মানুষ (নামযুক্ত সম্পাদক) সেট করেন — সিস্টেম তা অনুমান করে না।</li>
      </ul>

      <h2>স্বচ্ছতা</h2>
      <p>
        কোনও প্রতিবেদনে যাচাই-লেবেল থাকলে সেটি রেকর্ডভিত্তিক; লেবেলের ধরন দেখেই বোঝা যায় কী করা
        হয়েছে। আমাদের সম্পাদকীয় নীতি{" "}
        <Link className="font-bold text-alizarin underline" href="/about/editorial">
          এখানে
        </Link>
        , আর সংশোধনের নীতি{" "}
        <Link className="font-bold text-alizarin underline" href="/about/corrections">
          এখানে
        </Link>
        ।
      </p>
    </PageSection>
  );
}
