"use client";

import { useRef, useState } from "react";

type Written = Record<string, number> | null;

export function BackupManager() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "export" | "import" | "reset">(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const resetMsg = () => {
    setMsg(null);
    setErr(null);
  };

  async function doExport() {
    setBusy("export");
    resetMsg();
    try {
      const res = await fetch("/api/export", { method: "POST" });
      if (!res.ok) throw new Error(`export failed (${res.status})`);
      const { bundle } = (await res.json()) as { bundle: unknown };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hoichoi-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("ব্যাকআপ ডাউনলোড হয়েছে (শুধু কনটেন্ট — passwords নেই)।");
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function doImport(file: File) {
    setBusy("import");
    resetMsg();
    try {
      const bundle = JSON.parse(await file.text());
      if (!bundle || bundle.version !== 1 || !Array.isArray(bundle.tables)) {
        throw new Error("ফাইলটি বৈধ hoichoi backup নয়");
      }
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bundle }),
      });
      if (!res.ok) throw new Error(`import failed (${res.status})`);
      const { written } = (await res.json()) as { written: Written };
      const tally = Object.entries(written ?? {})
        .map(([t, n]) => `${t}:${n}`)
        .join(" ");
      setMsg(`পুরনো ডেটা REPLACE করে backup থেকে আনা হয়েছে। (${tally})`);
      window.location.reload();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function doReset() {
    if (!confirm("সব পোস্ট, লগ, রিকোয়েস্ট মুছে settings-default-এ ফিরে যাবে। admin এ্যাকাউন্ট থাকবে। নিশ্চিত?")) return;
    if (!confirm("এটি পুরোপুরি বাতিল করা যাবে না। আবার নিশ্চিত করুন:")) return;
    setBusy("reset");
    resetMsg();
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (!res.ok) throw new Error(`reset failed (${res.status})`);
      const { wiped } = (await res.json()) as { wiped: string[] };
      setMsg(`রিসেট সম্পন্ন — মুছে গেছে: ${wiped.join(", ")}`);
      window.location.reload();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="border border-ink/20 bg-paper-deep p-5">
        <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">EXPORT</p>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-soft">
          সব কনটেন্ট (posts, sources, settings, config, admin) একটি JSON ফাইলে নামবে। ডেস্কটপ-ব্যাকআপ
          অপসারে এনক্রিপ্টেড; ওয়েবে শুধু কনটেন্ট (passwords ছাড়া)।
        </p>
        <button
          onClick={doExport}
          disabled={busy !== null}
          className="mt-3 border-2 border-ink bg-ink px-4 py-2 text-[12.5px] font-bold text-paper transition hover:bg-paper hover:text-ink disabled:opacity-50"
        >
          {busy === "export" ? "তৈরি হচ্ছে…" : "⬇ ব্যাকআপ ডাউনলোড করুন"}
        </button>
      </div>

      <div className="border border-ink/20 bg-paper-deep p-5">
        <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">RESTORE</p>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-soft">
          আগের ব্যাকআপ JSON ফাইল বেছে নিন — বর্তমান ডেটা ওই অনুযায়ী REPLACE হবে।
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="mt-3 block text-[13px]"
          disabled={busy !== null}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
          }}
        />
      </div>

      <div className="border-2 border-alizarin bg-alizarin/5 p-5">
        <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">FULL RESET</p>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-soft">
          সব কনটেন্ট ও লগ মুছে fresh-install অবস্থায় ফিরে যান (admin এ্যাকাউন্ট, categories, providers,
          blocklist সিড থাকে)।
        </p>
        <button
          onClick={doReset}
          disabled={busy !== null}
          className="mt-3 border-2 border-alizarin bg-alizarin px-4 py-2 text-[12.5px] font-bold text-paper transition hover:bg-paper hover:text-alizarin disabled:opacity-50"
        >
          {busy === "reset" ? "মোছা হচ্ছে…" : "⟲ সম্পূর্ণ রিসেট"}
        </button>
      </div>

      {msg && <p className="text-[12.5px] font-bold text-cat-teal">✓ {msg}</p>}
      {err && <p className="text-[12.5px] font-bold text-alizarin">✗ {err}</p>}
    </div>
  );
}