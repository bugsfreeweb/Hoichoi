/**
 * Card / list view of the admin queues, as read from the URL.
 *
 * Kept out of `ViewToggle.tsx` on purpose: that file is a client component
 * (`"use client"`), and importing a helper from it into a server page makes Next
 * throw "Attempted to call … from the server but … is on the client". The pages
 * parse their own `searchParams`, so the parser must be server-safe; only the
 * toggle itself needs the client.
 */
export type QueueView = "card" | "list";

export function viewFromSearch(sp: Record<string, string | string[] | undefined>): QueueView {
  const raw = Array.isArray(sp.view) ? sp.view[0] : sp.view;
  return raw === "card" ? "card" : "list";
}
