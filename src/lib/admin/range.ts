const IST_MS = 5.5 * 3600_000;
const DAY = 86_400_000;

/** Start of the IST calendar day `daysAgo` days back, as an ISO string. */
export function istDayStart(daysAgo = 0, now = Date.now()) {
  return new Date(Math.floor((now + IST_MS) / DAY) * DAY - IST_MS - daysAgo * DAY).toISOString();
}
