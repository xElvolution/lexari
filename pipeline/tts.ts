import OpenAI from "openai";
import path from "node:path";
import { saveBuffer } from "@/lib/assets";
import type { TONES, VOICES } from "@/lib/schemas";

/**
 * Voiceover synthesis. Default: OpenAI gpt-4o-mini-tts (24kHz WAV, steerable
 * via instructions). TTS_PROVIDER=kokoro switches to a local model — same
 * interface, wired up only if OpenAI becomes unavailable.
 */

const TONE_INSTRUCTIONS: Record<(typeof TONES)[number], string> = {
  bold: "Speak with confident energy, like a keynote product reveal. Medium-fast pace, deliberate emphasis on product names and numbers.",
  friendly:
    "Warm, approachable, conversational. Like recommending a tool to a colleague you like.",
  technical:
    "Calm, precise, credible. Like a senior engineer walking through a well-built system.",
};

let openaiClient: OpenAI | null = null;
function openai(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI();
  return openaiClient;
}

export async function synthesizeVoiceover(opts: {
  jobDir: string;
  text: string;
  voice: (typeof VOICES)[number];
  tone: (typeof TONES)[number];
}): Promise<{ file: string }> {
  const provider = process.env.TTS_PROVIDER ?? "openai";
  if (provider === "kokoro") {
    throw new Error(
      "kokoro TTS provider not wired yet — set TTS_PROVIDER=openai",
    );
  }

  const res = await openai().audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: opts.voice,
    input: opts.text,
    instructions: TONE_INSTRUCTIONS[opts.tone],
    response_format: "wav",
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const file = "voiceover.wav";
  await saveBuffer(opts.jobDir, file, buf);
  return { file };
}

export function voiceoverPath(jobDir: string): string {
  return path.join(jobDir, "voiceover.wav");
}
