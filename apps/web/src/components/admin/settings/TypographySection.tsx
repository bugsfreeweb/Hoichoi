"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BANGLA_FONTS, banglaFontById } from "@hoichoi/bangla-fonts";
import { useSettings } from "./state";

const SAMPLE = "হৈচৈ — ভাইরাল বাংলা, সপ্তাহখানেক। ১২৩৪৫৬৭৮৯০";

type FontSlot =
  | "headline"
  | "body"
  | "meta"
  | "pageTitle"
  | "subtitle"
  | "header"
  | "footer"
  | "sidebar"
  | "comments"
  | "reports"
  | "admin"
  | "desk";

const SLOTS: Array<{ key: FontSlot; label: string; fallback: string }> = [
  { key: "headline", label: "শিরোনাম / টাইটেল", fallback: "ডিফল্ট — Noto Serif Bengali" },
  { key: "body", label: "বর্ণনা / বডি", fallback: "ডিফল্ট — Hind Siliguri" },
  { key: "meta", label: "ট্যাগ ও বিভাগ", fallback: "বডির ফন্টই ব্যবহার হবে" },
  { key: "pageTitle", label: "পাতার শিরোনাম", fallback: "বডির শিরোনাম ফন্ট" },
  { key: "subtitle", label: "উপশিরোনাম / সারাংশ", fallback: "বডির ফন্ট" },
  { key: "header", label: "হেডার / টপ বার", fallback: "বডির ফন্ট" },
  { key: "footer", label: "ফুটার", fallback: "বডির ফন্ট" },
  { key: "sidebar", label: "অ্যাডমিন সাইডবার", fallback: "বডির ফন্ট" },
  { key: "comments", label: "পাঠকের মন্তব্য", fallback: "বডির ফন্ট" },
  { key: "reports", label: "রিপোর্ট ও সংশোধন", fallback: "বডির ফন্ট" },
  { key: "admin", label: "অ্যাডমিন প্যানেল", fallback: "বডির ফন্ট" },
  { key: "desk", label: "ডেস্কটপ অ্যাপ", fallback: "বডির ফন্ট" },
];

/**
 * The bundled type library, made visible.
 *
 * Picking a family writes the shared site config, so the browser site and the
 * desktop's site panel agree. The gallery is not decoration: editors choose
 * typefaces by reading them, not by guessing from a name.
 */
