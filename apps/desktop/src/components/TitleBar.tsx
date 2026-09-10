import { Minus, Square, X } from "lucide-react";
import { isTauri } from "../lib/tauri";

let w: null | { minimize: () => Promise<void>; toggleMaximize: () => Promise<void>; close: () => Promise<void> } = null;

/** Lazy-import the Tauri window API only when inside the webview. */
async function win(): Promise<typeof w> {
  if (!isTauri()) return null;
  if (!w) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    w = getCurrentWindow();
  }
  return w;
}

export default function TitleBar() {
  const min = () => void win().then((x) => x?.minimize());
  const max = () => void win().then((x) => x?.toggleMaximize());
  const close = () => void win().then((x) => x?.close());

  return (
    <div className="titlebar flex h-10 shrink-0 items-center border-b border-white/8 bg-[#12161e] px-3">
      <div className="flex items-center gap-2">
        <button
          onClick={close}
          className="traffic bg-[#ff5f57]"
          title="বন্ধ · অ্যাপ বন্ধ করুন"
          aria-label="Close"
        />
        <button
          onClick={min}
          className="traffic bg-[#febc2e]"
          title="মিনিমাইজ"
          aria-label="Minimize"
        />
        <button
          onClick={max}
          className="traffic bg-[#28c840]"
          title="ম্যাক্সিমাইজ / পুনরুদ্ধার"
          aria-label="Maximize"
        />
      </div>

      <div
        data-tauri-drag-region
        className="flex h-full flex-1 items-center justify-center gap-2"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-alizarin font-serif-bn text-[9px] leading-none font-black text-white">
          হ
        </span>
        <span className="font-serif-bn text-[12.5px] font-bold text-white/85">
          হৈচৈ ডেস্ক
        </span>
        <span className="hidden font-mono-x text-[9px] tracking-[0.2em] text-white/30 uppercase sm:inline">
          TAURI 2 · OPTION A
        </span>
      </div>

      <div className="flex items-center gap-1 text-white/35">
        <button onClick={min} className="rounded p-1 hover:bg-white/10" title="মিনিমাইজ">
          <Minus size={12} />
        </button>
        <button
          onClick={max}
          className="rounded p-1 hover:bg-white/10"
          title="ম্যাক্সিমাইজ / পুনরুদ্ধার"
        >
          <Square size={10} />
        </button>
        <button
          onClick={close}
          className="rounded p-1 hover:bg-alizarin/80 hover:text-white"
          title="বন্ধ · অ্যাপ বন্ধ করুন"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}