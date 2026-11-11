"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The console page header.
 *
 * Every page used to carry its own copy of the same three lines, so titles were
 * 34px on some screens and missing on others, and the actions a page needed
 * (refresh, export, new) had nowhere to live. This is the single header: a
 * kicker, the serif title, an optional one-line description that says what the
 * page is actually for, and a slot for the page's primary actions.
 *
 * It sticks under the console top bar because these pages are long lists — the
 * title and the page's actions staying reachable is what makes a long admin
 * screen navigable.
 */
export function PageHeading({
  emoji,
  kicker,
  title,
  description,
  actions,
  back,
}: {
  emoji?: string;
  kicker?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Optional link back to the parent screen, shown above the title. */
  back?: { href: string; label: string };
}) {
  return (
    <header className="sticky top-[92px] z-20 -mx-4 mb-5 border-b border-ink/10 bg-paper/95 px-4 pt-1 pb-3 backdrop-blur md:-mx-6 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {back ? (
            <Link
              href={back.href}
              className="font-mono-x text-[9.5px] tracking-[0.16em] text-ink-soft uppercase transition-colors hover:text-alizarin"
            >
              ← {back.label}
            </Link>
          ) : null}
          {kicker ? (
            <p className="flex items-center gap-1.5 font-mono-x text-[9.5px] tracking-[0.24em] text-alizarin uppercase">
              {emoji ? <span className="text-[11px] leading-none">{emoji}</span> : null}
              {kicker}
            </p>
          ) : null}
          <h1 className="mt-0.5 font-serif-bn text-[27px] leading-[1.15] font-black text-ink md:text-[31px]">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-soft">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
