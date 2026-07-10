import path from "node:path";
import { rename, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium, type Page } from "playwright";
import type { AppTourInput, TourStep } from "@/lib/schemas";

const execFileAsync = promisify(execFile);

/**
 * Records a real browser walking through a live app, driven by an injected
 * animated cursor. Produces a clean 1080p mp4 plus per-step timing so the
 * Remotion wrapper can sync captions/narration to what's on screen.
 *
 * Resilience: a step that can't find its target is skipped (logged), not
 * fatal — a partial tour still renders.
 */

export interface CapturedStep {
  caption: string | null;
  atMs: number; // ms from the start of the trimmed footage
}

export interface CaptureResult {
  mp4Path: string;
  durationMs: number;
  steps: CapturedStep[];
}

const VIEWPORT = { width: 1600, height: 900 };
const LEAD_TRIM_SEC = 1.0; // Playwright records ~1s of white before first paint

export async function captureAppTour(opts: {
  input: AppTourInput;
  jobDir: string;
  onProgress?: (pct: number) => void;
}): Promise<CaptureResult> {
  const { input, jobDir } = opts;
  const rawDir = path.join(jobDir, "capture");

  const browser = await chromium.launch({
    args: ["--force-color-profile=srgb", "--hide-scrollbars"],
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: { dir: rawDir, size: VIEWPORT },
    colorScheme: "dark",
  });
  const page = await context.newPage();

  const steps: CapturedStep[] = [];
  const t0 = Date.now();
  const stamp = () => Math.max(Date.now() - t0 - LEAD_TRIM_SEC * 1000, 0);

  try {
    await page.goto(input.url, { waitUntil: "networkidle", timeout: 30000 }).catch(
      async () => {
        await page.goto(input.url, { waitUntil: "domcontentloaded", timeout: 30000 });
      },
    );
    await injectCursor(page);
    await page.waitForTimeout(900);

    for (let i = 0; i < input.steps.length; i++) {
      const step = input.steps[i];
      steps.push({ caption: step.caption ?? null, atMs: stamp() });
      try {
        await runStep(page, step);
      } catch (err) {
        console.warn(
          `[capture] step ${i} (${step.action}) skipped:`,
          err instanceof Error ? err.message.split("\n")[0] : err,
        );
      }
      opts.onProgress?.(((i + 1) / input.steps.length) * 100);
      await page.waitForTimeout(step.waitMs ?? 900);
    }

    // A final beat so the last action is readable.
    await page.waitForTimeout(1100);
  } finally {
    await context.close(); // finalizes the webm
    await browser.close();
  }

  // Playwright writes a randomly-named .webm; grab it.
  const { readdir } = await import("node:fs/promises");
  const files = await readdir(rawDir);
  const webm = files.find((f) => f.endsWith(".webm"));
  if (!webm) throw new Error("capture produced no video");
  const webmPath = path.join(rawDir, webm);

  const mp4Path = path.join(jobDir, "tour.mp4");
  const durationMs = await transcodeTrimmed(webmPath, mp4Path);
  await rm(rawDir, { recursive: true, force: true });

  // Clamp step stamps to the trimmed footage length.
  for (const s of steps) s.atMs = Math.min(s.atMs, Math.max(durationMs - 300, 0));

  return { mp4Path, durationMs, steps };
}

