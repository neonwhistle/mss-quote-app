import { google, type calendar_v3 } from "googleapis";
import { JWT } from "google-auth-library";
import {
  getGoogleCalendarIdForVehicle,
  isGoogleCalendarAvailabilityReady,
  parseGoogleServiceAccountJson,
  type GoogleServiceAccountCredentials,
} from "./google-calendar-config";
import type { VehicleAvailabilityState, VehicleType } from "./types";

function rangesOverlap(
  reqStartMs: number,
  reqEndMs: number,
  busyStartMs: number,
  busyEndMs: number,
): boolean {
  return reqStartMs < busyEndMs && busyStartMs < reqEndMs;
}

export async function queryGoogleCalendarAvailability(
  timeMin: string,
  timeMax: string,
): Promise<{
  calendarConfigured: boolean;
  resources: Record<VehicleType, VehicleAvailabilityState>;
  apiError?: string;
}> {
  const vehicles: readonly VehicleType[] = ["cart", "que", "sweetTooth"];
  const emptyState = (): Record<VehicleType, VehicleAvailabilityState> => ({
    cart: { available: true, checked: false },
    que: { available: true, checked: false },
    sweetTooth: { available: true, checked: false },
  });

  if (!isGoogleCalendarAvailabilityReady()) {
    return {
      calendarConfigured: false,
      resources: emptyState(),
    };
  }

  const creds: GoogleServiceAccountCredentials | null =
    parseGoogleServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (creds === null) {
    return {
      calendarConfigured: false,
      resources: emptyState(),
    };
  }

  const items: { id: string; vehicle: VehicleType }[] = [];
  for (const v of vehicles) {
    const calId: string | undefined = getGoogleCalendarIdForVehicle(v);
    if (calId !== undefined) {
      items.push({ id: calId, vehicle: v });
    }
  }

  if (items.length === 0) {
    return {
      calendarConfigured: false,
      resources: emptyState(),
    };
  }

  const auth: JWT = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });

  const calendar = google.calendar({ version: "v3", auth });

  let freeBusy: calendar_v3.Schema$FreeBusyResponse;
  try {
    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: items.map((i) => ({ id: i.id })),
      },
    });
    freeBusy = res.data ?? {};
  } catch (e: unknown) {
    const msg: string =
      e instanceof Error ? e.message : "Google Calendar request failed.";
    return {
      calendarConfigured: true,
      resources: emptyState(),
      apiError: msg,
    };
  }

  const calendars = freeBusy.calendars ?? {};
  const reqStartMs: number = Date.parse(timeMin);
  const reqEndMs: number = Date.parse(timeMax);

  const out: Record<VehicleType, VehicleAvailabilityState> = emptyState();

  for (const { id, vehicle } of items) {
    const entry = calendars[id];
    if (entry === undefined) {
      out[vehicle] = {
        available: true,
        checked: true,
        error: "No calendar data returned for this resource.",
      };
      continue;
    }
    if (entry.errors !== undefined && entry.errors.length > 0) {
      const first = entry.errors[0];
      const errMsg: string =
        first?.reason ?? first?.domain ?? "Calendar access error.";
      out[vehicle] = {
        available: true,
        checked: true,
        error: errMsg,
      };
      continue;
    }
    const busy = entry.busy ?? [];
    let blocked = false;
    for (const b of busy) {
      const bs0: string | null | undefined = b.start;
      const be0: string | null | undefined = b.end;
      if (
        bs0 === undefined ||
        bs0 === null ||
        be0 === undefined ||
        be0 === null
      ) {
        continue;
      }
      const bs: number = Date.parse(bs0);
      const be: number = Date.parse(be0);
      if (rangesOverlap(reqStartMs, reqEndMs, bs, be)) {
        blocked = true;
        break;
      }
    }
    out[vehicle] = { available: !blocked, checked: true };
  }

  return {
    calendarConfigured: true,
    resources: out,
  };
}
