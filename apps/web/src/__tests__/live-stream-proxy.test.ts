import assert from "node:assert/strict";
import test from "node:test";
import {
  createLiveStreamProxyUrl,
  decryptStreamToken,
  isPublicStreamAddress,
  protectLiveEventFeed,
} from "../lib/live-stream-proxy";
import type { LiveEventFeed } from "@hoichoi/db";

test("stream proxy tokens hide and recover the original URL", () => {
  process.env.LIVE_STREAM_PROXY_SECRET = "test-live-stream-secret";
  const source = "https://cdn.example.test/live/index.m3u8?auth=private";
  const route = createLiveStreamProxyUrl(source);
  const token = route.split("/").at(-1);

  assert.ok(token);
  assert.match(route, /^\/api\/live-stream\/[A-Za-z0-9_-]+$/);
  assert.equal(route.includes("cdn.example.test"), false);
  assert.equal(decryptStreamToken(token), source);

  const tampered = Buffer.from(token, "base64url");
  const lastByte = tampered.length - 1;
  tampered[lastByte] = (tampered[lastByte] ?? 0) ^ 1;
  assert.equal(decryptStreamToken(tampered.toString("base64url")), null);
});

test("private, reserved, and public stream addresses are classified", () => {
  assert.equal(isPublicStreamAddress("127.0.0.1"), false);
  assert.equal(isPublicStreamAddress("192.168.1.1"), false);
  assert.equal(isPublicStreamAddress("203.0.113.8"), false);
  assert.equal(isPublicStreamAddress("8.8.8.8"), true);
});

test("public live-event serialization never includes raw HLS or unsupported iframe URLs", () => {
  process.env.LIVE_STREAM_PROXY_SECRET = "test-live-stream-secret";
  const source = "https://cdn.example.test/live/index.m3u8?auth=private";
  const iframe = "https://player.example.test/embed/private-channel";
  const feed = {
    event: {
      id: "event-1",
      slug: "test-event",
      title: "Test event",
      kicker: "",
      summary: "",
      category: "News",
      categoryColor: "#000000",
      location: "",
      status: "live",
      streamType: "hls",
      streamUrl: source,
      streams: [{ label: "Other", type: "iframe", url: iframe }],
      coverImage: "",
      template: "stage",
      scoreboard: null,
      keyPoints: [],
      featured: false,
      commentsEnabled: true,
      reactionsEnabled: true,
      pollsEnabled: true,
      qaEnabled: false,
      showViewerCount: true,
      moderation: "pre",
      slowMode: 0,
      startsAt: new Date().toISOString(),
      endedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    updates: [],
    comments: [],
    reactions: { like: 0, love: 0, clap: 0, wow: 0, sad: 0, angry: 0 },
    poll: null,
    questions: [],
    viewers: 0,
    peakViewers: 0,
    totals: { comments: 0, reactions: 0, votes: 0, shares: 0, updates: 0 },
    refreshSeconds: 30,
    floatingPlayer: false,
    serverTime: new Date().toISOString(),
  } satisfies LiveEventFeed;

  const protectedFeed = protectLiveEventFeed(feed);
  const serialized = JSON.stringify(protectedFeed);
  assert.equal(serialized.includes("cdn.example.test"), false);
  assert.equal(serialized.includes(iframe), false);
  assert.equal(protectedFeed.event.streamPrivacyNotice, true);
  const token = protectedFeed.event.streamUrl.split("/").at(-1);
  assert.ok(token);
  assert.equal(decryptStreamToken(token), source);
});
