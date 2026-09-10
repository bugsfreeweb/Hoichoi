import { useEffect, useState } from "react";
import type { View } from "../App";
import { type CredentialName } from "../lib/vault";
import {
  LayoutDashboard,
  Radio,
  ListOrdered,
  ScrollText,
  KeyRound,
  Settings,
  ShieldCheck,
  SquarePlay,
} from "lucide-react";
import { toBn, bnClock } from "../lib/format";

const NAV: Array<{ id: View; label: string; icon: typeof LayoutDashboard; k: string }> = [
  { id: "dashboard", label: "মনিটর", icon: LayoutDashboard, k: "1" },
  { id: "watchlist", label: "ওয়াচলিস্ট", icon: Radio, k: "2" },
  { id: "queue", label: "কনটেন্ট সারি", icon: ListOrdered, k: "3" },
  { id: "collector", label: "কালেক্টর", icon: ScrollText, k: "4" },
  { id: "vault", label: "API ভল্ট", icon: KeyRound, k: "5" },
  { id: "settings", label: "সেটিংস", icon: Settings, k: "6" },
  { id: "moderation", label: "মন্তব্য মডারেশন", icon: ShieldCheck, k: "7" },
];

export default function Sidebar(props: {
  view: View;
  setView: (v: View) => void;
  configured: Partial<Record<CredentialName, boolean>>;
  running: boolean;
  onRun: () => void;
  watching: number;
}) {
  const { view, setView, configured, running, onRun, watching } = props;

  const [clock, setClock] = useState("");
  useEffect(() => {
    const t = setInterval(() => setClock(bnClock(true)), 1000);
    return () => clearInterval(t);
  }, []);

  const keys = Object.entries(configured) as Array<[CredentialName, boolean]>;
  const configuredCount = keys.filter(([, ok]) => ok).length;

  return (
    <aside className="flex w-[236px] shrink-0 flex-col border-r border-white/8 bg-[#0e1219]">
      <nav className="flex-1 space-y-0.5 p-2">
        <p className="px-2.5 pt-2 pb-1 font-mono-x text-[9px] tracking-[0.2em] text-white/30 uppercase">
          মেনু
        </p>
        {NAV.map((n) => {
          const active = view === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium transition-colors ${
                active ? "bg-white text-night" : "text-white/55 hover:bg-white/8 hover:text-white"
              }`}
            >
              <n.icon size={14} />
              <span className="flex-1">{n.label}</span>
              <span className={`font-mono-x text-[9px] ${active ? "text-night/40" : "text-white/25"}`}>
                {n.k}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/8 px-3 py-3">
        <p className="font-mono-x text-[9px] tracking-[0.18em] text-lime uppercase">
          ● CONTROLLER ONLINE
        </p>
        <div className="mt-1.5 flex items-center justify-between font-mono-x text-[10.5px] text-white/40">
          <span>ঢাকা · LIVE</span>
          <span className="tabular-nums text-white/70">{clock || "· · : · ·"}</span>
        </div>
        <p className="mt-1 text-[10.5px] text-white/40">
          {toBn(watching)} সোর্স সক্রিয় · {toBn(configuredCount)} কী
        </p>
      </div>

      <div className="border-t border-white/8 p-3">
        <button
          onClick={onRun}
          disabled={running}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-lime px-3 py-2 text-[12px] font-bold uppercase tracking-wider text-night transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SquarePlay size={13} />
          {running ? "· চলছে …" : "Run pipeline"}
        </button>
      </div>
    </aside>
  );
}