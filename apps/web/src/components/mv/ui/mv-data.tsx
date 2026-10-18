"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_MV_DATA, type MvData } from "@/lib/mv/data";

/**
 * Real, request-time datasets for the mockup design engine. The server builds
 * an {@link MvData} bundle from the live database (`@/lib/mv/live-data`) and
 * hands it to this provider; every client section reads it through
 * `useMvData()` so nothing in the UI falls back to sample content. When no
 * provider is mounted the deterministic {@link DEFAULT_MV_DATA} is used.
 */
const MvDataContext = createContext<MvData>(DEFAULT_MV_DATA);

export function MvDataProvider({
  value,
  children,
}: {
  value?: MvData;
  children: ReactNode;
}) {
  return <MvDataContext.Provider value={value ?? DEFAULT_MV_DATA}>{children}</MvDataContext.Provider>;
}

export function useMvData(): MvData {
  return useContext(MvDataContext);
}
