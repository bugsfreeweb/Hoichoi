import { toBn } from "../lib/format";

interface SidebarProps {
  view: "dashboard" | "watchlist" | "queue" | "collector" | "vault" | "settings" | "moderation";
  setView: (v: "dashboard" | "watchlist" | "queue" | "collector" | "vault" | "settings" | "moderation") => void;
  watching: number;
}

const NAV = [
  { id: "dashboard" as const, label: "মনিটর", icon: "dash" },
  { id: "watchlist" as const, label: "ওয়াচলিস্ট", icon: "radio" },
  { id: "queue" as const, label: "কনটেন্ট সারি", icon: "list" },
  { id: "collector" as const, label: "কালেক্টর", icon: "term" },
  { id: "vault" as const, label: "API ভল্ট", icon: "key" },
  { id: "settings" as const, label: "সেটিংস", icon: "gear" },
  { id: "moderation" as const, label: "মন্তব্য মডারেশন", icon: "shield" },
];

const ICONS: Record<string, () => React.ReactNode> = {
  dash: () => <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  radio: () => <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/></svg>,
  list: () => <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none"/></svg>,
  term: () => <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/></svg>,
  key: () => <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="4.5"/><path d="M11.5 11.5L21 2M16.5 6.5l3 3M13.5 9.5l2.5 2.5"/></svg>,
  gear: () => <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h9M19 7h1M4 17h3M13 17h7"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/><path d="M4 12h16"/><circle cx="9" cy="12" r="2.2"/></svg>,
  shield: () => <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/></svg>,
};

export default function Sidebar({ view, setView, watching }: SidebarProps) {
  return (
    <aside className="side">
      <nav className="sidenav" id="sideNav">
        {NAV.map((n, i) => (
          <button
            key={n.id}
            onClick={() => setView(n.id)}
            data-tab={n.id}
            className={`flex items-center gap-10 w-full px-8 py-8 rounded-8 font-medium text-[12.5px] font-weight-500 transition-colors ${
              view === n.id
                ? "bg-white text-night"
                : "text-white/55 hover:bg-white/8 hover:text-white"
            }`}
          >
            <span>{ICONS[n.icon]()}</span>
            <span className="flex-1 text-left">{n.label}</span>
            <kbd className={`font-mono-x text-[9px] ${view === n.id ? "text-night/40" : "text-white/25"}`}>
              {String(i + 1)}
            </kbd>
          </button>
        ))}
      </nav>
      <div className="side-foot">
        <p className="online"><span className="pulse-dot"></span>CONTROLLER ONLINE</p>
        <p className="watching" id="sideWatch">{toBn(watching)} সোর্স সক্রিয়</p>
        <p className="datasrc" id="dataSrc">ডেটা: সংযোগ…</p>
      </div>
    </aside>
  );
}