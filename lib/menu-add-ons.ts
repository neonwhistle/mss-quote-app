/**
 * Menu add-ons mirror the spirit of `TMSS.26`’s “ADD ONS” block:
 * line ≈ guestCount × guestShare × pricePerServing.
 *
 * Tune `guestShare` and `pricePerServing` against `Menu cost 26` / your retail columns.
 */

import type { MenuAddOnOverride } from "./types";

export interface MenuAddOnDefinition {
  id: string;
  label: string;
  /**
   * Expected participation: share of total guest count that consumes this item (0–1).
   * e.g. 0.4 ⇒ ~40% of guests; 1 ⇒ priced as if everyone is in scope for that package.
   */
  guestShare: number;
  /** Selling price for one serving (one guest who receives this item). */
  pricePerServing: number;
  /** Shown in UI / quote to explain the assumption. */
  takeRateNote: string;
}

const CATALOG: readonly MenuAddOnDefinition[] = [
  {
    id: "waffle-cone-upgrade",
    label: "Waffle cone upgrade",
    guestShare: 0.75,
    pricePerServing: 1.25,
    takeRateNote: "~75% of guests (workbook min take)",
  },
  {
    id: "walking-sundaes",
    label: "Walking sundaes",
    guestShare: 0.7,
    pricePerServing: 12.5,
    takeRateNote: "~70% of guests · blended topping + cup cost from menu",
  },
  {
    id: "brownie-ala-mode",
    label: "Brownies à la mode",
    guestShare: 0.8,
    pricePerServing: 4.5,
    takeRateNote: "~80% of guests",
  },
  {
    id: "mini-sundae-bar",
    label: "Mini sundae bar",
    guestShare: 1,
    pricePerServing: 11.5,
    takeRateNote: "100% of guests in scope for bar pricing",
  },
  {
    id: "seven-topping-bar",
    label: "7-topping bar",
    guestShare: 0.75,
    pricePerServing: 14,
    takeRateNote: "~75% of guests",
  },
  {
    id: "affogato-station",
    label: "Affogato station",
    guestShare: 0.4,
    pricePerServing: 8.5,
    takeRateNote: "~40% of guests",
  },
  {
    id: "root-beer-floats",
    label: "Root beer floats",
    guestShare: 0.4,
    pricePerServing: 7,
    takeRateNote: "~40% of guests · lower volume than full bar",
  },
  {
    id: "full-float-station",
    label: "Full float station",
    guestShare: 0.5,
    pricePerServing: 8,
    takeRateNote: "~50% of guests (hot cocoa / float mix—adjust to job)",
  },
  {
    id: "ice-cream-sandwiches",
    label: "Ice cream sandwiches",
    guestShare: 0.65,
    pricePerServing: 6.75,
    takeRateNote: "~65% of guests · cookie sandwich service",
  },
] as const;

const BY_ID: ReadonlyMap<string, MenuAddOnDefinition> = new Map(
  CATALOG.map((d) => [d.id, d]),
);

export function getMenuAddOnCatalog(): readonly MenuAddOnDefinition[] {
  return CATALOG;
}

export function getMenuAddOnById(id: string): MenuAddOnDefinition | undefined {
  return BY_ID.get(id);
}

export function isKnownMenuAddOnId(id: string): boolean {
  return BY_ID.has(id);
}

const GUEST_SHARE_MIN = 0;
const GUEST_SHARE_MAX = 2;

/**
 * Merge catalog defaults with optional per-quote overrides (UI / API).
 */
export function applyMenuAddOnOverrides(
  base: MenuAddOnDefinition,
  override: MenuAddOnOverride | undefined,
): MenuAddOnDefinition {
  if (!override) {
    return base;
  }
  let guestShare: number = base.guestShare;
  if (
    typeof override.guestShare === "number" &&
    Number.isFinite(override.guestShare)
  ) {
    guestShare = Math.min(
      GUEST_SHARE_MAX,
      Math.max(GUEST_SHARE_MIN, override.guestShare),
    );
  }
  let pricePerServing: number = base.pricePerServing;
  if (
    typeof override.pricePerServing === "number" &&
    Number.isFinite(override.pricePerServing)
  ) {
    pricePerServing = Math.max(0, override.pricePerServing);
  }
  let takeRateNote: string = base.takeRateNote;
  if (
    typeof override.lineNote === "string" &&
    override.lineNote.trim() !== ""
  ) {
    takeRateNote = override.lineNote.trim();
  }
  return {
    ...base,
    guestShare,
    pricePerServing,
    takeRateNote,
  };
}

export function menuAddOnOverrideDiffersFromCatalog(
  base: MenuAddOnDefinition,
  override: MenuAddOnOverride | undefined,
): boolean {
  if (!override) {
    return false;
  }
  const merged: MenuAddOnDefinition = applyMenuAddOnOverrides(base, override);
  return (
    merged.guestShare !== base.guestShare ||
    merged.pricePerServing !== base.pricePerServing ||
    merged.takeRateNote !== base.takeRateNote
  );
}

export interface AddOnLineMath {
  definition: MenuAddOnDefinition;
  /** guestCount × guestShare — may be fractional; displayed for transparency. */
  effectiveServings: number;
  lineTotal: number;
}

export function computeMenuAddOnLine(
  definition: MenuAddOnDefinition,
  guestCount: number,
): AddOnLineMath {
  const guests: number = Math.max(0, guestCount);
  const effectiveServings: number = guests * definition.guestShare;
  const lineTotal: number =
    Math.round(effectiveServings * definition.pricePerServing * 100) / 100;
  return { definition, effectiveServings, lineTotal };
}
