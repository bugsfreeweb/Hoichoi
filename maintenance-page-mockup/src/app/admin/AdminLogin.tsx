"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { DEFAULT_PASSWORD } from "@/lib/types";

export function AdminLogin() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="font-sans-bn relative grid min-h-[100dvh] place-items-center overflow-hidden bg-[#050608] px-6">
      <div className="hoi-night-grid absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0 animate-gradient opacity-70"
        style={{
          background:
            "radial-gradient(45% 40% at 18% 20%, rgba(210,32,44,0.4), transparent 62%), radial-gradient(40% 40% at 82% 24%, rgba(200,246,93,0.16), transparent 60%)",
          backgroundSize: "180% 180%",
        }}
      />

      {/* Tauri desk window */}
      <div className="hoi-tauri mc-reveal relative w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#0c1017]">
        <div className="flex h-10 items-center gap-2 border-b border-white/8 bg-[#12161e] px-3">
          <span className="hoi-traffic bg-[#ff5f57]" />
          <span className="hoi-traffic bg-[#febc2e]" />
          <span className="hoi-traffic bg-[#28c840]" />
          <span className="font-serif-bn mx-auto text-[13px] font-bold text-white/90">হৈচৈ ডেস্ক</span>
          <span className="font-mono-x rounded bg-white/8 px-2 py-0.5 text-[9px] text-white/50">TAURI WEB VIEW</span>
        </div>

        <div className="p-7">
          <div className="flex items-center gap-3">
            <span className="font-serif-bn grid h-12 w-12 place-items-center rounded-full border-[1.5px] border-[#c8f65d] bg-[#d2202c] text-[22px] font-black text-white">
              হ
            </span>
            <div>
              <h1 className="font-serif-bn text-xl font-extrabold text-[#f3eee1]">হৈচৈ ডেস্ক</h1>
              <p className="font-mono-x mt-0.5 text-[9.5px] tracking-[0.24em] text-[#c8f65d]/70 uppercase">
                Maintenance control room
              </p>
            </div>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-white/55">
            ডিজাইন, কপি, কাউন্টডাউন, ইফেক্ট বদলান আর নিউজলেটার সাইন-আপ পড়ুন — সব এক ডেস্ক থেকে।
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <div className="relative">
              <Lock size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-white/40" />
              <input
                autoFocus
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="অ্যাডমিন পাসওয়ার্ড"
                className="font-sans-bn w-full rounded-lg border border-white/15 bg-black/40 py-3 pr-4 pl-11 text-sm text-[#f3eee1] outline-none transition placeholder:text-white/35 focus:border-[#c8f65d]/60"
              />
            </div>
            {err && <p className="text-xs text-[#ff6b6b]">{err}</p>}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#d2202c] py-3 text-sm font-bold text-white transition hover:bg-[#a3121d] disabled:opacity-70"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              ডেস্কে প্রবেশ করুন
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-white/45">
            <span className="font-mono-x">demo: {DEFAULT_PASSWORD}</span>
            <Link href="/" className="inline-flex items-center gap-1.5 transition hover:text-white">
              <ArrowLeft size={13} /> প্রথম পাতা
            </Link>
          </div>
        </div>
        <div className="font-mono-x border-t border-white/8 bg-black/40 px-4 py-2 text-center text-[9px] tracking-[0.24em] text-white/35">
          FEED → SHOT → HASH → LLM → GIT → DEPLOY
        </div>
      </div>
    </main>
  );
}
