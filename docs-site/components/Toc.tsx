"use client";
import { useEffect, useState } from "react";
export default function Toc({ items }: { items: { id: string; text: string; level: number }[] }) {
  const [on, setOn] = useState("");
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((es) => { const v = es.filter((e) => e.isIntersecting)[0]; if (v) setOn(v.target.id); }, { rootMargin: "-80px 0px -70% 0px" });
    els.forEach((e) => io.observe(e));
    const reveal = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")), { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".prose > *").forEach((e) => reveal.observe(e));
    return () => { io.disconnect(); reveal.disconnect(); };
  }, [items]);
  const list = items.filter((i) => i.level === 2);
  if (!list.length) return <aside className="toc" />;
  return (
    <aside className="toc">
      <p>On this page</p>
      {list.map((i) => <a key={i.id} href={`#${i.id}`} className={on === i.id ? "on" : ""}>{i.text}</a>)}
    </aside>
  );
}
