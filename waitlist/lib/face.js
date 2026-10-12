'use strict';
// Same seeded agent faces as public/app.js, so the banner and the site share one family.
const PAL = [['#ff8a3d','#d65f16'],['#3b82f6','#1e4fd6'],['#34d399','#079669'],['#fcd34d','#d19b04'],['#f45b5b','#c42a2a'],['#2dd4bf','#0d8f84'],['#f9a8d4','#d9579e'],['#c9b8ff','#8f6bff'],['#7dd3fc','#0b84c4']];
const SHAPES = ['<circle cx="50" cy="54" r="38"/>', '<rect x="12" y="18" width="76" height="70" rx="20"/>',
  '<path d="M50 16 C74 14 90 32 88 56 C86 80 70 92 48 90 C26 88 12 74 13 52 C14 30 28 17 50 16 Z"/>',
  '<path d="M50 14 L84 33 L84 73 L50 92 L16 73 L16 33 Z"/>', '<ellipse cx="50" cy="54" rx="34" ry="40"/>',
  '<rect x="8" y="28" width="84" height="60" rx="26"/>'];
const EYES = ['<ellipse cx="38" cy="52" rx="6.5" ry="8.5"/><ellipse cx="62" cy="52" rx="6.5" ry="8.5"/>',
  '<circle cx="38" cy="52" r="4.5"/><circle cx="62" cy="52" r="4.5"/>',
  '<rect x="27" y="45" width="46" height="14" rx="7"/>',
  '<path d="M31 55 Q38 46 45 55" stroke="#0a0a0a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M55 55 Q62 46 69 55" stroke="#0a0a0a" stroke-width="4" fill="none" stroke-linecap="round"/>'];
const MOUTHS = ['<path d="M42 70 Q50 77 58 70" stroke="#0a0a0a" stroke-width="3.4" fill="none" stroke-linecap="round"/>',
  '<path d="M40 68 Q50 82 60 68 Z"/>', '<ellipse cx="50" cy="72" rx="4" ry="5"/>',
  '<path d="M41 70 Q45.5 76 50 70 Q54.5 76 59 70" stroke="#0a0a0a" stroke-width="3.2" fill="none" stroke-linecap="round"/>'];
// inner markup of a 100x100 face
function faceInner(seed) {
  const r = n => { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); };
  const [fill, shade] = PAL[r(PAL.length)];
  return `<g fill="${fill}" stroke="${shade}" stroke-width="3" stroke-linejoin="round">${SHAPES[r(SHAPES.length)]}</g><ellipse cx="36" cy="30" rx="10" ry="5" fill="#fff" opacity=".35" transform="rotate(-20 36 30)"/><g fill="#0a0a0a">${EYES[r(EYES.length)]}${MOUTHS[r(MOUTHS.length)]}</g>`;
}
const seedOf = code => [...String(code)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 233280;
module.exports = { faceInner, seedOf };
