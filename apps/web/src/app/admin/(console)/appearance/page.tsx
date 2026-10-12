import { listSections, getSiteVariant } from "@hoichoi/db";
import { VariantSwitcher } from "@/components/admin/VariantSwitcher";

export const dynamic = "force-dynamic";

export default async function AdminAppearancePage() {
  const [sections, siteVariant] = await Promise.all([listSections(), getSiteVariant()]);

  return (
    <div>
      <header>
        <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">
          🎨 SECTION VARIANT ENGINE
        </p>
        <h1 className="mt-1 font-serif-bn text-[34px] font-black text-ink">ডিজাইন ভ্যারিয়েন্ট</h1>
      </header>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
        প্রতিটি সেকশনের আলাদা নকশা বাছাই করার সুবিধা। এই সংস্করণে শুধু বর্তমান নকশা (ডিফল্ট)
        চালু আছে; বাকি ভ্যারিয়েন্টগুলো পরে যোগ করা হবে।
      </p>
      <div className="mt-6 max-w-3xl">
        <VariantSwitcher initialSections={sections} initialSiteVariant={siteVariant} />
      </div>
    </div>
  );
}
