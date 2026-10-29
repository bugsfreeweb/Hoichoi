"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import BlockCanvas from "@/components/ads/BlockCanvas";
import Creative from "@/components/ads/Creative";
import { SLOTS, SLOT_MAP, FORMAT_LABEL, DURATIONS, quotePrice } from "@/lib/ads/slots";
import { TEMPLATES, TEMPLATE_MAP, CATEGORY_LABEL, PALETTES } from "@/lib/ads/templates";
import { LANGS, translateCreative } from "@/lib/ads/translate";
import { DEFAULT_STYLE, FONTS, ANIMS, BORDERS, SHADOWS, TEXTURES, type CreativeStyle } from "@/lib/ads/style";
import {
  BLOCK_LIBRARY, BLOCK_META, LAYOUT_PRESETS, TEXT_VARIANTS,
  DEFAULT_LAYOUT, blockId, newBlock, layoutFromTemplate, templateToLayout,
  type Block, type BlockKind, type BlockLayout, type TextVariant,
} from "@/lib/ads/blocks";
import type { AdFormat, CreativeData, LangCode, PaletteKey } from "@/lib/ads/types";

/* ------------------------------------------------------------------ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="ctl">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Seg<T extends string | number>({
  label, value, options, onChange,
}: { label: string; value: T; options: { key: T; name: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="ctl">
      <span>{label}</span>
      <div className="seg">
        {options.map((o) => (
          <button key={String(o.key)} type="button" data-on={o.key === value ? "1" : "0"} onClick={() => onChange(o.key)}>
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */

export interface SavedTemplate {
  id: number;
  name: string;
  palette: string;
  layout: BlockLayout;
  style: CreativeStyle;
  sourceTemplateId: string | null;
  shared: boolean;
}

