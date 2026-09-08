import Link from "next/link";
import { BRAND } from "@/lib/brand";

export default function Logo({
  href = "/",
  size = "md",
  invert = false,
  withMark = true,
}: {
  href?: string | null;
  size?: "sm" | "md" | "lg" | "hero";
  invert?: boolean;
  withMark?: boolean;
}) {
  const type =
    size === "hero"
      ? "text-[64px] md:text-[104px] leading-[0.9]"
      : size === "lg"
        ? "text-[34px] leading-none"
        : size === "md"
          ? "text-[22px] leading-none"
          : "text-[16px] leading-none";

  const mark =
    size === "hero"
      ? "h-14 w-14 md:h-20 md:w-20"
      : size === "lg"
        ? "h-9 w-9"
        : size === "md"
          ? "h-7 w-7"
          : "h-5 w-5";

  const inner = (
    <span className="group inline-flex items-center gap-2">
      {withMark && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={BRAND.mark}
          alt=""
          className={`${mark} rounded-full object-cover ring-1 ring-black/10`}
        />
      )}
      <span
        className={`font-serif-bn font-black tracking-tight ${type} ${
          invert ? "text-white" : "text-ink"
        }`}
      >
        {BRAND.bn}
        <span className="text-alizarin">।</span>
      </span>
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="inline-flex" aria-label={BRAND.bn}>
      {inner}
    </Link>
  );
}
