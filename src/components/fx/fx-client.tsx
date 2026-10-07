"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Counts up to a number once it scrolls into view. Shows the final number straight away for reduced motion. */
export function CountUp({ to, suffix = "", className = "" }: { to: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setN(to));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 1400);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return <span ref={ref} className={`tabular-nums ${className}`}>{n}{suffix}</span>;
}

/** Nudges its child towards the pointer, like a magnet. Only on devices with a real pointer. */
export function Magnetic({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  function move(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
  }
  function leave() {
    if (ref.current) ref.current.style.transform = "";
  }
  return (
    <span ref={ref} onPointerMove={move} onPointerLeave={leave} className={`inline-block transition-transform duration-200 ease-out ${className}`}>
      {children}
    </span>
  );
}