export default function BlockBuilder({
  mode,
  advertiserId,
  initialSlot,
  initialTemplate,
  action,
  submitLabel,
  saved = [],
  saveAction,
  deleteAction,
}: {
  mode: "client" | "admin";
  advertiserId: number;
  initialSlot?: string;
  initialTemplate?: string;
  action: (fd: FormData) => void;
  submitLabel: string;
  saved?: SavedTemplate[];
  saveAction?: (fd: FormData) => void;
  deleteAction?: (fd: FormData) => void;
}) {
  const [slotKey, setSlotKey] = useState(initialSlot && SLOT_MAP[initialSlot] ? initialSlot : SLOTS[1].key);
  const slot = SLOT_MAP[slotKey];
  const format = slot.format as AdFormat;

  const [palette, setPalette] = useState<PaletteKey>("newsprint");
  const [layout, setLayout] = useState<BlockLayout>({ ...DEFAULT_LAYOUT, blocks: [] });
  const [style, setStyle] = useState<CreativeStyle>({ ...DEFAULT_STYLE });
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("কাস্টম লেআউট");
  const [landing, setLanding] = useState("https://example.com");
  const [sourceTemplate, setSourceTemplate] = useState<string>(initialTemplate ?? "");
  const [days, setDays] = useState(7);
  const [lang, setLang] = useState<LangCode>("bn");
  const [free, setFree] = useState(false);
  const [device, setDevice] = useState(980);
  const [saveName, setSaveName] = useState("");
  const [shared, setShared] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [canvasOver, setCanvasOver] = useState(false);
  const [pending, start] = useTransition();
  const paletteDrag = useRef<BlockKind | null>(null);

  const sel = layout.blocks.find((b) => b.id === selected) ?? null;
  const selIdx = sel ? layout.blocks.findIndex((b) => b.id === sel.id) : -1;
  const q = quotePrice(slotKey, days);

  /* ------------------------- mutations ------------------------- */

  function patch(id: string, p: Partial<Block>) {
    setLayout((l) => ({ ...l, blocks: l.blocks.map((b) => (b.id === id ? { ...b, ...p } : b)) }));
  }
  function remove(id: string) {
    setLayout((l) => ({ ...l, blocks: l.blocks.filter((b) => b.id !== id) }));
    setSelected((s) => (s === id ? null : s));
  }
  function duplicate(id: string) {
    setLayout((l) => {
      const i = l.blocks.findIndex((b) => b.id === id);
      if (i < 0) return l;
      const copy = { ...l.blocks[i], id: blockId(l.blocks[i].kind) };
      const next = [...l.blocks];
      next.splice(i + 1, 0, copy);
      return { ...l, blocks: next };
    });
  }
  function move(from: number, to: number) {
    setLayout((l) => {
      if (from === to || from < 0 || to < 0 || from >= l.blocks.length || to >= l.blocks.length) return l;
      const next = [...l.blocks];
      const [b] = next.splice(from, 1);
      next.splice(to, 0, b);
      return { ...l, blocks: next };
    });
  }
  function addBlock(kind: BlockKind, at?: number) {
    const b = newBlock(kind, kind === "headline" ? "আপনার শিরোনাম" : BLOCK_META[kind].name);
    if (kind === "cta") b.url = landing;
    if (kind === "image") b.url = "https://picsum.photos/seed/hoichoi1/900/500";
    if (kind === "bullets") b.items = [{ k: "প্রথম পয়েন্ট", v: "" }, { k: "দ্বিতীয় পয়েন্ট", v: "" }];
    if (kind === "rows" || kind === "stats") b.items = [{ k: "লেবেল", v: "মান" }];
    if (kind === "countdown") b.items = [{ k: "০৫", v: "ঘণ্টা" }, { k: "৪২", v: "মিনিট" }];
    if (kind === "tags") b.items = [{ k: "ট্যাগ ১", v: "" }];
    setLayout((l) => {
      const next = [...l.blocks];
      next.splice(at == null ? next.length : at, 0, b);
      return { ...l, blocks: next };
    });
    setSelected(b.id);
  }

  /* ------------------------- drop handlers ------------------------- */

  function onPaletteDragStart(e: React.DragEvent, kind: BlockKind) {
    paletteDrag.current = kind;
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", kind);
  }

  function onCanvasDrop(e: React.DragEvent) {
    e.preventDefault();
    setCanvasOver(false);
    if (paletteDrag.current) {
      addBlock(paletteDrag.current);
      paletteDrag.current = null;
      return;
    }
    if (dragIdx != null) {
      move(dragIdx, layout.blocks.length - 1);
      setDragIdx(null);
    }
    setOverIdx(null);
  }

  function onCellDrop(e: React.DragEvent, to: number) {
    e.preventDefault();
    e.stopPropagation();
    setOverIdx(null);
    if (paletteDrag.current) {
      addBlock(paletteDrag.current, to);
      paletteDrag.current = null;
      return;
    }
    if (dragIdx != null) move(dragIdx, to);
    setDragIdx(null);
  }

  /* ------------------------- presets & conversion ------------------------- */

  function applyPreset(key: string) {
    const p = LAYOUT_PRESETS.find((x) => x.key === key);
    if (!p) return;
    const built = p.build();
    setLayout(built);
    setSelected(built.blocks[0]?.id ?? null);
    setName(p.name);
  }

  /** "Customise any template" — explodes a saved template into editable blocks. */
  function convertTemplate(id: string) {
    const tpl = TEMPLATE_MAP[id];
    if (!tpl) return;
    setSourceTemplate(id);
    setPalette(tpl.palette);
    const l = templateToLayout(tpl.kind, tpl.data);
    // make sure the primary CTA carries the template link
    l.blocks.forEach((b) => {
      if (b.kind === "cta" && !b.url) b.url = tpl.data.url ?? landing;
      if (b.kind === "phone" && !b.text) b.text = tpl.data.phone ?? "";
    });
    setLayout(l);
    setSelected(l.blocks[0]?.id ?? null);
    setName(`${tpl.nameBn} — কাস্টম`);
  }

  function translateItems(items: { k: string; v: string }[] | undefined, code: LangCode) {
    if (!items) return items;
    return items.map((it) => ({
      k: code === "bn" ? it.k : (translateCreative({ headline: it.k }, code).headline ?? it.k),
      v: code === "bn" ? it.v : (translateCreative({ headline: it.v }, code).headline ?? it.v),
    }));
  }

  const previewLayout: BlockLayout = useMemo(() => {
    if (lang === "bn") return layout;
    return {
      ...layout,
      blocks: layout.blocks.map((b) => ({
        ...b,
        text: b.text ? (translateCreative({ headline: b.text }, lang).headline ?? b.text) : b.text,
        items: translateItems(b.items, lang),
      })),
    };
  }, [layout, lang]);

  function loadSaved(t: SavedTemplate) {
    setLayout(t.layout);
    setPalette(t.palette as PaletteKey);
    setStyle({ ...DEFAULT_STYLE, ...(t.style ?? {}) });
    setName(t.name);
    setSourceTemplate(t.sourceTemplateId ?? "");
    setSelected(t.layout.blocks[0]?.id ?? null);
  }

  const savePayload = JSON.stringify({
    advertiserId, name: saveName || name, sourceTemplate, palette, layout, style, shared,
  });

  const payload = JSON.stringify({
    advertiserId, slotKey, palette, layout, style, lang, days, name, free,
    sourceTemplate, url: landing,
  });

  const dir = LANGS.find((l) => l.code === lang)?.dir ?? "ltr";

  return (
    <form action={(fd) => start(() => action(fd))} className="builder-shell">
      <input type="hidden" name="payload" value={payload} />

      {/* ======================= LEFT: palette ======================= */}
      <div className="studio-panel">
        <div className="studio-panel-head">
          <b className="font-serif-bn text-[13px]">ব্লক প্যালেট</b>
          <span className="c-label">DRAG →</span>
        </div>

        <div className="border-b border-ink/10 p-3">
          <Field label="শুরু করার ছাঁচ">
            <div className="chipset">
              {LAYOUT_PRESETS.map((p) => (
                <button key={p.key} type="button" onClick={() => applyPreset(p.key)} title={p.hint}>
                  {p.name}
                </button>
              ))}
            </div>
          </Field>

          <Field label="যেকোনো টেমপ্লেটকে কাস্টম করুন">
            <select
              value={sourceTemplate}
              onChange={(e) => {
                setSourceTemplate(e.target.value);
                if (e.target.value) convertTemplate(e.target.value);
              }}
            >
              <option value="">— টেমপ্লেট বাছুন —</option>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nameBn} · {CATEGORY_LABEL[t.category]}
                </option>
              ))}
            </select>
          </Field>
          {sourceTemplate ? (
            <p className="text-[10px] leading-relaxed text-ink-soft">
              ✓ <b>{TEMPLATE_MAP[sourceTemplate]?.nameBn}</b> ব্লকে ভেঙে দেওয়া হয়েছে — এখন যেকোনো অংশ
              সরান, বদলান বা নতুন ব্লক যোগ করুন।
            </p>
          ) : null}

          {saved.length ? (
            <div className="mt-3 border-t border-ink/10 pt-3">
              <p className="c-label mb-2">আমার সংরক্ষিত টেমপ্লেট ({saved.length})</p>
              {saved.map((t) => (
                <div key={t.id} className="mb-1.5 flex items-center gap-1.5">
                  <button type="button" className="palette-item flex-1" onClick={() => loadSaved(t)} title="লোড করুন">
                    <span className="palette-item-ico" aria-hidden="true">⠿</span>
                    <span>
                      {t.name}
                      <small>{t.layout.blocks.length} ব্লক · {t.shared ? "শেয়ারড" : "নিজস্ব"}</small>
                    </span>
                  </button>
                  {deleteAction ? (
                    <form action={deleteAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button type="submit" className="cell-btn" data-danger="1" title="মুছুন">✕</button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {saveAction ? (
            <div className="mt-3 border-t border-ink/10 pt-3">
              <p className="c-label mb-2">এই লেআউট টেমপ্লেট হিসেবে সেভ করুন</p>
              <input type="text" className="c-input" placeholder="টেমপ্লেটের নাম" value={saveName} onChange={(e) => setSaveName(e.target.value)} />
              {mode === "admin" ? (
                <label className="ctl mt-2 flex items-center gap-2">
                  <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="h-4 w-4" />
                  <span className="!mb-0">সবার জন্য শেয়ারড হাউস টেমপ্লেট</span>
                </label>
              ) : null}
              <button type="submit" formAction={saveAction} disabled={layout.blocks.length === 0} className="c-btn c-btn-ghost mt-2 w-full px-2 py-1.5 text-[10.5px] disabled:opacity-55">
                💾 টেমপ্লেট সেভ করুন
              </button>
              <input type="hidden" name="savePayload" value={savePayload} />
            </div>
          ) : null}
        </div>

        <div className="builder-palette p-3">
          <p className="c-label mb-2">ব্লক ({BLOCK_LIBRARY.length})</p>
          {BLOCK_LIBRARY.map((b) => (
            <div
              key={b.kind}
              className="palette-item"
              draggable
              onDragStart={(e) => onPaletteDragStart(e, b.kind)}
              onDoubleClick={() => addBlock(b.kind)}
              title="টেনে ক্যানভাসে ফেলুন অথবা ডাবল-ক্লিক করুন"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  addBlock(b.kind);
                }
              }}
            >
              <span className="palette-item-ico" aria-hidden="true">{b.icon}</span>
              <span>
                {b.name}
                <small>{b.hint}</small>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ======================= CENTER: canvas ======================= */}
      <div className="studio-panel">
        <div className="studio-panel-head">
          <span className="flex items-center gap-2">
            <span className="live-dot text-alizarin" />
            <b className="font-serif-bn text-[13px]">লেআউট ক্যানভাস</b>
            <span className="c-label">{layout.blocks.length} ব্লক · {slot.label}</span>
          </span>
          <span className="seg">
            {[980, 680, 360].map((w) => (
              <button key={w} type="button" data-on={device === w ? "1" : "0"} onClick={() => setDevice(w)}>
                {w === 980 ? "ডেস্কটপ" : w === 680 ? "ট্যাবলেট" : "মোবাইল"}
              </button>
            ))}
          </span>
        </div>

        <div className="p-3">
          {/* layout controls */}
          <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Seg label="কলাম" value={layout.cols} onChange={(v) => setLayout((l) => ({ ...l, cols: v as BlockLayout["cols"] }))}
              options={[{ key: 1, name: "১" }, { key: 2, name: "২" }, { key: 3, name: "৩" }, { key: 4, name: "৪" }]} />
            <Seg label="সাজানো" value={layout.direction} onChange={(v) => setLayout((l) => ({ ...l, direction: v as BlockLayout["direction"] }))}
              options={[{ key: "row", name: "পাশাপাশি" }, { key: "column", name: "উপর-নিচ" }]} />
            <Seg label="অ্যালাইন" value={layout.align} onChange={(v) => setLayout((l) => ({ ...l, align: v as BlockLayout["align"] }))}
              options={[{ key: "left", name: "বাঁ" }, { key: "center", name: "মাঝ" }, { key: "right", name: "ডান" }]} />
            <Seg label="উল্লম্ব" value={layout.valign} onChange={(v) => setLayout((l) => ({ ...l, valign: v as BlockLayout["valign"] }))}
              options={[{ key: "top", name: "উপর" }, { key: "center", name: "মাঝ" }, { key: "bottom", name: "নিচ" }]} />
          </div>

          <div
            className="builder-canvas"
            data-over={canvasOver ? "1" : "0"}
            onDragOver={(e) => { e.preventDefault(); setCanvasOver(true); }}
            onDragLeave={() => setCanvasOver(false)}
            onDrop={onCanvasDrop}
          >
            {layout.blocks.length === 0 ? (
              <div className="builder-empty">
                <div>
                  <p className="font-serif-bn text-[15px] font-bold text-ink">ক্যানভাস খালি</p>
                  <p className="mt-1.5 text-[11.5px]">
                    বাঁ দিক থেকে ব্লক টেনে এখানে ফেলুন, অথবা একটি টেমপ্লেট বেছে নিয়ে
                    সেটিকে কাস্টম করা শুরু করুন।
                  </p>
                </div>
              </div>
            ) : (
              <div className="canvas-grid" style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0,1fr))` }}>
                {layout.blocks.map((b, i) => (
                  <div
                    key={b.id}
                    className="canvas-cell"
                    style={{ gridColumn: `span ${Math.max(1, Math.min(layout.cols, b.span ?? layout.cols))} / span ${Math.max(1, Math.min(layout.cols, b.span ?? layout.cols))}` }}
                    data-selected={selected === b.id ? "1" : "0"}
                    data-drag={dragIdx === i ? "1" : "0"}
                    data-over={overIdx === i ? "1" : "0"}
                    draggable
                    onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                    onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
                    onDragLeave={() => setOverIdx((v) => (v === i ? null : v))}
                    onDrop={(e) => onCellDrop(e, i)}
                    onClick={() => setSelected(b.id)}
                  >
                    <div className="cell-toolbar">
                      <span className="cell-grip" title="টেনে সাজান">⠿</span>
                      <span className="cell-kind">{BLOCK_META[b.kind].name}</span>
                      <button type="button" className="cell-btn" title="উপরে" onClick={(e) => { e.stopPropagation(); move(i, i - 1); }}>↑</button>
                      <button type="button" className="cell-btn" title="নিচে" onClick={(e) => { e.stopPropagation(); move(i, i + 1); }}>↓</button>
                      <button type="button" className="cell-btn" title="প্রস্থ বাড়ান" onClick={(e) => { e.stopPropagation(); patch(b.id, { span: Math.min(layout.cols, (b.span ?? 1) + 1) }); }}>⇥</button>
                      <button type="button" className="cell-btn" title="প্রস্থ কমান" onClick={(e) => { e.stopPropagation(); patch(b.id, { span: Math.max(1, (b.span ?? 1) - 1) }); }}>⇤</button>
                      <button type="button" className="cell-btn" title={b.hidden ? "দেখান" : "লুকান"} onClick={(e) => { e.stopPropagation(); patch(b.id, { hidden: !b.hidden }); }}>{b.hidden ? "◌" : "◉"}</button>
                      <button type="button" className="cell-btn" title="নকল" onClick={(e) => { e.stopPropagation(); duplicate(b.id); }}>⧉</button>
                      <button type="button" className="cell-btn" data-danger="1" title="মুছুন" onClick={(e) => { e.stopPropagation(); remove(b.id); }}>✕</button>
                    </div>

                    <div className="pointer-events-none mt-2 opacity-95" style={{ filter: b.hidden ? "grayscale(1) opacity(.35)" : undefined }}>
                      <BlockCanvas layout={{ ...layout, padding: 6, gap: 6, blocks: [b] }} palette={palette} style={style} still />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-2 text-[10.5px] text-ink-soft">
            টেনে ফেলুন → নতুন ব্লক · ব্লকের উপর টেনে → ক্রম বদলান · ↑↓ বাটন দিয়েও সাজানো যায় (কীবোর্ড/টাচ বান্ধব)।
          </p>
        </div>

        {/* live slot preview */}
        <div className="border-t border-ink/12 p-3">
          <p className="c-label mb-2">স্লটে আসল আকার — {FORMAT_LABEL[format]} · {slot.size}</p>
          <div className="stage" style={{ minHeight: 190, padding: 14 }}>
            <div style={{ width: Math.min(device, 1000), maxWidth: "100%" }} dir={dir}>
              <div className="relative">
                <span className="absolute top-1 right-1 z-10 border border-ink/30 bg-paper/90 px-1.5 py-0.5 font-mono-x text-[8px] tracking-[0.2em] text-ink-soft uppercase">
                  বিজ্ঞাপন · AD
                </span>
                <div key={JSON.stringify({ layout: previewLayout.blocks.length, palette, style })} className={`ad-reserve-${format}`}>
                  <Creative
                    kind="custom-html"
                    palette={palette}
                    data={{} as CreativeData}
                    format={format}
                    style={style}
                    layout={previewLayout}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================= RIGHT: inspector ======================= */}
      <div className="studio-panel">
        <div className="studio-panel-head">
          <b className="font-serif-bn text-[13px]">ইন্সপেক্টর</b>
          {sel ? <span className="c-pill st-active">{BLOCK_META[sel.kind].name}</span> : <span className="c-label">ব্লক বাছুন</span>}
        </div>

        <div className="builder-inspector p-3">
          {sel ? (
            <>
              {BLOCK_META[sel.kind].fields.map((f) =>
                f.type === "list" ? (
                  <div className="ctl" key={f.key}>
                    <span>{f.label}
                      <button type="button" className="text-[9px] text-alizarin" onClick={() => patch(sel.id, { items: [...(sel.items ?? []), { k: "", v: "" }] })}>+ যোগ</button>
                    </span>
                    {(sel.items ?? []).map((it, i) => (
                      <span key={i} className="mb-1 flex gap-1">
                        <input
                          type="text"
                          className="c-input"
                          value={it.k}
                          onChange={(e) => {
                            const items = [...(sel.items ?? [])];
                            items[i] = { ...items[i], k: e.target.value };
                            patch(sel.id, { items });
                          }}
                        />
                        <button type="button" className="cell-btn" data-danger="1" onClick={() => patch(sel.id, { items: (sel.items ?? []).filter((_, x) => x !== i) })}>✕</button>
                      </span>
                    ))}
                  </div>
                ) : f.type === "kv" ? (
                  <div className="ctl" key={f.key}>
                    <span>{f.label}
                      <button type="button" className="text-[9px] text-alizarin" onClick={() => patch(sel.id, { items: [...(sel.items ?? []), { k: "", v: "" }] })}>+ যোগ</button>
                    </span>
                    {(sel.items ?? []).map((it, i) => (
                      <span key={i} className="mb-1 grid grid-cols-[1fr_1fr_auto] gap-1">
                        <input type="text" className="c-input" value={it.k} onChange={(e) => {
                          const items = [...(sel.items ?? [])]; items[i] = { ...items[i], k: e.target.value }; patch(sel.id, { items });
                        }} />
                        <input type="text" className="c-input" value={it.v} onChange={(e) => {
                          const items = [...(sel.items ?? [])]; items[i] = { ...items[i], v: e.target.value }; patch(sel.id, { items });
                        }} />
                        <button type="button" className="cell-btn" data-danger="1" onClick={() => patch(sel.id, { items: (sel.items ?? []).filter((_, x) => x !== i) })}>✕</button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <Field key={f.key} label={f.label}>
                    {f.type === "area" ? (
                      <textarea rows={3} value={sel.text ?? ""} onChange={(e) => patch(sel.id, { text: e.target.value })} />
                    ) : (
                      <input type="text" value={f.type === "url" ? (sel.url ?? "") : (sel.text ?? "")}
                        onChange={(e) => patch(sel.id, f.type === "url" ? { url: e.target.value } : { text: e.target.value })} />
                    )}
                  </Field>
                )
              )}

              <div className="my-3 h-px bg-ink/10" />

              <div className="ctl">
                <span>টেক্সট স্টাইল</span>
                <div className="variant-grid">
                  {TEXT_VARIANTS.map((v) => (
                    <button key={v.key} type="button" data-on={(sel.variant ?? "plain") === v.key ? "1" : "0"} onClick={() => patch(sel.id, { variant: v.key as TextVariant })}>
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>

              <Seg label="প্রস্থ (কলাম)" value={sel.span ?? 1}
                onChange={(v) => patch(sel.id, { span: Math.min(layout.cols, v) })}
                options={Array.from({ length: layout.cols }, (_, i) => ({ key: i + 1, name: String(i + 1) }))} />

              <Seg label="অ্যালাইন" value={sel.align ?? "left"} onChange={(v) => patch(sel.id, { align: v })}
                options={[{ key: "left", name: "বাঁ" }, { key: "center", name: "মাঝ" }, { key: "right", name: "ডান" }]} />

              <div className="grid grid-cols-2 gap-2">
                <Field label={`সাইজ ${sel.size ?? ""}px`}>
                  <input type="range" min={8} max={40} value={sel.size ?? 14} onChange={(e) => patch(sel.id, { size: Number(e.target.value) })} />
                </Field>
                <Field label={`ওজন ${sel.weight ?? ""}`}>
                  <input type="range" min={400} max={900} step={100} value={sel.weight ?? 700} onChange={(e) => patch(sel.id, { weight: Number(e.target.value) })} />
                </Field>
                <Field label={`প্যাডিং ${sel.pad ?? ""}`}>
                  <input type="range" min={0} max={24} value={sel.pad ?? 0} onChange={(e) => patch(sel.id, { pad: Number(e.target.value) })} />
                </Field>
                <Field label={`রেডিয়াস ${sel.radius ?? ""}`}>
                  <input type="range" min={0} max={24} value={sel.radius ?? 0} onChange={(e) => patch(sel.id, { radius: Number(e.target.value) })} />
                </Field>
                <Field label="টেক্সট রং"><input type="color" value={sel.color ?? "#181a1f"} onChange={(e) => patch(sel.id, { color: e.target.value })} /></Field>
                <Field label="ব্লক ব্যাকগ্রাউন্ড"><input type="color" value={sel.bg ?? "#ffffff"} onChange={(e) => patch(sel.id, { bg: e.target.value })} /></Field>
              </div>

              <div className="mt-2 flex gap-2">
                <button type="button" className="c-btn c-btn-ghost flex-1 px-2 py-1.5 text-[10.5px]" onClick={() => { patch(sel.id, { color: undefined, bg: undefined, pad: undefined, radius: undefined, size: undefined, weight: undefined, variant: "plain" }); }}>রিসেট</button>
                <button type="button" className="c-btn c-btn-ghost flex-1 px-2 py-1.5 text-[10.5px]" onClick={() => duplicate(sel.id)}>নকল</button>
                <button type="button" className="c-btn flex-1 px-2 py-1.5 text-[10.5px]" onClick={() => remove(sel.id)}>মুছুন</button>
              </div>
            </>
          ) : (
            <div className="inspector-empty">
              ক্যানভাসের একটি ব্লকে ক্লিক করলে এখানে তার সব নিয়ন্ত্রণ দেখা যাবে — লেখা, রং, আকার,
              টেক্সট অ্যানিমেশন ও প্রস্থ।
            </div>
          )}

          <div className="my-3 h-px bg-ink/10" />

          <p className="c-label mb-2">সামগ্রিক ডিজাইন</p>
          <Field label="প্যালেট">
            <div className="chipset">
              {Object.values(PALETTES).map((p) => (
                <button key={p.key} type="button" data-on={palette === p.key ? "1" : "0"} onClick={() => setPalette(p.key)}>
                  <span className="mr-1 inline-block h-2 w-2 align-middle" style={{ background: p.accent }} />
                  {p.name}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="গ্যাপ">
              <input type="range" min={0} max={28} value={layout.gap} onChange={(e) => setLayout((l) => ({ ...l, gap: Number(e.target.value) }))} />
            </Field>
            <Field label="প্যাডিং">
              <input type="range" min={4} max={34} value={layout.padding} onChange={(e) => setLayout((l) => ({ ...l, padding: Number(e.target.value) }))} />
            </Field>
            <Field label="ফন্ট">
              <select value={style.headFont} onChange={(e) => setStyle((s) => ({ ...s, headFont: e.target.value as CreativeStyle["headFont"] }))}>
                {FONTS.map((f) => <option key={f.key} value={f.key}>{f.name}</option>)}
              </select>
            </Field>
            <Field label="বর্ডার">
              <select value={style.border} onChange={(e) => setStyle((s) => ({ ...s, border: e.target.value as CreativeStyle["border"] }))}>
                {BORDERS.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="শ্যাডো">
              <select value={style.shadow} onChange={(e) => setStyle((s) => ({ ...s, shadow: e.target.value as CreativeStyle["shadow"] }))}>
                {SHADOWS.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="টেক্সচার">
              <select value={style.texture} onChange={(e) => setStyle((s) => ({ ...s, texture: e.target.value as CreativeStyle["texture"] }))}>
                {TEXTURES.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="প্রবেশ অ্যানিমেশন">
              <select value={style.anim} onChange={(e) => setStyle((s) => ({ ...s, anim: e.target.value as CreativeStyle["anim"] }))}>
                {ANIMS.filter((a) => a.group === "entrance").map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="চলমান ইফেক্ট">
              <select value={style.animIdle} onChange={(e) => setStyle((s) => ({ ...s, animIdle: e.target.value as CreativeStyle["animIdle"] }))}>
                {[{ key: "none", name: "নেই" }, ...ANIMS.filter((a) => a.group === "idle")].map((a) => (
                  <option key={a.key} value={a.key}>{a.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="my-3 h-px bg-ink/10" />

          <Field label="স্লট">
            <select value={slotKey} onChange={(e) => setSlotKey(e.target.value)}>
              {SLOTS.map((s) => (
                <option key={s.key} value={s.key}>{s.existing ? "● " : "○ "}{s.label} · ৳{s.dayRate}/দিন</option>
              ))}
            </select>
          </Field>
          <Field label="ক্রিয়েটিভের নাম">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="ল্যান্ডিং URL">
            <input type="text" value={landing} onChange={(e) => setLanding(e.target.value)} />
          </Field>
          <Field label="প্রিভিউ ভাষা">
            <div className="chipset">
              {LANGS.map((l) => (
                <button key={l.code} type="button" data-on={lang === l.code ? "1" : "0"} onClick={() => setLang(l.code)}>{l.native}</button>
              ))}
            </div>
          </Field>
          <Field label="মেয়াদ">
            <div className="chipset">
              {DURATIONS.map((d) => (
                <button key={d.days} type="button" data-on={days === d.days ? "1" : "0"} onClick={() => setDays(d.days)}>
                  {d.label}{d.off ? <span className="ml-1 text-[9px] text-lime">−{Math.round(d.off * 100)}%</span> : null}
                </button>
              ))}
            </div>
          </Field>

          <dl className="mt-2 space-y-1.5 border border-ink/18 bg-paper-deep/40 p-3 text-[12px]">
            <div className="flex justify-between"><dt className="text-ink-soft">সাবটোটাল</dt><dd className="font-mono-x">৳{q.gross.toLocaleString()}</dd></div>
            <div className="flex justify-between text-lime"><dt>ছাড়</dt><dd className="font-mono-x">−৳{q.discount.toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">ভ্যাট ১৫%</dt><dd className="font-mono-x">৳{q.vat.toLocaleString()}</dd></div>
            <div className="flex justify-between border-t border-ink/20 pt-1.5 text-[15px] font-black">
              <dt>মোট</dt><dd className="font-mono-x tick-num" key={q.total}>৳{(free ? 0 : q.total).toLocaleString()}</dd>
            </div>
          </dl>

          {mode === "admin" ? (
            <label className="ctl mt-3 flex items-center gap-2">
              <input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} className="h-4 w-4" />
              <span className="!mb-0">বিনামূল্যে (জনস্বার্থ)</span>
            </label>
          ) : null}

          <button type="submit" disabled={pending || layout.blocks.length === 0} className="c-btn c-btn-lime mt-3 w-full py-3 disabled:opacity-55">
            {pending ? "সেভ হচ্ছে…" : submitLabel}
          </button>
          {layout.blocks.length === 0 ? (
            <p className="mt-2 text-center text-[10px] text-ink-soft">সেভ করতে অন্তত একটি ব্লক যোগ করুন।</p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
