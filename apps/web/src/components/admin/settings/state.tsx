"use client";

import { createContext, useContext } from "react";
import type { SiteAppConfig } from "@hoichoi/shared-types";

/** Editable identity fields (settings row, PATCH /api/settings whitelist). */
export type IdentityForm = {
  site_name: string;
  slogan_bn: string;
  tagline: string;
  logo_url: string;
  favicon_url: string;
  accent_color: string;
  footer_about_bn: string;
  contact_email: string;
  police_helpline: string;
  child_helpline: string;
  pipeline_hours: number;
  archive_visible_days: number;
  archive_retention_days: number;
};

/** Ad-slot raw HTML (settings row, none = default sponsor card). */
export type AdsForm = {
  ad_leaderboard_html: string;
  ad_rect_html: string;
  ad_infeed_html: string;
  ad_strip_html: string;
};

export interface SettingsState {
  identity: IdentityForm;
  setIdentity: (patch: Partial<IdentityForm>) => void;
  ads: AdsForm;
  setAds: (patch: Partial<AdsForm>) => void;
  cfg: SiteAppConfig;
  setCfg: (updater: (c: SiteAppConfig) => SiteAppConfig) => void;
  dirty: boolean;
}

/** Maintenance-screen inbox dimensions (operations tab tiles). */
export interface MaintenanceInbox {
  subscribers: number;
  newSubscribersToday: number;
  messages: number;
  openMessages: number;
}

export const SettingsCtx = createContext<SettingsState | null>(null);

export function useSettings(): SettingsState {
  const v = useContext(SettingsCtx);
  if (!v) throw new Error("useSettings must be used inside SettingsConsole");
  return v;
}