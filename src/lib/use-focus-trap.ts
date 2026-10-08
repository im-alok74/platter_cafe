"use client";
import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * While `active`, keeps Tab inside `ref`, calls `onEscape` on Escape, and gives focus back to whatever had it before.
 * Focuses the container itself if it has a tabIndex, otherwise its first control.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void) {
  const esc = useRef(onEscape);
  useEffect(() => {
    esc.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement as HTMLElement | null;
    const box = ref.current;
    const items = () => (box ? [...box.querySelectorAll<HTMLElement>(FOCUSABLE)] : []);
    if (box?.hasAttribute("tabindex")) box.focus();
    else (items()[0] ?? box)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && esc.current) return esc.current();
      if (e.key !== "Tab" || !box) return;
      const list = items();
      if (!list.length) return e.preventDefault();
      const first = list[0];
      const last = list[list.length - 1];
      const at = document.activeElement;
      if (e.shiftKey && (at === first || at === box || !box.contains(at))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (at === last || !box.contains(at))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [active, ref]);
}
