import { redirect } from "next/navigation";

/**
 * The section-variant / design engine now lives inside the Settings console
 * (ডিজাইন tab). This route is kept as a stable entry point so old bookmarks and
 * the desktop admin surface still land in the right place.
 */
export default function AdminAppearancePage() {
  redirect("/admin/settings?tab=design");
}
