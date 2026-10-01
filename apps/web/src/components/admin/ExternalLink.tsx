import type { AnchorHTMLAttributes, ReactNode } from "react";

/**
 * Anchor for links that leave the app.
 *
 * Admin pages link out to GitHub, Facebook source pages and Vercel. Those were a
 * mix of bare `<a href>`, `<a target="_blank" rel="noreferrer">` and Next `<Link>`,
 * so some navigated away from the console (losing the operator's place) and some
 * opened the destination with a live `window.opener` reference. `noopener` is
 * what closes that, and it has to be present together with `target="_blank"` to
 * mean anything.
 *
 * Routing every outbound link through here makes "opens in a new tab, cannot
 * reach back into the console" a property of the component instead of something
 * each call site has to remember. `scripts/external-links.test.ts` fails the
 * build if a raw external anchor reappears.
 */
export function ExternalLink({
  href,
  children,
  className,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}

/** True for anything that navigates off this origin. */
export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
