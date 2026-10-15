"use client";

import type { ReactNode } from "react";

/* Hoichoi Desk skinned controls — same API, newsroom look. */

export function Card({
  title,
  desc,
  children,
  actions,
  className = "",
}: {
  title?: string;
  desc?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`font-sans-bn rounded-2xl border-2 border-[#1a140d]/12 bg-white p-5 shadow-[3px_3px_0_rgba(26,20,13,0.08)] ${className}`}>
      {(title || actions) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="font-serif-bn text-[15px] font-extrabold text-[#1a140d]">
                <span className="mr-1.5 text-[#d2202c]">▚</span>
                {title}
              </h2>
            )}
            {desc && <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#6b6250]">{desc}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="font-sans-bn block">
      <span className="mb-1.5 flex items-baseline gap-2">
        <span className="text-xs font-bold text-[#1a140d]">{label}</span>
        {hint && <span className="font-mono-x text-[10px] text-[#6b6250]">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputBase =
  "font-sans-bn w-full rounded-lg border-2 border-[#1a140d]/15 bg-white px-3.5 py-2.5 text-sm text-[#1a140d] outline-none transition placeholder:text-[#6b6250]/60 focus:border-[#1a140d]";

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  mono = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputBase} ${mono ? "font-mono-x text-xs" : ""}`}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputBase} resize-none leading-relaxed`}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`font-sans-bn flex w-full items-center justify-between gap-4 rounded-xl border-2 bg-white px-3.5 py-3 text-left transition ${
        checked ? "border-[#1a140d]" : "border-[#1a140d]/12 hover:border-[#1a140d]/35"
      }`}
    >
      <span>
        <span className="block text-xs font-bold text-[#1a140d]">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] leading-relaxed text-[#6b6250]">{hint}</span>}
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-[#d2202c]" : "bg-[#1a140d]/15"}`}>
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
          style={{ left: checked ? 18 : 2 }}
        />
      </span>
    </button>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="font-sans-bn flex items-center gap-3 rounded-xl border-2 border-[#1a140d]/12 bg-white px-3 py-2.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-8 shrink-0 rounded-lg"
        aria-label={label}
      />
      <div className="min-w-0">
        <p className="text-xs font-bold text-[#1a140d]">{label}</p>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono-x w-full bg-transparent text-[11px] text-[#6b6250] outline-none"
        />
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; hint?: string }[];
  size?: "sm" | "md";
}) {
  return (
    <div className="font-sans-bn inline-flex w-full flex-wrap gap-1 rounded-xl border-2 border-[#1a140d]/12 bg-[#f3eee1] p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          title={o.hint}
          className={`flex-1 rounded-lg px-2.5 ${
            size === "sm" ? "py-1.5 text-[11px]" : "py-2 text-xs"
          } font-bold whitespace-nowrap transition ${
            value === o.id ? "bg-[#1a140d] text-[#f3eee1] shadow-sm" : "text-[#6b6250] hover:text-[#1a140d]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  suffix = "%",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="font-sans-bn">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-[#1a140d]">{label}</span>
        <span className="font-mono-x rounded bg-[#1a140d] px-2 py-0.5 text-xs text-[#c8f65d]">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "slate" | "violet" | "emerald" | "amber";
}) {
  const tones: Record<string, { bar: string; text: string }> = {
    slate: { bar: "#1a140d", text: "text-[#1a140d]" },
    violet: { bar: "#d2202c", text: "text-[#d2202c]" },
    emerald: { bar: "#5f8f0e", text: "text-[#4a7009]" },
    amber: { bar: "#b45309", text: "text-[#9a4208]" },
  };
  const tn = tones[tone];
  return (
    <div className="font-sans-bn relative overflow-hidden rounded-2xl border-2 border-[#1a140d]/12 bg-white p-4">
      <p className="font-mono-x text-[10px] tracking-[0.22em] text-[#6b6250] uppercase">{label}</p>
      <p className={`font-serif-bn mt-2 text-2xl font-extrabold tabular-nums ${tn.text}`}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-[#6b6250]">{sub}</p>}
      <span className="absolute inset-x-0 bottom-0 h-1" style={{ background: tn.bar }} />
    </div>
  );
}

export function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function fromLocalInput(v: string) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
