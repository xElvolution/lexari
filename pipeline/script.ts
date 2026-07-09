import OpenAI from "openai";
import {
  DURATION_MAX_SEC,
  type LaunchReelInput,
  type StatClipInput,
} from "@/lib/schemas";

/**
 * Narration script generation. One small-model call with structured output
 * and a hard word budget (2.4 spoken words/sec of available voiceover time).
 * Overshoot → one retry with the budget restated → sentence-boundary truncate.
 */

export interface SceneScript {
  id: string;
  voLine: string;
}

export interface NarrationScript {
  scenes: SceneScript[];
  fullVoiceover: string;
}

const WORDS_PER_SECOND = 2.4;

let openaiClient: OpenAI | null = null;
function openai(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI();
  return openaiClient;
}

const LAUNCH_SCENES = ["hook", "features", "screenshots", "outro"] as const;

export async function launchReelScript(
  input: LaunchReelInput,
): Promise<NarrationScript> {
  const maxSec = DURATION_MAX_SEC[input.duration];
  // Reserve time for the outro tail and scene breathing room.
  const budget = Math.floor(WORDS_PER_SECOND * (maxSec - 8));
  const style =
    input.duration === "short"
      ? "a punchy 30-40 second product launch clip"
      : input.duration === "standard"
        ? "a 60-90 second product launch video"
        : "a 2-3 minute project demo film (like a hackathon submission video: what it is, why it matters, how it works)";
  const featureGuidance =
    input.duration === "short"
      ? "weave the features into one or two natural sentences (do not read them as a list)"
      : "give each feature its own short beat, flowing naturally from one to the next";
  const system = `You write voiceover scripts for ${style}.
Rules:
- Exactly 4 narration lines for scenes: hook, features, screenshots, outro.
- TOTAL across all lines: at most ${budget} words. This is a hard limit.
- hook: grab attention, introduce the product by name and the problem it solves.
- features: ${featureGuidance}.
- screenshots: walk the viewer through what they're seeing ("Here it is in action...").
- outro: a confident closing call to action with the product name.
- Tone: ${input.tone}. No emojis, no hashtags, no quotation marks. Plain spoken English.`;
  const user = JSON.stringify({
    productName: input.productName,
    oneLiner: input.oneLiner,
    features: input.features,
    targetLengthSeconds: maxSec,
  });
  return generateScenes(system, user, [...LAUNCH_SCENES], budget);
}

export async function statClipScript(
  input: StatClipInput,
): Promise<NarrationScript> {
  const budget = Math.floor(WORDS_PER_SECOND * (20 - 5)); // ~36 words
  const system = `You write voiceover for 10-20 second data-highlight videos.
Rules:
- Exactly 2 narration lines for scenes: intro, numbers.
- TOTAL at most ${budget} words. Hard limit.
- intro: state what this report is ("${input.title}").
- numbers: call out the one or two most striking figures.
- Confident, punchy. No emojis, no quotation marks.`;
  const user = JSON.stringify({ title: input.title, stats: input.stats });
  return generateScenes(system, user, ["intro", "numbers"], budget);
}

async function generateScenes(
  system: string,
  user: string,
  sceneIds: string[],
  budget: number,
): Promise<NarrationScript> {
  let scenes = await callModel(system, user, sceneIds);
  if (countWords(scenes) > budget) {
    scenes = await callModel(
      system +
        `\nYour previous draft was too long. Rewrite tighter: at most ${budget} words TOTAL.`,
      user,
      sceneIds,
    );
  }
  if (countWords(scenes) > budget) scenes = truncate(scenes, budget);
  return {
    scenes,
    fullVoiceover: scenes.map((s) => s.voLine).join(" "),
  };
}

async function callModel(
  system: string,
  user: string,
  sceneIds: string[],
): Promise<SceneScript[]> {
  const res = await openai().chat.completions.create({
    model: process.env.SCRIPT_MODEL ?? "gpt-4o-mini",
    temperature: 0.7,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "narration",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["lines"],
          properties: {
            lines: {
              type: "array",
              items: { type: "string" },
              minItems: sceneIds.length,
              maxItems: sceneIds.length,
            },
          },
        },
      },
    },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const parsed = JSON.parse(res.choices[0].message.content ?? "{}") as {
    lines: string[];
  };
  return sceneIds.map((id, i) => ({
    id,
    voLine: (parsed.lines[i] ?? "").trim(),
  }));
}

function countWords(scenes: SceneScript[]): number {
  return scenes.reduce(
    (n, s) => n + s.voLine.split(/\s+/).filter(Boolean).length,
    0,
  );
}

/** Trim overflow from the longest lines at sentence boundaries. */
function truncate(scenes: SceneScript[], budget: number): SceneScript[] {
  const out = scenes.map((s) => ({ ...s }));
  while (countWords(out) > budget) {
    const longest = out.reduce((a, b) =>
      b.voLine.length > a.voLine.length ? b : a,
    );
    const sentences = longest.voLine.match(/[^.!?]+[.!?]?/g) ?? [];
    if (sentences.length > 1) {
      longest.voLine = sentences.slice(0, -1).join("").trim();
    } else {
      longest.voLine = longest.voLine
        .split(/\s+/)
        .slice(0, Math.max(4, Math.floor(longest.voLine.split(/\s+/).length * 0.7)))
        .join(" ");
    }
  }
  return out;
}
