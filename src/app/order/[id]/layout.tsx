import type { ReactNode } from "react";
import { MotionProvider } from "@/components/motion";

export const metadata = { title: "Your order", robots: { index: false, follow: false } };

export default function OrderLayout({ children }: { children: ReactNode }) {
  return <MotionProvider>{children}</MotionProvider>;
}
