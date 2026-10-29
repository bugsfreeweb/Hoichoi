"use client";

import { useMemo, useState, useTransition } from "react";
import Creative from "@/components/ads/Creative";
import { SLOTS, SLOT_MAP, FORMAT_LABEL, DURATIONS, quotePrice } from "@/lib/ads/slots";
import { TEMPLATES, TEMPLATE_MAP, CATEGORY_LABEL, PALETTES, templatesForFormat } from "@/lib/ads/templates";
import { LANGS, translateCreative } from "@/lib/ads/translate";
import {
  FONTS, ANIMS, BORDERS, SHADOWS, TEXTURES, IMAGE_FILTERS,
  DEFAULT_STYLE, type CreativeStyle, type AnimKey, type BorderKey,
  type FontKey, type ImageFilter, type ShadowKey, type TextureKey,
} from "@/lib/ads/style";
import type { AdFormat, CreativeData, CreativeKind, LangCode, PaletteKey } from "@/lib/ads/types";

/* ------------------------------ controls ------------------------------ */

function Range({
  label, value, min, max, step = 1, unit = "", onChange,
}: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <label className="ctl">
      <span>{label}<b className="font-mono-x text-[10px] text-ink">{value}{unit}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Select<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: { key: T; name: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="ctl">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}
      </select>
    </label>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="ctl">
      <span>{label}<b className="font-mono-x text-[9px] text-ink-soft">{value}</b></span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Text({ label, value, onChange, area }: { label: string; value: string; onChange: (v: string) => void; area?: boolean }) {
  return (
    <label className="ctl">
      <span>{label}</span>
      {area
        ? <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
        : <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

function ImageUpload({ onImage, current }: { onImage: (dataUrl: string) => void; current?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("শুধু ছবি আপলোড করুন (JPG, PNG, WebP)।");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage("ছবির আকার ৮ MB-এর মধ্যে রাখুন।");
      return;
    }
    setBusy(true);
    setMessage("ছবি অপ্টিমাইজ হচ্ছে…");
    try {
      const source = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("file read failed"));
        reader.readAsDataURL(file);
      });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("image decode failed"));
        image.src = source;
      });
      const max = 1400;
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas not available");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const optimized = canvas.toDataURL("image/webp", 0.82);
      onImage(optimized);
      setMessage(`অপ্টিমাইজড · ${canvas.width} × ${canvas.height} · WebP`);
    } catch {
      setMessage("ছবি প্রসেস করা যায়নি। একটি URL ব্যবহার করুন।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="studio-image-upload">
      <label className="image-upload-drop">
        <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(e) => void handleFile(e.target.files?.[0])} />
        <span className="image-upload-icon">↥</span>
        <span><b>{busy ? "প্রসেস হচ্ছে…" : "ছবি আপলোড করুন"}</b><small>JPG · PNG · WebP · সর্বোচ্চ ৮ MB</small></span>
      </label>
      {current ? <div className="image-upload-preview"><img src={current} alt="Creative preview" /><button type="button" onClick={() => { onImage(""); setMessage("ছবি সরানো হয়েছে"); }}>সরান</button></div> : null}
      {message ? <p className="image-upload-note">{message}</p> : null}
    </div>
  );
}

