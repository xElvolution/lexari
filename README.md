# RenderReel

**The motion studio that agents hire.** A pay-per-call Agent Service Provider (ASP) on [OKX.AI](https://www.okx.ai): send structured JSON, get back a cinematic, voice-narrated, caption-synced 1080p MP4 — with a tamper-evident receipt whose payment settles in USDT0 on X Layer.

Built for the OKX.AI Genesis Hackathon, July 2026.

## What it renders

| Template | Price | Output |
|---|---|---|
| **Launch Reel** | $5.00 | ≤40s product launch film: kinetic typography hook, feature cards, device-framed screenshots, logo outro, AI voiceover, word-synced captions |
| **Stat Clip** | $2.00 | 10–20s data highlight: animated count-ups, deltas, optional narration — built for report agents that publish weekly numbers |

Every render writes a receipt: `inputHash` (canonical input JSON), payment `txHash` on X Layer, `outputHash` (sha256 of the MP4). Anyone can recompute both hashes and check the transaction on the explorer.

## How agents call it

**MCP** (streamable HTTP):

```
claude mcp add --transport http renderreel https://<host>/api/mcp/mcp
```

Tools: `create_launch_reel`, `create_stat_clip`, `get_job`.

**HTTP + x402**:

```
POST /api/v1/launch-reel   → 402 with payment requirements
(pay $5 USDT0 via any x402 client, e.g. @okxweb3/x402-fetch)
POST … + X-PAYMENT header  → 202 { jobId }
GET  /api/v1/jobs/:id      → { status, progress } … { downloadUrl, receiptUrl }
```

Free, no wallet: `POST /api/v1/validate` (dry-run input validation) and `POST /api/demo` (2/day, watermarked 720p).

## Architecture

One package, two processes:

- **`next`** — landing page, paid API routes (x402-gated), MCP server, job status.
- **`worker`** — claims jobs from a Neon Postgres queue (`FOR UPDATE SKIP LOCKED`), runs the pipeline: narration script (gpt-4o-mini) → TTS (gpt-4o-mini-tts) → word timestamps (local whisper.cpp over the generated audio) → timeline → Remotion `renderMedia` → local storage (HMAC-signed download URLs) → receipt.

```
app/            landing, /api/v1/*, /api/mcp, /api/demo, /jobs/[id]
lib/            schemas (zod, single source of truth), jobs, payments (x402), hashing
pipeline/       script, tts, captions, timeline, render
remotion/       LaunchReel + StatClip compositions, shared motion system
worker/         queue loop + per-job pipeline
scripts/        e2e (buyer-side x402 test), render-samples, stills
```

## Run it

```bash
npm install
cp .env.example .env.local          # fill in Neon DATABASE_URL + OpenAI (+ OKX for payments)
# run db/migration.sql in the Neon SQL editor; set FILES_SECRET to any long
# random string (openssl rand -hex 32)
npm run dev                          # web
npm run worker                       # renderer
npm run studio                       # Remotion Studio (template dev)
npm run e2e                          # free-path e2e; add --paid + BUYER_PRIVATE_KEY for x402
```

`PAYMENTS_DISABLED=1` runs the full product without OKX credentials (payment gating off).

## Payments

- Network **X Layer** (`eip155:196`), token **USDT0** (6 decimals), scheme **`exact`** (EIP-3009, gas-subsidized), **syncSettle** — settlement confirms on-chain before the jobId is returned.
- Seller SDK: `@okxweb3/x402-core` / `x402-evm` / `x402-next` (OKX facilitator).
- Invalid input never charges: validation runs before settlement; agents can also pre-check via the free `/api/v1/validate`.
