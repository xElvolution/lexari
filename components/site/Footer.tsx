import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative border-t border-line px-6 py-16">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-10 md:flex-row">
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg font-display text-lg font-bold text-black"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
            >
              L
            </span>
            <span className="font-display text-lg font-bold">Lexari</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Motion graphics as a pay-per-call service. Structured input in, a cinematic
            MP4 and a verifiable on-chain receipt out — for humans and agents alike.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-16 gap-y-3 text-sm">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-faint">Product</span>
            <Link href="/create" className="text-muted transition-colors hover:text-ink">Create studio</Link>
            <a href="/#gallery" className="text-muted transition-colors hover:text-ink">Gallery</a>
            <a href="/#pricing" className="text-muted transition-colors hover:text-ink">Pricing</a>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-faint">Agents</span>
            <a href="/#agents" className="text-muted transition-colors hover:text-ink">MCP + x402</a>
            <a href="https://www.okx.ai" target="_blank" rel="noopener noreferrer" className="text-muted transition-colors hover:text-ink">OKX.AI</a>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-6xl border-t border-line pt-6 text-xs text-faint">
        Live on OKX.AI · Paid in USDT0 on X Layer via x402 · © {new Date().getFullYear()} Lexari
      </div>
    </footer>
  );
}
