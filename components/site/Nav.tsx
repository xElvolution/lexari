"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import Magnetic from "@/components/landing/Magnetic";
import { useAuth } from "./Auth";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#agents", label: "For agents" },
  { href: "/#pricing", label: "Pricing" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { user, open, logout } = useAuth();
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
            L
          </span>
          <span className="font-display text-[17px] font-bold tracking-tight">Lexari</span>
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
          {user ? (
            <div className="group relative">
              <button className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-black"
                  style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                >
                  {(user.name ?? user.email)[0]?.toUpperCase()}
                </span>
                <span className="hidden max-w-[120px] truncate sm:block">{user.name ?? user.email}</span>
              </button>
              <div className="invisible absolute right-0 top-full w-44 pt-2 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                <div className="rounded-xl border border-line p-1.5 shadow-xl" style={{ background: "var(--elev)" }}>
                  <Link href="/create" className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface hover:text-ink">New video</Link>
                  <button onClick={logout} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-surface hover:text-ink">Log out</button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => open("login")}
              className="hidden rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-line-strong sm:block"
            >
              Sign in
            </button>
          )}
          <Magnetic strength={0.2}>
            <Link
              href="/create"
              className="block rounded-xl px-5 py-2.5 text-sm font-semibold text-black transition-transform"
              style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))" }}
            >
              Make a video
            </Link>
          </Magnetic>
        </div>
      </nav>
    </div>
  );
}
