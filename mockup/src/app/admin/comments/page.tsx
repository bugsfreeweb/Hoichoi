import Link from "next/link";
import { ArrowLeft, MessageSquare, LayoutDashboard, AppWindow, ShieldCheck, ArrowUpRight, Newspaper, Flag } from "lucide-react";
import ModerationPanel from "@/components/admin/moderation-panel";
import { ensureReady } from "@/lib/db-bootstrap";
import Logo from "@/components/logo";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "মন্তব্য মডারেশন — হৈচৈ অ্যাডমিন" };
export default async function CommentsAdmin() {
  await ensureReady();
  return <main className="min-h-screen bg-night px-4 py-8 text-paper md:px-6">
    <div className="mx-auto flex max-w-[1500px] items-start gap-6">
      <aside className="sticky top-16 hidden w-56 shrink-0 rounded-2xl border border-white/10 bg-panel p-4 lg:block">
        <div className="border-b border-white/10 px-2 pb-6 pt-2"><Logo href="/admin" invert size="md" /><p className="mt-3 font-mono-x text-[9px] tracking-widest text-white/40">EDITORIAL WORKSPACE</p></div>
        <nav className="my-5 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/60 hover:bg-white/5"><LayoutDashboard size={15} />ড্যাশবোর্ড</Link>
          <Link href="/admin/comments" aria-current="page" className="flex items-center gap-3 rounded-lg bg-lime px-3 py-3 text-sm font-semibold text-night"><MessageSquare size={15} />মন্তব্য মডারেশন</Link>
          <Link href="/admin/reports" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/60 hover:bg-white/5"><Flag size={15} />পাঠক রিপোর্ট</Link>
          <Link href="/desk" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/60 hover:bg-white/5"><AppWindow size={15} />ডেস্কটপ অ্যাপ</Link>
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/60 hover:bg-white/5"><Newspaper size={15} />পাবলিক সাইট<ArrowUpRight size={12} className="ml-auto" /></Link>
        </nav>
        <div className="rounded-xl border border-white/10 p-4"><ShieldCheck size={18} className="text-lime" /><p className="mt-3 text-xs leading-6 text-white/45">ওয়েব ও ডেস্কটপে একই রিভিউ সারি। অনুমোদিত মন্তব্যই পাঠকের কাছে দৃশ্যমান।</p></div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mb-5 flex items-center justify-between"><Link href="/admin" className="flex items-center gap-2 text-xs text-white/50 hover:text-white"><ArrowLeft size={13} />ড্যাশবোর্ডে ফিরুন</Link><span className="font-mono-x text-[9px] tracking-wider text-white/35">ADMIN / COMMUNITY</span></div>
        <ModerationPanel />
      </div>
    </div>
  </main>;
}
