"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminAction } from "@/lib/admin-api";

/**
 * Second factor, managed by the account that owns it.
 *
 * Three states, three screens: off (with the option to turn it on), enrolling
 * (secret shown once + a live code to prove the app is set up), and on (with a
 * ten-character recovery code stash that is shown exactly once). Every action
 * targets the caller's own account — there is intentionally no email field.
 */
export function MfaPanel() {
  const [state, setState] = useState<{
    enabled: boolean;
    confirmedAt: string | null;
    recoveryCodesRemaining: number;
  } | null>(null);

  const [enrolling, setEnrolling] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const action = useAdminAction();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/mfa", { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { enabled: boolean; confirmedAt: string | null; recoveryCodesRemaining: number };
      setState({ enabled: json.enabled, confirmedAt: json.confirmedAt, recoveryCodesRemaining: json.recoveryCodesRemaining });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function begin(): Promise<void> {
    setError(null);
    const res = await action<{ ok?: boolean; secret?: string; uri?: string; error?: string }>({
      path: "/api/admin/mfa",
      busy: "দুই-ধাপ যাচাইয়ের সেটআপ শুরু হচ্ছে…",
      init: { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "begin" }) },
      success: "সেটআপ শুরু হয়েছে",
      detail: "সিক্রেটটি একবারই দেখানো হচ্ছে — এখনই অ্যাপে দিন।",
    });
    if (res?.secret && res.uri) setEnrolling({ secret: res.secret, uri: res.uri });
  }

  async function confirm(): Promise<void> {
    setError(null);
    const res = await action<{ ok?: boolean; recoveryCodes?: string[]; error?: string }>({
      path: "/api/admin/mfa",
      busy: "কোড যাচাই হচ্ছে…",
      init: { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "confirm", code }) },
      success: "দুই-ধাপ যাচাই চালু হয়েছে",
      detail: "রিকভারি কোডগুলো নিচে — একবার দেখানো হয়, পরে দেখা যাবে না।",
    });
    if (res?.recoveryCodes) {
      setRecoveryCodes(res.recoveryCodes);
      setEnrolling(null);
      setCode("");
    }
    void refresh();
  }

  async function disable(): Promise<void> {
    setError(null);
    if (code.trim() === "") {
      setError("বন্ধ করতে একটি বর্তমান কোড দিন।");
      return;
    }
    const res = await action<{ ok?: boolean; error?: string }>({
      path: "/api/admin/mfa",
      busy: "দুই-ধাপ যাচাই বন্ধ হচ্ছে…",
      init: { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "disable", code }) },
      success: "দুই-ধাপ যাচাই বন্ধ হয়েছে",
    });
    if (res) {
      setCode("");
      void refresh();
    }
  }

  return (
    <div className="border border-ink/20 bg-paper-deep p-4">
      <p className="font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">2FA · Authenticator app</p>

      {state?.enabled ? (
        <div className="mt-3">
          <p className="font-sans-bn text-[15px] font-bold text-ink">দুই-ধাপ যাচাই চালু আছে ✓</p>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            লগইনে এখন কোড লাগবেই। {state.confirmedAt ? `চালু হয়েছে ${new Date(state.confirmedAt).toLocaleString("bn-BD")}` : ""}
            {state.recoveryCodesRemaining > 0
              ? ` · ${state.recoveryCodesRemaining}টি রিকভারি কোড বাকি`
              : " · কোনো রিকভারি কোড বাকি নেই"}
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="font-mono-x text-[10px] tracking-[0.16em] text-ink-soft uppercase">বর্তমান কোড</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={8}
                className="mt-1 w-40 border border-ink/25 bg-paper px-3 py-2 font-mono-x text-[14px] tracking-[0.2em] text-ink"
                aria-label="দুই-ধাপ কোড"
              />
            </label>
            <button
              type="button"
              onClick={() => void disable()}
              className="border border-alizarin px-3 py-2 text-[12px] font-bold text-alizarin transition hover:bg-alizarin hover:text-on-accent disabled:opacity-40"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      ) : enrolling ? (
        <div className="mt-3">
          <p className="font-sans-bn text-[15px] font-bold text-ink">অথেন্টিকেটর অ্যাপে যোগ করুন</p>
          <p className="mt-1 text-[12px] text-ink-soft">
            Google Authenticator বা সমতুল্য অ্যাপে নিচের কোডটি দিন (QR স্ক্যান করার বিকল্প — অ্যাপটি otpauth:// লিংক
            স্ক্যান করতে পারে)। সিক্রেটটি কেবল এবারই দেখানো হবে।
          </p>
          <p className="mt-3 select-all break-all border border-ink/25 bg-paper px-3 py-2 font-mono-x text-[13px] text-ink">
            {enrolling.secret}
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-[12px] font-bold text-ink-soft hover:text-ink">otpauth লিংক</summary>
            <p className="mt-1 select-all break-all font-mono-x text-[11px] text-ink-soft">{enrolling.uri}</p>
          </details>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="font-mono-x text-[10px] tracking-[0.16em] text-ink-soft uppercase">অ্যাপ থেকে ৬ অক্ষরের কোড</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={8}
                className="mt-1 w-40 border border-ink/25 bg-paper px-3 py-2 font-mono-x text-[14px] tracking-[0.2em] text-ink"
                aria-label="নিশ্চিতকরণ কোড"
              />
            </label>
            <button
              type="button"
              disabled={code.trim().length < 6}
              onClick={() => void confirm()}
              className="border border-ink/40 px-3 py-2 text-[12px] font-bold text-ink transition hover:bg-lime disabled:opacity-40"
            >
              নিশ্চিত করুন
            </button>
            <button
              type="button"
              onClick={() => setEnrolling(null)}
              className="px-3 py-2 text-[12px] font-bold text-ink-soft hover:text-ink"
            >
              বাতিল
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p className="font-sans-bn text-[15px] font-bold text-ink">দুই-ধাপ যাচাই বন্ধ</p>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            চালু করলে লগইনে এক-বারের কোডের পাশে অ্যাপের ৬ অক্ষরের কোডও লাগবে। কনসোলে যত বেশি ক্ষমতা, তার
            সুরক্ষাও তত বেশি হওয়া উচিত।
          </p>
          <button
            type="button"
            onClick={() => void begin()}
            className="mt-3 border border-ink/40 px-4 py-2 text-[12.5px] font-bold text-ink transition hover:bg-lime"
          >
            চালু করুন
          </button>
        </div>
      )}

      {recoveryCodes && (
        <div className="mt-4 border border-amberx/40 bg-amberx/10 p-3">
          <p className="font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">রিকভারি কোড — একবারই</p>
          <p className="mt-1 text-[12px] text-ink-soft">
            ফোন হারালে এই কোডগুলো দিয়ে ঢুকতে পারবেন। এগুলো আর কোথাও দেখা যাবে না — এখনই কোথাও লিখে রাখুন।
          </p>
          <pre className="mt-2 grid grid-cols-2 gap-1 font-mono-x text-[12px] text-ink sm:grid-cols-4">
            {recoveryCodes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </pre>
          <button
            type="button"
            onClick={() => setRecoveryCodes(null)}
            className="mt-2 text-[12px] font-bold text-alizarin underline underline-offset-2 hover:text-ink"
          >
            বুঝেছি, মুছে দিন
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 border border-alizarin bg-alizarin/10 px-3 py-2 text-[12px] font-bold text-ink">
          ✕ {error}
        </p>
      )}
    </div>
  );
}