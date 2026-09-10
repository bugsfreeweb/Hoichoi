const WORDS: Array<{ text: string; outline: boolean }> = [
  { text: "শিশু সুরক্ষা", outline: false },
  { text: "পরকীয়া অপরাধ", outline: true },
  { text: "নিখোঁজ শিশু", outline: false },
  { text: "যাচাইকৃত সংবাদ", outline: true },
];

function Item({ text, outline }: { text: string; outline: boolean }) {
  return (
    <span className={`font-serif-bn text-[44px] leading-none font-black whitespace-nowrap md:text-[64px] ${outline ? "text-outline-ink" : "text-ink/85"}`}>
      {text} <span className="text-alizarin">✳</span>
    </span>
  );
}

export function CategoryMarquee() {
  return (
    <div className="overflow-hidden border-b border-ink/15 py-6 select-none">
      <div className="marquee-track items-center gap-10" style={{ width: "max-content" }}>
        <span className="flex items-center gap-10">
          {WORDS.map((w) => (
            <Item key={`a-${w.text}`} {...w} />
          ))}
        </span>
        <span className="flex items-center gap-10">
          {WORDS.map((w) => (
            <Item key={`b-${w.text}`} {...w} />
          ))}
        </span>
      </div>
    </div>
  );
}