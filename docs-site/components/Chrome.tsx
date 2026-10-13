"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Face from "./Face";

type Nav = { group: string; items: { slug: string; title: string }[] }[];
type Entry = { slug: string; title: string; section: string; anchor: string; text: string };
const href = (slug: string) => (slug === "index" ? "/" : `/${slug}/`);

export default function Chrome({ nav, index, children }: { nav: Nav; index: Entry[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const path = usePathname();
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !(e.target as HTMLElement)?.closest("input,textarea"))) { e.preventDefault(); setSearch(true); }
      if (e.key === "Escape") { setSearch(false); setOpen(false); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  useEffect(() => { document.body.style.overflow = open || search ? "hidden" : ""; }, [open, search]);
  // copy buttons on code blocks
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const b = (e.target as HTMLElement).closest(".copy") as HTMLButtonElement | null;
      if (!b) return;
      const code = b.closest(".code")?.querySelector("code")?.textContent || "";
      navigator.clipboard?.writeText(code).then(() => { b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1400); });
    };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);
  const current = (path || "/").replace(/\/$/, "") || "/";
  return (
    <>
      <div className="bg" aria-hidden="true"><i className="blob b1" /><i className="blob b2" /><i className="blob b3" /><i className="grain" /></div>
      <header className="top">
        <button className="menu" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(!open)}><span /><span /></button>
        <Link href="/" className="brand"><Face size={30} live /><span>Lexari</span><em>Docs</em></Link>
        <button className="search-btn" onClick={() => setSearch(true)} aria-label="Search docs">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <span className="lbl">Search docs</span><kbd>Ctrl K</kbd>
        </button>
        <a className="open-app" href="https://app.lexari.ai" target="_blank" rel="noopener">Open app<span aria-hidden="true">↗</span></a>
      </header>
      <div className={open ? "scrim on" : "scrim"} onClick={() => setOpen(false)} />
      <div className="frame">
        <aside className={open ? "side open" : "side"}>
          <nav>
            {nav.map((g, gi) => (
              <div className="grp" key={g.group} style={{ ["--d" as any]: `${gi * 40}ms` }}>
                <p>{g.group}</p>
                {g.items.map((i) => {
                  const h = href(i.slug).replace(/\/$/, "") || "/";
                  return <Link key={i.slug} href={href(i.slug)} className={current === h ? "on" : ""}>{i.title}</Link>;
                })}
              </div>
            ))}
            <a className="apk" href="https://github.com/xElvolution/lexari-web/releases/latest/download/lexari.apk"><Face size={22} /> Get the Android app</a>
          </nav>
        </aside>
        <div className="main">{children}</div>
      </div>
      {search && <Search index={index} onClose={() => setSearch(false)} />}
    </>
  );
}

function Search({ index, onClose }: { index: Entry[]; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return index.filter((e) => !e.anchor).slice(0, 8);
    return index
      .map((e) => {
        const t = e.title.toLowerCase(), x = e.text.toLowerCase();
        let s = 0;
        for (const w of terms) { if (t.includes(w)) s += t.startsWith(w) ? 12 : 8; else if (x.includes(w)) s += 2; else return null; }
        if (!e.anchor) s += 1;
        return { e, s };
      })
      .filter(Boolean).sort((a, b) => b!.s - a!.s).slice(0, 10).map((r) => r!.e);
  }, [q, index]);
  useEffect(() => setSel(0), [q]);
  const go = (e: Entry) => { onClose(); router.push(href(e.slug) + (e.anchor ? `#${e.anchor}` : "")); };
  const snip = (e: Entry) => {
    const w = q.toLowerCase().split(/\s+/).filter(Boolean)[0];
    const i = w ? e.text.toLowerCase().indexOf(w) : -1;
    return (i > 40 ? "…" + e.text.slice(i - 40, i + 90) : e.text.slice(0, 120)) + "…";
  };
  return (
    <div className="search-scrim" onClick={onClose}>
      <div className="search" role="dialog" aria-label="Search" onClick={(e) => e.stopPropagation()}>
        <div className="search-in">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search balance, SKR, Confirm cards…"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              if (e.key === "Enter" && results[sel]) go(results[sel]);
            }} />
          <button onClick={onClose} className="esc">Esc</button>
        </div>
        <ul>
          {results.map((e, i) => (
            <li key={e.slug + e.anchor} className={i === sel ? "sel" : ""} onMouseEnter={() => setSel(i)} onClick={() => go(e)}>
              <span className="r-t">{e.section ? <><em>{e.section}</em> / </> : null}{e.title}</span>
              <span className="r-x">{snip(e)}</span>
            </li>
          ))}
          {!results.length && <li className="none">No results for “{q}”. Try “top up” or “wallet”.</li>}
        </ul>
      </div>
    </div>
  );
}
