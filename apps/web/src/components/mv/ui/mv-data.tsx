"use client";

import { createContext, useContext, type ReactNode } from "react";
import { EMPTY_MV_DATA, type MvData } from "@/lib/mv/data";

/**
 * Real, request-time datasets for the mockup design engine. The server builds
 * an {@link MvData} bundle from the live database (`@/lib/mv/live-data`) and
 * hands it to this provider; every client section reads it through
 * `useMvData()`. When no provider is mounted the neutral {@link EMPTY_MV_DATA}
 * (all zeros / empty axes) is used so nothing is ever fabricated.
 */
const MvDataContext = createContext<MvData>(EMPTY_MV_DATA);

export function MvDataProvider({
  value,
  children,
}: {
  value?: MvData;
  children: ReactNode;
}) {
  return <MvDataContext.Provider value={value ?? EMPTY_MV_DATA}>{children}</MvDataContext.Provider>;
}

export function useMvData(): MvData {
  return useContext(MvDataContext);
}
