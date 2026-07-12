import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const [name, path] of [['landing','/'],['create','/create']]) {
  await p.goto('http://localhost:3100'+path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `/tmp/audit-${name}.png`, fullPage: true });
  console.log('shot', name);
}
await b.close();
