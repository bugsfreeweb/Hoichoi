import type { Metadata } from "next";
import { SubmitSourceForm } from "@/components/SubmitSourceForm";
import { serverBi } from "@/lib/bi-server";

export const metadata: Metadata = {
  title: "পেজ প্রস্তাব করুন",
  description: "একটি ফেসবুক পেজ বা গ্রুপ হৈচৈ-এর সোর্স হিসেবে প্রস্তাব করুন।",
};

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const { b } = await serverBi(sp);
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 md:px-8">
      <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">
        ▚ SUBMIT A PAGE · ২ মিনিট
      </p>
      <h1 className="mt-2 font-serif-bn text-[40px] font-black text-ink md:text-[52px]">
        {b("পেজ প্রস্তাব করুন", "Suggest a page")}
      </h1>
      <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-ink-soft">
        {b(
          "আপনি কোনো নিউজ পেজ, নাগরিক-প্রতিবেদন পেজ বা কমিউনিটি গ্রুপ চেনেন যা ভাইরাল বাংলা সংবাদের উৎস? নিচের ফর্মে পাঠিয়ে দিন — আমাদের ডেস্ক যাচাই করে তালিকায় যোগ করবে। ব্যক্তিগত প্রোফাইল বাদে পেজ ও গ্রুপ গ্রহণযোগ্য।",
          "Do you know a news page, citizen-reporting page or community group that is a source of viral Bangla news? Send it below; our desk will verify it and add it to the list. Pages and groups are accepted, personal profiles are not.",
        )}
      </p>
      <div className="mt-10 border-2 border-ink p-6 md:p-8">
        <SubmitSourceForm />
      </div>
    </section>
  );
}
