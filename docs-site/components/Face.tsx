export default function Face({ size = 28, live = false }: { size?: number; live?: boolean }) {
  return (
    <svg className={live ? "face live" : "face"} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#5B2BFF" />
      <g className="eyes">
        <ellipse cx="22" cy="26" rx="6" ry="8.5" fill="#fff" />
        <ellipse cx="42" cy="26" rx="6" ry="8.5" fill="#fff" />
      </g>
      <path className="mouth" d="M20 41 Q32 51.5 44 41" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" />
    </svg>
  );
}
