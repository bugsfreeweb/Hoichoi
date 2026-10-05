"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminLoginLog, LoginLogPage } from "@hoichoi/shared-types";
import { RefreshCw, Trash2, X } from "lucide-react";

/**
 * অ্যাডমিন লগইন লগ — কে/কখন/কোন আইপি থেকে ওয়েব কনসোলে ঢুকল (success/failure
 *  দুটোই রেকর্ড হয়)। ডেস্কটপ অ্যাপ থেকেও একই টেবিল (loginlog CLI) দেখা যায়।
 */
export default function LoginLogViewer() {
  const [data, setData] = useState<LoginLogPage | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login-log", { cache: "no-store" });
      if (!res.ok) throw new Error("লোড ব্যর্থ");
      setData((await res.json()) as LoginLogPage);
    } catch (e) {
      flash("err", String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = async (id: string) => {
    if (!window.confirm("এই এন্ট্রিটি মুছবেন?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/login-log?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("মুছতে ব্যর্থ");
      await refresh();
      flash("ok", "মুছে ফেলা হয়েছে");
    } catch (e) {
      flash("err", String(e));
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (!window.confirm("পুরো লগইন লগ মুছে ফেলবেন? এটি ফিরে পাওয়া যাবে না।")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login-log", { method: "DELETE" });
      if (!res.ok) throw new Error("মুছতে ব্যর্থ");
      await refresh();
      flash("ok", "লগ খালি করা হয়েছে");
    } catch (e) {
      flash("err", String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">
            AUTH · AUDIT
          </p>
          <h1 className="mt-1 font-serif-bn text-[34px] font-black text-[#e9e6da]">লগইন লগ</h1>
          <p className="mt-1 text-[12.5px] text-white/45">
            ওয়েব অ্যাডমিনের প্রতিটি সাইন-ইন attempt (সফল + ব্যর্থ)।
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void refresh()}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-[12px] font-bold text-white/70 transition-colors hover:border-white/40 hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
            রিফ্রেশ
          </button>
          <button
            onClick={clearAll}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg border border-alizarin/40 px-4 py-2 text-[12px] font-bold text-alizarin transition-colors hover:bg-alizarin/10 disabled:opacity-50"
          >
            <X size={14} />
            সব মুছুন
          </button>
        </div>
      </header>

      {msg && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-[12.5px] font-bold ${
            msg.type === "ok" ? "bg-lime/15 text-lime" : "bg-alizarin/15 text-alizarin"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/*
        scroll-x opts this one region back into horizontal scrolling. The app
        now clips horizontal overflow everywhere, which is what we want for the
        page as a whole - but this table has six columns of audit data and
        truncating the timestamps or the IPs to avoid a scrollbar would destroy
        the point of an audit log. It scrolls inside its own box instead.
      */}
      <div className="scroll-x overflow-x-auto rounded-xl border border-white/8 bg-panel/40">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-white/8 font-mono-x text-[9.5px] tracking-[0.16em] text-white/35 uppercase">
              <th className="px-4 py-3">স্টেট</th>
              <th className="px-4 py-3">ইমেইল</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">বার্তা</th>
              <th className="px-4 py-3">সময়</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="text-[12.5px]">
            {(data?.rows ?? []).map((row) => (
              <tr key={row.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  {row.ok ? (
                    <span className="rounded-full bg-lime/15 px-2.5 py-0.5 text-[10px] font-bold text-lime">সফল</span>
                  ) : (
                    <span className="rounded-full bg-alizarin/15 px-2.5 py-0.5 text-[10px] font-bold text-alizarin">ব্যর্থ</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-white/85">{row.email}</td>
                <td className="px-4 py-3 font-mono-x text-[11px] text-white/55">{row.ip ?? "—"}</td>
                <td className="px-4 py-3 text-white/55">{row.message ?? "—"}</td>
                <td className="px-4 py-3 font-mono-x text-[11px] text-white/45">
                  {new Date(row.created_at).toLocaleString("bn-BD")}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => void remove(row.id)}
                    disabled={busy}
                    className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-alizarin/15 hover:text-alizarin disabled:opacity-40"
                    title="মুছুন"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.rows.length === 0 && (
          <p className="p-8 text-center text-[13px] text-white/40">কোনো লগইন এন্ট্রি নেই।</p>
        )}
      </div>

      {data && (
        <div className="mt-4 flex items-center justify-between font-mono-x text-[10.5px] tracking-wide text-white/40 uppercase">
          <span>মোট {data.total} · পৃষ্ঠা {data.page}/{data.pages}</span>
          <span>নতুন—পুরনো</span>
        </div>
      )}
    </div>
  );
}