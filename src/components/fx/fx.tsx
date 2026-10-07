import type { CSSProperties } from "react";

/** Headline whose letters rise out of a mask one by one. Screen readers get the plain text. */
export function SplitText({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  let n = 0;
  return (
    <span className={`split ${className}`} aria-label={text} style={{ "--d": `${delay}ms` } as CSSProperties}>
      <span aria-hidden>
        {text.split(" ").map((word, wi, all) => (
          <span key={wi}>
            <span className="w">
              {[...word].map((c, ci) => (
                <span key={ci} className="ch" style={{ "--i": n++ } as CSSProperties}>{c}</span>
              ))}
            </span>
            {wi < all.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Three wisps of steam. Colour follows the text colour of the parent. */
export function Steam({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 60 80" className={`steam ${className}`}>
      <path d="M14 76 C 4 60, 24 50, 14 34 S 20 10, 14 2" />
      <path d="M30 78 C 20 60, 40 50, 30 32 S 36 8, 30 0" />
      <path d="M46 76 C 36 60, 56 50, 46 34 S 52 10, 46 2" />
    </svg>
  );
}

/** A cup with latte art that draws itself, steam rising, bobbing gently. */
export function Cup({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`relative ${className}`}>
      <Steam className="absolute left-1/2 top-0 h-[34%] -translate-x-1/2 text-[#fbf6ef]" />
      <svg viewBox="0 0 240 200" className="cup-bob absolute inset-x-0 bottom-0 w-full">
        <ellipse cx="120" cy="178" rx="104" ry="16" fill="#c9a25b" />
        <ellipse cx="120" cy="172" rx="92" ry="12" fill="#e0bd78" />
        <path d="M168 84 h22 a22 22 0 0 1 0 44 h-26" fill="none" stroke="#fbf6ef" strokeWidth="11" strokeLinecap="round" />
        <path d="M44 70 h152 v38 a62 54 0 0 1 -62 62 h-28 a62 54 0 0 1 -62 -62 z" fill="#fbf6ef" />
        <ellipse cx="120" cy="70" rx="76" ry="14" fill="#6b3f26" />
        <ellipse cx="120" cy="70" rx="62" ry="9" fill="#8a5636" />
        <path className="heart" d="M120 76 C 100 68, 104 60, 112 62 C 117 63, 120 67, 120 67 C 120 67, 123 63, 128 62 C 136 60, 140 68, 120 76 Z" />
      </svg>
    </div>
  );
}

const BEANS = [
  { x: "6%", y: "14%", s: "34px", t: "7s", dl: "0s", r: "-20deg", dx: "14px" },
  { x: "84%", y: "10%", s: "26px", t: "9s", dl: "1.4s", r: "30deg", dx: "-12px", c: "#b3202a" },
  { x: "18%", y: "62%", s: "22px", t: "8s", dl: "0.6s", r: "60deg", dx: "10px" },
  { x: "70%", y: "52%", s: "40px", t: "10s", dl: "2s", r: "-50deg", dx: "-16px" },
  { x: "92%", y: "78%", s: "28px", t: "7.5s", dl: "0.9s", r: "10deg", dx: "-8px", c: "#fbf6ef" },
  { x: "42%", y: "8%", s: "20px", t: "11s", dl: "3s", r: "80deg", dx: "12px", c: "#fbf6ef" },
  { x: "52%", y: "82%", s: "30px", t: "9.5s", dl: "1.8s", r: "-10deg", dx: "-14px" },
  { x: "30%", y: "34%", s: "18px", t: "12s", dl: "2.6s", r: "40deg", dx: "9px", c: "#b3202a" },
];

/** Coffee beans drifting. `fall` makes them rain down instead (for the closing section). */
export function Beans({ fall = false, count = BEANS.length }: { fall?: boolean; count?: number }) {
  return (
    <div aria-hidden className={`beans ${fall ? "beans-fall" : ""}`}>
      {BEANS.slice(0, count).map((b, i) => (
        <svg key={i} viewBox="0 0 40 56" className="bean" style={{ "--x": b.x, "--y": b.y, "--s": b.s, "--t": b.t, "--dl": b.dl, "--r": b.r, "--dx": b.dx, "--c": b.c } as CSSProperties}>
          <ellipse cx="20" cy="28" rx="16" ry="25" fill="currentColor" />
          <path d="M20 4 C 10 18, 30 38, 20 52" fill="none" stroke="#2a1d17" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ))}
    </div>
  );
}

/** Text running round a circle, spinning slowly, with something in the middle. */
export function SpinBadge({ text, id, children, className = "" }: { text: string; id: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <svg aria-hidden viewBox="0 0 120 120" className="spin h-full w-full">
        <defs>
          <path id={id} d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
        </defs>
        <text fill="currentColor" fontSize="9.5" fontWeight="600">
          <textPath href={`#${id}`} textLength="286" lengthAdjust="spacing">{text}</textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/** A wavy edge between two sections. Pass the colour of the section below as text colour. */
export function Wave({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`overflow-hidden leading-[0] ${className}`}>
      <svg viewBox="0 0 2400 80" preserveAspectRatio="none" className="wave-x block h-10 w-[200%] md:h-16" fill="currentColor">
        <path d="M0 40 C 150 0, 300 80, 450 40 S 750 0, 900 40 S 1050 80, 1200 40 C 1350 0, 1500 80, 1650 40 S 1950 0, 2100 40 S 2250 80, 2400 40 V80 H0 Z" />
      </svg>
    </div>
  );
}
