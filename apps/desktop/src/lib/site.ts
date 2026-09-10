const envUrl = (import.meta as { env?: Record<string, string> }).env?.VITE_SITE_URL;

/** Live web site (a browser page the desk can open for admin/home). */
export const SITE_URL = envUrl && envUrl.trim() ? envUrl : "https://hoichoifeed.vercel.app";