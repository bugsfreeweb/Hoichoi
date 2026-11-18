import { sidebarStyleOr, type SidebarStyleId } from "@hoichoi/shared-types";

/**
 * The desk's own copy of the sidebar template.
 *
 * The admin-owned value lives in the site config (`admin_sidebar_style`), which
 * is the source of truth the web console reads. The desk keeps a local mirror so
 * the panel is right on the first paint — and still right with no network — and
 * writes back to the shared config when the operator changes it, so the console
 * and the desk do not disagree.
 *
 * An unknown or missing value is the default template, never "no style": an
 * unstyled sidebar would look like a broken build instead of a choice.
 */
const KEY = "desk-sidebar-style";
const EVENT = "desk-sidebar-style";

export function getDeskSidebarStyle(): SidebarStyleId {
  try {
    return sidebarStyleOr(window.localStorage.getItem(KEY));
  } catch {
    return sidebarStyleOr(null);
  }
}

export function setDeskSidebarStyle(id: SidebarStyleId): void {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* The session keeps the style; a locked-down storage is not an error. */
  }
  window.dispatchEvent(new CustomEvent<SidebarStyleId>(EVENT, { detail: id }));
}

/** Subscribe to picker changes so the shell restyles without a reload. */
export function onDeskSidebarStyle(listener: (id: SidebarStyleId) => void): () => void {
  const handler = (e: Event) => listener(sidebarStyleOr((e as CustomEvent<SidebarStyleId>).detail));
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
