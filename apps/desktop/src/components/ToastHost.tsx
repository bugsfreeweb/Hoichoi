import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Info, Loader2, X } from "lucide-react";
import { onToast, type ToastMsg, type ToastTone } from "../lib/toast";

const TONE_STYLE: Record<ToastTone, { wrap: string; icon: React.ReactNode }> = {
  ok: {
    wrap: "border-lime/50 bg-lime/15 text-lime",
    icon: <CheckCircle2 size={16} />,
  },
  err: {
    wrap: "border-rose-500/50 bg-rose-500/15 text-rose-300",
    icon: <XCircle size={16} />,
  },
  info: {
    wrap: "border-sky-400/40 bg-sky-400/12 text-sky-300",
    icon: <Info size={16} />,
  },
  busy: {
    wrap: "border-white/20 bg-white/10 text-white/85",
    icon: <Loader2 size={16} className="animate-spin" />,
  },
};

/** Top-center notification stack — every save/sync/refresh in the desk surfaces here. */
export function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([]);

  useEffect(() => onToast((t) => {
    setItems((prev) => [...prev.slice(-3), t]);
    if (t.ttl > 0) {
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), t.ttl);
    }
  }), []);

  const dismiss = (id: number) => setItems((prev) => prev.filter((x) => x.id !== id));

  if (items.length === 0) return null;

  return (
    <div className="toast-stack" data-toasts={items.length}>
      {items.map((t) => {
        const s = TONE_STYLE[t.tone];
        return (
          <div
            key={t.id}
            className={`toast-item flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[12px] shadow-lg backdrop-blur ${s.wrap}`}
          >
            <span className="mt-0.5 shrink-0">{s.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-snug">{t.title}</p>
              {t.body && <p className="mt-0.5 font-mono-x text-[10.5px] leading-relaxed opacity-80">{t.body}</p>}
            </div>
            {t.ttl > 0 && (
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
                aria-label="বন্ধ"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}