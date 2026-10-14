import type { FooterSocialLink } from "@hoichoi/shared-types";

/**
 * Admin-managed footer social/contact links. Icon keys are mapped to compact
 * inline SVGs so the footer needs no icon dependency and an unknown key just
 * falls back to a generic link glyph rather than crashing the page.
 */
const PATHS: Record<string, { d: string; fill?: boolean }> = {
  facebook: { d: "M15 3h-2.5A4.5 4.5 0 0 0 8 7.5V10H5.5v3H8v8h3.5v-8h2.6l.4-3h-3V7.8c0-.5.4-.8.9-.8H15z", fill: true },
  x: { d: "M4 4l6.2 8.2L4.3 20h2.1l4.9-6.4 4.6 6.4H20l-6.5-9L19.5 4h-2.1l-4.4 5.8L9 4z", fill: true },
  youtube: { d: "M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22.4 12 31 31 0 0 0 22 8.2zM10 15V9l5.2 3z", fill: true },
  instagram: { d: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zM17.5 6a1 1 0 1 1-1 1 1 1 0 0 1 1-1z", fill: true },
  tiktok: { d: "M16 3c.3 2.3 1.6 3.7 3.9 3.9v2.6c-1.3.1-2.5-.3-3.8-1v6.3a5.9 5.9 0 1 1-5.9-5.9c.3 0 .6 0 .9.1v2.7a3.2 3.2 0 1 0 2.3 3.1V3z", fill: true },
  linkedin: { d: "M4.5 3.5A2 2 0 1 1 2.5 5.5 2 2 0 0 1 4.5 3.5zM3 9h3v12H3zm5 0h2.9v1.6h.1A3.2 3.2 0 0 1 13.9 9c3 0 3.6 2 3.6 4.6V21h-3v-6.5c0-1.6 0-3.6-2.2-3.6s-2.5 1.7-2.5 3.5V21H8z", fill: true },
  whatsapp: { d: "M12 2a10 10 0 0 0-8.6 15l-1 3.7 3.8-1A10 10 0 1 0 12 2zm0 2a8 8 0 0 1 6.9 12l-.3.5.6 2.2-2.3-.6-.5.3A8 8 0 1 1 12 4zm-3 4c-.3 0-.7.1-1 .5s-1.3 1.3-1.3 3.2 1.4 3.7 1.6 4 2.7 4.2 6.6 5.4c3.2 1 3.9.8 4.6.7s2.2-.9 2.5-1.8.3-1.6.2-1.8-.4-.3-.9-.5-2.2-1-2.5-1.2-.6-.2-.9.2-1 1.2-1.2 1.5-.4.3-.9 0a8 8 0 0 1-2.3-1.5 8.6 8.6 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.6-.7c.2-.2.2-.4.3-.6s0-.4 0-.6-.9-2.1-1.2-2.9-.6-.7-.9-.7z", fill: true },
  telegram: { d: "M21.5 4.3 2.9 11.5c-1 .4-1 1 0 1.3l4.7 1.5 1.8 5.5c.2.6.4.6.9.2l2.5-2.4 4.7 3.5c.6.4 1 .2 1.2-.6l3.2-15c.2-.9-.3-1.3-1-1zM8.9 14.3l9.4-5.9c.4-.3.8-.1.5.2l-7.6 6.9-.3 2.9z", fill: true },
  github: { d: "M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7 3.6 3.6 0 0 1 .1-2.7s.8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1a3.6 3.6 0 0 1 .1 2.7 3.9 3.9 0 0 1 1 2.7c0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z", fill: true },
  rss: { d: "M4 4h.01M5 19a0 0 0 0 0-5 0zM4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" },
  mail: { d: "M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1.4 2L12 12l7.6-5z" },
  link: { d: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" },
};

function iconGlyph(icon: string) {
  const p = PATHS[icon] ?? PATHS.link!;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill={p.fill ? "currentColor" : "none"}
      stroke={p.fill ? "none" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={p.d} />
    </svg>
  );
}

export function FooterSocials({ links }: { links: FooterSocialLink[] }) {
  if (!links.length) return null;
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      {links.map((l, i) => (
        <a
          key={`${l.url}-${i}`}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          title={l.label || l.url}
          aria-label={l.label || l.url}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink-soft ring-offset-paper transition-all duration-300 hover:-translate-y-0.5 hover:border-alizarin hover:bg-alizarin hover:text-paper"
        >
          {iconGlyph(l.icon)}
        </a>
      ))}
    </div>
  );
}
