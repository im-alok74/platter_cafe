import { describe, expect, it } from "vitest";
import { formatTime, inWindow, isOpenNow } from "./hours";

const hours = { open: "11:00", close: "22:30", weekly_off: [] };
// 2026-10-06 is a Tuesday. IST = UTC + 5:30.
const ist = (hhmm: string) => new Date(`2026-10-06T${hhmm}:00+05:30`);

describe("isOpenNow", () => {
  it("is closed before opening and after closing", () => {
    expect(isOpenNow(hours, ist("10:59"))).toBe(false);
    expect(isOpenNow(hours, ist("22:30"))).toBe(false);
  });
  it("is open during the day, regardless of device timezone", () => {
    expect(isOpenNow(hours, ist("11:00"))).toBe(true);
    expect(isOpenNow(hours, ist("22:29"))).toBe(true);
  });
  it("respects weekly off", () => {
    expect(isOpenNow({ ...hours, weekly_off: [2] }, ist("15:00"))).toBe(false);
  });
});

describe("inWindow", () => {
  it("treats no window as always available", () => expect(inWindow(0, null, null)).toBe(true));
  it("handles windows past midnight", () => {
    expect(inWindow(23 * 60, "22:00", "02:00")).toBe(true);
    expect(inWindow(3 * 60, "22:00", "02:00")).toBe(false);
  });
});

it("formats times", () => {
  expect(formatTime("11:00")).toBe("11:00 AM");
  expect(formatTime("22:30")).toBe("10:30 PM");
});
