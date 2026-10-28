import type {
  LiveEventCard,
  LiveEventFeed,
  LiveEventRecord,
  LiveEventStatus,
  LivePoll,
  LiveQuestion,
  LiveReactionKind,
  LiveScoreboard,
  LiveStream,
  LiveStreamType,
  LiveThemeKey,
  LiveUpdate,
  LiveUpdateKind,
} from "@hoichoi/db";

export type {
  LiveEventCard as EventCard,
  LiveEventFeed as LiveFeed,
  LiveEventRecord as EventDTO,
  LiveEventStatus as EventStatus,
  LivePoll as PollDTO,
  LiveQuestion as QuestionDTO,
  LiveReactionKind as ReactionKind,
  LiveScoreboard as ScoreboardData,
  LiveStream as StreamSource,
  LiveStreamType as StreamKind,
  LiveThemeKey as TemplateKey,
  LiveUpdate as UpdateDTO,
  LiveUpdateKind as UpdateKind,
};

export const REACTIONS: { kind: LiveReactionKind; emoji: string; label: string }[] = [
  { kind: "like", emoji: "👍", label: "পছন্দ" },
  { kind: "love", emoji: "❤️", label: "ভালোবাসা" },
  { kind: "clap", emoji: "👏", label: "সাবাশ" },
  { kind: "wow", emoji: "😮", label: "বিস্ময়" },
  { kind: "sad", emoji: "😢", label: "দুঃখ" },
  { kind: "angry", emoji: "😡", label: "রাগ" },
];

export type { LiveEventCard, LiveEventFeed, LiveEventRecord, LiveEventStatus, LivePoll, LiveQuestion, LiveScoreboard, LiveStream, LiveStreamType, LiveThemeKey, LiveUpdate, LiveUpdateKind };
