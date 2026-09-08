"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Rss,
  Sparkles,
  GitBranch,
  Triangle,
  Database,
  HardDrive,
  Lock,
  RotateCw,
} from "lucide-react";
import type { ApiKey } from "@/lib/data";

const SERVICE_ICON: Record<string, typeof KeyRound> = {
  facebook: Rss,
  llm: Sparkles,
  github: GitBranch,
  vercel: Triangle,
  database: Database,
  storage: HardDrive,
  vault: Lock,
};

const SCOPE_STYLE: Record<string, string> = {
  desktop: "border-sky-400/40 text-sky-300",
  web: "border-violet-400/40 text-violet-300",
  both: "border-lime/40 text-lime",
};

const SCOPE_BN: Record<string, string> = {
  desktop: "ডেস্কটপ",
  web: "ওয়েব",
  both: "উভয়",
};

export default function KeyVault({ keys }: { keys: ApiKey[] }) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<Record<number, boolean>>({});
  const [copiedAll, setCopiedAll] = useState(false);

  const copyOne = async (k: ApiKey) => {
    try {
      await navigator.clipboard.writeText(`${k.envName}=${k.revealValue}`);
      setCopied((m) => ({ ...m, [k.id]: true }));
      setTimeout(() => setCopied((m) => ({ ...m, [k.id]: false })), 1600);
    } catch {
      /* clipboard blocked — mock */
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(
        keys.map((k) => `${k.envName}=${k.revealValue}`).join("\n"),
      );
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    } catch {
      /* mock */
    }
  };

  return (
    <div className="panel overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-alizarin/15 text-alizarin">
          <KeyRound size={15} />
        </span>
        <div>
          <p className="font-serif-bn text-[17px] font-bold text-white">API ভল্ট</p>
          <p className="font-mono-x text-[9px] tracking-[0.22em] text-white/35 uppercase">
            AES-256 · MASTER KEY FROM DESKTOP ENV · নমুনা মান
          </p>
        </div>
        <button
          onClick={copyAll}
          className="ml-auto flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.05] px-3.5 py-2 text-[11px] font-semibold text-white/80 transition-all duration-300 hover:border-lime/50 hover:text-lime"
        >
          {copiedAll ? <Check size={12} /> : <Copy size={12} />}
          {copiedAll ? "কপি হয়েছে (.env)" : "সব কপি করুন (.env)"}
        </button>
      </div>

      <div className="scroll-slim overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="font-mono-x text-[9.5px] tracking-[0.18em] text-white/35 uppercase">
              <th className="px-5 py-3 font-medium">সার্ভিস</th>
              <th className="px-3 py-3 font-medium">এনভি ভেরিয়েবল</th>
              <th className="px-3 py-3 font-medium">মান</th>
              <th className="px-3 py-3 font-medium">স্কোপ</th>
              <th className="px-3 py-3 font-medium">স্ট্যাটাস</th>
              <th className="px-5 py-3 text-right font-medium">রোটেটED</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {keys.map((k) => {
              const Icon = SERVICE_ICON[k.service] ?? KeyRound;
              const isOpen = revealed[k.id];
              const isCopied = copied[k.id];
              const rotate = k.status === "rotate";
              return (
                <tr
                  key={k.id}
                  className="group transition-colors duration-200 hover:bg-white/[0.035]"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-white/70">
                        <Icon size={13.5} />
                      </span>
                      <div>
                        <p className="text-[12px] font-semibold text-white/90">
                          {k.label}
                        </p>
                        <p className="text-[10px] text-white/40">{k.note}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 font-mono-x text-[10.5px] text-white/60">
                    {k.envName}
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <code className="rounded-md border border-white/10 bg-night px-2.5 py-1.5 font-mono-x text-[10.5px] tracking-wide text-amberx/90">
                        {isOpen ? k.revealValue : k.maskedValue}
                      </code>
                      <button
                        onClick={() =>
                          setRevealed((m) => ({ ...m, [k.id]: !m[k.id] }))
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 transition-colors hover:border-white/40 hover:text-white"
                        title={isOpen ? "লুকান" : "দেখান"}
                      >
                        {isOpen ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      <button
                        onClick={() => copyOne(k)}
                        className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                          isCopied
                            ? "border-lime/60 text-lime"
                            : "border-white/10 text-white/60 hover:border-lime/50 hover:text-lime"
                        }`}
                        title="কপি"
                      >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-1 text-[9.5px] font-semibold ${
                        SCOPE_STYLE[k.scope] ?? SCOPE_STYLE.both
                      }`}
                    >
                      {SCOPE_BN[k.scope] ?? k.scope}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    {rotate ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amberx/12 px-2.5 py-1 text-[10px] font-semibold text-amberx">
                        <RotateCw size={10} /> রোটেশন দরকার
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-lime/12 px-2.5 py-1 text-[10px] font-semibold text-lime">
                        <span className="h-1.5 w-1.5 rounded-full bg-lime" /> সক্রিয়
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono-x text-[10px] text-white/40">
                    {k.rotatedAt}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
