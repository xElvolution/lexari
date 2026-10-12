'use strict';
// Privy sign-in check. Same approach as the main Lexari app: Privy signs access and identity tokens (ES256)
// with a public per-app key, so no app secret is needed. PRIVY_VERIFICATION_KEY overrides the fetched key.
const crypto = require('node:crypto');

let cached = null;
async function verificationKey(appId) {
  if (cached && Date.now() - cached.at < 6 * 3600e3) return cached.key;
  let pem = (process.env.PRIVY_VERIFICATION_KEY || '').replace(/\\n/g, '\n').trim();
  if (!pem) {
    const r = await fetch(`https://auth.privy.io/api/v1/apps/${appId}`, { headers: { 'privy-app-id': appId }, signal: AbortSignal.timeout(8000) });
    pem = ((await r.json().catch(() => ({}))).verification_key || '').trim();
  }
  if (!pem) throw Object.assign(new Error('Email sign-in is not available right now.'), { status: 503 });
  cached = { key: crypto.createPublicKey(pem), at: Date.now() };
  return cached.key;
}
const b64 = s => Buffer.from(s, 'base64url');

async function verifyJwt(token, appId) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw Object.assign(new Error('Your sign-in expired. Try again.'), { status: 401 });
  let header, payload;
  try { header = JSON.parse(b64(parts[0])); payload = JSON.parse(b64(parts[1])); } catch { throw Object.assign(new Error('Your sign-in expired. Try again.'), { status: 401 }); }
  const key = await verificationKey(appId);
  const ok = header.alg === 'ES256' && crypto.verify('sha256', Buffer.from(parts[0] + '.' + parts[1]), { key, dsaEncoding: 'ieee-p1363' }, b64(parts[2]));
  const now = Date.now() / 1000;
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!ok || payload.iss !== 'privy.io' || !aud.includes(appId) || !(payload.exp > now - 30) || (payload.nbf && payload.nbf > now + 30)
    || typeof payload.sub !== 'string' || !payload.sub.startsWith('did:privy:')) throw Object.assign(new Error('Your sign-in expired. Try again.'), { status: 401 });
  return payload;
}

const emailOf = accounts => {
  const list = typeof accounts === 'string' ? JSON.parse(accounts) : accounts;
  const a = Array.isArray(list) && list.find(x => x && x.type === 'email' && typeof x.address === 'string');
  return a ? a.address.trim().toLowerCase() : null;
};

/** Returns { did, email } for a verified Privy email login. Prefers the identity token; falls back to the access token plus Privy's user endpoint. */
async function privyEmailUser({ idToken, accessToken }, appId) {
  if (idToken) {
    const p = await verifyJwt(idToken, appId);
    const email = emailOf(p.linked_accounts || '[]');
    if (email) return { did: p.sub, email };
  }
  if (!accessToken) throw Object.assign(new Error('Your sign-in expired. Try again.'), { status: 401 });
  const p = await verifyJwt(accessToken, appId);
  const r = await fetch('https://auth.privy.io/api/v1/users/me', { headers: { authorization: 'Bearer ' + accessToken, 'privy-app-id': appId }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw Object.assign(new Error('Could not confirm your email with Privy. Try again.'), { status: 502 });
  const u = await r.json();
  const user = u.user || u;
  if (user.id && user.id !== p.sub) throw Object.assign(new Error('Your sign-in expired. Try again.'), { status: 401 });
  const email = emailOf(user.linked_accounts);
  if (!email) throw Object.assign(new Error('Sign in with the email code to open your dashboard.'), { status: 400 });
  return { did: p.sub, email };
}
module.exports = { privyEmailUser };
