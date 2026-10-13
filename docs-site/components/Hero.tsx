import Link from "next/link";
import Face from "./Face";
const NETS = ["Solana", "Base", "Ethereum", "Arbitrum", "Monad", "Hyperliquid", "Tempo", "Robinhood Chain", "Zcash"];
export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><span className="dot" /> Lexari documentation</p>
        <h1>Your own agent.<br /><i>Working onchain</i>, on your terms.</h1>
        <p className="lede">Personalized AI agents with a memory, a computer and a wallet. They read freely and act only when you tap Confirm.</p>
        <div className="hero-cta">
          <Link className="btn" href="/getting-started/">Get started</Link>
          <a className="btn ghost" href="https://app.lexari.ai" target="_blank" rel="noopener">Open the app ↗</a>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="orbit"><span>Confirm</span><span>$ USD</span><span>+5% SKR</span><span>Agent wallet</span></div>
        <div className="pass">
          <div className="pass-strap" />
          <div className="pass-card">
            <Face size={96} live />
            <b>Your agent</b>
            <small>AGENT PASS · LX-0001</small>
            <div className="pass-bar"><i /><i /><i /><i /><i /><i /><i /></div>
          </div>
        </div>
      </div>
      <div className="marquee" aria-label="Supported networks"><div>{[...NETS, ...NETS].map((n, i) => <span key={i}>{n}</span>)}</div></div>
    </section>
  );
}
