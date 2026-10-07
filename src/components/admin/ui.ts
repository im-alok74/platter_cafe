// Shared admin class names, so every control looks and sizes the same (44px minimum tap target).
export const btn = {
  primary: "inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground transition active:scale-95 disabled:opacity-60",
  ghost: "inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-medium transition active:scale-95 disabled:opacity-60",
  danger: "inline-flex min-h-11 items-center justify-center rounded-full border border-nonveg px-5 text-sm font-medium text-nonveg transition active:scale-95 disabled:opacity-60",
};
export const input = "min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-base outline-none focus:border-brand";
export const card = "rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card";
