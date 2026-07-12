"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import Magnetic from "@/components/landing/Magnetic";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#agents", label: "For agents" },
  { href: "/#pricing", label: "Pricing" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav
        className={`flex w-full max-w-6xl items-center justify-between rounded-2xl border px-4 py-2.5 transition-all duration-300 ${
          scrolled
            ? "border-line bg-elev/70 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
            : "border-transparent bg-transparent"
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5 pl-1">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg font-display text-lg font-bold text-black"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
          >
            R
          </span>
          <span className="font-display text-[17px] font-bold tracking-tight">RenderReel</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Magnetic strength={0.2}>
            <Link
              href="/create"
              className="block rounded-xl px-5 py-2.5 text-sm font-semibold text-black transition-transform"
              style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}
            >
              Make a video
            </Link>
          </Magnetic>
        </div>
      </nav>
    </div>
  );
}
