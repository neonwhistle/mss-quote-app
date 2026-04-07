import { buildQuote } from "@/lib/quote-engine";
import type {
  EventQuoteInput,
  QuoteApiRequestBody,
  QuoteApiResponseBody,
} from "@/lib/types";
import { NextResponse } from "next/server";

function validateInput(input: unknown): input is EventQuoteInput {
  if (!input || typeof input !== "object") {
    return false;
  }
  const o = input as Record<string, unknown>;
  return (
    typeof o.clientName === "string" &&
    typeof o.eventDate === "string" &&
    typeof o.venueNotes === "string" &&
    typeof o.guestCount === "number" &&
    ["1", "2", "3", "4", "5"].includes(o.zone as string) &&
    (o.vehicle === "van" || o.vehicle === "cart") &&
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
    o.selectedMenuAddOnIds.every((id: unknown) => typeof id === "string")
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
    const quote = buildQuote(body.input);
    return NextResponse.json({ ok: true, quote });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not parse JSON." },
      { status: 400 },
    );
  }
}
