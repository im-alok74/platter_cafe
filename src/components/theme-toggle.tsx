"use client";
import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "./icons";

const EVENT = "platter-theme";
const query = () => matchMedia("(prefers-color-scheme: dark)");

function subscribe(cb: () => void) {
  const mq = query();
  window.addEventListener(EVENT, cb);
  mq.addEventListener("change", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    mq.removeEventListener("change", cb);
  };
}

function isDark() {
  const set = document.documentElement.dataset.theme;
  return set ? set === "dark" : query().matches;
}

/** Light/dark switch. Starts from the phone's setting; once tapped, the choice is remembered on this device. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const dark = useSyncExternalStore<boolean | null>(subscribe, isDark, () => null);

  function toggle() {
    const next = !isDark();
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("platter.theme", next ? "dark" : "light");
    } catch {
      /* storage blocked: the choice still applies until the page closes */
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button type="button" onClick={toggle} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface transition active:scale-90 ${className}`}>
      {dark === null ? <span className="h-5 w-5" /> : dark ? <SunIcon width={20} height={20} /> : <MoonIcon width={20} height={20} />}
    </button>
  );
}
