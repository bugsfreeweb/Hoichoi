import assert from "node:assert/strict";
import { isFeedPlatform, parseRssFeed, stripHtml, decodeEntities, feedLink, tagText, entryMediaUrls } from "../rss";

/** Simple, state-free checks so a regression anywhere fails loudly. */
const RSS = `<?xml version="1.0"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>হৈচৈ টেস্ট</title>
    <item>
      <guid isPermaLink="false">abc-123</guid>
      <title>নিখোঁজ শিশুর সন্ধানে বিক্ষোভ</title>
      <link>https://example.com/stories/missing-child-protest</link>
      <description><![CDATA[<p>থানা প্রাঙ্গণে বিক্ষোভ চলে <b>৩ ঘণ্টা</b>।</p>]]></description>
      <pubDate>Tue, 01 Sep 2026 10:00:00 GMT</pubDate>
      <dc:creator>সম্পাদক</dc:creator>
      <enclosure url="https://cdn.example.com/photos/a.jpg" type="image/jpeg" length="12345"/>
      <media:content url="https://cdn.example.com/photos/a.webp" medium="image"/>
      <media:thumbnail url="https://cdn.example.com/photos/thumb.jpg"/>
    </item>
    <item>
      <title>ভিডিও প্রতিবেদন: রেলপথে বাধা</title>
      <link>https://example.com/stories/rail-blockade-video</link>
      <guid>rail-456</guid>
      <description>রেল যোগাযোগ বন্ধ।</description>
      <enclosure url="https://cdn.example.com/videos/clip.mp4" type="video/mp4" length="999999"/>
    </item>
  </channel>
</rss>`;

const posts = parseRssFeed(RSS, "হৈচৈ টেস্ট");
assert.equal(posts.length, 2, "parses both items");
const first = posts[0]!;
assert.equal(first.fbPostUrl, "https://example.com/stories/missing-child-protest", "permalink is the feed link");
assert.ok(first.fbPostId.startsWith("rss_"), "rss_ prefixed stable id");
assert.ok(first.rawText?.includes("বিক্ষোভ"), "raw text carries title + description");
assert.ok(first.rawText?.includes("৩ ঘণ্টা"), "CDATA + tags stripped, text preserved");
assert.equal(first.mediaUrls.length, 3, "enclosure + media:content + media:thumbnail collected");
assert.equal(first.mediaUrls[0], "https://cdn.example.com/photos/a.jpg");
assert.equal(first.fbMediaIsVideo, false, "image entry is not video");
assert.equal(first.authorName, "সম্পাদক");
assert.equal(posts[1]!.fbMediaIsVideo, true, "video enclosure marks the post");

/* Atom shape */
const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <title>Atom Test</title>
  <entry>
    <title>নতুন আইন কার্যকর</title>
    <link rel="alternate" href="https://news.example.org/a/law"/>
    <id>urn:uuid:1111</id>
    <updated>2026-09-01T10:00:00Z</updated>
    <content type="html"><![CDATA[<p>সংসদে <a href="https://x">বিল</a> পাস।</p>]]></content>
  </entry>
  <entry>
    <id>urn:uuid:2222</id>
    <link rel="alternate" href="https://news.example.org/b"/>
    <updated>2026-09-02T10:00:00Z</updated>
    <content>A little text.</content>
  </entry>
</feed>`;
const atom = parseRssFeed(ATOM, "Atom Test");
assert.equal(atom.length, 2, "parses atom entries even when no rss items exist");
assert.equal(atom[0]!.fbPostUrl, "https://news.example.org/a/law", "atom alternate link used");
assert.ok(atom[0]!.rawText?.includes("বিল") && atom[0]!.rawText!.includes("পাস"), "atom content in body");
assert.ok(atom[1]!.rawText === "A little text.", "atom 'content' falls back for text-only");

/* Helpers */
assert.equal(stripHtml("<b>হা</b>&amp;<i>হা</i>"), "হা & হা", "tags removed, entities decoded");
assert.equal(decodeEntities("&#x2026;"), "…", "named entities pass through untouched");
assert.equal(feedLink('<link href="https://a.b/x"/>'), "https://a.b/x", "self-closing atom link read");
assert.equal(
  tagText("<item><title> টি </title></item>", "title"),
  "টি",
  "tagText trims whitespace",
);
const med = entryMediaUrls('<item><enclosure url="https://c.d/1.jpg" type="image/jpeg"/><media:content url="https://c.d/2.mp4" title="v" type="video/mp4"/></item>');
assert.ok(med.urls.includes("https://c.d/2.mp4"), "video url collected");
assert.equal(med.video, true, "video type detected");

assert.equal(isFeedPlatform("news"), true);
assert.equal(isFeedPlatform("magazine"), true);
assert.equal(isFeedPlatform("facebook"), false);
assert.equal(isFeedPlatform("x"), false);
assert.equal(isFeedPlatform(null), false);

console.log("rss-feed checks passed");