function Chips<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: { key: T; name: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="ctl">
      <span>{label}</span>
      <div className="chipset">
        {options.map((o) => (
          <button key={o.key} type="button" data-on={o.key === value ? "1" : "0"} onClick={() => onChange(o.key)}>
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-ink/12 px-2 pt-2">
      {tabs.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`px-2.5 py-1.5 text-[11.5px] font-bold transition-colors ${
            active === t ? "border-b-2 border-alizarin text-ink" : "text-ink-soft hover:text-ink"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/* ================================================================== */

export interface StudioProps {
  mode: "client" | "admin";
  advertiserId: number;
  initialSlot?: string;
  initialTemplate?: string;
  /** server action: receives a FormData with json payload */
  action: (fd: FormData) => void;
  submitLabel: string;
}

const DEVICES = [
  { key: "desktop", name: "ডেস্কটপ", w: 980 },
  { key: "tablet", name: "ট্যাবলেট", w: 680 },
  { key: "mobile", name: "মোবাইল", w: 360 },
];

export default function CreativeStudio({
  mode, advertiserId, initialSlot, initialTemplate, action, submitLabel,
}: StudioProps) {
  const [slotKey, setSlotKey] = useState(initialSlot && SLOT_MAP[initialSlot] ? initialSlot : SLOTS[1].key);
  const slot = SLOT_MAP[slotKey];
  const format = slot.format as AdFormat;
  const compatible = useMemo(() => templatesForFormat(format), [format]);

  const [templateId, setTemplateId] = useState(() => {
    if (initialTemplate && TEMPLATE_MAP[initialTemplate]) return initialTemplate;
    return compatible[0]?.id ?? TEMPLATES[0].id;
  });
  const tpl = TEMPLATE_MAP[templateId] ?? compatible[0] ?? TEMPLATES[0];
  const basePal = PALETTES[tpl.palette];

  const [palette, setPalette] = useState<PaletteKey>(tpl.palette);
  const [data, setData] = useState<CreativeData>(tpl.data);
  const [style, setStyle] = useState<CreativeStyle>({ ...DEFAULT_STYLE });
  const [lang, setLang] = useState<LangCode>("bn");
  const [days, setDays] = useState(7);
  const [device, setDevice] = useState("desktop");
  const [tab, setTab] = useState("কনটেন্ট");
  const [name, setName] = useState(`${tpl.nameBn}`);
  const [free, setFree] = useState(false);
  const [pending, start] = useTransition();

  const set = <K extends keyof CreativeData>(k: K, v: CreativeData[K]) => setData((d) => ({ ...d, [k]: v }));
  const sty = <K extends keyof CreativeStyle>(k: K, v: CreativeStyle[K]) => setStyle((s) => ({ ...s, [k]: v }));

  function pickTemplate(id: string) {
    const t = TEMPLATE_MAP[id];
    if (!t) return;
    setTemplateId(id);
    setData(t.data);
    setPalette(t.palette);
    setName(t.nameBn);
  }

  function pickSlot(k: string) {
    setSlotKey(k);
    const f = SLOT_MAP[k].format;
    if (!tpl.formats.includes(f)) {
      const next = templatesForFormat(f)[0];
      if (next) pickTemplate(next.id);
    }
  }

  const preview = lang === "bn" ? data : translateCreative(data, lang);
  const dir = LANGS.find((l) => l.code === lang)?.dir ?? "ltr";
  const q = quotePrice(slotKey, days, tpl.uplift);
  const deviceW = DEVICES.find((d) => d.key === device)!.w;

  const payload = JSON.stringify({ slotKey, templateId, palette, data, style, lang, days, name, free, advertiserId });

  return (
    <form
      action={(fd) => start(() => action(fd))}
      className="studio-grid"
    >
      <input type="hidden" name="payload" value={payload} />

      {/* ====================== LEFT: content + design ====================== */}
      <div className="studio-panel">
        <Tabs tabs={["কনটেন্ট", "রং", "ফন্ট", "ফ্রেম", "ছবি", "মোশন"]} active={tab} onChange={setTab} />
        <div className="studio-scroll p-3">

          {tab === "কনটেন্ট" ? (
            <>
              <Text label="ক্রিয়েটিভের নাম (অভ্যন্তরীণ)" value={name} onChange={setName} />
              <Text label="ব্র্যান্ড" value={data.brand ?? ""} onChange={(v) => set("brand", v)} />
              <Text label="ব্যাজ" value={data.badge ?? ""} onChange={(v) => set("badge", v)} />
              <Text label="হেডলাইন" value={data.headline ?? ""} onChange={(v) => set("headline", v)} area />
              <Text label="সাব-হেডলাইন" value={data.sub ?? ""} onChange={(v) => set("sub", v)} area />
              <Text label="বডি টেক্সট" value={data.body ?? ""} onChange={(v) => set("body", v)} area />
              <div className="grid grid-cols-2 gap-2">
                <Text label="মূল্য" value={data.price ?? ""} onChange={(v) => set("price", v)} />
                <Text label="কাটা দাম" value={data.strikePrice ?? ""} onChange={(v) => set("strikePrice", v)} />
                <Text label="ছাড়" value={data.discount ?? ""} onChange={(v) => set("discount", v)} />
                <Text label="কুপন কোড" value={data.code ?? ""} onChange={(v) => set("code", v)} />
                <Text label="তারিখ" value={data.date ?? ""} onChange={(v) => set("date", v)} />
                <Text label="সময়" value={data.time ?? ""} onChange={(v) => set("time", v)} />
              </div>
              <Text label="স্থান" value={data.place ?? ""} onChange={(v) => set("place", v)} />
              <Text label="ফোন" value={data.phone ?? ""} onChange={(v) => set("phone", v)} />
              <Text label="বাটনের লেখা" value={data.cta ?? ""} onChange={(v) => set("cta", v)} />
              <Text label="ল্যান্ডিং URL" value={data.url ?? ""} onChange={(v) => set("url", v)} />
              <Text label="ফুটনোট" value={data.footnote ?? ""} onChange={(v) => set("footnote", v)} />
              {tpl.kind === "custom-html" ? (
                <Text label="কাস্টম HTML" value={data.html ?? ""} onChange={(v) => set("html", v)} area />
              ) : null}
            </>
          ) : null}

          {tab === "রং" ? (
            <>
              <Chips
                label="প্রিসেট প্যালেট"
                value={palette}
                options={Object.values(PALETTES).map((p) => ({ key: p.key, name: p.name }))}
                onChange={(v) => { setPalette(v); setStyle((s) => ({ ...s, bg: undefined, fg: undefined, accent: undefined, accentFg: undefined, muted: undefined, borderColor: undefined })); }}
              />
              <div className="my-2 h-px bg-ink/10" />
              <div className="grid grid-cols-2 gap-2">
                <Color label="ব্যাকগ্রাউন্ড" value={style.bg ?? basePal.bg} onChange={(v) => sty("bg", v)} />
                <Color label="টেক্সট" value={style.fg ?? basePal.fg} onChange={(v) => sty("fg", v)} />
                <Color label="অ্যাকসেন্ট" value={style.accent ?? basePal.accent} onChange={(v) => sty("accent", v)} />
                <Color label="অ্যাকসেন্ট টেক্সট" value={style.accentFg ?? basePal.accentFg} onChange={(v) => sty("accentFg", v)} />
                <Color label="সেকেন্ডারি টেক্সট" value={style.muted ?? "#6b6250"} onChange={(v) => sty("muted", v)} />
                <Color label="বর্ডার" value={style.borderColor ?? "#1a140d"} onChange={(v) => sty("borderColor", v)} />
              </div>
              <label className="ctl mt-2 flex items-center gap-2">
                <input type="checkbox" checked={!!style.gradient} onChange={(e) => sty("gradient", e.target.checked)} className="h-4 w-4" />
                <span className="!mb-0">গ্রেডিয়েন্ট ব্যাকগ্রাউন্ড</span>
              </label>
              {style.gradient ? (
                <>
                  <Color label="গ্রেডিয়েন্ট শেষ রং" value={style.gradientTo ?? basePal.accent} onChange={(v) => sty("gradientTo", v)} />
                  <Range label="কোণ" value={style.gradientAngle ?? 135} min={0} max={360} unit="°" onChange={(v) => sty("gradientAngle", v)} />
                </>
              ) : null}
            </>
          ) : null}

          {tab === "ফন্ট" ? (
            <>
              <Select label="হেডলাইন ফন্ট" value={(style.headFont ?? "serif-bn") as FontKey}
                options={FONTS.map((f) => ({ key: f.key, name: f.name }))} onChange={(v) => sty("headFont", v)} />
              <Select label="বডি ফন্ট" value={(style.bodyFont ?? "sans-bn") as FontKey}
                options={FONTS.map((f) => ({ key: f.key, name: f.name }))} onChange={(v) => sty("bodyFont", v)} />
              <Range label="হেডলাইন সাইজ" value={style.headSize ?? 17} min={10} max={44} unit="px" onChange={(v) => sty("headSize", v)} />
              <Range label="বডি সাইজ" value={style.bodySize ?? 11.5} min={8} max={20} step={0.5} unit="px" onChange={(v) => sty("bodySize", v)} />
              <Range label="হেডলাইন ওজন" value={style.headWeight ?? 800} min={400} max={900} step={100} onChange={(v) => sty("headWeight", v)} />
              <Range label="অক্ষর ব্যবধান" value={style.letterSpacing ?? 0} min={-5} max={30} unit="/100em" onChange={(v) => sty("letterSpacing", v)} />
              <Range label="লাইন উচ্চতা" value={style.lineHeight ?? 125} min={90} max={200} unit="%" onChange={(v) => sty("lineHeight", v)} />
              <Chips label="টেক্সট কেস" value={(style.headTransform ?? "none") as "none" | "uppercase" | "capitalize"}
                options={[{ key: "none", name: "সাধারণ" }, { key: "uppercase", name: "বড় হাতের" }, { key: "capitalize", name: "Title Case" }] as const}
                onChange={(v) => sty("headTransform", v)} />
              <Chips label="অ্যালাইনমেন্ট" value={(style.align ?? "left") as "left" | "center" | "right"}
                options={[{ key: "left", name: "বাঁ" }, { key: "center", name: "মাঝ" }, { key: "right", name: "ডান" }] as const}
                onChange={(v) => sty("align", v)} />
              <div className="chipset mt-1">
                <button type="button" data-on={style.headItalic ? "1" : "0"} onClick={() => sty("headItalic", !style.headItalic)}><i>ইটালিক</i></button>
                <button type="button" data-on={style.headUnderline ? "1" : "0"} onClick={() => sty("headUnderline", !style.headUnderline)}><u>আন্ডারলাইন</u></button>
              </div>
            </>
          ) : null}

          {tab === "ফ্রেম" ? (
            <>
              <Select label="বর্ডার" value={(style.border ?? "solid") as BorderKey} options={BORDERS} onChange={(v) => sty("border", v)} />
              <Range label="কর্নার রেডিয়াস" value={style.radius ?? 0} min={0} max={28} unit="px" onChange={(v) => sty("radius", v)} />
              <Select label="শ্যাডো" value={(style.shadow ?? "none") as ShadowKey} options={SHADOWS} onChange={(v) => sty("shadow", v)} />
              <Range label="প্যাডিং" value={style.padding ?? 16} min={4} max={40} unit="px" onChange={(v) => sty("padding", v)} />
              <Select label="টেক্সচার" value={(style.texture ?? "none") as TextureKey} options={TEXTURES} onChange={(v) => sty("texture", v)} />
            </>
          ) : null}

          {tab === "ছবি" ? (
            <>
              <ImageUpload current={data.imageUrl} onImage={(v) => set("imageUrl", v)} />
              <Text label="অথবা ছবির URL" value={data.imageUrl ?? ""} onChange={(v) => set("imageUrl", v)} />
              <div className="chipset mb-3">
                {["", "https://picsum.photos/seed/hoichoi1/800/600", "https://picsum.photos/seed/hoichoi2/800/600", "https://picsum.photos/seed/hoichoi3/800/600"].map((u, i) => (
                  <button key={i} type="button" data-on={data.imageUrl === u ? "1" : "0"} onClick={() => set("imageUrl", u)}>
                    {i === 0 ? "ছবি নেই" : `নমুনা ${i}`}
                  </button>
                ))}
              </div>
              <Chips label="ফিট" value={(style.imageFit ?? "cover") as "cover" | "contain" | "fill"}
                options={[{ key: "cover", name: "কভার" }, { key: "contain", name: "কনটেইন" }, { key: "fill", name: "ফিল" }] as const}
                onChange={(v) => sty("imageFit", v)} />
              <Select label="ফিল্টার" value={(style.imageFilter ?? "none") as ImageFilter}
                options={IMAGE_FILTERS.map((f) => ({ key: f.key, name: f.name }))} onChange={(v) => sty("imageFilter", v)} />
              <Range label="জুম" value={style.imageZoom ?? 100} min={100} max={200} unit="%" onChange={(v) => sty("imageZoom", v)} />
              <Range label="অনুভূমিক অবস্থান" value={style.imagePosX ?? 50} min={0} max={100} unit="%" onChange={(v) => sty("imagePosX", v)} />
              <Range label="উল্লম্ব অবস্থান" value={style.imagePosY ?? 50} min={0} max={100} unit="%" onChange={(v) => sty("imagePosY", v)} />
              <Range label="অস্বচ্ছতা" value={style.imageOpacity ?? 100} min={10} max={100} unit="%" onChange={(v) => sty("imageOpacity", v)} />
              <Range label="ছবির রেডিয়াস" value={style.imageRadius ?? 0} min={0} max={99} unit="px" onChange={(v) => sty("imageRadius", v)} />
            </>
          ) : null}

          {tab === "মোশন" ? (
            <>
              <Select label="প্রবেশ অ্যানিমেশন" value={(style.anim ?? "fade-up") as AnimKey}
                options={ANIMS.filter((a) => a.group === "entrance").map((a) => ({ key: a.key, name: a.name }))}
                onChange={(v) => sty("anim", v)} />
              <Select label="চলমান ইফেক্ট" value={(style.animIdle ?? "none") as AnimKey}
                options={[{ key: "none" as AnimKey, name: "কোনোটিই নয়" }, ...ANIMS.filter((a) => a.group === "idle").map((a) => ({ key: a.key, name: a.name }))]}
                onChange={(v) => sty("animIdle", v)} />
              <Range label="গতি" value={style.animSpeed ?? 600} min={150} max={2000} step={50} unit="ms" onChange={(v) => sty("animSpeed", v)} />
              <label className="ctl flex items-center gap-2">
                <input type="checkbox" checked={!!style.hoverLift} onChange={(e) => sty("hoverLift", e.target.checked)} className="h-4 w-4" />
                <span className="!mb-0">হোভারে উঠে আসবে</span>
              </label>
              <p className="mt-2 border border-ink/15 bg-ink/[0.03] p-2 text-[11px] leading-relaxed text-ink-soft">
                সব অ্যানিমেশন <span className="font-mono-x">prefers-reduced-motion</span> মানে — যেসব পাঠক
                মোশন বন্ধ রেখেছেন তাঁদের কাছে স্থির দেখাবে।
              </p>
            </>
          ) : null}
        </div>
      </div>

      {/* ====================== CENTER: live stage ====================== */}
      <div className="studio-panel">
        <div className="studio-panel-head">
          <span className="flex items-center gap-2">
            <span className="live-dot text-alizarin" />
            <b className="font-serif-bn text-[14px]">রিয়েল-টাইম প্রিভিউ</b>
          </span>
          <span className="flex flex-wrap items-center gap-1">
            {DEVICES.map((d) => (
              <button key={d.key} type="button" onClick={() => setDevice(d.key)}
                className={`px-2 py-1 text-[10.5px] font-bold ${device === d.key ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}>
                {d.name}
              </button>
            ))}
          </span>
        </div>

        <div className="stage">
          <div style={{ width: Math.min(deviceW, 1000), maxWidth: "100%" }} dir={dir}>
            <div className="relative">
              <span className="absolute top-1 right-1 z-10 border border-ink/30 bg-paper/90 px-1.5 py-0.5 font-mono-x text-[8px] tracking-[0.2em] text-ink-soft uppercase">
                বিজ্ঞাপন · AD
              </span>
              <div key={`${templateId}-${JSON.stringify(style)}-${lang}`} className={`ad-reserve-${format}`}>
                <Creative kind={tpl.kind as CreativeKind} palette={palette} data={preview} format={format} style={style} />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-ink/12 p-3">
          <div className="ctl">
            <span>ভাষা — লিখুন একটিতে, বাকিগুলো অটো</span>
            <div className="chipset">
              {LANGS.map((l) => (
                <button key={l.code} type="button" data-on={l.code === lang ? "1" : "0"} onClick={() => setLang(l.code)}>
                  {l.native}
                </button>
              ))}
            </div>
          </div>

          <div className="ctl">
            <span>স্লট — {slot.area}</span>
            <select value={slotKey} onChange={(e) => pickSlot(e.target.value)}>
              {SLOTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.existing ? "● " : "○ "}{s.label} — {FORMAT_LABEL[s.format]} · ৳{s.dayRate}/দিন
                </option>
              ))}
            </select>
          </div>

          <div className="ctl">
            <span>টেমপ্লেট — {CATEGORY_LABEL[tpl.category]} · {compatible.length}টি উপলব্ধ</span>
            <select value={templateId} onChange={(e) => pickTemplate(e.target.value)}>
              {compatible.map((t) => (
                <option key={t.id} value={t.id}>{t.nameBn} — {CATEGORY_LABEL[t.category]}{t.premium ? ` (+৳${t.uplift})` : ""}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ====================== RIGHT: quote + submit ====================== */}
      <div className="studio-panel">
        <div className="studio-panel-head">
          <b className="font-serif-bn text-[14px]">বুকিং ও মূল্য</b>
          <span className="c-pill st-active">LIVE QUOTE</span>
        </div>
        <div className="studio-scroll p-3">
          <div className="ctl">
            <span>মেয়াদ</span>
            <div className="chipset">
              {DURATIONS.map((d) => (
                <button key={d.days} type="button" data-on={d.days === days ? "1" : "0"} onClick={() => setDays(d.days)}>
                  {d.label}{d.off ? <span className="ml-1 text-[9px] text-lime">-{Math.round(d.off * 100)}%</span> : null}
                </button>
              ))}
            </div>
          </div>

          <dl className="space-y-1.5 border border-ink/18 bg-paper-deep/40 p-3 text-[12.5px]">
            <div className="flex justify-between"><dt className="text-ink-soft">স্লট রেট × {days}</dt><dd className="font-mono-x">৳{q.gross.toLocaleString()}</dd></div>
            <div className="flex justify-between text-lime"><dt>ছাড় {Math.round(q.off * 100)}%</dt><dd className="font-mono-x">−৳{q.discount.toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">ভ্যাট ১৫%</dt><dd className="font-mono-x">৳{q.vat.toLocaleString()}</dd></div>
            <div className="flex justify-between border-t border-ink/20 pt-1.5 text-[16px] font-black">
              <dt>মোট</dt><dd className="font-mono-x tick-num" key={q.total}>৳{(free ? 0 : q.total).toLocaleString()}</dd>
            </div>
          </dl>

          <div className="mt-3 space-y-1.5 border border-ink/15 p-3 text-[11.5px] text-ink-soft">
            <p className="flex justify-between"><span>আনুমানিক ইম্প্রেশন</span><b className="font-mono-x text-ink">{(slot.heat * 420 * days).toLocaleString()}</b></p>
            <p className="flex justify-between"><span>আনুমানিক CTR</span><b className="font-mono-x text-ink">{(slot.heat / 42).toFixed(2)}%</b></p>
            <p className="flex justify-between"><span>CPM</span><b className="font-mono-x text-ink">৳{Math.round((q.total / (slot.heat * 420 * days)) * 1000)}</b></p>
            <div className="mt-2 h-1.5 w-full bg-ink/10">
              <div className="h-full bg-lime transition-[width] duration-500" style={{ width: `${slot.heat}%` }} />
            </div>
            <p className="font-mono-x text-[9px] tracking-[0.16em] uppercase">চাহিদা স্কোর {slot.heat}/100</p>
          </div>

          {mode === "admin" ? (
            <label className="ctl mt-3 flex items-center gap-2">
              <input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} className="h-4 w-4" />
              <span className="!mb-0">বিনামূল্যে বসান (জনস্বার্থ)</span>
            </label>
          ) : null}

          <button type="submit" disabled={pending} className="c-btn c-btn-lime mt-3 w-full py-3 disabled:opacity-60">
            {pending ? "সেভ হচ্ছে…" : submitLabel}
          </button>

          <p className="mt-2 text-center text-[10.5px] text-ink-soft">
            {mode === "admin"
              ? "সরাসরি লাইভ হবে · priority 8 · অডিট লগে নথিভুক্ত"
              : "পেমেন্ট নিশ্চিত হলেই স্বয়ংক্রিয়ভাবে লাইভ"}
          </p>

          <div className="mt-4 border-t border-ink/12 pt-3">
            <p className="c-label">স্টাইল JSON (ডেভের জন্য)</p>
            <pre className="mt-1.5 max-h-32 overflow-auto border border-ink/15 bg-ink/[0.03] p-2 font-mono-x text-[9px] leading-relaxed text-ink-soft">
{JSON.stringify(style, null, 1)}
            </pre>
          </div>
        </div>
      </div>
    </form>
  );
}
