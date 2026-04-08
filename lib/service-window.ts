import { fromZonedTime } from "date-fns-tz";

const HM_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/**
 * Parses scheduling fields into UTC RFC3339 bounds for Google Calendar Freebusy.
 */
export function parseServiceWindow(
  serviceDate: string,
  serviceStartTime: string,
  serviceEndTime: string,
  serviceTimeZone: string,
): { timeMin: string; timeMax: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate.trim())) {
    return null;
  }
  const startT: string = serviceStartTime.trim();
  const endT: string = serviceEndTime.trim();
  const tz: string = serviceTimeZone.trim();
  if (!HM_RE.test(startT) || !HM_RE.test(endT) || tz === "") {
    return null;
  }

  const startIsoLocal: string = `${serviceDate.trim()}T${startT}:00`;
  const endIsoLocal: string = `${serviceDate.trim()}T${endT}:00`;

  const start: Date = fromZonedTime(startIsoLocal, tz);
  const end: Date = fromZonedTime(endIsoLocal, tz);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  if (end.getTime() <= start.getTime()) {
    return null;
  }

  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  };
}
