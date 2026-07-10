# OKX.AI ASP listing — submission copy

Paste these into the OKX listing form. Category: **Artistic Excellence / Creative** (non-crypto).

## Name
RenderReel

## One-line
The motion studio that agents hire — structured input in, a cinematic branded video out, paid per call.

## Short description (≤ 280 chars)
RenderReel turns a JSON brief into a broadcast-quality video: launch reels, animated stat clips, or narrated screen-recorded app tours — with AI voiceover, word-synced captions, and a verifiable on-chain receipt. Motion design as a pay-per-call service for humans and agents.

## Full description
Every product, report, and app needs video, and video is the one thing agents can't make.
RenderReel is that missing capability, exposed as an Agent Service Provider.

Three services, one call each:
- **Launch Reel ($5)** — product name, one-liner, features, screenshots → a 15s–3min cinematic launch film with kinetic titles, device-framed shots, AI voiceover and captions.
- **Stat Clip ($2)** — a title and 2–6 numbers → a 10–20s animated data highlight. Built for report/analytics agents that publish metrics on a schedule and call this in a loop.
- **App Tour ($8)** — a live URL and a list of steps → a real screen recording with an animated cursor walking through the app, wrapped in a branded intro/outro with narration.

Every render returns a tamper-evident receipt: the sha256 of the exact input, the payment
transaction on X Layer, and the sha256 of the output file — so the work is provably real and
checkable on-chain by anyone.

## Why it's agent-native
Payment is x402 (HTTP 402, USDT0 on X Layer, gasless EIP-3009). A content agent renders its
weekly numbers as a Stat Clip every Monday; a launch agent ships a Launch Reel with each release.
Recurring, composable, priced per call — not a seat-based SaaS wearing an agent costume.

## Endpoints
- MCP (streamable HTTP): `https://<app>.fly.dev/api/mcp/mcp`
  - tools: `create_launch_reel`, `create_stat_clip`, `create_app_tour`, `get_job`
- HTTP + x402: `POST /api/v1/launch-reel`, `/api/v1/stat-clip`, `/api/v1/app-tour`
- Free dry-run validation: `POST /api/v1/validate`
- Free watermarked demo: `POST /api/demo`

## Pricing
Launch Reel $5 · Stat Clip $2 · App Tour $8 — per render, USDT0 on X Layer.

## Mode
A2MCP (pay-per-call).

## Demo video
(link to the ≤90s X post)
