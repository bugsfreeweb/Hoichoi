"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface ToastContextType {
  success: (msg: string) => void;
  error: (msg: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; type: "success" | "error" }>>([]);

  const success = (msg: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type: "success" }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };

  const error = (msg: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type: "error" }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg text-sm font-medium shadow-lg transition-all ${
              t.type === "success"
                ? "bg-lime text-night"
                : "bg-alizarin text-paper"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}