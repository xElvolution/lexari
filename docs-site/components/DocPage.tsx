import Link from "next/link";
import { allDocs, type Doc } from "@/lib/docs";
import Toc from "./Toc";
import Hero from "./Hero";
const href = (slug: string) => (slug === "index" ? "/" : `/${slug}/`);
export default function DocPage({ doc }: { doc: Doc }) {
  const docs = allDocs();
  const i = docs.findIndex((d) => d.slug === doc.slug);
  const prev = docs[i - 1], next = docs[i + 1];
  return (
    <div className="page" key={doc.slug}>
      <article>
        {doc.slug === "index" ? <Hero /> : (
          <header className="doc-head">
            <p className="eyebrow">{doc.group}</p>
            <h1>{doc.title}</h1>
            <p className="lede">{doc.summary}</p>
          </header>
        )}
        <div className="prose" dangerouslySetInnerHTML={{ __html: doc.html }} />
        <nav className="pager">
          {prev ? <Link href={href(prev.slug)} className="pg prev"><small>Previous</small><b>{prev.title}</b></Link> : <span />}
          {next ? <Link href={href(next.slug)} className="pg next"><small>Next</small><b>{next.title}</b></Link> : <span />}
        </nav>
        <footer className="foot"><span>© 2026 Lexari</span><a href="https://lexari.ai" target="_blank" rel="noopener">lexari.ai</a><a href="https://app.lexari.ai" target="_blank" rel="noopener">app.lexari.ai</a></footer>
      </article>
      <Toc items={doc.headings} />
    </div>
  );
}