export function TypographySection() {
  const { cfg, setCfg } = useSettings();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const chosen = cfg.typography ?? { headline: "", body: "", meta: "" };
  const headline = banglaFontById(chosen.headline);
  const body = banglaFontById(chosen.body);
  const meta = banglaFontById(chosen.meta);

  const setFont = (key: FontSlot, id: string) => {
    setCfg((c) => ({
      ...c,
      typography: {
        ...(c.typography ?? { headline: "", body: "", meta: "" }),
        [key]: id,
      },
    }));
    setMsg(null);
  };

  /**
   * The design tab hides the console-wide save button, and a font choice is a
   * publishing decision, not a draft. Save the whole shared config here so the
   * site and the desktop panel both move on one click.
   */
  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_config_json: JSON.stringify(cfg) }),
      });
      const j = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(j?.error ?? `HTTP ${res.status}`);
      setMsg("✓ ফন্ট সংরক্ষিত — সাইট এখনই নতুন ফন্ট ব্যবহার করবে");
      router.refresh();
    } catch (e) {
      setMsg(`✕ ${e instanceof Error ? e.message : "সংরক্ষণ ব্যর্থ"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 border border-ink/15 bg-paper p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-sans-bn text-[16px] font-bold text-ink">
            বাংলা ফন্ট লাইব্রেরি
          </h4>
          <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-soft">
            রিপোজিটরির <code className="font-mono-x">Bangla Fonts</code>{" "}
            ফোল্ডারের {BANGLA_FONTS.length}টি ইউনিকোড পরিবার এখানে বান্ডল করা আছে
            — কোনো Google Fonts রিকোয়েস্ট নেই। এখন প্রতিটি সারফেসের জন্য আলাদা
            ফন্ট বেছে নিন: শিরোনাম, সারাংশ, ট্যাগ, হেডার, ফুটার, সাইডবার, মন্তব্য,
            রিপোর্ট, অ্যাডমিন এবং ডেস্কটপ অ্যাপ। ফাঁকা রাখলে আগের স্লটই ব্যবহার হবে।
          </p>
        </div>
        <span className="font-mono-x text-[10px] text-ink-soft">
          {BANGLA_FONTS.length} পরিবার ·{" "}
          {BANGLA_FONTS.reduce((n, f) => n + f.faces.length, 0)} ফেস
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {SLOTS.map((slot) => (
          <label key={slot.key} className="block text-[11px] font-bold text-ink">
            {slot.label}
            {/* Native dropdowns do not inherit a theme the way page text does:
                on Windows the popup is painted by the OS. In the dark console
                the inherited light ink landed on a white popup, so the family
                names were invisible. Pin both the control and its options to a
                readable light surface in either theme. */}
            <select
              value={(chosen[slot.key] as string | undefined) ?? ""}
              onChange={(e) => setFont(slot.key, e.target.value)}
              style={{
                colorScheme: "light",
                backgroundColor: "#ffffff",
                color: "#141414",
              }}
              className="mt-1 w-full border border-ink/25 px-2 py-2 text-[12px] font-normal outline-none focus:border-ink"
            >
              <option
                value=""
                style={{ backgroundColor: "#ffffff", color: "#141414" }}
              >
                {slot.fallback}
              </option>
              {BANGLA_FONTS.map((f) => (
                <option
                  key={f.id}
                  value={f.id}
                  style={{ backgroundColor: "#ffffff", color: "#141414" }}
                >
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="mt-3 border border-ink/15 bg-card p-3">
        <p className="font-mono-x text-[9px] uppercase tracking-[0.18em] text-ink-soft">
          লাইভ প্রিভিউ
        </p>
        <p
          className="mt-1 text-[26px] leading-tight text-ink"
          style={{
            fontFamily: headline ? `'${headline.family}', serif` : undefined,
          }}
        >
          {headline ? headline.label : "Noto Serif Bengali"} — শিরোনাম এমন
          দেখাবে
        </p>
        <p
          className="mt-1 text-[13px] leading-relaxed text-ink-soft"
          style={{
            fontFamily: body ? `'${body.family}', sans-serif` : undefined,
          }}
        >
          {body ? body.label : "Hind Siliguri"} — সংবাদের বডি এই ফন্টে পড়া হবে।
          সংখ্যা ১২৩৪৫৬৭৮৯০, যুক্তাক্ষর: ক্ষ্ম, ন্ত, স্ত্র, ঞ্জ।
        </p>
        <p
          className="mt-1 text-[11px] font-bold tracking-wide text-ink-soft"
          style={{
            fontFamily: meta ? `'${meta.family}', sans-serif` : undefined,
          }}
        >
          {meta ? meta.label : "বডির ফন্ট"} — ট্যাগ · বিভাগ · বিষয়
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {BANGLA_FONTS.map((f) => (
          <div key={f.id} className="border border-ink/12 bg-card p-2">
            <p
              className="truncate text-[17px] leading-snug text-ink"
              style={{ fontFamily: `'${f.family}', sans-serif` }}
              title={f.label}
            >
              {SAMPLE}
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span
                className="truncate font-mono-x text-[9px] text-ink-soft"
                title={f.label}
              >
                {f.label}
              </span>
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setFont("headline", f.id)}
                  aria-pressed={chosen.headline === f.id}
                  className={`px-1.5 py-0.5 text-[9px] font-bold ${
                    chosen.headline === f.id
                      ? "bg-ink text-paper"
                      : "border border-ink/20 text-ink-soft hover:text-ink"
                  }`}
                >
                  শিরোনাম
                </button>
                <button
                  type="button"
                  onClick={() => setFont("body", f.id)}
                  aria-pressed={chosen.body === f.id}
                  className={`px-1.5 py-0.5 text-[9px] font-bold ${
                    chosen.body === f.id
                      ? "bg-ink text-paper"
                      : "border border-ink/20 text-ink-soft hover:text-ink"
                  }`}
                >
                  বডি
                </button>
                <button
                  type="button"
                  onClick={() => setFont("meta", f.id)}
                  aria-pressed={chosen.meta === f.id}
                  className={`px-1.5 py-0.5 text-[9px] font-bold ${
                    chosen.meta === f.id
                      ? "bg-ink text-paper"
                      : "border border-ink/20 text-ink-soft hover:text-ink"
                  }`}
                >
                  ট্যাগ
                </button>
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="border-2 border-ink bg-ink px-4 py-2 text-[12px] font-bold text-on-accent transition hover:bg-alizarin disabled:cursor-wait disabled:opacity-50"
        >
          {busy ? "সংরক্ষণ হচ্ছে…" : "ফন্ট সংরক্ষণ করুন"}
        </button>
        {msg && (
          <span
            role="status"
            className={`text-[11px] font-bold ${msg.startsWith("✕") ? "text-red-700" : "text-ink"}`}
          >
            {msg}
          </span>
        )}
      </div>
      <p className="mt-2 text-[10.5px] leading-relaxed text-ink-soft">
        {BANGLA_FONTS.length}টি পরিবারই বান্ডল করা — টাইটেল, বর্ণনা, ট্যাগ, বিভাগ ও
        বাকি ইন্টারফেসে একই তালিকা থেকে বেছে নিন। প্রতিটি পরিবারের সোর্স
        লাইসেন্স/রিডমি{" "}
        <code className="font-mono-x">packages/bangla-fonts/licenses/</code>-এ
        সংরক্ষিত।
      </p>
    </div>
  );
}
