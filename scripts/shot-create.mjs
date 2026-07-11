import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto('http://localhost:3100/create', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
// fill a bit so the live preview populates
await p.fill("input[placeholder='Vaultline']", 'Vaultline');
await p.fill("input[placeholder='Every yield strategy on every chain, one dashboard.']", 'Every yield strategy on every chain, one dashboard.');
const feats = await p.$$("input[placeholder^='Feature']");
if (feats[0]) await feats[0].fill('Live APY across 40+ protocols');
if (feats[1]) await feats[1].fill('One-click position migration');
if (feats[2]) await feats[2].fill('Risk scoring on every vault');
await p.waitForTimeout(600);
await p.screenshot({ path: '/tmp/create-launch.png' });
// switch to stat clip tab
await p.click('text=Stat Clip');
await p.waitForTimeout(800);
await p.screenshot({ path: '/tmp/create-stat.png' });
await b.close();
console.log('done');
