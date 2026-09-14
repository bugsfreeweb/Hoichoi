import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "অ্যাডমিন লগইন" };

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm border-2 border-ink bg-paper p-8 shadow-[12px_12px_0_0_#0a0c10]">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-alizarin/30" />
          <div>
            <p className="font-mono-x text-[10px] tracking-[0.26em] text-alizarin uppercase">▚ ADMIN GATEWAY</p>
            <h1 className="mt-0.5 font-serif-bn text-[28px] leading-none font-black text-ink">
              হৈচৈ। <span className="text-alizarin">কনসোল</span>
            </h1>
          </div>
        </div>
        <p className="mt-2 text-[13px] text-ink-soft">অ্যাডমিন সেশনে প্রবেশ করুন।</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}