'use strict';
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');
const { faceInner, seedOf } = require('./face');

const FONTS = ['Bricolage-ExtraBold.ttf', 'MartianMono-SemiBold.ttf', 'Figtree-SemiBold.ttf'].map(f => path.join(__dirname, '..', 'fonts', f));
const W = 1200, H = 630;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The grape mascot from the landing page, happy face, blush and sparks.
const MASCOT = `
  <rect x="20" y="30" width="160" height="160" rx="40" fill="#3514b0"/>
  <rect x="20" y="20" width="160" height="160" rx="40" fill="#5b2bff"/>
  <ellipse cx="52" cy="122" rx="12" ry="7" fill="#f9a8d4" opacity=".85"/><ellipse cx="148" cy="122" rx="12" ry="7" fill="#f9a8d4" opacity=".85"/>
  <path d="M52 98 Q70 70 88 98" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
  <path d="M112 98 Q130 70 148 98" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
  <path d="M64 130 Q100 134 136 130 Q134 168 100 168 Q66 168 64 130 Z" fill="#0a0a0a" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>
  <path d="M188 22 l5 13 13 5 -13 5 -5 13 -5 -13 -13 -5 13 -5z" fill="#fcd34d"/>
  <path d="M14 150 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4z" fill="#fcd34d"/>`;

function svg(position, code) {
  const num = '#' + String(position).padStart(4, '0');
  const numSize = num.length > 7 ? 88 : num.length > 6 ? 98 : num.length > 5 ? 112 : 120;
  const crew = [[40, 470, 70, 3, -8], [455, 36, 54, 20, 10], [1112, 535, 64, 37, 6], [1110, 40, 56, 54, -10], [610, 540, 46, 71, 12]]
    .map(([x, y, s, seed, rot]) => `<g transform="translate(${x} ${y}) rotate(${rot} ${s / 2} ${s / 2}) scale(${s / 100})" opacity=".9">${faceInner(seed)}</g>`).join('');
  const dots = [[300, 80, 5, '#c9b8ff'], [1010, 300, 6, '#34d399'], [560, 470, 4, '#fcd34d'], [140, 420, 4, '#f9a8d4'], [980, 585, 5, '#8f6bff'], [700, 60, 4, '#ffffff']]
    .map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join('');
  const bars = Array.from({ length: 34 }, (_, i) => { const w = [2, 3, 1, 2, 4][(i * 7 + seedOf(code)) % 5]; return `<rect x="${i * 8}" y="0" width="${w}" height="34" fill="#0a0a0a"/>`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="g1" cx="0.72" cy="0.42" r="0.6"><stop offset="0" stop-color="#5b2bff" stop-opacity=".62"/><stop offset=".55" stop-color="#5b2bff" stop-opacity=".14"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx="0.1" cy="1" r="0.5"><stop offset="0" stop-color="#8f6bff" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#000"/>
  <rect width="${W}" height="${H}" fill="url(#g1)"/><rect width="${W}" height="${H}" fill="url(#g2)"/>
  ${dots}${crew}
  <g transform="translate(64 60)">
    <rect width="40" height="40" rx="12" fill="#fff"/><circle cx="20" cy="20" r="7" fill="#000"/>
    <text x="54" y="32" font-family="LexDisplay" font-size="38" fill="#fff" letter-spacing="-1.6">lexari</text>
  </g>
  <text x="64" y="186" font-family="LexMono" font-size="17" fill="#c9b8ff" letter-spacing="1.5">PERSONALIZED AI AGENTS, ONCHAIN</text>
  <g font-family="LexDisplay" font-size="86" fill="#fff" letter-spacing="-3.2">
    <text x="60" y="282">Your own agent.</text><text x="60" y="362">Your rules.</text><text x="60" y="442" fill="#a58bff">Onchain.</text>
  </g>
  <text x="64" y="548" font-family="LexSans" font-size="26" fill="#cfc8ea">Claim yours at <tspan fill="#fff">waitlist.lexari.ai</tspan></text>
  <g transform="translate(770 150) rotate(-4 170 200)">
    <rect x="0" y="18" width="340" height="380" rx="26" fill="#3514b0"/>
    <rect x="0" y="0" width="340" height="380" rx="26" fill="#fff"/>
    <path d="M0 26 Q0 0 26 0 H314 Q340 0 340 26 V96 H0 Z" fill="#5b2bff"/>
    <rect x="147" y="14" width="46" height="9" rx="4.5" fill="#000" opacity=".85"/>
    <text x="24" y="78" font-family="LexMono" font-size="15" fill="#fff" letter-spacing="1">LEXARI / AGENT PASS</text>
    <g transform="translate(24 120)"><rect width="92" height="92" rx="20" fill="#f5f2ff"/><g transform="translate(6 6) scale(.8)">${faceInner(seedOf(code))}</g></g>
    <text x="132" y="150" font-family="LexMono" font-size="14" fill="#6b6680" letter-spacing="1">WAITLIST NO.</text>
    <text x="132" y="182" font-family="LexDisplay" font-size="30" fill="#0a0a0a" letter-spacing="-1">Spot in line</text>
    <text x="22" y="${290 + (120 - numSize) * .3}" font-family="LexDisplay" font-size="${numSize}" fill="#0a0a0a" letter-spacing="-5">${esc(num)}</text>
    <g transform="translate(24 320)">${bars}</g>
  </g>
  <g transform="translate(990 64) rotate(10 90 90) scale(.9)">${MASCOT}</g>
</svg>`;
}

const cache = new Map();
function renderOg(position, code) {
  const key = position + ':' + code;
  let png = cache.get(key);
  if (png) { cache.delete(key); cache.set(key, png); return png; }
  png = new Resvg(svg(position, code), { fitTo: { mode: 'width', value: W }, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'LexSans' } }).render().asPng();
  cache.set(key, png);
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return png;
}
module.exports = { renderOg, svg };
