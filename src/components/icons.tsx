import type { SVGProps } from "react";

// Small line icons, drawn once so every page matches.
const base = (p: SVGProps<SVGSVGElement>) => ({ width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...p });

export const QrIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4" /></svg>
);
export const BagIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 7h12l1 13H5L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
);
export const ScooterIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M9 17h6M15 17l-2-9h-3M13 8h4l2 9" /></svg>
);
export const ClockIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const PinIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const PhoneIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>
);
export const ArrowIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const CoffeeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9ZM17 11h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3" /></svg>
);
export const SunIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const MoonIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" /></svg>
);
export const GridIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
);
export const ReceiptIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></svg>
);
export const FlameIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9Z" /></svg>
);
export const UtensilsIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3c-2 2-3 5-3 8h3v10" /></svg>
);
export const TagIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="8" cy="8" r="1.3" /></svg>
);
export const PlusCircleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
);
export const PaletteIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.6-1.2.2-2.5 1.6-2.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" /></svg>
);
export const UsersIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></svg>
);
export const ListIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></svg>
);
export const KeyIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M14 9l2 2" /></svg>
);
export const LogoutIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" /></svg>
);
