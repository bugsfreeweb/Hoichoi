import { Footer } from "@/components/Footer";
import { Masthead } from "@/components/Masthead";
import { BreakingTicker } from "@/components/BreakingTicker";
import { TopBar } from "@/components/TopBar";

/** পাবলিক সাইট শেল — টপ বার, টিকার, ম্যাস্টহেড, ফুটার। */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-chrome">
      <TopBar />
      <BreakingTicker />
      <Masthead />
      {children}
      <Footer />
    </div>
  );
}