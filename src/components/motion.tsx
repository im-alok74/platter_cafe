"use client";
import { LazyMotion, MotionConfig, domAnimation, m, useReducedMotion } from "motion/react";
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

/** Scroll reveal for marketing sections only. Never use in the ordering flow. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: duration.slow, ease: ease.out, delay }}
    >
      {children}
    </m.div>
  );
}
