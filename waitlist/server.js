'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { renderOg } = require('./lib/og');
const { privyEmailUser } = require('./lib/privy');

const PORT = Number(process.env.PORT || 3220);
const HOST = process.env.HOST || '127.0.0.1';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'waitlist.db');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const PUBLIC_URL = process.env.PUBLIC_URL || 'https://waitlist.lexari.ai';
const PRIVY_APP_ID = process.env.PRIVY_APP_ID || '';
const PRIVY_CLIENT_ID = process.env.PRIVY_CLIENT_ID || '';
const X_HANDLE = (process.env.X_HANDLE || '').replace(/^@/, '').replace(/[^A-Za-z0-9_]/g, '');
const TELEGRAM_URL = /^https:\/\/t\.me\//.test(process.env.TELEGRAM_URL || '') ? process.env.TELEGRAM_URL : '';
const DISCORD_URL = /^https:\/\/(discord\.gg|discord\.com\/invite)\//.test(process.env.DISCORD_URL || '') ? process.env.DISCORD_URL : '';
const SECURE_COOKIE = PUBLIC_URL.startsWith('https://');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  ref_code TEXT NOT NULL UNIQUE,
  referred_by TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE TABLE IF NOT EXISTS points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES signups(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  pts INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE(user_id, key)
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES signups(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS points_user ON points(user_id);
CREATE INDEX IF NOT EXISTS signups_ref ON signups(referred_by);`);
db.exec('PRAGMA foreign_keys=ON;');
{
  const cols = db.prepare('PRAGMA table_info(signups)').all().map(c => c.name);
  if (!cols.includes('privy_did')) db.exec('ALTER TABLE signups ADD COLUMN privy_did TEXT');
  if (!cols.includes('verified_at')) db.exec('ALTER TABLE signups ADD COLUMN verified_at TEXT');
}

/* ---- points: one row per (user, key), so every award is idempotent ---- */
const PTS = { signup: 100, verify_email: 50, referral: 50, share_x: 25, follow_x: 25, join_telegram: 25, join_discord: 25 };
const qAward = db.prepare('INSERT OR IGNORE INTO points (user_id, key, pts) VALUES (?, ?, ?)');
const award = (userId, key, pts) => qAward.run(userId, key, pts).changes > 0;
// backfill rows that predate points: signup bonus for everyone, referral bonus per referred signup
db.exec(`INSERT OR IGNORE INTO points (user_id, key, pts) SELECT id, 'signup', ${PTS.signup} FROM signups;
INSERT OR IGNORE INTO points (user_id, key, pts) SELECT p.id, 'ref:' || c.id, ${PTS.referral} FROM signups c JOIN signups p ON p.ref_code = c.referred_by;`);
const TASKS = [
  { key: 'verify_email', title: 'Verify your email', body: 'Sign in once with the code Privy emails you.', pts: PTS.verify_email, kind: 'auto' },
  { key: 'share_x', title: 'Share your pass on X', body: 'Post your banner with your link.', pts: PTS.share_x, kind: 'self' },
  X_HANDLE && { key: 'follow_x', title: `Follow @${X_HANDLE} on X`, body: 'Stay close to launch news.', pts: PTS.follow_x, kind: 'self', url: `https://x.com/intent/follow?screen_name=${X_HANDLE}` },
  TELEGRAM_URL && { key: 'join_telegram', title: 'Join the Telegram', body: 'Chat with the team and early users.', pts: PTS.join_telegram, kind: 'self', url: TELEGRAM_URL },
  DISCORD_URL && { key: 'join_discord', title: 'Join the Discord', body: 'Chat with the team and early users.', pts: PTS.join_discord, kind: 'self', url: DISCORD_URL },
].filter(Boolean);
const SELF_TASKS = new Set(TASKS.filter(t => t.kind === 'self').map(t => t.key));

const SCORES = `SELECT s.id, s.email, s.ref_code, COALESCE((SELECT SUM(pts) FROM points p WHERE p.user_id = s.id), 0) AS pts FROM signups s`;
const qPts = db.prepare('SELECT COALESCE(SUM(pts),0) AS n FROM points WHERE user_id = ?');
const qRank = db.prepare(`WITH t AS (${SCORES}) SELECT COUNT(*) + 1 AS n FROM t WHERE t.pts > ? OR (t.pts = ? AND t.id < ?)`);
const qTop = db.prepare(`WITH t AS (${SCORES}) SELECT id, email, ref_code, pts FROM t ORDER BY pts DESC, id ASC LIMIT ?`);
const qCutoff = db.prepare(`WITH t AS (${SCORES}) SELECT pts FROM t ORDER BY pts DESC, id ASC LIMIT 1 OFFSET 99`);
const qMyTasks = db.prepare('SELECT key, pts, created_at FROM points WHERE user_id = ?');
const qReferrals = db.prepare('SELECT id, email, created_at, verified_at FROM signups WHERE referred_by = ? ORDER BY id DESC LIMIT 200');
const qUser = db.prepare('SELECT id, email, ref_code, referred_by, created_at, verified_at FROM signups WHERE id = ?');
const qSetVerified = db.prepare("UPDATE signups SET privy_did = ?, verified_at = COALESCE(verified_at, strftime('%Y-%m-%dT%H:%M:%SZ','now')) WHERE id = ?");
const qSessIns = db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)');
const qSessGet = db.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?');
const qSessDel = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
const qSessGc = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
setInterval(() => qSessGc.run(Date.now()), 3600e3).unref();
const SESSION_DAYS = 30;
const tokenHash = t => crypto.createHash('sha256').update(t).digest('hex');
const cookieOf = (req, name) => { const m = (req.headers.cookie || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)')); return m ? m[1] : ''; };
function sessionUser(req) {
  const t = cookieOf(req, 'lx_s');
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(t)) return null;
  const s = qSessGet.get(tokenHash(t), Date.now());
  return s ? qUser.get(s.user_id) : null;
}
function newSession(userId) {
  const t = crypto.randomBytes(32).toString('base64url');
  qSessIns.run(tokenHash(t), userId, Date.now() + SESSION_DAYS * 864e5);
  return `lx_s=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${SECURE_COOKIE ? '; Secure' : ''}`;
}
// public-safe label for other people's emails: first two letters of the name only
const handleOf = e => { const u = e.split('@')[0].replace(/[^a-z0-9]/gi, ''); return (u.slice(0, 2) || 'ag') + '\u2022\u2022\u2022\u2022'; };
const maskEmail = e => { const [u, d] = e.split('@'); return (u.length <= 2 ? u[0] + '*' : u.slice(0, 2) + '*'.repeat(Math.min(5, u.length - 2))) + '@' + d; };
function dashboard(u) {
  const position = qPos.get(u.id).n, total = qCount.get().n, pts = qPts.get(u.id).n;
  const rank = qRank.get(pts, pts, u.id).n;
  const cutoffRow = qCutoff.get();
  const cutoff = cutoffRow ? cutoffRow.pts : 0;
  const inTop = rank <= 100;
  const need = inTop ? 0 : Math.max(1, cutoff - pts + 1);
  const done = new Map(qMyTasks.all(u.id).map(r => [r.key, r]));
  const refs = qReferrals.all(u.ref_code);
  return {
    ok: true,
    me: { email: u.email, masked: maskEmail(u.email), code: u.ref_code, joined: u.created_at, verified: !!u.verified_at },
    position, total, points: pts, rank,
    top100: { inTop, cutoff, need, progress: inTop ? 1 : Math.min(0.99, pts / (cutoff + 1)) },
    share: `${PUBLIC_URL}/r/${u.ref_code}`, banner: `/og/${u.ref_code}.png`,
    tasks: [
      ...TASKS.map(t => ({ key: t.key, title: t.title, body: t.body, pts: t.pts, kind: t.kind, url: t.url || null, done: done.has(t.key) })),
      { key: 'referral', title: 'Refer friends', body: `Every friend who joins with your link adds ${PTS.referral} points.`, pts: PTS.referral, kind: 'repeat', count: refs.length, done: false },
    ],
    referrals: refs.map(r => ({ who: maskEmail(r.email), joined: r.created_at, verified: !!r.verified_at, pts: PTS.referral })),
    leaderboard: qTop.all(10).map((r, i) => ({ rank: i + 1, who: r.id === u.id ? 'You' : handleOf(r.email), seed: r.ref_code, pts: r.pts, me: r.id === u.id })),
    social: { x: X_HANDLE || null, telegram: TELEGRAM_URL || null, discord: DISCORD_URL || null },
  };
}
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function sharePage(row) {
  const pos = qPos.get(row.id).n;
  const url = `${PUBLIC_URL}/r/${row.ref_code}`, img = `${PUBLIC_URL}/og/${row.ref_code}.png`, dest = `/?ref=${row.ref_code}`;
  const title = `#${pos} in line for a Lexari agent`, desc = 'Your own agent. Your rules. Onchain. Personalized AI agents with their own memory, wallet and computer. Get in line.';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(title)}</title><meta name="description" content="${escHtml(desc)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Lexari"><meta property="og:url" content="${url}">
