import React from "react";
import ReactDOM from "react-dom/client";
import { isTauri } from "./lib/tauri";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isTauri() ? <App /> : <BrowserHint />}
  </React.StrictMode>,
);

function BrowserHint() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="panel max-w-md text-center">
        <p className="font-serif-bn text-[26px] font-black">হৈচৈ ডেস্ক</p>
        <p className="mt-2 text-[13px] text-ink-soft">
          এই UI টি শুধু Tauri ডেস্কটপ অ্যাপের ভেতরে চলে।
        </p>
        <p className="mt-1 font-mono text-[11px] text-ink-soft">
          run: <code className="bg-paper px-1">pnpm --filter desktop tauri dev</code>
        </p>
      </div>
    </div>
  );
}