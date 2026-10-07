export type Hours = { open: string; close: string; weekly_off: number[] };

const IST = "Asia/Kolkata";

/** Minutes since midnight and weekday (0 = Sunday) in India time, whatever the device timezone. */
export function istClock(now: Date = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: IST, hour: "numeric", minute: "numeric", hour12: false, weekday: "short" })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  );
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { minutes: (Number(p.hour) % 24) * 60 + Number(p.minute), day };
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** True when `minutes` falls in [from, to). A window that ends before it starts runs past midnight. */
export function inWindow(minutes: number, from: string | null, to: string | null) {
  if (!from || !to) return true;
  const a = toMin(from);
  const b = toMin(to);
  return a <= b ? minutes >= a && minutes < b : minutes >= a || minutes < b;
}

export function isOpenNow(h: Hours, now: Date = new Date()) {
  const { minutes, day } = istClock(now);
  if (h.weekly_off.includes(day)) return false;
  return inWindow(minutes, h.open, h.close);
}

/** "11:00" -> "11:00 AM" */
export function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
