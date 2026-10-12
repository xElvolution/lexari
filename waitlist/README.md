# Lexari waitlist

Waitlist, dashboard and share banners for waitlist.lexari.ai. This folder is standalone: its own `package.json`, no imports from other Lexari folders, and not part of any npm workspace.

Node 24 (`node:sqlite`), static files in `public/`, one runtime dependency (`@resvg/resvg-js`) for the banner.

## Routes

- `POST /api/join` `{email, company(honeypot), ref, t}` returns position, total, share link (`/r/:code`) and banner. Same email returns its existing position.
- `GET /api/stats` total in line. `GET /api/config` public Privy app id.
- `GET /r/:code` share page with `og:image` and `twitter:card=summary_large_image`. People are redirected to `/?ref=:code`.
- `GET /og/:code.png` 1200x630 banner with the user's spot in line, rendered server side from SVG with resvg and the fonts in `fonts/` (OFL).
- `GET /dashboard` dashboard. Sign-in is a Privy email code (`@privy-io/js-sdk-core`, bundled to `public/privy.js`). `POST /api/auth/privy {idToken, accessToken, ref}` verifies the Privy ES256 token with Privy's public key (no app secret) and sets an HttpOnly session cookie. An email with no signup yet is added to the line.
- `GET /api/me` dashboard data. `POST /api/tasks/:key` claims a self-reported task. `POST /api/auth/logout`.
- `GET /admin/export.csv` with `Authorization: Bearer <ADMIN_TOKEN>` (or `?token=`).

## Points

Stored in the `points` table with `UNIQUE(user_id, key)`, so every award happens once no matter how often it is triggered.

| key | points | how |
| --- | --- | --- |
| `signup` | 100 | joining |
| `verify_email` | 50 | first Privy email sign-in |
| `ref:<signup id>` | 50 each | a friend joins with your link |
| `share_x` | 25 | self-reported, once |
| `follow_x`, `join_telegram`, `join_discord` | 25 | self-reported, once, only shown when `X_HANDLE`, `TELEGRAM_URL`, `DISCORD_URL` are set |

Rank is by points, ties broken by who joined first. Waitlist points are for rewards at launch and are not transferred to the main Lexari balance.

## Run

```bash
npm ci --omit=dev
pm2 start ecosystem.config.cjs   # port 3220
```

Env: see `.env.example`. Secrets live in `/etc/lexari-waitlist/admin.env` (root only). Rebuild the Privy bundle with `npm install && npm run build` after bumping the SDK.
