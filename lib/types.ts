/** Vehicle used for the event (matches workbook van vs cart lanes). */
export type VehicleType = "van" | "cart";

/** Geographic / minimum-fee band from the TMSS.26 zone tables. */
export type ZoneId = "1" | "2" | "3" | "4" | "5";

/** Staffing model affects which column of the base-rate table applies. */
export type StaffingModel = "single" | "double";

/** All user-controlled inputs for a single quote (event form). */
export interface EventQuoteInput {
  clientName: string;
  eventDate: string;
  venueNotes: string;
  guestCount: number;
  zone: ZoneId;
  vehicle: VehicleType;
  staffingModel: StaffingModel;
  equipmentFee: number;
  pricePerGuest: number;
  staffCount: number;
  laborRatePerHour: number;
  serviceHours: number;
  travelFee: number;
  /** Apply workbook-style gratuity on service subtotal (default 10% of line items before travel add-on). */
  gratuityPercent: number;
  /**
   * Menu package add-ons (sundae bar, floats, sandwiches, etc.).
   * Each id maps to `lib/menu-add-ons.ts` and rolls up as its own quote line.
   */
  selectedMenuAddOnIds: string[];
  /** Optional flat add-ons for anything not yet in the catalog (or manual adjustments). */
  addOnFlatTotal: number;
}

/** One line on the customer-facing quote. */
export interface QuoteLineItem {
  /** Stable id for React keys (falls back to label if omitted). */
  key: string;
  label: string;
  quantity: number;
  unitLabel: string;
  unitAmount: number;
  lineTotal: number;
}

/** Full quote output for UI, email text, and reconciliation with Excel. */
export interface QuoteResult {
  lineItems: QuoteLineItem[];
  subtotal: number;
  gratuityAmount: number;
  grandTotal: number;
  internal: {
    minimumFeeWarning?: string;
    suggestedFromZone?: string;
  };
}

/** DTO for POST /api/quote */
export interface QuoteApiRequestBody {
  input: EventQuoteInput;
}

export interface QuoteApiResponseBody {
  ok: boolean;
  quote?: QuoteResult;
  error?: string;
}

/** Heuristic extraction from pasted customer email (Gmail copy/paste). */
export interface ParsedInquiryHints {
  guestCount: number | null;
  rawSnippets: string[];
}
