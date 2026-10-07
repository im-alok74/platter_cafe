"use client";
import { useSyncExternalStore } from "react";
import type { MenuItem } from "@/lib/data/menu";

// Which cart panel is open. Not saved: a reload starts closed.
type Ui = { drawer: boolean; item: MenuItem | null };
let ui: Ui = { drawer: false, item: null };
const listeners = new Set<() => void>();
const set = (next: Partial<Ui>) => {
  ui = { ...ui, ...next };
  listeners.forEach((l) => l());
};

export const useCartUi = () =>
  useSyncExternalStore(
    (cb) => (listeners.add(cb), () => void listeners.delete(cb)),
    () => ui,
    () => ui,
  );

export const cartUi = {
  openDrawer: () => set({ drawer: true, item: null }),
  closeDrawer: () => set({ drawer: false }),
  openItem: (item: MenuItem) => set({ item }),
  closeItem: () => set({ item: null }),
};
