"use client";
import { useSyncExternalStore } from "react";

export type CartLine = {
  key: string; // item + option + add-ons, so the same choice merges into one line
  itemId: string;
  name: string;
  isVeg: boolean;
  image?: string | null; // photo for the order list; display only, and absent in carts saved before photos were shown
  variantId: string | null;
  variantName: string | null;
  addonIds: string[];
  addonNames: string[];
  unitPrice: number; // for display only; the server recalculates every price
  qty: number;
  note: string;
};

type State = { lines: CartLine[]; note: string; requestKey: string };

const STORAGE = "platter.cart.v1";
const EMPTY: State = { lines: [], note: "", requestKey: "" };
const newKey = () => crypto.randomUUID();

let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) state = { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    /* private mode or bad data: start empty */
  }
}

function set(next: State) {
  state = next;
  try {
    localStorage.setItem(STORAGE, JSON.stringify(state));
  } catch {
    /* storage full or blocked: the cart still works for this visit */
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

// Another tab changed the cart: re-read it so both tabs show the same order.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE && e.key !== null) return;
    loaded = false;
    state = EMPTY;
    load();
    listeners.forEach((l) => l());
  });
}
const snapshot = () => {
  load();
  return state;
};

export function useCart() {
  const s = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  return {
    ...s,
    count: s.lines.reduce((n, l) => n + l.qty, 0),
    subtotal: s.lines.reduce((n, l) => n + l.unitPrice * l.qty, 0),
  };
}

export const cart = {
  snapshot: () => snapshot(),
  add(line: Omit<CartLine, "key">) {
    load();
    const key = [line.itemId, line.variantId ?? "", [...line.addonIds].sort().join(","), line.note.trim()].join("|");
    const existing = state.lines.find((l) => l.key === key);
    const lines = existing
      ? state.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(20, l.qty + line.qty) } : l))
      : [...state.lines, { ...line, key, qty: Math.min(20, line.qty) }];
    set({ ...state, lines });
  },
  setQty(key: string, qty: number) {
    load();
    set({ ...state, lines: qty <= 0 ? state.lines.filter((l) => l.key !== key) : state.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(20, qty) } : l)) });
  },
  setNote(note: string) {
    load();
    set({ ...state, note });
  },
  /** One key per attempt: a double tap or retry sends the same key, so the server makes one order. */
  requestKey() {
    load();
    if (!state.requestKey) set({ ...state, requestKey: newKey() });
    return state.requestKey;
  },
  clear() {
    load();
    set(EMPTY);
  },
};
