import Link from "next/link";
import { RecoveryForm } from "@/components/auth/RecoveryForm";

export const metadata = { title: "পাসওয়ার্ড / লগইন কোড" };

export default function AdClientForgotPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12">
      <section className="w-full max-w-md border border-ink/20 bg-paper p-6 shadow-[8px_8px_0_0_var(--color-ink)] md:p-8">
        <Link href="/portal/login" className="font-mono-x text-[9px] tracking-[0.18em] text-alizarin uppercase hover:underline">
          ← লগইনে ফিরুন
        </Link>
        <h1 className="mt-3 font-serif-bn text-[26px] font-black text-ink">পাসওয়ার্ড ভুলে গেছেন?</h1>
        <p className="mb-6 mt-1 text-[12px] leading-relaxed text-ink-soft">
          অ্যাকাউন্টের ইমেইল দিন — রিসেট লিংক পাঠানো হবে। লিংক ৬০ মিনিট পর্যন্ত কাজ করবে এবং একবারই ব্যবহার করা যাবে।
        </p>
        <RecoveryForm kind="advertiser" />
      </section>
    </main>
  );
}
