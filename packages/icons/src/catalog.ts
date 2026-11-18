/**
 * The console's icon vocabulary.
 *
 * Emoji were used here and they were the weakest part of the interface: the same
 * glyph rendered as a colour photograph on Windows, a flat orange blob on
 * Android and a monochrome outline in some browsers, so twenty-one sidebar rows
 * had twenty-one different visual weights and no theme response at all. A nav is
 * read by shape, so the shapes have to come from one grid.
 *
 * Lucide is used — already a dependency of both apps, already used by several
 * console screens — at one stroke width and one size, so a row is a row. The
 * `icon` name is stored in the nav data (not the component) so the catalogue
 * stays serialisable and a test can prove every entry resolves.
 */
import {
  Archive,
  BadgeDollarSign,
  Cpu,
  Database,
  Flag,
  FolderTree,
  HardDriveDownload,
  Inbox,
  KeyRound,
  LayoutDashboard,
  ListOrdered,
  Lock,
  Megaphone,
  MessagesSquare,
  PenLine,
  Radio,
  Rss,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  TowerControl,
  TrendingUp,
  Vote,
  type LucideIcon,
} from "lucide-react";

/**
 * Every icon the console's navigation and the desk's tab strip can show.
 *
 * One map, two surfaces (the web console and the desktop app), so a screen is the
 * same glyph wherever an operator meets it. Adding a screen without adding an
 * entry here is a type error, not a blank square at runtime.
 */
export const NAV_ICONS = {
  dashboard: LayoutDashboard,
  sources: Rss,
  categories: FolderTree,
  posts: PenLine,
  live: Radio,
  notices: Megaphone,
  ads: BadgeDollarSign,
  polls: Vote,
  archive: Archive,
  moderation: ShieldCheck,
  comments: MessagesSquare,
  submissions: Inbox,
  removals: ShieldAlert,
  reports: Flag,
  providers: Cpu,
  media: Database,
  backup: HardDriveDownload,
  logs: ScrollText,
  security: Lock,
  setup: KeyRound,
  settings: SlidersHorizontal,
  // Desk-only tab strip.
  traffic: TrendingUp,
  watchlist: TowerControl,
  queue: ListOrdered,
  collector: Terminal,
} as const;

export type NavIconName = keyof typeof NAV_ICONS;

export function isNavIconName(v: unknown): v is NavIconName {
  return typeof v === "string" && v in NAV_ICONS;
}

export function navIcon(name: NavIconName): LucideIcon {
  return NAV_ICONS[name];
}
