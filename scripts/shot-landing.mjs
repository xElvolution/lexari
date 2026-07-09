import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await p.waitForTimeout(4500); // let the particle morph + reveals settle
await p.screenshot({ path: '/tmp/landing-hero.png' });
await p.evaluate(() => window.scrollTo(0, 1600));
await p.waitForTimeout(1600);
await p.screenshot({ path: '/tmp/landing-how.png' });
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.62));
await p.waitForTimeout(1600);
await p.screenshot({ path: '/tmp/landing-pricing.png' });
await b.close();
console.log('done');
