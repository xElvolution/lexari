import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import {
  downloadWhisperModel,
  installWhisperCpp,
  transcribe,
  toCaptions,
} from "@remotion/install-whisper-cpp";
import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";

const execFileAsync = promisify(execFile);

/**
 * Word-level caption timing: OpenAI TTS returns no timestamps, so we
 * transcribe our own voiceover with local whisper.cpp (DTW token timestamps),
 * pass the known script as the prompt to keep product names intact, then
 * post-correct any remaining token against the script with a small
 * edit-distance pass.
 */

const WHISPER_DIR = path.join(process.cwd(), "whisper");
const WHISPER_VERSION = "1.5.5";
const MODEL = "small.en" as const;

let ready: Promise<void> | null = null;

export function ensureWhisper(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await installWhisperCpp({ to: WHISPER_DIR, version: WHISPER_VERSION });
      await downloadWhisperModel({ model: MODEL, folder: WHISPER_DIR });
    })();
  }
  return ready;
}

/** whisper.cpp requires 16kHz mono WAV; Remotion's bundled ffmpeg resamples. */
async function resampleTo16k(wavPath: string): Promise<string> {
  const out = wavPath.replace(/\.wav$/, ".16k.wav");
  await execFileAsync("npx", [
    "remotion",
    "ffmpeg",
    "-y",
    "-i",
    wavPath,
    "-ar",
    "16000",
    "-ac",
    "1",
    out,
  ]);
  return out;
}

export interface CaptionPage {
  text: string;
  startMs: number;
  durationMs: number;
  tokens: { text: string; fromMs: number; toMs: number }[];
}

export async function captionsForVoiceover(opts: {
  wavPath: string;
  knownScript: string;
}): Promise<{ captions: Caption[]; pages: CaptionPage[]; audioDurationMs: number }> {
  await ensureWhisper();
  const wav16k = await resampleTo16k(opts.wavPath);

  const result = await transcribe({
    inputPath: wav16k,
    whisperPath: WHISPER_DIR,
    whisperCppVersion: WHISPER_VERSION,
    model: MODEL,
    tokenLevelTimestamps: true,
    splitOnWord: true,
    additionalArgs: [["--prompt", opts.knownScript.slice(0, 800)]],
  });

  const { captions } = toCaptions({ whisperCppOutput: result });
  const fixed = fixAgainstScript(captions, opts.knownScript);

  const { pages } = createTikTokStyleCaptions({
    captions: fixed,
    combineTokensWithinMilliseconds: 900,
  });

  const audioDurationMs =
    fixed.length > 0 ? fixed[fixed.length - 1].endMs : 0;

  return {
    captions: fixed,
    pages: pages.map((p) => ({
      text: p.text,
      startMs: p.startMs,
      durationMs: p.durationMs,
      tokens: p.tokens.map((t) => ({
        text: t.text,
        fromMs: t.fromMs,
        toMs: t.toMs,
      })),
    })),
    audioDurationMs,
  };
}

/**
 * Whisper occasionally mangles brand names even with a prompt. When a
 * transcribed word is within edit distance 2 of a script word at the same
 * position neighborhood, prefer the script's spelling (keep whisper timing).
 */
function fixAgainstScript(captions: Caption[], script: string): Caption[] {
  const scriptWords = script.split(/\s+/).filter(Boolean);
  let cursor = 0;
  return captions.map((c) => {
    const raw = c.text.trim();
    if (!raw) return c;
    const window = scriptWords.slice(cursor, cursor + 4);
    for (let i = 0; i < window.length; i++) {
      const candidate = window[i];
      if (normalized(candidate) === normalized(raw)) {
        cursor += i + 1;
        return { ...c, text: matchSpacing(c.text, candidate) };
      }
    }
    for (let i = 0; i < window.length; i++) {
      const candidate = window[i];
      if (
        levenshtein(normalized(candidate), normalized(raw)) <= 2 &&
        candidate.length > 3
      ) {
        cursor += i + 1;
        return { ...c, text: matchSpacing(c.text, candidate) };
      }
    }
    return c;
  });
}

function normalized(word: string): string {
  return word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function matchSpacing(original: string, replacement: string): string {
  return original.startsWith(" ") ? " " + replacement : replacement;
}

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}
