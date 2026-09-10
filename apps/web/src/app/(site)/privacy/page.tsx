import type { Metadata } from "next";
import { PageSection } from "@/components/PageSection";

export const metadata: Metadata = { title: "গোপনীয়তা নীতি" };

export default function PrivacyPage() {
  return (
    <PageSection kicker="PRIVACY · BD GDPR STYLE" title="গোপনীয়তা নীতি">
      <p>
        হৈচৈ। সর্বনিম্ন-ডেটা নীতিতে পরিচালিত হয়। আমরা সংবাদ সংগ্রহ, প্রকাশ ও আর্কাইভই প্রধানত করি —
        পাঠকদের ব্যক্তিগত তথ্য সংগ্রহ করা আমাদের কাজ নয়।
      </p>
      <h2>আমরা যা সংগ্রহ করি</h2>
      <ul>
        <li><strong>সাবমিশন ফর্ম</strong> — আপনি স্বেচ্ছায় যে পেজ-প্রস্তাব ও ইমেইল দেন, তা শুধু প্রস্তাব যাচাইয়ে ব্যবহৃত হয়।</li>
        <li><strong>রিপোর্ট</strong> — সমস্যা রিপোর্টে আপনার ইমেইল থাকলে তা শুধু উত্তর দিতে ব্যবহৃত হয়।</li>
        <li><strong>সার্ভার লগ</strong> — নিরাপত্তার জন্য অস্থায়ী লগ রাখা হয় (৭ দিন)।</li>
      </ul>
      <h2>আমরা যা সংগ্রহ করি না</h2>
      <ul>
        <li>অ্যাড-ট্র্যাকার, ক্রস-সাইট ট্র্যাকিং বা behavioral প্রোফাইলিং নেই।</li>
        <li>নিউজ-পাঠের অভ্যাস বিক্রি বা শেয়ার করা হয় না।</li>
        <li>কুকি ব্যবহার কেবল অ্যাডমিন সেশনের জন্য (HttpOnly)।</li>
      </ul>
      <h2>তথ্য সুরক্ষা</h2>
      <p>
        টার্সো ডেটাবেসে সংকুচিত (libSQL) — API কী Stronghold/পরিবেশভেদে সংরক্ষিত, কখনো ডেটাবেসে লেখা হয় না।
        আর্কাইভ মেয়াদ শেষে কনটেন্ট স্থায়ীভাবে মুছে যায় (retention policy)।
      </p>
      <h2>আপনার অধিকার</h2>
      <p>
        যেকোনো কনটেন্ট অপসারণ/সংশোধনের অনুরোধ জানাতে <a className="font-bold text-alizarin" href="/contact">যোগাযোগ</a> পেজ ব্যবহার করুন।
      </p>
    </PageSection>
  );
}