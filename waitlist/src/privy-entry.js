// Bundled to public/privy.js with `npm run build`. Exposes the small slice of Privy the dashboard needs.
import Privy, { LocalStorage } from '@privy-io/js-sdk-core';
let client = null;
window.LexariPrivy = {
  async init(appId, clientId) {
    if (!client) { client = new Privy({ appId, ...(clientId ? { clientId } : {}), storage: new LocalStorage() }); await client.initialize(); }
    return true;
  },
  sendCode: email => client.auth.email.sendCode(email),
  async login(email, code) {
    const r = await client.auth.email.loginWithCode(email, code, 'login-or-sign-up');
    return { idToken: r.identity_token || (await client.getIdentityToken()) || null, accessToken: r.token || (await client.getAccessToken()) || null };
  },
  async logout() { try { await client?.auth.logout(); } catch {} },
};
