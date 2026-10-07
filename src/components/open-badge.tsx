"use client";
import { useEffect, useState } from "react";
import { formatTime, isOpenNow, type Hours } from "@/lib/hours";

/** "Open now / Closed" pill. Computed in the browser so the cached page stays the same for everyone. */
export function OpenBadge({ hours, className = "", compact = false }: { hours: Hours; className?: string; compact?: boolean }) {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    const tick = () => setOpen(isOpenNow(hours));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [hours]);

  if (open === null) return <span className={`inline-block h-7 w-28 rounded-full bg-border ${className}`} aria-hidden />;
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface px-3 py-1 text-sm text-foreground font-medium ${className}`}
      role="status"
    >
      <span className={`h-2 w-2 rounded-full ${open ? "bg-veg" : "bg-nonveg"}`} />
      {compact ? (open ? "Open now" : "Closed") : open ? `Open now · until ${formatTime(hours.close)}` : `Closed · opens ${formatTime(hours.open)}`}
    </span>
  );
}
