"use client";

import Link from "next/link";
import { useState } from "react";

/** ক্যাটাগরি-ভিত্তিক কনটেন্ট ওয়ার্নিং গেট (শিশু যৌন নির্যাতন)। */
export function ContentWarningGate({
  warningText,
  children,
}: {
  warningText: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (open) return <>{children}</>;
  return (
    <div className="mt-6 rounded-md border-2 border-amberx bg-amberx/15 p-5">
      <p className="text-[13.5px] font-semibold text-ink">
        ⚠️ {warningText}
      </p>
      <p className="mt-2 text-[12.5px] text-ink-soft">
        এই প্রবন্ধে সংবেদনশীল বিষয়বস্তু রয়েছে যা পড়তে কষ্টকর হতে পারে। চালিয়ে পড়তে নিচের বাটনে ক্লিক করুন।
      </p>
      <button
        onClick={() => setOpen(true)}
        className="mt-4 border-2 border-ink bg-paper px-5 py-2 text-[13px] font-bold transition hover:bg-ink hover:text-paper"
      >
        পড়া চালিয়ে যান →
      </button>
      <p className="mt-2">
        <Link href="/" className="text-[12px] font-bold text-alizarin hover:text-alizarin-deep">← হোমে ফিরে যান</Link>
      </p>
    </div>
  );
}