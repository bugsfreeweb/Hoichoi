import "server-only";

import { createCipheriv, createDecipheriv, createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { LiveEventCard, LiveEventFeed, LiveStream, LiveStreamType } from "@hoichoi/db";
import { youtubeEmbed } from "@/lib/live-format";

const TOKEN_LIFETIME_MS = 6 * 60 * 60 * 1000;

function proxyKey(): Buffer {
  const secret = process.env.LIVE_STREAM_PROXY_SECRET || process.env.TURSO_AUTH_TOKEN;
  if (!secret) throw new Error("LIVE_STREAM_PROXY_SECRET or TURSO_AUTH_TOKEN must be configured to protect live streams.");
  return createHmac("sha256", secret).update("hoichoi-live-stream-proxy-v1").digest();
}

export function createLiveStreamProxyUrl(rawUrl: string): string {
  const secret = process.env.LIVE_STREAM_PROXY_SECRET || process.env.TURSO_AUTH_TOKEN;
  if (!secret) throw new Error("LIVE_STREAM_PROXY_SECRET or TURSO_AUTH_TOKEN must be configured to protect live streams.");
  const expiresAt = Math.ceil((Date.now() + 30 * 60_000) / TOKEN_LIFETIME_MS) * TOKEN_LIFETIME_MS;
  const payload = Buffer.from(JSON.stringify({ url: rawUrl, expiresAt })).toString("base64url");
  const iv = createHmac("sha256", secret).update(`${expiresAt}:${rawUrl}`).digest().subarray(0, 12);
  const cipher = createCipheriv("aes-256-gcm", proxyKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const token = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
  return `/api/live-stream/${token}`;
}

function publicSource(type: LiveStreamType, url: string): string | null {
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (type === "hls" || type === "mp4") return createLiveStreamProxyUrl(url);
  if (type === "youtube") return youtubeEmbed(url, false);
  return null;
}

function protectStream<T extends LiveStream>(stream: T): [T, boolean] {
  const protectedUrl = publicSource(stream.type, stream.url);
  return [{ ...stream, url: protectedUrl ?? "" }, Boolean(stream.url && !protectedUrl)];
}

export function protectLiveEventFeed(feed: LiveEventFeed): LiveEventFeed {
  const [main, mainUnsupported] = protectStream({
    label: "মূল সম্প্রচার",
    type: feed.event.streamType,
    url: feed.event.streamUrl,
  });
  let unsupported = mainUnsupported;
  const streams = feed.event.streams.map((stream) => {
    const [protectedStream, unsupportedStream] = protectStream(stream);
    unsupported ||= unsupportedStream;
    return protectedStream;
  });
  return {
    ...feed,
    event: {
      ...feed.event,
      streamUrl: main.url,
      streams,
      streamPrivacyNotice: unsupported,
    },
  };
}

export function protectLiveEventCard<T extends LiveEventCard>(event: T): T {
  const protectedUrl = publicSource(event.streamType, event.streamUrl);
  return { ...event, streamUrl: protectedUrl ?? "" };
}

function publicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const octets = address.split(".").map(Number);
    const [a, b] = octets;
    if (a === undefined || b === undefined) return false;
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0)
    );
  }
  if (isIP(address) === 6) {
    const value = address.toLowerCase();
    if (value.startsWith("::ffff:")) {
      const mapped = value.slice(7);
      if (isIP(mapped) === 4) return publicAddress(mapped);
      const [high, low] = mapped.split(":").map((part) => Number.parseInt(part, 16));
      if (high === undefined || low === undefined || !Number.isFinite(high) || !Number.isFinite(low)) return false;
      return publicAddress(`${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`);
    }
    return value !== "::" && value !== "::1" &&
      !value.startsWith("fc") && !value.startsWith("fd") &&
      !value.startsWith("fe8") && !value.startsWith("fe9") &&
      !value.startsWith("fea") && !value.startsWith("feb") &&
      !value.startsWith("ff");
  }
  return false;
}

export function isPublicStreamAddress(address: string): boolean {
  return publicAddress(address);
}

export function decryptStreamToken(token: string): string | null {
  const secret = process.env.LIVE_STREAM_PROXY_SECRET || process.env.TURSO_AUTH_TOKEN;
  if (!secret) return null;
  try {
    const bytes = Buffer.from(token, "base64url");
    if (bytes.length < 29) return null;
    const iv = bytes.subarray(0, 12);
    const tag = bytes.subarray(12, 28);
    const ciphertext = bytes.subarray(28);
    const decryptor = createDecipheriv("aes-256-gcm", proxyKey(), iv);
    decryptor.setAuthTag(tag);
    const encodedPayload = Buffer.concat([decryptor.update(ciphertext), decryptor.final()]).toString("utf8");
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const parsed = JSON.parse(payload) as { url?: unknown; expiresAt?: unknown };
    if (typeof parsed.url !== "string" || typeof parsed.expiresAt !== "number" || parsed.expiresAt <= Date.now()) return null;
    return parsed.url;
  } catch {
    return null;
  }
}
