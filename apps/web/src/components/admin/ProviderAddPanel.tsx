"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ProviderForm } from "./ProviderForm";

/**
 * "Add a provider" as a panel, not as a permanent column.
 *
 * The form used to sit in a fixed 320px column beside the fleet list. It stretched
 * to the height of the list (a tall empty box), pushed the list into a narrow
 * column, and made the page feel like a form with a sidebar. It is now a button in
 * the list card's header that opens a panel over the list — closed by default, so
 * the page is about the fleet until you decide to change it.
 */
export function ProviderAddPanel() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-ink bg-ink px-3 py-1.5 text-[12px] font-bold text-paper transition-opacity hover:opacity-90"
      >
        <Plus size={13} /> প্রোভাইডার যোগ
      </button>
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-night/50 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-6 w-full max-w-3xl rounded-xl border border-ink/20 bg-paper-deep shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-4 py-3">
              <div>
                <h2 className="font-sans-bn text-[15px] font-bold text-ink">নতুন প্রোভাইডার</h2>
                <p className="mt-0.5 font-mono-x text-[9.5px] tracking-[0.18em] text-ink-soft uppercase">
                  ADD PROVIDER · TEXT OR IMAGE
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="বন্ধ করুন"
                className="rounded-lg border border-ink/20 p-1.5 text-ink-soft hover:border-ink hover:text-ink"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-4">
              <ProviderForm />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
