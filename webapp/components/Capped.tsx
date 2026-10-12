"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * The app-wide list rule: a list with more than `rows` items (5 by default) scrolls inside a box about `rows` rows tall
 * instead of growing the page. Short lists render as-is. Wrap the rows themselves, or a single <ul>/<ol>.
 * Rows can be any height; the cap is measured from the rows, with half of the next row peeking out.
 */
export default function Capped({ children, rows = 5, className = "" }: { children: ReactNode; rows?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const only = el.children.length === 1 ? el.children[0] : null;
      const list = only && /^(UL|OL)$/.test(only.tagName) ? only : el;
      const first = list.children[0] as HTMLElement | undefined, next = list.children[rows] as HTMLElement | undefined;
      if (!first || !next) { setH(null); return; }
      const top = (x: HTMLElement) => x.getBoundingClientRect().top;
      setH(Math.round(top(next) - top(first) + next.offsetHeight / 2));
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    const mo = new MutationObserver(measure); mo.observe(el, { childList: true, subtree: true });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, [rows]);
  return (
    <div ref={ref} data-capped={h ? true : undefined} className={`${h ? "overflow-y-auto overscroll-contain [scrollbar-width:thin]" : ""} ${className}`} style={h ? { maxHeight: h } : undefined}>
      {children}
    </div>
  );
}
