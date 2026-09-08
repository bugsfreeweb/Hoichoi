export function PageSection({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 md:px-8">
      <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-alizarin uppercase">▚ {kicker}</p>
      <h1 className="mt-2 font-serif-bn text-[40px] font-black text-ink md:text-[52px]">{title}</h1>
      <div className="mt-8 space-y-5 text-[15px] leading-[1.8] text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_strong]:font-bold [&_h2]:font-serif-bn [&_h2]:text-[24px] [&_h2]:font-extrabold [&_h2]:mt-8">
        {children}
      </div>
    </section>
  );
}