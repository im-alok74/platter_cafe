// One motion system. Durations in seconds; animate only transform and opacity.
export const duration = { fast: 0.15, base: 0.24, slow: 0.45 } as const;

export const ease = {
  out: [0.22, 1, 0.36, 1], // entrances
  in: [0.64, 0, 0.78, 0], // exits
  inOut: [0.65, 0, 0.35, 1], // moves between states
} as const;

export const spring = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 } as const; // sheets, drawers, popups
