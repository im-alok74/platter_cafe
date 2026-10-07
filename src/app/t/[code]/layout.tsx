import type { ReactNode } from "react";
import { MotionProvider } from "@/components/motion";

export const metadata = { title: "Order from your table", robots: { index: false, follow: false } };

// The ordering flow loads the full motion features (drag, shared layout) that the marketing pages do not need.
export default function TableLayout({ children }: { children: ReactNode }) {
  return <MotionProvider full>{children}</MotionProvider>;
}
