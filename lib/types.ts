/**
 * Service type — which unit serves the event (Cart, Que, or Sweet Tooth van).
 * Stored in `EventQuoteInput.vehicle` for API compatibility; UI label is “Service type”.
 */
export type VehicleType = "cart" | "que" | "sweetTooth";

/** Geographic / minimum-fee band from the TMSS.26 zone tables. */
export type ZoneId = "1" | "2" | "3" | "4" | "5";

/** Staffing model affects which column of the base-rate table applies. */
export type StaffingModel = "single" | "double";

/**
 * Optional tweaks for a catalog menu add-on on this quote.
 * Omitted fields fall back to `lib/menu-add-ons.ts`.
 */
export interface MenuAddOnOverride {
  /** Participation as a fraction of guest count (0–2); e.g. 0.75 ≈ 75% of guests. */
  guestShare?: number;
  /** Retail / selling price for one serving. */
  pricePerServing?: number;
  /** Replaces the catalog `takeRateNote` on the quote line / email when non-empty. */
  lineNote?: string;
}

/** All user-controlled inputs for a single quote (event form). */
export interface EventQuoteInput {
  clientName: string;
  eventDate: string;
  /**
   * ISO date `YYYY-MM-DD` for scheduling / Google Calendar availability.
   * When set, typically mirrors a human-readable `eventDate`.
   */
  serviceDate: string;
  /** Local wall time start `HH:mm` in `serviceTimeZone`. */
  serviceStartTime: string;
  /** Local wall time end `HH:mm` in `serviceTimeZone` (exclusive overlap check vs Google busy blocks). */
  serviceEndTime: string;
  /** IANA timezone for the service window (e.g. America/Los_Angeles). */
  serviceTimeZone: string;
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
  /**
   * Per–add-on overrides keyed by catalog id (`lib/menu-add-ons.ts`).
   * Only set fields override defaults; leave others to the catalog.
   */
  menuAddOnOverrides: Record<string, MenuAddOnOverride>;
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

/** Per–service-type result from Google Calendar Freebusy. */
export interface VehicleAvailabilityState {
  available: boolean;
  /** True when this van’s calendar was included in the Freebusy request. */
  checked: boolean;
  /** Google returned an error for this calendar (resource stays selectable). */
  error?: string;
}

/** DTO for GET /api/availability */
export interface AvailabilityApiResponseBody {
  ok: boolean;
  calendarConfigured: boolean;
  timeMin?: string;
  timeMax?: string;
  resources?: Record<VehicleType, VehicleAvailabilityState>;
  /** Set when Google returned an error for the whole request. */
  apiError?: string;
  error?: string;
}

/** Heuristic extraction from pasted customer email (Gmail copy/paste). */
export interface ParsedInquiryHints {
  guestCount: number | null;
  rawSnippets: string[];
}
