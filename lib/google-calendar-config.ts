import type { VehicleType } from "./types";

export interface GoogleServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

export function parseGoogleServiceAccountJson(
  raw: string | undefined,
): GoogleServiceAccountCredentials | null {
  if (raw === undefined || raw.trim() === "") {
    return null;
  }
  try {
    const o: unknown = JSON.parse(raw);
    if (o === null || typeof o !== "object" || Array.isArray(o)) {
      return null;
    }
    const rec: Record<string, unknown> = o as Record<string, unknown>;
    const email: unknown = rec.client_email;
    const key: unknown = rec.private_key;
    if (typeof email !== "string" || typeof key !== "string") {
      return null;
    }
    if (email.trim() === "" || key.trim() === "") {
      return null;
    }
    return {
      client_email: email,
      private_key: key.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

export function getGoogleCalendarIdForVehicle(
  vehicle: VehicleType,
): string | undefined {
  const map: Record<VehicleType, string | undefined> = {
    cart: process.env.GOOGLE_CALENDAR_ID_CART?.trim(),
    que: process.env.GOOGLE_CALENDAR_ID_QUE?.trim(),
    sweetTooth: process.env.GOOGLE_CALENDAR_ID_SWEET_TOOTH?.trim(),
  };
  const id: string | undefined = map[vehicle];
  return id !== undefined && id !== "" ? id : undefined;
}

/**
 * True when a service account is present and at least one van calendar id is set.
 */
export function isGoogleCalendarAvailabilityReady(): boolean {
  const sa: GoogleServiceAccountCredentials | null =
    parseGoogleServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (sa === null) {
    return false;
  }
  const vehicles: readonly VehicleType[] = ["cart", "que", "sweetTooth"];
  return vehicles.some((v) => getGoogleCalendarIdForVehicle(v) !== undefined);
}
