import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

const DB = path.join(process.cwd(), ".tmp-live-events-test.db");

async function removeTestFiles(): Promise<void> {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = `${DB}${suffix}`;
    for (let attempt = 0; ; attempt += 1) {
      try {
        fs.rmSync(file, { force: true });
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EPERM" || attempt >= 5) throw error;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }
}

async function main(): Promise<void> {
  await removeTestFiles();
  process.env.TURSO_DATABASE_URL = `file:${DB}`;
  process.env.TURSO_AUTH_TOKEN = "local";

  const { getClient } = await import("../client");
  const live = await import("../live-events");
  const client = getClient();

  try {
    const eventInput = (slug: string) => ({
      slug,
      title: slug,
      kicker: "লাইভ",
      summary: "",
      category: "জাতীয়",
      categoryColor: "#d2202c",
      location: "",
      status: "live" as const,
      streamType: "youtube" as const,
      streamUrl: "",
      streams: [],
      coverImage: "",
      template: "auto" as const,
      scoreboard: null,
      keyPoints: [],
      featured: false,
      commentsEnabled: true,
      reactionsEnabled: true,
      pollsEnabled: true,
      qaEnabled: true,
      showViewerCount: true,
      moderation: "post" as const,
      slowMode: 0,
      startsAt: new Date().toISOString(),
    });

    const first = await live.createLiveEvent(eventInput("first-live-event"));
    const second = await live.createLiveEvent(eventInput("second-live-event"));
    const sessionId = "reader-session-001";
    await live.recordLiveViewer(first.id, sessionId);
    await live.recordLiveViewer(first.id, sessionId);

    await live.submitLiveComment(first, sessionId, "Reader", "Verified comment", {
      autoModeration: false,
      bannedWords: [],
    });
    const firstAdmin = await live.getLiveEventAdmin(first.id);
    assert.ok(firstAdmin);
    const comment = firstAdmin.comments[0];
    assert.ok(comment);
    assert.equal(comment.status, "approved");

    await live.likeLiveComment(second.id, comment.id, "another-reader");
    let feed = await live.getLiveEventFeed(first.slug, sessionId);
    assert.ok(feed);
    assert.equal(feed.viewers, 1);
    assert.equal(feed.comments[0]?.likes, 0, "a different event cannot like this comment");

    await live.likeLiveComment(first.id, comment.id, "another-reader");
    feed = await live.getLiveEventFeed(first.slug, sessionId);
    assert.equal(feed?.comments[0]?.likes, 1);

    await live.submitLiveQuestion(first, sessionId, "Reader", "A live question");
    const questions = await live.getLiveEventAdmin(first.id);
    const question = questions?.questions[0];
    assert.ok(question);
    await live.moderateLiveQuestion(question.id, "approved");
    await live.upvoteLiveQuestion(second.id, question.id, "another-reader");
    let admin = await live.getLiveEventAdmin(first.id);
    assert.equal(admin?.questions[0]?.upvotes, 0, "a different event cannot upvote this question");
    await live.upvoteLiveQuestion(first.id, question.id, "another-reader");
    admin = await live.getLiveEventAdmin(first.id);
    assert.equal(admin?.questions[0]?.upvotes, 1);

    await live.createLivePoll(first.id, "Poll question", [
      { id: "option-a", label: "Option A" },
      { id: "option-b", label: "Option B" },
    ]);
    feed = await live.getLiveEventFeed(first.slug);
    assert.ok(feed?.poll);
    await assert.rejects(
      live.voteLivePoll(second.id, feed.poll.id, "option-a", "voter-session-001"),
      /poll_not_found/,
    );
    await live.voteLivePoll(first.id, feed.poll.id, "option-a", "voter-session-001");
    await assert.rejects(
      live.voteLivePoll(first.id, feed.poll.id, "option-b", "voter-session-001"),
      /already_voted/,
    );

    await live.addLiveUpdate({
      eventId: first.id,
      kind: "breaking",
      title: "Update title",
      body: "Verified update body",
      author: "Desk",
      mediaUrl: "",
    });
    feed = await live.getLiveEventFeed(first.slug);
    assert.equal(feed?.updates.length, 1);
    assert.equal(typeof feed?.updates[0]?.id, "string");
  } finally {
    await client.close();
    await removeTestFiles();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
