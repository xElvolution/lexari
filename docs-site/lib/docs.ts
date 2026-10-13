import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Marked } from "marked";

export type Heading = { id: string; text: string; level: number };
export type Doc = { slug: string; title: string; group: string; summary: string; html: string; headings: Heading[]; text: string; order: number };

const DIR = path.join(process.cwd(), "content");
const BASE = process.env.DOCS_BASE || "";
export const GROUPS = ["Start here", "Money", "Agents", "Build", "Account"];

const BADGE: Record<string, string> = { live: "Live", testnet: "Testnet", soon: "Coming soon" };
const slugify = (s: string) => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/\[\[\w+\]\]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function render(md: string) {
  const headings: Heading[] = [];
  const m = new Marked({ gfm: true });
  m.use({
    renderer: {
      heading({ tokens, depth }) {
        const raw = tokens.map((t: any) => t.raw).join("");
        const id = slugify(raw);
        const inner = this.parser.parseInline(tokens);
        if (depth <= 3) headings.push({ id, text: raw.replace(/\[\[\w+\]\]/g, "").replace(/\*\*/g, "").trim(), level: depth });
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-label="Link to section">#</a>${inner}</h${depth}>\n`;
      },
      code({ text, lang }) {
        return `<div class="code"><div class="code-bar"><span>${esc(lang || "text")}</span><button class="copy" type="button">Copy</button></div><pre><code>${esc(text)}</code></pre></div>`;
      },
    },
  });
  let html = m.parse(md) as string;
  html = html.replace(/<blockquote>\s*<p>\[!(NOTE|TIP|WARNING)\]\s*/g, (_s, k) => `<blockquote class="callout ${k.toLowerCase()}"><p><b class="callout-k">${k === "NOTE" ? "Note" : k === "TIP" ? "Tip" : "Heads up"}</b>`);
  html = html.replace(/\[\[(live|testnet|soon)\]\]/g, (_s, k) => `<span class="badge b-${k}">${BADGE[k]}</span>`);
  if (BASE) html = html.replace(/href="\/(?!\/)/g, `href="${BASE}/`);
  html = html.replace(/<a href="http/g, '<a target="_blank" rel="noopener" href="http').replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
  html = html.replace(/<table>([\s\S]*?)<\/table>/g, (t) => {
    const heads = [...t.matchAll(/<th(?:\s[^>]*)?>([\s\S]*?)<\/th>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").replace(/"/g, ""));
    return t.replace(/<tr>([\s\S]*?)<\/tr>/g, (row) => { let i = 0; return row.replace(/<td([^>]*)>/g, (_m, a) => `<td${a} data-l="${heads[i++] || ""}">`); });
  });
  return { html, headings };
}
let cache: Doc[] | null = null;
export function allDocs(): Doc[] {
  if (cache) return cache;
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md")).sort();
  cache = files.map((f, i) => {
    const { data, content } = matter(fs.readFileSync(path.join(DIR, f), "utf8"));
    const { html, headings } = render(content);
    const text = content.replace(/<[^>]+>/g, " ").replace(/\[\[\w+\]\]/g, "").replace(/[#*|`>\-\[\]()]/g, " ").replace(/\s+/g, " ").trim();
    return { slug: data.slug, title: data.title, group: data.group, summary: data.summary, html, headings, text, order: i };
  });
  cache.sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.order - b.order);
  return cache;
}
export const docBySlug = (s: string) => allDocs().find((d) => d.slug === s);
export function nav() {
  const d = allDocs();
  return GROUPS.map((g) => ({ group: g, items: d.filter((x) => x.group === g).map((x) => ({ slug: x.slug, title: x.title })) }));
}
export function searchIndex() {
  return allDocs().flatMap((d) => [
    { slug: d.slug, title: d.title, section: "", anchor: "", text: d.summary + " " + d.text.slice(0, 600) },
    ...d.headings.filter((h) => h.level > 1).map((h) => ({ slug: d.slug, title: h.text, section: d.title, anchor: h.id, text: sectionText(d, h.id) })),
  ]);
}
function sectionText(d: Doc, id: string) {
  const i = d.html.indexOf(`id="${id}"`);
  if (i < 0) return "";
  const rest = d.html.slice(i);
  const end = rest.slice(10).search(/<h[23] /);
  return rest.slice(0, end < 0 ? 1500 : end + 10).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 400);
}
