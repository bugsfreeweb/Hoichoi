import { notFound } from "next/navigation";
import { getSettings } from "@/lib/store";
import { THEME_MAP } from "@/lib/themes";
import type { ThemeId } from "@/lib/types";
import { ThemeView } from "@/components/themes/registry";
import { PreviewBar } from "@/components/PreviewBar";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  if (!(theme in THEME_MAP)) notFound();
  const id = theme as ThemeId;
  const s = await getSettings();

  if (!s.security.allowPreview && id !== s.activeTheme) notFound();

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <ThemeView id={id} s={s} />
      <PreviewBar id={id} s={s} />
    </main>
  );
}
