import Link from "next/link";
import { PortalAuthForm } from "@/components/ads/PortalAuthForm";

export const metadata = { title: "বিজ্ঞাপন ক্লায়েন্ট লগইন" };

export default function AdClientLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12">
      <section className="w-full max-w-md border border-ink/20 bg-paper p-6 shadow-[8px_8px_0_0_var(--color-ink)] md:p-8">
        <Link href="/advertise" className="font-mono-x text-[9px] tracking-[0.18em] text-alizarin uppercase hover:underline">বিজ্ঞাপন · হৈচৈ</Link>
        <h1 className="mt-3 font-serif-bn text-[27px] font-black text-ink">ক্লায়েন্ট লগইন</h1>
        <p className="mb-6 mt-1 text-[12px] text-ink-soft">আপনার বিজ্ঞাপন, বুকিং ও ফলাফল পরিচালনা করুন।</p>
        <PortalAuthForm mode="login" />
      </section>
    </main>
  );
}
