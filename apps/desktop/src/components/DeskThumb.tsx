import { ImageOff } from "lucide-react";
import { useDeskMedia } from "../lib/media";

/**
 * The desk's picture element.
 *
 * Replaces raw `<img src={/uploads/…}>` calls, which never loaded inside
 * the Tauri window (no static file server exists there) — the reason the content
 * screens showed no images even for posts the collector had downloaded.
 * Local files are read over IPC and shown from a blob URL; remote URLs pass
 * through. A path that cannot be read renders a labelled placeholder rather than
 * a broken image icon.
 */
export function DeskThumb({
  path,
  className = "",
  emptyLabel = "নেই",
  fallback,
}: {
  path: string | null | undefined;
  className?: string;
  emptyLabel?: string;
  /** Rendered when the path resolves to nothing (e.g. a larger editor preview). */
  fallback?: React.ReactNode;
}) {
  const src = useDeskMedia(path);
  const has = Boolean((path ?? "").trim());

  if (!has) {
    return (
      <span
        className={`flex items-center justify-center border border-dashed border-white/15 text-[9px] text-white/25 ${className}`}
        title="কোনো ছবি নেই"
      >
        {emptyLabel}
      </span>
    );
  }
  if (!src) {
    return (
      <span
        className={`flex items-center justify-center border border-dashed border-white/15 text-white/30 ${className}`}
        title="ছবি লোড হচ্ছে…"
      >
        <ImageOff size={12} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      className={className}
      onError={(e) => {
        const img = e.currentTarget;
        img.style.visibility = "hidden";
        fallback;
      }}
    />
  );
}
