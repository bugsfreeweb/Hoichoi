import type { Metadata } from "next";
import Link from "next/link";
import { PageSection } from "@/components/PageSection";

export const metadata: Metadata = {
  title: "কুকি নীতি",
  description: "হৈচৈ কোন কুকি ব্যবহার করে, কেন করে, কতদিন রাখে এবং কীভাবে সম্মতি প্রত্যাহার করবেন।",
};

/**
 * Standard cookie policy.
 *
 * Content mirrors what the code actually does: one consent cookie, one session
 * cookie per console, a first-party analytics beacon with no third-party
 * trackers. Keep this page in step with `lib/consent.ts` and `/api/track`.
 */
export default function CookiesPage() {
  return (
    <PageSection kicker="COOKIE POLICY · LAST UPDATED 2025" title="কুকি নীতি">
      <p>
        এই নীতিতে বলা হয়েছে হৈচৈ (hoichoifeed.vercel.app) কোন কুকি ও লোকাল স্টোরেজ ব্যবহার করে,
        কেন ব্যবহার করে, কতদিন রাখে এবং আপনি কীভাবে নিয়ন্ত্রণ করবেন। সাইট ব্যবহার চালিয়ে গেলে
        আপনি এই নীতির সঙ্গে সম্মত হচ্ছেন; নিচের বন্ধনী দেখে যেকোনো সময় পছন্দ বদলাতে পারবেন।
      </p>

      <h2>১. আমরা কোন কুকি ব্যবহার করি</h2>
      <ul>
        <li>
          <strong>hc_consent</strong> (প্রয়োজনীয়) — আপনার কুকি-পছন্দ মনে রাখে। মেয়াদ ৬ মাস।
          SameSite=Lax, HttpOnly নয় (ক্লায়েন্ট ব্যানার এটি পড়ে)।
        </li>
        <li>
          <strong>hoichoi_session</strong> (প্রয়োজনীয়) — শুধুমাত্র অ্যাডমিন কনসোলে লগইন সেশন।
          HttpOnly, Secure, SameSite=Lax; লগআউটে মুছে যায়।
        </li>
        <li>
          <strong>ad_client_session</strong> (প্রয়োজনীয়) — শুধুমাত্র বিজ্ঞাপনদাতা পোর্টালে লগইন
          সেশন। একই বৈশিষ্ট্য।
        </li>
        <li>
          <strong>hoichoi-sid</strong> (বিশ্লেষণ — সম্মতিসাপেক্ষ) — sessionStorage-এ একটি
          র‍্যান্ডম আইডি; শুধু এক ট্যাবে থাকে, ট্যাব বন্ধ হলে মুছে যায়। কুকি নয়।
        </li>
      </ul>

      <h2>২. আমরা যা করি না</h2>
      <ul>
        <li>কোনো তৃতীয় পক্ষের বিজ্ঞাপন-ট্র্যাকার, পিক্সেল বা ক্রস-সাইট প্রোফাইলিং নেই।</li>
        <li>পাঠকের ব্যক্তিগত তথ্য বা পড়ার অভ্যাস বিক্রি বা শেয়ার করা হয় না।</li>
        <li>কনটেন্ট ব্যক্তিগতকরণের জন্য কোনো বিহেভিয়ারাল প্রোফাইল তৈরি হয় না।</li>
      </ul>

      <h2>৩. বিশ্লেষণ ও বিজ্ঞাপন পরিমাপ</h2>
      <p>
        “সব গ্রহণ করুন” বেছে নিলে প্রথম-পক্ষের <code>/api/track</code> বিকেন পাঠানো হয় — পেজ-ভিউ
        ও বিজ্ঞাপন স্লটের impression/click গণনার জন্য। সার্ভার শুধু দৈনিক সংক্ষিপ্ত সংখ্যা রাখে,
        ব্যক্তিগত আইডি নয়। “শুধু প্রয়োজনীয়” বেছে নিলে এই বিকেন পাঠানো হয় না; সাইট সম্পূর্ণ
        স্বাভাবিকভাবে কাজ করে।
      </p>

      <h2>৪. আপনার নিয়ন্ত্রণ</h2>
      <ul>
        <li>
          যেকোনো সময় পছন্দ বদলাতে ব্রাউজারে <strong>hc_consent</strong> কুকি ও{" "}
          <strong>hc-consent</strong> লোকাল স্টোরেজ মুছে দিন — ব্যানারটি আবার দেখা যাবে।
        </li>
        <li>
          ব্রাউজার সেটিংস থেকে সব কুকি ব্লক করলে অ্যাডমিন/বিজ্ঞাপনদাতা কনসোলে লগইন কাজ করবে না;
          সাধারণ পাঠে কোনো প্রভাব পড়বে না।
        </li>
        <li>
          অপসারণ বা সংশোধনের অনুরোধ জানাতে <Link className="font-bold text-alizarin" href="/contact">যোগাযোগ</Link>{" "}
          পেজ ব্যবহার করুন।
        </li>
      </ul>

      <h2>৫. সংশ্লিষ্ট নথি</h2>
      <ul>
        <li><Link className="font-bold text-alizarin" href="/privacy">গোপনীয়তা নীতি</Link></li>
        <li><Link className="font-bold text-alizarin" href="/terms">ব্যবহারের শর্তাবলি</Link></li>
      </ul>
    </PageSection>
  );
}
