import React from "react";
import ReactDOM from "react-dom/client";
import { isTauri } from "./lib/tauri";
import { DeskLocaleProvider, useDeskLocale } from "./lib/locale";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* The language is decided once, above every screen. */}
    <DeskLocaleProvider>{isTauri() ? <App /> : <BrowserHint />}</DeskLocaleProvider>
  </React.StrictMode>,
);

function BrowserHint() {
  const { t } = useDeskLocale();
  return (
    <div className="flex h-full items-center justify-center">
      <div className="panel max-w-md text-center">
        <p className="font-serif-bn text-[26px] font-black">{t("desk.chrome.name")}</p>
        <p className="mt-2 text-[13px] text-ink-soft">{t("desk.chrome.tauriOnly")}</p>
        <p className="mt-1 font-mono text-[11px] text-ink-soft">
          run: <code className="bg-paper px-1">pnpm --filter desktop tauri dev</code>
        </p>
      </div>
    </div>
  );
}