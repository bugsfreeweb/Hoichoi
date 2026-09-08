"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "login failed");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1 w-full border border-ink/30 bg-paper px-3 py-2 text-[14px]";

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">ইমেইল</span>
        <input type="email" required autoFocus className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">পাসওয়ার্ড</span>
        <input
          type="password"
          required
          className={field}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="border border-alizarin bg-alizarin/10 px-3 py-2 text-[13px] font-bold text-ink">⚠ {error}</p>}
      <button disabled={busy} className="border-2 border-ink bg-ink px-5 py-2.5 text-[13.5px] font-bold text-paper transition hover:bg-alizarin disabled:opacity-50">
        {busy ? "প্রবেশ করা হচ্ছে…" : "প্রবেশ করুন →"}
      </button>
      <p className="text-[11px] text-ink-soft/80">
        ডেমো: <code className="bg-paper-deep px-1">admin@hoichoi.local</code> · <code className="bg-paper-deep px-1">demo-admin-2026</code>
      </p>
    </form>
  );
}