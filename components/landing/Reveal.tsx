"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Scroll-linked reveal used across sections (Framer Motion, in-view). */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 42, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionTitle({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mx-auto mb-16 max-w-3xl text-center">
      <Reveal>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-[#8B7CFF]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#8B7CFF]" />
          {kicker}
        </div>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
          {title}
        </h2>
      </Reveal>
      {sub && (
        <Reveal delay={0.16}>
          <p className="mt-5 text-lg leading-relaxed text-muted">{sub}</p>
        </Reveal>
      )}
    </div>
  );
}
