"use client";

import { removeLiveEvent } from "@/app/admin/(console)/live/actions";

export function LiveDeleteButton({ id }: { id: string }) {
  return (
    <form action={removeLiveEvent.bind(null, id)}>
      <button
        type="submit"
        onClick={(event) => {
          if (!window.confirm("এই লাইভ ইভেন্ট ও তার আপডেট/মন্তব্য স্থায়ীভাবে মুছে যাবে। চালিয়ে যাবেন?")) {
            event.preventDefault();
          }
        }}
        className="border border-alizarin/50 px-3 py-2 text-[12px] font-bold text-alizarin hover:bg-alizarin hover:text-white"
      >
        ইভেন্ট মুছুন
      </button>
    </form>
  );
}
