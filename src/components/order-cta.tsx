"use client";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import type { Hours } from "@/lib/hours";
import { useOpen } from "@/lib/use-open";

/** The second hero button. While closed it would only repeat "See the menu", so it is hidden. */
export function ViewMenuLink({ hours, className }: { hours: Hours; className: string }) {
  return useOpen(hours) ? <Link href="/menu" className={className}>View menu</Link> : null;
}

/** "Order now" while the cafe is open; "See the menu" when it is closed, because orders are refused until it opens. */
export function OrderCta({ hours, className }: { hours: Hours; className: string }) {
  const open = useOpen(hours);
  return (
    <Link href="/menu" className={className}>
      {open ? "Order now" : "See the menu"} <ArrowIcon width={20} height={20} />
    </Link>
  );
}
