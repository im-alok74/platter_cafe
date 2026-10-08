"use client";
import { LazyMotion, MotionConfig, domAnimation, m } from "motion/react";
import type { ReactNode } from "react";
import { duration, ease } from "@/lib/motion/tokens";

/** Loads only the animation features we use, and turns motion into plain fades for reduced-motion users. */
export function MotionProvider({ children, full = false }: { children: ReactNode; full?: boolean }) {
  return (
    <LazyMotion features={full ? () => import("./motion-max").then((m) => m.default) : domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/**
 * Scroll reveal for marketing sections only. Never use in the ordering flow.
 * The starting position is the same for everyone, so the server and the browser render identical HTML. People who
 * prefer reduced motion still get a plain fade: MotionConfig (above) drops the movement for them.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: duration.slow, ease: ease.out, delay }}
    >
      {children}
    </m.div>
  );
}
