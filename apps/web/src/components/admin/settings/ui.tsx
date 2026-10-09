"use client";

import React from "react";

/** Small editorial form primitives for the tabbed settings console — the tone
 *  upfront: paper cards, ink type, alizarin accent, uppercase mono kickers. */

export function Section({
  title,
  kicker,
  hint,
  children,
  danger,
}: {
  title: string;
  kicker?: string;
  hint?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section className={danger ? "border border-rose-500/40 bg-rose-500/[0.04]" : "border border-ink/20 bg-paper-deep"}>
      <div className="border-b border-ink/10 px-5 py-4">
        {kicker && (
          <p className="font-mono-x text-[9px] tracking-[0.24em] text-alizarin uppercase">{kicker}</p>
        )}
        <h3 className="mt-0.5 font-sans-bn text-[15px] font-bold text-ink">{title}</h3>
        {hint && <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{hint}</p>}
      </div>
      <div className="space-y-5 px-5 py-5">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-[11px] leading-relaxed text-ink-soft/80">{hint}</span>}
    </label>
  );
}

const INPUT =
  "w-full border border-ink/30 bg-paper px-3 py-2 text-[13px] text-ink placeholder:text-ink-soft/60 focus:border-alizarin focus:outline-none";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={`${INPUT} ${className ?? ""}`} />;
}

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input type="number" {...rest} className={`${INPUT} ${className ?? ""}`} />;
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        className="h-9 w-12 shrink-0 cursor-pointer border border-ink/30 bg-paper"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#d2202c"}
        onChange={(e) => onChange(e.target.value)}
      />
      <TextInput value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={`${INPUT} resize-y leading-relaxed ${className ?? ""}`} />;
}

export function ToggleRow({
  on,
  onChange,
  label,
  hint,
  accent = "lime",
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  accent?: "lime" | "alizarin" | "cat-blue";
}) {
  const active = accent === "lime" ? "bg-lime" : accent === "alizarin" ? "bg-alizarin" : "bg-cat-blue";
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-ink/15 bg-ink/5 px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-[13px] font-bold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[10.5px] leading-relaxed text-ink-soft">{hint}</span>}
      </span>
      <button
        type="button"
        onClick={() => onChange(!on)}
        aria-pressed={on}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? active : "bg-ink/25"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
            value === o.value ? "bg-ink text-paper" : "border border-ink/20 bg-paper text-ink-soft hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StatusNote({
  tone,
  children,
}: {
  tone: "ok" | "err" | "info";
  children: React.ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "border-cat-teal bg-cat-teal/10 text-ink"
      : tone === "err"
        ? "border-alizarin bg-alizarin/10 text-alizarin"
        : "border-ink/20 bg-ink/5 text-ink-soft";
  return <p className={`border px-3 py-2 text-[12.5px] font-bold ${cls}`}>{children}</p>;
}