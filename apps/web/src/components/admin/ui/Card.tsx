"use client";

import type { ReactNode } from "react";

/**
 * The console's card.
 *
 * Every console page used to be one flat column of bordered boxes, so a long
 * screen (providers, logs, notices) read as an undifferentiated wall and there
 * was nowhere to put a title, a count or an action without inventing a new
 * heading style. This is the dashboard's card language, in the console's light
 * palette: a rounded surface, a small mono kicker, a bold bilingual title, and a
 * slot for the card's own actions.
 */
export function Card({
  children,
  className = "",
  tone = "plain",
}: {
  children: ReactNode;
  className?: string;
  /** `plain` for lists, `quiet` for fills, `accent` for the one card that matters. */
  tone?: "plain" | "quiet" | "accent";
}) {
  const surface =
    tone === "quiet"
      ? "border-ink/15 bg-paper"
      : tone === "accent"
        ? "border-cat-teal/40 bg-cat-teal/[0.04]"
        : "border-ink/15 bg-paper-deep";
  return <section className={`rounded-xl border ${surface} ${className}`}>{children}</section>;
}

export function CardHead({
  emoji,
  title,
  kicker,
  actions,
  note,
}: {
  emoji?: string;
  title: ReactNode;
  kicker?: string;
  actions?: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/10 px-4 py-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 font-sans-bn text-[15px] font-bold text-ink">
          {emoji ? <span className="text-[14px] leading-none">{emoji}</span> : null}
          {title}
        </h2>
        {kicker ? (
          <p className="mt-0.5 font-mono-x text-[9.5px] tracking-[0.18em] text-ink-soft uppercase">
            {kicker}
          </p>
        ) : null}
        {note ? <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-ink-soft">{note}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/**
 * A single number with its label — the dashboard's KPI tile, sized for a console
 * page. Three of these say more about a provider fleet than a paragraph does.
 */
export function StatTile({
  label,
  value,
  hint,
  tone = "ink",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "ink" | "teal" | "alarm" | "amber";
}) {
  const color =
    tone === "alarm" ? "text-alizarin" : tone === "teal" ? "text-cat-teal" : tone === "amber" ? "text-amberx" : "text-ink";
  return (
    <div className="rounded-xl border border-ink/15 bg-paper-deep px-4 py-3">
      <p className="font-mono-x text-[9.5px] tracking-[0.16em] text-ink-soft uppercase">{label}</p>
      <p className={`mt-1 font-grotesk text-[26px] leading-none font-bold ${color}`}>{value}</p>
      {hint ? <p className="mt-1.5 text-[11.5px] leading-snug text-ink-soft">{hint}</p> : null}
    </div>
  );
}
