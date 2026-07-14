"use client";

/**
 * Telegram-style scattered-icon wallpaper: a seamless tiled SVG pattern of
 * small monochrome motion-design doodles (play, film frame, sparkle, wave,
 * cursor, caption bars, star, aperture) at low opacity. Sits above the base
 * wash and below the glows in <Ambient/>. Uses currentColor so the theme
 * tint flows through.
 */

// A 240x240 tile. Icons are placed + rotated so the repeat doesn't read as a grid.
const TILE = `
<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'>
  <g fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
    <!-- play -->
    <g transform='translate(28 30) rotate(-12)'><path d='M0 -9 L11 0 L0 9 Z' fill='currentColor' stroke='none'/></g>
    <!-- film frame -->
    <g transform='translate(150 26) rotate(8)'>
      <rect x='-13' y='-10' width='26' height='20' rx='3'/>
      <path d='M-13 -3 H13 M-13 3 H13 M-6 -10 V10 M6 -10 V10'/>
    </g>
    <!-- sparkle -->
    <g transform='translate(210 70) rotate(0)'><path d='M0 -10 C1 -3 3 -1 10 0 C3 1 1 3 0 10 C-1 3 -3 1 -10 0 C-3 -1 -1 -3 0 -10 Z' fill='currentColor' stroke='none'/></g>
    <!-- waveform -->
    <g transform='translate(70 92) rotate(0)'>
      <path d='M-16 0 V0 M-11 -7 V7 M-6 -12 V12 M-1 -6 V6 M4 -10 V10 M9 -4 V4 M14 -8 V8'/>
    </g>
    <!-- cursor arrow -->
    <g transform='translate(190 132) rotate(6)'>
      <path d='M-6 -8 L-6 8 L-2 4 L1 10 L4 9 L1 3 L6 3 Z' fill='currentColor' stroke='none'/>
    </g>
    <!-- caption bars -->
    <g transform='translate(34 150) rotate(-6)'>
      <rect x='-14' y='-8' width='28' height='16' rx='4'/>
      <path d='M-9 -1 H4 M-9 4 H9'/>
    </g>
    <!-- star -->
    <g transform='translate(120 178) rotate(0)'>
      <path d='M0 -11 L3 -3 L11 -3 L5 2 L7 10 L0 5 L-7 10 L-5 2 L-11 -3 L-3 -3 Z'/>
    </g>
    <!-- aperture / lens -->
    <g transform='translate(206 200) rotate(0)'>
      <circle cx='0' cy='0' r='11'/>
      <path d='M0 -11 L4 -3 M11 0 L3 2 M4 10 L1 3 M-9 6 L-2 2 M-6 -9 L-1 -2'/>
    </g>
    <!-- small play (repeat, offset) -->
    <g transform='translate(96 44) rotate(14)'><path d='M0 -6 L7 0 L0 6 Z' fill='currentColor' stroke='none'/></g>
    <!-- plus/sparkle dot -->
    <g transform='translate(150 96)'><circle cx='0' cy='0' r='2.5' fill='currentColor' stroke='none'/></g>
    <!-- timeline slider -->
    <g transform='translate(120 120) rotate(0)'>
      <path d='M-16 0 H16'/><circle cx='2' cy='0' r='3.5' fill='currentColor' stroke='none'/>
    </g>
    <!-- speech/render bubble -->
    <g transform='translate(60 210) rotate(4)'>
      <rect x='-11' y='-8' width='22' height='15' rx='5'/><path d='M-4 7 L-2 12 L2 7'/>
    </g>
  </g>
</svg>`;

export default function IconPattern() {
  const data = `url("data:image/svg+xml,${encodeURIComponent(TILE)}")`;
  return (
    <div
      aria-hidden
      className="absolute inset-0 text-[color:var(--accent)]"
      style={{
        backgroundImage: data,
        backgroundRepeat: "repeat",
        backgroundSize: "240px 240px",
        opacity: "calc(var(--glow) * 0.42)",
        maskImage:
          "radial-gradient(ellipse 90% 80% at 50% 30%, black 20%, transparent 80%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 90% 80% at 50% 30%, black 20%, transparent 80%)",
        animation: "iconDrift 90s linear infinite",
      }}
    />
  );
}
