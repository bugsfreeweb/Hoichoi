import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "অ্যাডমিন লগইন" };

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm border-2 border-ink bg-paper p-8 shadow-[12px_12px_0_0_#0a0c10]">
        <p className="font-mono-x text-[10px] tracking-[0.26em] text-alizarin uppercase">▚ ADMIN GATEWAY</p>
        <h1 className="mt-2 font-serif-bn text-[28px] font-black text-ink">
          হৈচৈ। <span className="text-alizarin">কনসোল</span>
        </h1>
        <p className="mt-2 text-[13px] text-ink-soft">অ্যাডমিন সেশনে প্রবেশ করুন।</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}