/** Inject a smooth CSS-animated cursor that shows up in the recording. */
async function injectCursor(page: Page) {
  await page.addStyleTag({
    content: `
      #__rr_cursor {
        position: fixed; top: 0; left: 0; width: 34px; height: 34px;
        z-index: 2147483647; pointer-events: none;
        transform: translate(-100px, -100px);
        transition: transform 0.75s cubic-bezier(0.22, 1, 0.36, 1);
        will-change: transform;
      }
      #__rr_cursor svg { filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5)); }
      #__rr_ripple {
        position: fixed; z-index: 2147483646; pointer-events: none;
        width: 20px; height: 20px; border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.9); opacity: 0;
        transform: translate(-50%, -50%) scale(0.4);
      }
      @keyframes __rr_click {
        0% { opacity: 0.9; transform: translate(-50%,-50%) scale(0.4); }
        100% { opacity: 0; transform: translate(-50%,-50%) scale(2.6); }
      }
    `,
  });
  await page.evaluate(
    ([cx, cy]) => {
      const c = document.createElement("div");
      c.id = "__rr_cursor";
      c.innerHTML = `<svg viewBox="0 0 24 24" width="34" height="34" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 2 L5 20 L10 15 L13.5 22 L16.5 20.5 L13 13.5 L20 13.5 Z"
          fill="white" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
      // Start visible, centred — never off-screen.
      c.style.transform = `translate(${cx}px, ${cy}px)`;
      document.body.appendChild(c);
      const r = document.createElement("div");
      r.id = "__rr_ripple";
      document.body.appendChild(r);
    },
    [VIEWPORT.width / 2, VIEWPORT.height / 2],
  );
}

async function moveCursorTo(page: Page, x: number, y: number) {
  await page.evaluate(
    ([px, py]) => {
      const c = document.getElementById("__rr_cursor");
      if (c) c.style.transform = `translate(${px - 4}px, ${py - 2}px)`;
    },
    [x, y],
  );
  await page.waitForTimeout(800); // let the CSS transition play
}

async function ripple(page: Page, x: number, y: number) {
  await page.evaluate(
    ([px, py]) => {
      const r = document.getElementById("__rr_ripple");
      if (!r) return;
      r.style.left = px + "px";
      r.style.top = py + "px";
      r.style.animation = "none";
      // reflow to restart the animation
      void r.offsetWidth;
      r.style.animation = "__rr_click 0.5s ease-out";
    },
    [x, y],
  );
  await page.waitForTimeout(340);
}

async function runStep(page: Page, step: TourStep) {
  switch (step.action) {
    case "goto": {
      if (step.url) {
        await page.goto(step.url, { waitUntil: "networkidle", timeout: 30000 });
        await injectCursor(page);
      }
      return;
    }
    case "wait":
      return;
    case "scroll": {
      const target = step.selector ? locator(page, step.selector).first() : null;
      if (target && (await target.count())) {
        await target.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(650); // let the smooth scroll settle
        // Glide the cursor to the thing we just scrolled to.
        const box = await target.boundingBox();
        if (box) {
          await moveCursorTo(
            page,
            box.x + Math.min(box.width / 2, VIEWPORT.width / 2),
            Math.min(Math.max(box.y + 40, 120), VIEWPORT.height - 120),
          );
        }
      } else {
        await page.mouse.wheel(0, 640);
        await page.waitForTimeout(500);
        // Keep the cursor alive with a small drift.
        await moveCursorTo(
          page,
          VIEWPORT.width / 2 + (Math.random() > 0.5 ? 180 : -180),
          VIEWPORT.height / 2,
        );
      }
      return;
    }
    case "hover":
    case "click":
    case "type": {
      if (!step.selector) return;
      const el = locator(page, step.selector).first();
      await el.waitFor({ state: "visible", timeout: 6000 });
      await el.scrollIntoViewIfNeeded().catch(() => {});
      const box = await el.boundingBox();
      if (box) {
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        await moveCursorTo(page, cx, cy);
        if (step.action !== "hover") await ripple(page, cx, cy);
      }
      if (step.action === "click") {
        await el.click({ timeout: 6000 }).catch(() => {});
      } else if (step.action === "type" && step.text) {
        await el.click({ timeout: 6000 }).catch(() => {});
        await el.type(step.text, { delay: 55 });
      }
      return;
    }
  }
}

/** Support both CSS selectors and Playwright text= locators. */
function locator(page: Page, selector: string) {
  if (selector.startsWith("text=") || selector.startsWith("//")) {
    return page.locator(selector);
  }
  return page.locator(selector);
}

/** Trim the white lead-in and transcode to even-dimension H.264. Returns ms. */
async function transcodeTrimmed(webmPath: string, mp4Path: string): Promise<number> {
  const ffmpeg = (await import("ffmpeg-static")).default as string;
  await execFileAsync(
    ffmpeg,
    [
      "-y",
      "-ss",
      String(LEAD_TRIM_SEC),
      "-i",
      webmPath,
      "-vf",
      "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      mp4Path,
    ],
    { maxBuffer: 1024 * 1024 * 64 },
  );
  return probeDurationMs(mp4Path);
}

export async function probeDurationMs(mp4Path: string): Promise<number> {
  const ffmpeg = (await import("ffmpeg-static")).default as string;
  try {
    const { stderr } = await execFileAsync(ffmpeg, ["-i", mp4Path], {
      maxBuffer: 1024 * 1024 * 16,
    }).catch((e: { stderr?: string }) => ({ stderr: e.stderr ?? "" }));
    const m = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/.exec(stderr ?? "");
    if (m) {
      return Math.round(
        (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1000,
      );
    }
  } catch {
    /* fall through */
  }
  return 0;
}

export { rename as _rename };
