import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:3100/', { waitUntil: 'networkidle' });
await p.waitForTimeout(3500);
await p.screenshot({ path: '/tmp/theme-dark-hero.png' });
// scroll to how-it-works
await p.evaluate(() => document.querySelector('#how')?.scrollIntoView());
await p.waitForTimeout(2000);
await p.screenshot({ path: '/tmp/theme-dark-how.png' });
// toggle to light via the nav button
await p.evaluate(() => { localStorage.setItem('theme','light'); document.documentElement.classList.remove('dark'); document.documentElement.classList.add('light'); });
await p.goto('http://localhost:3100/', { waitUntil: 'networkidle' });
await p.waitForTimeout(3500);
await p.screenshot({ path: '/tmp/theme-light-hero.png' });
await p.evaluate(() => document.querySelector('#pricing')?.scrollIntoView());
await p.waitForTimeout(2000);
await p.screenshot({ path: '/tmp/theme-light-pricing.png' });
await b.close(); console.log('done');
