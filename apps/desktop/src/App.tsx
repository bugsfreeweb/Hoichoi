import { useEffect, useState, useCallback } from "react";
import { listen } from "./lib/tauri";
import { listConfigured, type CredentialName } from "./lib/vault";
import SetupWizard from "./components/SetupWizard";
import Sidebar from "./components/Sidebar";
import Dashboard from "./screens/Dashboard";
import Pipeline from "./screens/Pipeline";
import Desk from "./screens/Desk";
import Settings from "./screens/Settings";

export type View = "dashboard" | "pipeline" | "desk" | "settings";

const ONBOARD_KEY = "hoichoi.desk.onboarded.v1";

export default function App() {
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(ONBOARD_KEY) === "1");
  const [view, setView] = useState<View>("dashboard");
  const [configured, setConfigured] = useState<Partial<Record<CredentialName, boolean>>>({});
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    try {
      setConfigured(await listConfigured());
    } catch {
      setConfigured({});
    }
  }, []);

  // Sidebar টেক্সটে ব্র্যান্ড প্রিন্ট করা হয় না — saveBrand-এর পরে নোটিফিকেশন হিসেবে empty refresh।
  const refreshBrand = useCallback(async () => {}, []);

  useEffect(() => {
    void refresh();
    const NAV_ORDER: View[] = ["dashboard", "pipeline", "desk", "settings"];
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const i = ["1", "2", "3", "4"].indexOf(e.key);
      if (i >= 0) setView(NAV_ORDER[i]);
    };
    window.addEventListener("keydown", onKey);
    const unlog = listen<string>("pipeline://log", (e) => {
      setLogs((prev) => [...prev.slice(-399), e.payload]);
    });
    const undone = listen<number>("pipeline://done", (e) => {
      setRunning(false);
      setLogs((prev) => [...prev, `── exit code ${e.payload} ──`]);
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      void unlog.then((f) => f());
      void undone.then((f) => f());
    };
  }, [refresh]);

  const finishSetup = async () => {
    localStorage.setItem(ONBOARD_KEY, "1");
    setOnboarded(true);
    await refresh();
  };

  if (!onboarded) {
    return <SetupWizard onDone={finishSetup} />;
  }

  return (
    <div className="flex h-full">
      <Sidebar
        view={view}
        setView={setView}
        configured={configured}
        running={running}
        setRunning={setRunning}
        onLog={(line) => setLogs((prev) => [...prev.slice(-399), line])}
      />
      <main className="flex-1 overflow-auto">
        {view === "dashboard" && (
          <Dashboard configured={configured} refresh={refresh} />
        )}
        {view === "pipeline" && <Pipeline logs={logs} />}
        {view === "desk" && <Desk />}
        {view === "settings" && <Settings refresh={refresh} refreshBrand={refreshBrand} />}
      </main>
    </div>
  );
}