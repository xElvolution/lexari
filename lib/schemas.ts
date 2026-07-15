import { z } from "zod";

/**
 * Single source of truth for both template families.
 * The same schemas validate the HTTP API body, define the MCP tool
 * inputSchema, and type the Remotion composition inputProps.
 *
 * Char limits are sized so max-length text always fits the fixed
 * layouts — validation rejects, the renderer never truncates silently.
 */

export const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

export const VOICES = ["nova", "onyx", "shimmer"] as const;
export const TONES = ["bold", "friendly", "technical"] as const;

export const DURATIONS = ["short", "standard", "extended"] as const;
/** Max seconds per duration mode: social clip, launch video, full demo film. */
export const DURATION_MAX_SEC: Record<(typeof DURATIONS)[number], number> = {
  short: 40,
  standard: 90,
  extended: 180,
};

export const LaunchReelInput = z.object({
  productName: z.string().trim().min(2).max(40),
  oneLiner: z.string().trim().min(10).max(120),
  features: z
    .array(z.string().trim().min(3).max(80))
    .min(3)
    .max(6)
    .describe("3-6 feature bullets (3 is ideal for short, up to 6 for extended)"),
  logoUrl: z.string().url().max(500).optional(),
  brandColor: z.string().regex(HEX_COLOR).default("#6C5CE7"),
  screenshots: z
    .array(z.string().url().max(500))
    .min(1)
    .max(6)
    .describe("1-6 image URLs (PNG/JPG/WebP, max 8MB each, min 400px wide)"),
  voice: z.enum(VOICES).default("nova"),
  tone: z.enum(TONES).default("bold"),
  duration: z
    .enum(DURATIONS)
    .default("short")
    .describe(
      "short: ≤40s social launch clip · standard: ≤90s launch video (fits most hackathon demo rules) · extended: ≤180s full project demo",
    ),
});
export type LaunchReelInput = z.infer<typeof LaunchReelInput>;

export const StatItem = z.object({
  label: z.string().trim().min(1).max(24),
  value: z.number().finite(),
  unit: z.string().trim().max(8).optional().describe('e.g. "%", "$", "M"'),
  delta: z
    .number()
    .finite()
    .optional()
    .describe("Change vs previous period, e.g. +12.4"),
});
export type StatItem = z.infer<typeof StatItem>;

export const TOUR_ACTIONS = [
  "goto",
  "click",
  "scroll",
  "type",
  "hover",
  "wait",
] as const;

export const TourStep = z.object({
  action: z.enum(TOUR_ACTIONS),
  selector: z
    .string()
    .max(200)
    .optional()
    .describe("CSS selector or text= locator for click/hover/type/scroll"),
  url: z.string().url().max(500).optional().describe("for goto"),
  text: z.string().max(200).optional().describe("for type"),
  caption: z
    .string()
    .max(90)
    .optional()
    .describe("on-screen label narrated for this step"),
  waitMs: z.number().int().min(0).max(8000).optional(),
});
export type TourStep = z.infer<typeof TourStep>;

export const AppTourInput = z.object({
  productName: z.string().trim().min(2).max(40),
  url: z.string().url().max(500).describe("Public URL of the app to record"),
  steps: z
    .array(TourStep)
    .min(2)
    .max(12)
    .describe("Ordered walkthrough steps; a real animated cursor performs each"),
  brandColor: z.string().regex(HEX_COLOR).default("#6C5CE7"),
  tagline: z.string().trim().max(120).optional(),
  narrate: z.boolean().default(true),
  voice: z.enum(VOICES).default("nova"),
  tone: z.enum(TONES).default("friendly"),
});
export type AppTourInput = z.infer<typeof AppTourInput>;

export const StatClipInput = z.object({
  title: z.string().trim().min(2).max(60),
  stats: z.array(StatItem).min(2).max(6),
  brandColor: z.string().regex(HEX_COLOR).default("#6C5CE7"),
  narrate: z.boolean().default(true),
  voice: z.enum(VOICES).default("nova"),
});
export type StatClipInput = z.infer<typeof StatClipInput>;

export const TEMPLATES = {
  "launch-reel": {
    id: "launch-reel" as const,
    version: 1,
    schema: LaunchReelInput,
    priceUsd: "$1.00",
    maxDurationSec: 40,
    compositionId: "LaunchReel",
    estimatedRenderSec: 300,
  },
  "stat-clip": {
    id: "stat-clip" as const,
    version: 1,
    schema: StatClipInput,
    priceUsd: "$0.25",
    maxDurationSec: 20,
    compositionId: "StatClip",
    estimatedRenderSec: 150,
  },
  "app-tour": {
    id: "app-tour" as const,
    version: 1,
    schema: AppTourInput,
    priceUsd: "$2.00",
    maxDurationSec: 180,
    compositionId: "AppTour",
    estimatedRenderSec: 420,
  },
} as const;
export type TemplateId = keyof typeof TEMPLATES;

export const JOB_STATUSES = [
  "queued",
  "rendering",
  "done",
  "failed",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export interface Job {
  id: string;
  template: TemplateId;
  status: JobStatus;
  input: LaunchReelInput | StatClipInput | AppTourInput;
  input_hash: string;
  payment: PaymentRecord | null;
  progress: number;
  output_path: string | null;
  output_hash: string | null;
  receipt_path: string | null;
  error: string | null;
  demo: boolean;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface PaymentRecord {
  network: string;
  txHash: string | null;
  payer: string | null;
  amount: string;
  asset: string;
}

/** Public job view returned by GET /api/v1/jobs/:id and the MCP get_job tool. */
export interface JobPublic {
  jobId: string;
  template: TemplateId;
  status: JobStatus;
  progress: number;
  createdAt: string;
  completedAt: string | null;
  estimatedSeconds: number;
  downloadUrl?: string;
  receiptUrl?: string;
  outputHash?: string;
  error?: string;
}
