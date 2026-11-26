import type { Metadata } from "next";
import { ReportSlugForm } from "@/components/ReportSlugForm";
import { serverBi } from "@/lib/bi-server";

export const metadata: Metadata = {
  title: "কনটেন্ট রিপোর্ট করুন",
  description: "ভুল তথ্য, অসম্পূর্ণতা বা অনুপযুক্ত বিষয়বস্তু রিপোর্ট করুন।",
};

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const { b } = await serverBi(sp);
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 md:px-8">
      <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">
        ▚ REPORT CONTENT
      </p>
      <h1 className="bnfont-page-title mt-2 font-serif-bn text-[40px] font-black text-ink md:text-[52px]">
        {b("কনটেন্ট রিপোর্ট করুন", "Report content")}
      </h1>
      <p className="mt-4 text-[14.5px] leading-relaxed text-ink-soft">
        {b(
          "পোস্টের slug (নিচের অংশ) জানা থাকলে এখানে সরাসরি রিপোর্ট করুন। রিপোর্টগুলো removal_requests কিউতে জমা হয় এবং মডারেটর রিভিউ করেন।",
          "If you know the post slug (the last part of its URL), report it here. Reports enter the removal_requests queue for a moderator to review.",
        )}
      </p>
      <div className="mt-8 border-2 border-ink p-6 md:p-8">
        <ReportSlugForm />
      </div>
    </section>
  );
}
