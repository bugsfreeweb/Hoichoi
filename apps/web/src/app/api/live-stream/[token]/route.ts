import { lookup } from "node:dns/promises";
import { NextResponse } from "next/server";
import { createLiveStreamProxyUrl, decryptStreamToken, isPublicStreamAddress } from "@/lib/live-stream-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIVATE_HOST_SUFFIXES = [".localhost", ".local", ".internal"];

async function safePublicUrl(value: string): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || PRIVATE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return null;

  if (isPublicStreamAddress(hostname)) return url;
  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some((entry) => !isPublicStreamAddress(entry.address))) return null;
  } catch {
    return null;
  }
  return url;
}

function proxyResponse(body: BodyInit | null, status: number, headers: HeadersInit = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", "private, no-store");
  responseHeaders.set("Cross-Origin-Resource-Policy", "same-origin");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  return new NextResponse(body, {
    status,
    headers: responseHeaders,
  });
}

function rewritePlaylist(text: string, playlistUrl: string): string {
  const rewrite = (value: string) => {
    if (!value) return "";
    if (value.startsWith("data:")) return value;
    try {
      const url = new URL(value, playlistUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "";
      return createLiveStreamProxyUrl(url.href);
    } catch {
      return "";
    }
  };
  return text
    .replace(/URI="([^"]*)"/g, (_match, uri: string) => `URI="${rewrite(uri)}"`)
    .split(/\r?\n/)
    .map((line) => {
      const value = line.trim();
      if (!value || value.startsWith("#")) return line;
      return rewrite(value);
    })
    .join("\n");
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const source = decryptStreamToken(token);
  if (!source) return proxyResponse(null, 404);

  let target = await safePublicUrl(source);
  if (!target) return proxyResponse(null, 404);

  let upstream: Response | null = null;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const headers = new Headers({ Accept: "*/*", "User-Agent": "HoichoiLive/1.0" });
    const range = request.headers.get("range");
    if (range) headers.set("Range", range);
    try {
      upstream = await fetch(target, { headers, redirect: "manual", signal: request.signal });
    } catch {
      return proxyResponse(null, 502);
    }
    if (![301, 302, 303, 307, 308].includes(upstream.status)) break;
    const location = upstream.headers.get("location");
    if (!location || redirects === 3) return proxyResponse(null, 502);
    const nextTarget = await safePublicUrl(new URL(location, target).href);
    if (!nextTarget) return proxyResponse(null, 404);
    target = nextTarget;
  }

  if (!upstream) return proxyResponse(null, 502);
  if (!upstream.ok) return proxyResponse(null, upstream.status);

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const isPlaylist = /\.m3u8(?:$|[?#])/i.test(target.href) || /mpegurl/i.test(contentType);
  const headers = new Headers({ "Content-Type": contentType });
  for (const name of ["accept-ranges", "content-range"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  if (isPlaylist) {
    const text = await upstream.text();
    return proxyResponse(rewritePlaylist(text, target.href), upstream.status, headers);
  }
  return proxyResponse(upstream.body, upstream.status, headers);
}
