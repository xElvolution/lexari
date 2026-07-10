# RenderReel — go-live setup (do these in order)

Everything is built and the production build passes. These steps need *your* accounts;
each one unlocks a capability. Do them top to bottom.

## 1. Neon (Postgres) — unlocks the job queue  ·  ~5 min
1. Sign up at https://neon.tech → create a project (region: closest to you).
2. Copy the connection string (`postgres://…@…neon.tech/neondb?sslmode=require`).
3. In the Neon SQL editor, paste and run the contents of `db/migration.sql`.
4. Put it in `.env.local`:  `DATABASE_URL=postgres://…`

## 2. OpenAI — unlocks voiceover + script + captions  ·  ~2 min
1. https://platform.openai.com → API keys → create key.
2. `.env.local`:  `OPENAI_API_KEY=sk-…`
   (Cost is ~$0.04 per rendered video.)

## 3. Local secret for file downloads  ·  30 sec
`.env.local`:  `FILES_SECRET=` → paste output of `openssl rand -hex 32`

→ At this point tell me, and I render the FIRST fully-voiced video locally.

## 4. Deploy — unlocks fast renders + the public URL the listing needs  ·  ~15 min
Pick one:
- **Fly.io** (recommended): install flyctl, `fly launch --no-deploy` (uses our `fly.toml`),
  `fly secrets set DATABASE_URL=… OPENAI_API_KEY=… FILES_SECRET=… OKX_API_KEY=… OKX_SECRET_KEY=… OKX_PASSPHRASE=… PAY_TO=… NEXT_PUBLIC_BASE_URL=https://<app>.fly.dev`,
  then `fly deploy`.
- **Any VPS** with Docker: `docker build -t renderreel . && docker run --env-file .env.local -p 3000:3000 renderreel`.

→ Gives a stable HTTPS URL. Renders drop from ~40 min (this Mac) to ~30 sec.

## 5. OKX Developer Portal + Agentic Wallet — unlocks payments + listing  ·  ~15 min
1. https://web3.okx.com/onchainos → create Agentic Wallet (email login, no seed phrase).
2. Developer Portal → create app → copy **OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE**
   → into `.env.local` and `fly secrets set …`.
3. `PAY_TO=` your wallet address that receives USDT0 on X Layer.
4. Fund that wallet with ~$20 USDT0 on X Layer (for our own test payments).
5. Install skills:  `npx skills add okx/onchainos-skills`  (or the Claude Code plugin).
6. Register as ASP (role `asp`) via the `okx-ai` skill; choose **A2MCP pay-per-call**;
   point it at the deployed MCP URL:  `https://<app>.fly.dev/api/mcp/mcp`.
7. Submit the listing for review using the copy in `LISTING.md`.

→ This is the gate: an approved, live listing is what makes the hackathon submission valid.

## 6. Submit  ·  by Jul 17 23:59 UTC
- Post the demo video on X with **#OKXAI** (introduce it, use case, walkthrough ≤90s).
- Fill the Google form with ASP details + the X post link.

---

### `.env.local` — final shape
```
DATABASE_URL=postgres://…neon.tech/neondb?sslmode=require
OPENAI_API_KEY=sk-…
FILES_SECRET=<64 hex chars>
OKX_API_KEY=…
OKX_SECRET_KEY=…
OKX_PASSPHRASE=…
PAY_TO=0x…
NEXT_PUBLIC_BASE_URL=https://<app>.fly.dev
```
Leave `PAYMENTS_DISABLED` unset in production; set it to `1` only for local dev without OKX creds.
