import type { AppTourProps, LaunchReelProps, StatClipProps } from "./props";

/**
 * Studio-only fixtures with fake (but realistic) timings so compositions
 * are workable in `npm run studio` without running the pipeline.
 * Production props always come from the worker.
 */

export const launchReelFixture: LaunchReelProps = {
  input: {
    productName: "Lexari",
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
    { id: "hook", from: 0, durationInFrames: 150 },
    { id: "features", from: 150, durationInFrames: 270 },
    { id: "screenshots", from: 420, durationInFrames: 240 },
    { id: "outro", from: 660, durationInFrames: 150 },
  ],
  captionPages: [
    {
      text: "Meet Lexari",
      startMs: 400,
      durationMs: 1600,
      tokens: [
        { text: "Meet", fromMs: 400, toMs: 900 },
        { text: " Lexari", fromMs: 900, toMs: 2000 },
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
  durationInFrames: 810,
  watermark: false,
};

/** Extended-mode fixture: ~101s, 6 features, 3 sequential screenshots. */
export const extendedLaunchReelFixture: LaunchReelProps = {
  input: {
    productName: "Vaultline",
    oneLiner: "Every yield strategy on every chain, one dashboard — built solo in 10 days for this hackathon.",
    features: [
      "Live APY tracking across 40+ protocols",
      "One-click position migration between vaults",
      "Risk scoring on every strategy",
      "Gas-optimized batch rebalancing",
      "Alerts when your yield drops off a cliff",
      "Full portfolio P&L, exportable anywhere",
    ],
    brandColor: "#00B894",
    screenshots: [
      "https://placehold.co/1600x1000/0E1512/00B894/png?text=Dashboard",
      "https://placehold.co/1600x1000/0E1512/4ADEDE/png?text=Strategy+View",
      "https://placehold.co/800x1400/0E1512/00B894/png?text=Mobile",
    ],
    voice: "nova",
    tone: "technical",
    duration: "extended",
    logoUrl: undefined,
  },
  scenes: [
    { id: "hook", from: 0, durationInFrames: 240 },
    { id: "features", from: 240, durationInFrames: 1350 },
    { id: "screenshots", from: 1590, durationInFrames: 1200 },
    { id: "outro", from: 2790, durationInFrames: 240 },
  ],
  captionPages: [],
  screenshots: [
    {
      url: "https://placehold.co/1600x1000/0E1512/00B894/png?text=Dashboard",
      width: 1600,
      height: 1000,
      aspect: "desktop",
    },
    {
      url: "https://placehold.co/1600x1000/0E1512/4ADEDE/png?text=Strategy+View",
      width: 1600,
      height: 1000,
      aspect: "desktop",
    },
    {
      url: "https://placehold.co/800x1400/0E1512/00B894/png?text=Mobile",
      width: 800,
      height: 1400,
      aspect: "phone",
    },
  ],
  logoUrl: null,
  audioUrl: null,
  durationInFrames: 3030,
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

/** App Tour fixture — expects public/tour-sample.mp4 (a captured walkthrough). */
export const appTourFixture: AppTourProps = {
  input: {
    productName: "Lexari",
    url: "http://localhost:3000",
    steps: [
      { action: "wait", caption: "Meet Lexari" },
      { action: "scroll", caption: "Cinematic templates" },
      { action: "scroll", caption: "Call it from any agent" },
      { action: "scroll", caption: "Priced per render" },
    ],
    brandColor: "#6C5CE7",
    tagline: "The motion studio that agents hire",
    narrate: true,
    voice: "nova",
    tone: "friendly",
  },
  footageUrl: "tour-sample.mp4",
  introFrames: 66,
  footageFrames: 300,
  outroFrames: 72,
  stepCaptions: [
    { text: "Meet Lexari", fromFrame: 66, toFrame: 141 },
    { text: "Cinematic templates", fromFrame: 141, toFrame: 216 },
    { text: "Call it from any agent", fromFrame: 216, toFrame: 291 },
    { text: "Priced per render", fromFrame: 291, toFrame: 366 },
  ],
  captionPages: [],
  audioUrl: null,
  durationInFrames: 438,
  watermark: false,
};
