import { randomMediaName } from "./media";

export interface VideoResult {
  rel: string;
  durationSec: number | null;
  sizeBytes: number;
  watermarked: boolean;
}

export interface VideoOptions {
  inputUrl?: string;
  inputPath?: string;
  /** Bangla timestamp stamp like "০৭/০৯/২০২৬ ১৪:৩০" */
  stampText: string;
  log?: (msg: string) => void;
}

/**
 * Re-encode a Facebook video to H.264/AAC and (when the ffmpeg binary and a
 * Bangla-capable font are available) burn a "হৈচৈ।" watermark + timestamp.
 * Lazy-loads ffmpeg-static so installs without it still run the pipeline;
 * the video is stored locally and never hotlinked.
 */
export async function processVideo(opts: VideoOptions): Promise<VideoResult | null> {
  let ffmpegPath: string | null = null;
  try {
    ffmpegPath = (await import("ffmpeg-static")).default ?? null;
  } catch {
    opts.log?.("[video] ffmpeg-static not installed — skipping video processing");
    return null;
  }
  if (!ffmpegPath) {
    opts.log?.("[video] ffmpeg binary missing — skipping");
    return null;
  }

  // Resolve an input file: either a downloaded temp file or a remote URL.
  const tmpIn = opts.inputPath;
  if (!tmpIn && !opts.inputUrl) return null;
  const inArg = (tmpIn ?? opts.inputUrl) as string;

  const rel = randomMediaName("vid", "mp4");
  const out = (await import("./media")).localMediaPath(rel);
  const { spawn } = await import("node:child_process");

  const args: string[] = [
    "-y",
    "-i", inArg,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "23",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-movflags", "+faststart",
  ];

  // try watermark w/ fontconfig — best effort, non-fatal on failure
  let watermarked = false;
  try {
    args.push(
      "-vf",
      `drawtext=text='হৈচৈ। ${opts.stampText}':x=w-tw-24:y=h-th-24:fontcolor=white@0.9:fontsize=28:box=1:boxcolor=0x0A0C10@0.65:boxborderw=12`,
    );
    watermarked = true;
  } catch {
    watermarked = false;
  }
  args.push(out);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegPath!, args, { stdio: ["ignore", "ignore", "pipe"] });
    let errBuf = "";
    proc.stderr?.on("data", (d: Buffer) => (errBuf += d.toString()));
    proc.on("error", reject);
    proc.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`ffmpeg exited ${code}: ${errBuf.slice(-800)}`)),
    );
  }).catch(async (err) => {
    // If the drawtext filter failed (no Bangla font), retry without it.
    if (watermarked && /drawtext|font|filter/i.test((err as Error).message)) {
      opts.log?.("[video] drawtext watermark unavailable — retrying re-encode only");
      watermarked = false;
      const fs = await import("node:fs");
      if (fs.existsSync(out)) fs.unlinkSync(out);
      return retryPlain(ffmpegPath!, args, out);
    }
    throw err;
  });

  const stats = await (await import("node:fs/promises")).stat(out);
  return {
    rel,
    durationSec: null,
    sizeBytes: stats.size,
    watermarked,
  };
}

async function retryPlain(
  ffmpegPath: string,
  originalArgs: string[],
  out: string,
): Promise<void> {
  const { spawn } = await import("node:child_process");
  const vfIndex = originalArgs.indexOf("-vf");
  const args = [
    ...originalArgs.slice(0, vfIndex),
    ...originalArgs.slice(vfIndex + 2),
  ].map((a) => (a === out ? out : a));
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let errBuf = "";
    proc.stderr?.on("data", (d: Buffer) => (errBuf += d.toString()));
    proc.on("error", reject);
    proc.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg plain exit ${code}`)),
    );
  });
}