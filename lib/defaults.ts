import type { EventQuoteInput, StaffingModel, VehicleType, ZoneId } from "./types";

/**
 * Default form state — numbers mirror the `TMSS.26` “Quoting” block where possible
 * (equip 425, guests × PP, staff × rate × hours, gratuity labeled 8% in-sheet but 10% in formula).
 */
export function getDefaultEventInput(): EventQuoteInput {
  return {
    clientName: "",
    eventDate: "",
    serviceDate: "",
    serviceStartTime: "14:00",
    serviceEndTime: "18:00",
    serviceTimeZone: "America/Los_Angeles",
    venueNotes: "",
    guestCount: 120,
    zone: "1",
    vehicle: "sweetTooth",
    staffingModel: "single",
    equipmentFee: 425,
    pricePerGuest: 4.25,
    staffCount: 2,
    laborRatePerHour: 55,
    serviceHours: 1.5,
    travelFee: 0,
    gratuityPercent: 10,
    selectedMenuAddOnIds: [],
    menuAddOnOverrides: {},
    addOnFlatTotal: 0,
  };
}

/** Zone table excerpts from `TMSS.26` (~rows 27–34): J = single-staff column, L = double-staff column. */
const VAN_BASE_BY_ZONE: Record<
  ZoneId,
  { single: number; double: number }
> = {
  "1": { single: 315, double: 370 },
  "2": { single: 345, double: 425 },
  "3": { single: 395, double: 480 },
  "4": { single: 565, double: 595 },
  "5": { single: 565, double: 595 },
};

const CART_BASE_BY_ZONE: Record<
  ZoneId,
  { single: number; double: number }
> = {
  "1": { single: 425, double: 480 },
  "2": { single: 510, double: 565 },
  "3": { single: 510, double: 565 },
  "4": { single: 565, double: 595 },
  "5": { single: 565, double: 595 },
};

/**
 * Minimum service fees from `TMSS.26` block (~rows 34–37): weekday vs weekend, 50 vs 100 guests.
 * This is informational for staff — the workbook splits winter/summer; we use the stricter weekend column for hints.
 */
const MIN_FEE_HINTS: Record<
  VehicleType,
  { at50: number; at100: number }
> = {
  sweetTooth: { at50: 995, at100: 995 },
  que: { at50: 995, at100: 995 },
  cart: { at50: 1195, at100: 1195 },
};

/** Fixed equipment / service base when “Apply zone preset” is used with the Que van (all zones). */
const QUE_PRESET_BASE_USD = 595;

const SERVICE_TYPE_LABELS: Record<VehicleType, string> = {
  cart: "Cart",
  que: "Que",
  sweetTooth: "Sweet Tooth",
};

export function getServiceTypeLabel(vehicle: VehicleType): string {
  return SERVICE_TYPE_LABELS[vehicle];
}

/**
 * Populate equipment / per-guest fields from zone + service-type presets.
 * Base-rate columns from the sheet are exposed as a suggested **equipment** offset
 * (many operators fold base into equip fee vs minimum); adjust in settings later.
 */
export function applyZonePreset(
  input: EventQuoteInput,
): EventQuoteInput {
  const staffing: StaffingModel = input.staffingModel;
  const pickBase = (): number => {
    if (input.vehicle === "que") {
      return QUE_PRESET_BASE_USD;
    }
    if (input.vehicle === "sweetTooth") {
      const row = VAN_BASE_BY_ZONE[input.zone];
      return staffing === "double" ? row.double : row.single;
    }
    const row = CART_BASE_BY_ZONE[input.zone];
    return staffing === "double" ? row.double : row.single;
  };
  return {
    ...input,
    equipmentFee: pickBase(),
    pricePerGuest: input.pricePerGuest || 4.25,
  };
}

export function getMinimumFeeHint(
  vehicle: VehicleType,
  guestCount: number,
): number {
  const h = MIN_FEE_HINTS[vehicle];
  return guestCount <= 50 ? h.at50 : h.at100;
}

export function formatCurrencyUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
