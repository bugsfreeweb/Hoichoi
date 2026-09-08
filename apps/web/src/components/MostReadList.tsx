import Link from "next/link";
import { mostRead } from "@hoichoi/db";
import type { CategoryMeta } from "@hoichoi/shared-types";
import { relativeBn } from "@/lib/bn";

export async function MostReadList({ cats }: { cats: CategoryMeta[] }) {
  let items: Awaited<ReturnType<typeof mostRead>> = [];
  try {
    items = await mostRead(5);
  } catch {
    items = [];
  }

  return (
    <div>
      <p className="border-b-2 border-ink pb-2 font-serif-bn text-[17px] font-extrabold">সর্বাধিক পঠিত</p>
      <ol className="mt-1 divide-y divide-ink/12">
        {items.map((post, i) => {
          const cat = cats.find((c) => c.slug === post.category);
          return (
            <li key={post.id}>
              <Link className="group flex items-start gap-4 py-4" href={`/post/${post.slug}`}>
                <span className="text-outline-ink mt-0.5 font-serif-bn text-3xl font-black leading-none">
                  {["১", "২", "৩", "৪", "৫"][i]}
                </span>
                <div>
                  <h4 className="link-sweep inline font-serif-bn text-[15.5px] font-bold leading-snug">
                    {post.title_bn}
                  </h4>
                  <p className="mt-1.5 flex items-center gap-2 text-[10.5px] text-ink-soft">
                    <span className="cat-dot" style={{ background: cat?.dot ? `#${cat.dot}` : "#4a4a4a" }}></span>
                    {cat?.displayNameBn ?? post.category} · {relativeBn(post.published_at)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}