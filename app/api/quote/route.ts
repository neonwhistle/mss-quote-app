import { buildQuote } from "@/lib/quote-engine";
import { getDefaultEventInput } from "@/lib/defaults";
import type {
  EventQuoteInput,
  MenuAddOnOverride,
  QuoteApiRequestBody,
  QuoteApiResponseBody,
  VehicleType,
} from "@/lib/types";
import { NextResponse } from "next/server";

function isMenuAddOnOverride(v: unknown): v is MenuAddOnOverride {
  if (v === null || typeof v !== "object" || Array.isArray(v)) {
    return false;
  }
  const x = v as Record<string, unknown>;
  const okShare =
    x.guestShare === undefined ||
    (typeof x.guestShare === "number" && Number.isFinite(x.guestShare));
  const okPrice =
    x.pricePerServing === undefined ||
    (typeof x.pricePerServing === "number" &&
      Number.isFinite(x.pricePerServing));
  const okNote =
    x.lineNote === undefined || typeof x.lineNote === "string";
  return okShare && okPrice && okNote;
}

function isValidVehicleField(v: unknown): v is VehicleType | "van" {
  return (
    v === "cart" ||
    v === "que" ||
    v === "sweetTooth" ||
    v === "van"
  );
}

function normalizeVehicle(v: VehicleType | "van"): VehicleType {
  return v === "van" ? "sweetTooth" : v;
}

function validateMenuAddOnOverrides(v: unknown): boolean {
  if (v === undefined) {
    return true;
  }
  if (v === null || typeof v !== "object" || Array.isArray(v)) {
    return false;
  }
  return Object.entries(v as Record<string, unknown>).every(
    ([k, val]) => typeof k === "string" && isMenuAddOnOverride(val),
  );
}

function validateInput(input: unknown): input is EventQuoteInput {
  if (!input || typeof input !== "object") {
    return false;
  }
  const o = input as Record<string, unknown>;
  return (
    typeof o.clientName === "string" &&
    typeof o.eventDate === "string" &&
    (o.serviceDate === undefined || typeof o.serviceDate === "string") &&
    (o.serviceStartTime === undefined ||
      typeof o.serviceStartTime === "string") &&
    (o.serviceEndTime === undefined || typeof o.serviceEndTime === "string") &&
    (o.serviceTimeZone === undefined ||
      typeof o.serviceTimeZone === "string") &&
    typeof o.venueNotes === "string" &&
    typeof o.guestCount === "number" &&
    ["1", "2", "3", "4", "5"].includes(o.zone as string) &&
    isValidVehicleField(o.vehicle) &&
    (o.staffingModel === "single" || o.staffingModel === "double") &&
    typeof o.equipmentFee === "number" &&
    typeof o.pricePerGuest === "number" &&
    typeof o.staffCount === "number" &&
    typeof o.laborRatePerHour === "number" &&
    typeof o.serviceHours === "number" &&
    typeof o.travelFee === "number" &&
    typeof o.gratuityPercent === "number" &&
    typeof o.addOnFlatTotal === "number" &&
    Array.isArray(o.selectedMenuAddOnIds) &&
    o.selectedMenuAddOnIds.every((id: unknown) => typeof id === "string") &&
    validateMenuAddOnOverrides(o.menuAddOnOverrides)
  );
}

export async function POST(
  req: Request,
): Promise<NextResponse<QuoteApiResponseBody>> {
  try {
    const json: unknown = await req.json();
    const body = json as Partial<QuoteApiRequestBody>;
    if (!body.input || !validateInput(body.input)) {
      return NextResponse.json(
        { ok: false, error: "Invalid request body." },
        { status: 400 },
      );
    }
    const rawInput = body.input;
    const schedDefaults: EventQuoteInput = getDefaultEventInput();
    const input: EventQuoteInput = {
      ...rawInput,
      serviceDate:
        typeof rawInput.serviceDate === "string"
          ? rawInput.serviceDate
          : schedDefaults.serviceDate,
      serviceStartTime:
        typeof rawInput.serviceStartTime === "string"
          ? rawInput.serviceStartTime
          : schedDefaults.serviceStartTime,
      serviceEndTime:
        typeof rawInput.serviceEndTime === "string"
          ? rawInput.serviceEndTime
          : schedDefaults.serviceEndTime,
      serviceTimeZone:
        typeof rawInput.serviceTimeZone === "string"
          ? rawInput.serviceTimeZone
          : schedDefaults.serviceTimeZone,
      vehicle: normalizeVehicle(rawInput.vehicle as VehicleType | "van"),
      menuAddOnOverrides:
        rawInput.menuAddOnOverrides &&
        typeof rawInput.menuAddOnOverrides === "object" &&
        !Array.isArray(rawInput.menuAddOnOverrides)
          ? (rawInput.menuAddOnOverrides as Record<string, MenuAddOnOverride>)
          : {},
    };
    const quote = buildQuote(input);
    return NextResponse.json({ ok: true, quote });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not parse JSON." },
      { status: 400 },
    );
  }
}
