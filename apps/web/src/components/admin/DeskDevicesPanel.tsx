"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminAction } from "@/lib/admin-api";

interface DeskDevice {
  id: string;
  email: string;
  label: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

/**
 * Devices that hold a `hdc_` token and may run desk commands on the server.
 *
 * The token appears exactly once, in a highlight box, right after you create a
 * device — the admin console is the only place it can ever be copied from, and
 * a token lost here is not recoverable (only a revoked hash is stored).
 */
export function DeskDevicesPanel() {
  const [devices, setDevices] = useState<DeskDevice[]>([]);
  const [label, setLabel] = useState("");
  const [freshToken, setFreshToken] = useState<{ label: string; token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const action = useAdminAction();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/desk-devices", { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { devices: DeskDevice[] };
      setDevices(json.devices);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function create(): Promise<void> {
    setError(null);
    const res = await action<{ ok?: boolean; token?: string; label?: string; error?: string }>({
      path: "/api/admin/desk-devices",
      busy: "ডিভাইস টোকেন তৈরি হচ্ছে…",
      init: {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", label }),
      },
      success: "ডিভাইস যোগ হয়েছে",
      detail: "টোকেনটি এখনই কপি করুন — পরে আর দেখা যাবে না।",
    });
    if (res?.token) {
      setFreshToken({ label: res.label ?? label, token: res.token });
      setLabel("");
      void refresh();
    }
  }

  async function revoke(id: string, deviceLabel: string): Promise<void> {
    setError(null);
    await action<{ ok?: boolean; error?: string }>({
      path: "/api/admin/desk-devices",
      busy: "ডিভাইস বাতিল হচ্ছে…",
      init: {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "revoke", id, reason: "console revoke" }),
      },
      success: `${deviceLabel} বাতিল হয়েছে`,
      detail: "এই ডিভাইসের পরের অনুরোধ সার্ভার থেকে ফিরিয়ে দেওয়া হবে।",
    });
    void refresh();
  }

  return (
    <div className="border border-ink/20 bg-paper-deep p-4">
      <p className="font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">Desk devices · ডিভাইস টোকেন</p>
      <p className="mt-2 text-[12.5px] text-ink-soft">
        প্রতিটি ডেস্কটপ অ্যাপের জন্য এখানে একটি টোকেন তৈরি করুন। টোকেন দিয়েই অ্যাপটি সার্ভারের ডেটাবেসে কাজ করে —
        এখন আর অ্যাপে ডেটাবেসের গোপন চাবি রাখা লাগে না। যেকোনো ডিভাইস বাতিল করলেই পরের মুহূর্তে তার অ্যাক্সেস বন্ধ।
      </p>

      {freshToken && (
        <div className="mt-3 border border-lime bg-lime/10 p-3" role="status">
          <p className="font-sans-bn text-[13px] font-bold text-ink">
            ✓ নতুন টোকেন — <span className="font-mono-x tracking-wide">{freshToken.label}</span>
          </p>
          <p className="mt-1 text-[12px] text-ink-soft">
            এটি মাত্র একবার দেখানো হচ্ছে। ডেস্কটপ অ্যাপের সেটিংসে (ডেস্ক টোকেন) বসান এবং এই উইন্ডো বন্ধ করুন।
          </p>
          <code className="mt-2 block select-all break-all border border-ink/25 bg-paper px-3 py-2 font-mono-x text-[13px] text-ink">
            {freshToken.token}
          </code>
          <button
            type="button"
            onClick={() => setFreshToken(null)}
            className="mt-2 text-[12px] font-bold text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            বুঝেছি, কপি করেছি
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="block flex-1 min-w-[180px]">
          <span className="font-mono-x text-[10px] tracking-[0.16em] text-ink-soft uppercase">ডিভাইসের নাম</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="যেমন: অফিসের Windows"
            className="mt-1 w-full border border-ink/25 bg-paper px-3 py-2 text-[13px] text-ink"
            aria-label="ডিভাইসের নাম"
          />
        </label>
        <button
          type="button"
          disabled={label.trim().length < 2}
          onClick={() => void create()}
          className="border border-ink/40 px-4 py-2 text-[12.5px] font-bold text-ink transition hover:bg-lime disabled:opacity-40"
        >
          টোকেন তৈরি করুন
        </button>
      </div>

      <ul className="mt-4 divide-y divide-ink/10">
        {devices.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className={`text-[13px] font-bold text-ink ${d.revokedAt ? "line-through opacity-60" : ""}`}>{d.label}</p>
              <p className="font-mono-x text-[10.5px] text-ink-soft">
                {d.prefix}… · {d.email}
                {d.lastUsedAt ? ` · শেষ ব্যবহার ${new Date(d.lastUsedAt).toLocaleString("bn-BD")}` : " · এখনো ব্যবহার হয়নি"}
                {d.revokedAt ? ` · বাতিল ${new Date(d.revokedAt).toLocaleString("bn-BD")}` : ""}
              </p>
            </div>
            {!d.revokedAt && (
              <button
                type="button"
                onClick={() => void revoke(d.id, d.label)}
                className="border border-alizarin px-3 py-1 text-[11.5px] font-bold text-alizarin transition hover:bg-alizarin hover:text-on-accent"
              >
                বাতিল
              </button>
            )}
          </li>
        ))}
        {devices.length === 0 && (
          <li className="py-3 text-[12.5px] text-ink-soft">এখনো কোনো ডেস্ক ডিভাইস নেই।</li>
        )}
      </ul>

      {error && (
        <p role="alert" className="mt-3 border border-alizarin bg-alizarin/10 px-3 py-2 text-[12px] font-bold text-ink">
          ✕ {error}
        </p>
      )}
    </div>
  );
}