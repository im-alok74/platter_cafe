"use client";
import { useSyncExternalStore } from "react";
import { isOpenNow, type Hours } from "./hours";

const everyMinute = (cb: () => void) => {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
};

/** Open or closed by the cafe's clock, rechecked every minute. Assumed open on the server; placing an order checks again. */
export const useOpen = (hours: Hours) => useSyncExternalStore(everyMinute, () => isOpenNow(hours), () => true);
