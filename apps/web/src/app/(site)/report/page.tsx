import type { Metadata } from "next";
import { ReportSlugForm } from "@/components/ReportSlugForm";

export const metadata: Metadata = {
  title: "কনটেন্ট রিপোর্ট করুন",
  description: "ভুল তথ্য, অসম্পূর্ণতা বা অনুপযুক্ত বিষয়বস্তু রিপোর্ট করুন।",
};

export default function ReportPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 md:px-8">
      <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">▚ REPORT CONTENT</p>
      <h1 className="mt-2 font-serif-bn text-[40px] font-black text-ink md:text-[52px]">কনটেন্ট রিপোর্ট করুন</h1>
      <p className="mt-4 text-[14.5px] leading-relaxed text-ink-soft">
        পোস্টের slug (নিচের অংশ) জানা থাকলে এখানে সরাসরি রিপোর্ট করুন। রিপোর্টগুলো removal_requests কিউতে
        জমা হয় এবং মডারেটর রিভিউ করেন।
      </p>
      <div className="mt-8 border-2 border-ink p-6 md:p-8">
        <ReportSlugForm />
      </div>
    </section>
  );
}