<meta property="og:title" content="${escHtml(title)}"><meta property="og:description" content="${escHtml(desc)}">
<meta property="og:image" content="${img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Lexari agent pass ${escHtml('#' + pos)}. Your own agent. Your rules. Onchain.">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escHtml(title)}"><meta name="twitter:description" content="${escHtml(desc)}"><meta name="twitter:image" content="${img}">${X_HANDLE ? `<meta name="twitter:site" content="@${X_HANDLE}">` : ''}
<meta http-equiv="refresh" content="0;url=${dest}"><link rel="icon" href="/icon.svg"><style>body{background:#000;color:#cfc8ea;font:16px system-ui;display:grid;place-items:center;min-height:100vh}a{color:#a58bff}</style>
</head><body><p>Taking you to the <a href="${dest}">Lexari waitlist</a>.</p><script>location.replace(${JSON.stringify(dest)})</script></body></html>`;
}
const qFind = db.prepare('SELECT id, ref_code FROM signups WHERE email = ?');
const qByRef = db.prepare('SELECT id, ref_code, email FROM signups WHERE ref_code = ?');
const qIns = db.prepare('INSERT INTO signups (email, ref_code, referred_by, ip_hash, user_agent) VALUES (?, ?, ?, ?, ?)');
const qPos = db.prepare('SELECT COUNT(*) AS n FROM signups WHERE id <= ?');
const qCount = db.prepare('SELECT COUNT(*) AS n FROM signups');
const qRefs = db.prepare('SELECT COUNT(*) AS n FROM signups WHERE referred_by = ?');
const qAll = db.prepare('SELECT s.id, s.email, s.ref_code, s.referred_by, s.created_at, (SELECT COUNT(*) FROM signups r WHERE r.referred_by = s.ref_code) AS referrals FROM signups s ORDER BY s.id');

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/;
function normEmail(e) {
  if (typeof e !== 'string') return null;
  e = e.trim().toLowerCase();
  if (e.length < 6 || e.length > 254 || !EMAIL_RE.test(e) || e.includes('..')) return null;
  if (e.split('@')[0].length > 64) return null;
  return e;
}

// rate limit: sliding window per IP
const hits = new Map();
const LIMIT = 8, WINDOW = 10 * 60 * 1000;
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < WINDOW);
  arr.push(now); hits.set(ip, arr);
  return arr.length > LIMIT;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some(t => now - t < WINDOW)) hits.delete(k); }, 60000).unref();

const clientIp = req => (req.headers['x-real-ip'] || req.socket.remoteAddress || '').toString();
const ipHash = ip => crypto.createHash('sha256').update('lexari-wl:' + ip).digest('hex').slice(0, 16);
const newRef = () => crypto.randomBytes(5).toString('base64url').replace(/[-_]/g, 'x').slice(0, 7).toLowerCase();

function send(res, code, body, headers = {}) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(code, { 'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
}
function onJoined(id) {
  award(id, 'signup', PTS.signup);
  const u = qUser.get(id);
  if (u.referred_by) { const p = qByRef.get(u.referred_by); if (p && p.id !== id) award(p.id, 'ref:' + id, PTS.referral); }
}
function result(row, existing) {
  return { ok: true, existing, position: qPos.get(row.id).n, total: qCount.get().n, ref: row.ref_code, referrals: qRefs.get(row.ref_code).n, share: `${PUBLIC_URL}/r/${row.ref_code}`, banner: `/og/${row.ref_code}.png` };
}
function readBody(req, max = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0, chunks = [];
    req.on('data', c => { size += c.length; if (size > max) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
const csvCell = v => { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

const STATIC = { '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css', '/icon.svg': 'icon.svg',
  '/dashboard': 'dashboard.html', '/dashboard.js': 'dashboard.js', '/dashboard.css': 'dashboard.css', '/privy.js': 'privy.js' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const HTML_PAGES = new Set(['/', '/index.html', '/dashboard']);
async function json(req, res) {
  if (!(req.headers['content-type'] || '').includes('application/json')) { send(res, 415, { ok: false, error: 'Bad request' }); return null; }
  try { return JSON.parse((await readBody(req, 16384)) || '{}'); } catch { send(res, 400, { ok: false, error: 'Bad request' }); return null; }
}
// same-origin check for cookie-authenticated writes
const sameOrigin = req => { const o = req.headers.origin; return !o || o === PUBLIC_URL || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o); };
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY' };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    if (req.method === 'GET' && STATIC[p]) {
      const f = path.join(__dirname, 'public', STATIC[p]);
      return send(res, 200, fs.readFileSync(f), { ...SEC, 'Content-Type': TYPES[path.extname(f)], 'Cache-Control': HTML_PAGES.has(p) ? 'no-cache' : 'public, max-age=300' });
    }
    if (req.method === 'GET' && p === '/api/health') return send(res, 200, { ok: true });
    if (req.method === 'GET' && p === '/api/stats') return send(res, 200, { total: qCount.get().n });
    if (req.method === 'GET' && p === '/api/config') return send(res, 200, { privyAppId: PRIVY_APP_ID || null, privyClientId: PRIVY_CLIENT_ID || null }, { 'Cache-Control': 'public, max-age=300' });
    let m;
    if (req.method === 'GET' && (m = p.match(/^\/og\/([a-z0-9]{4,12})\.png$/))) {
      const row = qByRef.get(m[1]);
      if (!row) return send(res, 404, 'Not found');
      return send(res, 200, renderOg(qPos.get(row.id).n, row.ref_code), { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
    }
    if (req.method === 'GET' && (m = p.match(/^\/r\/([a-z0-9]{4,12})\/?$/))) {
      const row = qByRef.get(m[1]);
      if (!row) return send(res, 302, '', { Location: '/' });
      return send(res, 200, sharePage(row), { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    }
    if (req.method === 'POST' && p === '/api/auth/privy') {
      if (!sameOrigin(req)) return send(res, 403, { ok: false, error: 'Bad origin' });
      if (!PRIVY_APP_ID) return send(res, 503, { ok: false, error: 'Email sign-in is not set up yet.' });
      const ip = clientIp(req);
      if (limited('auth:' + ip)) return send(res, 429, { ok: false, error: 'Easy there. Try again in a few minutes.' });
      const data = await json(req, res); if (!data) return;
      let who;
      try { who = await privyEmailUser({ idToken: typeof data.idToken === 'string' ? data.idToken : '', accessToken: typeof data.accessToken === 'string' ? data.accessToken : '' }, PRIVY_APP_ID); }
      catch (e) { return send(res, e.status || 401, { ok: false, error: e.status ? e.message : 'Your sign-in expired. Try again.' }); }
      const email = normEmail(who.email);
      if (!email) return send(res, 422, { ok: false, error: 'That email does not look right.' });
      let row = qFind.get(email), created = false;
      if (!row) {
        const ref = typeof data.ref === 'string' && /^[a-z0-9]{4,12}$/.test(data.ref) && qByRef.get(data.ref) ? data.ref : null;
        for (let i = 0; i < 5; i++) {
          try { qIns.run(email, newRef(), ref, ipHash(ip), String(req.headers['user-agent'] || '').slice(0, 200)); created = true; break; }
          catch (e) { if (qFind.get(email)) break; if (i === 4) throw e; }
        }
        row = qFind.get(email);
        if (created) onJoined(row.id);
      }
      qSetVerified.run(who.did, row.id);
      award(row.id, 'verify_email', PTS.verify_email);
      return send(res, 200, { ok: true, created }, { 'Set-Cookie': newSession(row.id) });
    }
    if (req.method === 'POST' && p === '/api/auth/logout') {
      const t = cookieOf(req, 'lx_s'); if (t) qSessDel.run(tokenHash(t));
      return send(res, 200, { ok: true }, { 'Set-Cookie': `lx_s=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${SECURE_COOKIE ? '; Secure' : ''}` });
    }
    if (req.method === 'GET' && p === '/api/me') {
      const u = sessionUser(req);
      if (!u) return send(res, 401, { ok: false, error: 'Sign in to open your dashboard.' });
      return send(res, 200, dashboard(u));
    }
    if (req.method === 'POST' && (m = p.match(/^\/api\/tasks\/([a-z_]{3,32})$/))) {
      if (!sameOrigin(req)) return send(res, 403, { ok: false, error: 'Bad origin' });
      const u = sessionUser(req);
      if (!u) return send(res, 401, { ok: false, error: 'Sign in to open your dashboard.' });
      if (!SELF_TASKS.has(m[1])) return send(res, 404, { ok: false, error: 'Unknown task' });
      const awarded = award(u.id, m[1], PTS[m[1]]);
      return send(res, 200, { ...dashboard(u), awarded });
    }
    if (req.method === 'POST' && p === '/api/join') {
      if (!(req.headers['content-type'] || '').includes('application/json')) return send(res, 415, { ok: false, error: 'Bad request' });
      const ip = clientIp(req);
      if (limited(ip)) return send(res, 429, { ok: false, error: 'Easy there. Try again in a few minutes.' });
      let data; try { data = JSON.parse(await readBody(req)); } catch { return send(res, 400, { ok: false, error: 'Bad request' }); }
      // honeypot: bots fill the hidden field or submit instantly. Pretend success, store nothing.
      if ((data.company && String(data.company).trim()) || (typeof data.t === 'number' && data.t < 1200)) {
        return send(res, 200, { ok: true, existing: false, position: qCount.get().n + 1, total: qCount.get().n + 1, ref: 'welcome', referrals: 0, share: PUBLIC_URL });
      }
      const email = normEmail(data.email);
      if (!email) return send(res, 422, { ok: false, error: 'That email does not look right.' });
      let row = qFind.get(email);
      if (row) return send(res, 200, result(row, true));
      let ref = typeof data.ref === 'string' && /^[a-z0-9]{4,12}$/.test(data.ref) && qByRef.get(data.ref) ? data.ref : null;
      for (let i = 0; i < 5; i++) {
        try { qIns.run(email, newRef(), ref, ipHash(ip), String(req.headers['user-agent'] || '').slice(0, 200)); break; }
        catch (e) { if (qFind.get(email)) break; if (i === 4) throw e; }
      }
      row = qFind.get(email);
      onJoined(row.id);
      return send(res, 201, result(row, false));
    }
    if (req.method === 'GET' && p === '/admin/export.csv') {
      const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || url.searchParams.get('token') || '';
      if (!ADMIN_TOKEN || !safeEq(auth, ADMIN_TOKEN)) return send(res, 401, 'Unauthorized');
      const rows = qAll.all();
      const out = ['position,email,ref_code,referred_by,referrals,created_at'];
      rows.forEach((r, i) => out.push([i + 1, r.email, r.ref_code, r.referred_by, r.referrals, r.created_at].map(csvCell).join(',')));
      return send(res, 200, out.join('\n') + '\n', { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="lexari-waitlist-${new Date().toISOString().slice(0, 10)}.csv"` });
    }
    send(res, 404, 'Not found');
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(res, 500, { ok: false, error: 'Something broke. Try again.' });
  }
}).listen(PORT, HOST, () => console.log(`lexari-waitlist on ${HOST}:${PORT}`));
