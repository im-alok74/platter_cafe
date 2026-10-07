"use client";
import { useSyncExternalStore } from "react";

export type SavedBench = { code: string; label: string };

// A scanned table is remembered for a meal, not forever: after a few hours the website treats the visitor as someone ordering from outside.
const FRESH_MS = 4 * 3600_000;

// The table this visitor scanned most recently. A string snapshot keeps React's equality check stable.
const raw = () => {
  try {
    const b = JSON.parse(localStorage.getItem("platter.bench") ?? "null") as (SavedBench & { at?: number }) | null;
    return b && b.at && Date.now() - b.at < FRESH_MS ? JSON.stringify({ code: b.code, label: b.label }) : null;
  } catch {
    return null;
  }
};

export function useSavedBench(): SavedBench | null {
  const value = useSyncExternalStore(() => () => {}, raw, () => null);
  try {
    return value ? (JSON.parse(value) as SavedBench) : null;
  } catch {
    return null;
  }
}
