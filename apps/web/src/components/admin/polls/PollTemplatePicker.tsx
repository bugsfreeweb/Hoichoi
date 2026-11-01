"use client";

const TEMPLATES = [
  { key: "bar", name: "লাইভ বার", description: "পরিষ্কার ফলাফল বার", accent: "#d2202c" },
  { key: "battle", name: "মুখোমুখি", description: "দুই পক্ষের তুলনা", accent: "#2563eb" },
  { key: "donut", name: "ডোনাট", description: "শতাংশভিত্তিক ফল", accent: "#0d9488" },
  { key: "card", name: "কার্ড গ্রিড", description: "ভিজ্যুয়াল অপশন কার্ড", accent: "#7c3aed" },
  { key: "rank", name: "র‌্যাঙ্কিং", description: "ক্রম ও অবস্থান", accent: "#b45309" },
  { key: "meter", name: "মিটার", description: "এক নজরে মোট ফল", accent: "#16a34a" },
] as const;

function Sketch({ template, accent }: { template: string; accent: string }) {
  if (template === "battle") {
    return <div className="flex h-9 items-center gap-1"><span className="h-5 flex-1 bg-blue-500/25" /><span className="text-[8px] font-black text-ink-soft">VS</span><span className="h-5 flex-1 bg-red-500/25" /></div>;
  }
  if (template === "donut") {
    return <div className="flex h-9 items-center justify-center"><span className="h-8 w-8 rounded-full border-[6px]" style={{ borderColor: `${accent} ${accent} #d1d5db #d1d5db` }} /></div>;
  }
  if (template === "card") {
    return <div className="grid h-9 grid-cols-3 gap-1">{[0, 1, 2, 3, 4, 5].map((item) => <span key={item} className="border border-ink/20 bg-ink/5" />)}</div>;
  }
  if (template === "rank") {
    return <div className="flex h-9 flex-col justify-center gap-1">{[88, 66, 45].map((width, index) => <span key={index} className="flex items-center gap-1"><i className="w-3 text-[8px] not-italic">{index + 1}</i><i className="h-1.5 rounded-full" style={{ width: `${width}%`, background: accent }} /></span>)}</div>;
  }
  if (template === "meter") {
    return <div className="flex h-9 items-center"><span className="flex h-5 w-full overflow-hidden">{[38, 27, 21, 14].map((width, index) => <i key={index} style={{ width: `${width}%`, background: [accent, "#2563eb", "#0d9488", "#b45309"][index] }} />)}</span></div>;
  }
  return <div className="flex h-9 flex-col justify-center gap-1.5">{[88, 62, 42].map((width) => <i key={width} className="h-1.5 rounded-full" style={{ width: `${width}%`, background: accent }} />)}</div>;
}

export function PollTemplatePicker({
  name = "template",
  defaultValue = "bar",
}: {
  name?: string;
  defaultValue?: string;
}) {
  return (
    <fieldset>
      <legend className="field-label">ডিজাইন বেছে নিন</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {TEMPLATES.map((template, index) => (
          <label key={template.key} className="group relative grid cursor-pointer grid-cols-[48px_1fr] items-center gap-3 border border-ink/15 bg-card p-3 transition-colors hover:border-ink/45 has-[:checked]:border-ink has-[:checked]:bg-paper has-[:checked]:shadow-[3px_3px_0_0_var(--color-ink)]">
            <input
              type="radio"
              name={name}
              value={template.key}
              defaultChecked={defaultValue === template.key}
              className="peer sr-only"
            />
            <span className="absolute top-2 right-2 font-mono-x text-[8px] text-ink-soft">{String(index + 1).padStart(2, "0")}</span>
            <Sketch template={template.key} accent={template.accent} />
            <span className="min-w-0">
              <span className="block font-serif-bn text-[13px] font-bold text-ink">{template.name}</span>
              <span className="mt-0.5 block text-[10px] text-ink-soft">{template.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
