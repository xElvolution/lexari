import type { LaunchReelProps, StatClipProps } from "./props";

/**
 * Studio-only fixtures with fake (but realistic) timings so compositions
 * are workable in `npm run studio` without running the pipeline.
 * Production props always come from the worker.
 */

export const launchReelFixture: LaunchReelProps = {
  input: {
    productName: "RenderReel",
    oneLiner: "Turn a product brief into a cinematic launch video — rendered by an agent, paid per call.",
    features: [
      "Structured JSON in, branded 1080p MP4 out",
      "AI voiceover with word-synced captions",
      "On-chain receipt for every render",
    ],
    brandColor: "#6C5CE7",
    screenshots: ["https://placehold.co/1600x1000/png"],
    voice: "nova",
    tone: "bold",
    duration: "short",
    logoUrl: undefined,
  },
  scenes: [
    { id: "hook", from: 0, durationInFrames: 210 },
    { id: "features", from: 210, durationInFrames: 300 },
    { id: "screenshots", from: 510, durationInFrames: 270 },
    { id: "outro", from: 780, durationInFrames: 180 },
  ],
  captionPages: [
    {
      text: "Meet RenderReel",
      startMs: 400,
      durationMs: 1600,
      tokens: [
        { text: "Meet", fromMs: 400, toMs: 900 },
        { text: " RenderReel", fromMs: 900, toMs: 2000 },
      ],
    },
  ],
  screenshots: [
    {
      url: "https://placehold.co/1600x1000/1a1a2e/6C5CE7/png?text=Product+Screenshot",
      width: 1600,
      height: 1000,
      aspect: "desktop",
    },
  ],
  logoUrl: null,
  audioUrl: null,
  durationInFrames: 960,
  watermark: false,
};

export const statClipFixture: StatClipProps = {
  input: {
    title: "Weekly On-Chain Report",
    stats: [
      { label: "TVL", value: 4.2, unit: "B", delta: 12 },
      { label: "Active wallets", value: 812000, delta: 8.4 },
      { label: "Avg fee", value: 0.4, unit: "¢", delta: -22 },
      { label: "Tx volume", value: 96, unit: "M", delta: 15 },
    ],
    brandColor: "#00B894",
    narrate: false,
    voice: "nova",
  },
  scenes: [
    { id: "intro", from: 0, durationInFrames: 66 },
    { id: "numbers", from: 66, durationInFrames: 264 },
    { id: "outro", from: 330, durationInFrames: 60 },
  ],
  captionPages: [],
  audioUrl: null,
  durationInFrames: 390,
  watermark: false,
};
