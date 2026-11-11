import Link from "next/link";
import { RecoveryForm } from "@/components/auth/RecoveryForm";

export const metadata = { title: "অ্যাডমিন কোড পুনরুদ্ধার" };

export default function AdminForgotPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm border-2 border-ink bg-paper p-8 shadow-[12px_12px_0_0_#0a0c10]">
        <Link href="/admin/login" className="font-mono-x text-[10px] tracking-[0.2em] text-alizarin uppercase hover:underline">
          ← লগইন
        </Link>
        <h1 className="mt-3 font-serif-bn text-[26px] leading-none font-black text-ink">কোড পুনরুদ্ধার</h1>
        <p className="mb-6 mt-2 text-[12px] leading-relaxed text-ink-soft">
          অ্যাডমিন অ্যাকাউন্টের ইমেইল দিন — লগইন কোড ইমেইলে পাঠানো হবে। ডেস্ক অ্যাপ খোলা না থাকলেও কাজ করবে।
        </p>
        <RecoveryForm kind="admin" />
      </div>
    </main>
  );
}
