import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:3100/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(6000);
await p.screenshot({ path: '/tmp/site-dark.png' });
// scroll a bit to show icon bg between sections + nav
await p.evaluate(() => window.scrollTo({ top: 700, behavior: 'instant' }));
await p.waitForTimeout(2500);
await p.screenshot({ path: '/tmp/site-mid.png' });
await b.close(); console.log('done');
