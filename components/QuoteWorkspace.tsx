"use client";

import { QuoteAgreementDocument } from "@/components/QuoteAgreementDocument";
import {
  applyZonePreset,
  formatCurrencyUSD,
  getDefaultEventInput,
} from "@/lib/defaults";
import {
  addDays,
  formatLocaleDate,
  formatLongDateFromYyyyMmDd,
  generateDocumentId,
} from "@/lib/document-id";
import { parseServiceWindow } from "@/lib/service-window";
import {
  applyMenuAddOnOverrides,
  computeMenuAddOnLine,
  getMenuAddOnCatalog,
  menuAddOnOverrideDiffersFromCatalog,
} from "@/lib/menu-add-ons";
import { parseInquiryFromText } from "@/lib/parse-inquiry";
import { buildQuote, quoteToEmailText } from "@/lib/quote-engine";
import type {
  AvailabilityApiResponseBody,
  EventQuoteInput,
  MenuAddOnOverride,
  QuoteResult,
  VehicleType,
} from "@/lib/types";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";

const SERVICE_TIMEZONES: { value: string; label: string }[] = [
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/New_York", label: "Eastern (New York)" },
];

function num(v: string): number {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export function QuoteWorkspace(): ReactElement {
  const [input, setInput] = useState<EventQuoteInput>(getDefaultEventInput);
  const [paste, setPaste] = useState<string>("");
  const [parseNote, setParseNote] = useState<string>("");
  const [agreementOpen, setAgreementOpen] = useState<boolean>(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [validThroughInput, setValidThroughInput] = useState<string>("");
  const [agreementDepositPercent, setAgreementDepositPercent] =
    useState<number>(50);
  const [clientSignerPrintName, setClientSignerPrintName] =
    useState<string>("");
  const [catererSignerPrintName, setCatererSignerPrintName] =
    useState<string>("");

  const [availabilityMap, setAvailabilityMap] = useState<Record<
    VehicleType,
    boolean
  > | null>(null);
  const [availabilityLoading, setAvailabilityLoading] =
    useState<boolean>(false);
  const [calendarConfigured, setCalendarConfigured] =
    useState<boolean>(false);
  const [availabilityApiError, setAvailabilityApiError] = useState<
    string | undefined
  >(undefined);

  const quote: QuoteResult = useMemo(() => buildQuote(input), [input]);

  const emailBody: string = useMemo(
    () => quoteToEmailText(input, quote),
    [input, quote],
  );

  const set =
    <K extends keyof EventQuoteInput>(key: K) =>
    (value: EventQuoteInput[K]): void => {
      setInput((prev) => ({ ...prev, [key]: value }));
    };

  const onApplyPasteHints = (): void => {
    const hints = parseInquiryFromText(paste);
    setParseNote(hints.rawSnippets.join(" · "));
    const guests: number | null = hints.guestCount;
    if (guests !== null) {
      setInput((prev) => ({ ...prev, guestCount: guests }));
    }
  };

  const onApplyZonePreset = (): void => {
    setInput((prev) => applyZonePreset(prev));
  };

  useEffect(() => {
    const windowParsed: ReturnType<typeof parseServiceWindow> =
      parseServiceWindow(
        input.serviceDate,
        input.serviceStartTime,
        input.serviceEndTime,
        input.serviceTimeZone,
      );
    if (windowParsed === null) {
      setAvailabilityMap(null);
      setCalendarConfigured(false);
      setAvailabilityApiError(undefined);
      return;
    }
    const ctrl: AbortController = new AbortController();
    const tid: number = window.setTimeout(() => {
      void (async (): Promise<void> => {
        setAvailabilityLoading(true);
        setAvailabilityApiError(undefined);
        try {
          const q: URLSearchParams = new URLSearchParams({
            serviceDate: input.serviceDate,
            serviceStartTime: input.serviceStartTime,
            serviceEndTime: input.serviceEndTime,
            serviceTimeZone: input.serviceTimeZone,
          });
          const res: Response = await fetch(
            `/api/availability?${q.toString()}`,
            { signal: ctrl.signal },
          );
          const data: AvailabilityApiResponseBody = await res.json();
          setCalendarConfigured(data.calendarConfigured);
          if (!data.ok) {
            setAvailabilityMap(null);
            setAvailabilityApiError(
              data.error ?? data.apiError ?? "Availability request failed.",
            );
            return;
          }
          setAvailabilityApiError(data.apiError);
          if (data.resources === undefined) {
            setAvailabilityMap(null);
            return;
          }
          const m: Record<VehicleType, boolean> = {
            cart: data.resources.cart.available,
            que: data.resources.que.available,
            sweetTooth: data.resources.sweetTooth.available,
          };
          setAvailabilityMap(m);
        } catch (e: unknown) {
          if (e instanceof DOMException && e.name === "AbortError") {
            return;
          }
          setAvailabilityMap(null);
          setCalendarConfigured(false);
        } finally {
          setAvailabilityLoading(false);
        }
      })();
    }, 450);
    return (): void => {
      ctrl.abort();
      window.clearTimeout(tid);
    };
  }, [
    input.serviceDate,
    input.serviceStartTime,
    input.serviceEndTime,
    input.serviceTimeZone,
  ]);

  const serviceTypeDisabled = (v: VehicleType): boolean => {
    if (availabilityMap === null) {
      return false;
    }
    return availabilityMap[v] === false;
  };

  const selectedServiceUnavailable: boolean =
    availabilityMap !== null && availabilityMap[input.vehicle] === false;

  const catalog = getMenuAddOnCatalog();

  const toggleAddOn = (id: string, checked: boolean): void => {
    setInput((prev) => {
      const setIds = new Set(prev.selectedMenuAddOnIds);
      if (checked) {
        setIds.add(id);
      } else {
        setIds.delete(id);
      }
      return { ...prev, selectedMenuAddOnIds: [...setIds] };
    });
  };

  const setAddOnGuestSharePercent = (id: string, percent: number): void => {
    const clamped: number = Math.min(200, Math.max(0, percent));
    setInput((prev) => {
      const cur: Record<string, MenuAddOnOverride> = {
        ...prev.menuAddOnOverrides,
      };
      const o: MenuAddOnOverride = { ...(cur[id] ?? {}) };
      o.guestShare = clamped / 100;
      cur[id] = o;
      return { ...prev, menuAddOnOverrides: cur };
    });
  };

  const setAddOnPricePerServing = (id: string, price: number): void => {
    setInput((prev) => {
      const cur: Record<string, MenuAddOnOverride> = {
        ...prev.menuAddOnOverrides,
      };
      const o: MenuAddOnOverride = { ...(cur[id] ?? {}) };
      o.pricePerServing = Math.max(0, price);
      cur[id] = o;
      return { ...prev, menuAddOnOverrides: cur };
    });
  };

  const setAddOnLineNote = (id: string, raw: string): void => {
    setInput((prev) => {
      const cur: Record<string, MenuAddOnOverride> = {
        ...prev.menuAddOnOverrides,
      };
      const o: MenuAddOnOverride = { ...(cur[id] ?? {}) };
      const t: string = raw.trim();
      if (t === "") {
        delete o.lineNote;
      } else {
        o.lineNote = t;
      }
      if (Object.keys(o).length === 0) {
        delete cur[id];
      } else {
        cur[id] = o;
      }
      return { ...prev, menuAddOnOverrides: cur };
    });
  };

  const resetAddOnRow = (id: string): void => {
    setInput((prev) => {
      const cur: Record<string, MenuAddOnOverride> = {
        ...prev.menuAddOnOverrides,
      };
      delete cur[id];
      return { ...prev, menuAddOnOverrides: cur };
    });
  };

  const selectAllAddOns = (): void => {
    setInput((prev) => ({
      ...prev,
      selectedMenuAddOnIds: catalog.map((d) => d.id),
    }));
  };

  const clearAddOns = (): void => {
    setInput((prev) => ({
      ...prev,
      selectedMenuAddOnIds: [],
      menuAddOnOverrides: {},
    }));
  };

  const copyEmail = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(emailBody);
    } catch {
      /* ignore */
    }
  };

  const openAgreement = useCallback((): void => {
    setDocumentId((prev) => prev ?? generateDocumentId());
    setValidThroughInput((prev) => {
      if (prev.trim() !== "") {
        return prev;
      }
      return formatLocaleDate(addDays(new Date(), 14));
    });
    setAgreementOpen(true);
  }, []);

  const closeAgreement = useCallback((): void => {
    setAgreementOpen(false);
  }, []);

  const onPrintAgreement = useCallback((): void => {
    window.print();
  }, []);

  const preparedOnLabel: string = formatLocaleDate(new Date());
  const activeDocumentId: string = documentId ?? "—";
  const clientPrint: string =
    clientSignerPrintName.trim() || input.clientName || "—";

  return (
    <>
    <div className="no-print grid two">
      <div className="card">
        <h2>Event details</h2>
        <label className="field">
          Client name
          <input
            type="text"
            value={input.clientName}
            onChange={(e) => set("clientName")(e.target.value)}
            autoComplete="off"
          />
        </label>
        <div className="row2 split">
          <label className="field">
            Event date
            <span className="hint">Used for Google Calendar availability</span>
            <input
              type="date"
              value={input.serviceDate}
              onChange={(e) => {
                const v: string = e.target.value;
                setInput((prev) => ({
                  ...prev,
                  serviceDate: v,
                  eventDate:
                    v !== ""
                      ? formatLongDateFromYyyyMmDd(v)
                      : prev.eventDate,
                }));
              }}
            />
          </label>
          <label className="field">
            Guest count
            <input
              type="number"
              min={0}
              step={1}
              value={input.guestCount}
              onChange={(e) => set("guestCount")(num(e.target.value))}
            />
          </label>
        </div>
        <div className="row2 split">
          <label className="field">
            Service starts
            <input
              type="time"
              value={input.serviceStartTime}
              onChange={(e) => set("serviceStartTime")(e.target.value)}
            />
          </label>
          <label className="field">
            Service ends
            <input
              type="time"
              value={input.serviceEndTime}
              onChange={(e) => set("serviceEndTime")(e.target.value)}
            />
          </label>
        </div>
        <label className="field">
          Time zone
          <select
            value={input.serviceTimeZone}
            onChange={(e) => set("serviceTimeZone")(e.target.value)}
          >
            {SERVICE_TIMEZONES.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </select>
        </label>
        <div className="row2 split">
          <label className="field">
            Zone
            <span className="hint">Portland travel bands (see Excel TMSS.26)</span>
            <select
              value={input.zone}
              onChange={(e) =>
                set("zone")(e.target.value as EventQuoteInput["zone"])
              }
            >
              <option value="1">Zone 1</option>
              <option value="2">Zone 2</option>
              <option value="3">Zone 3</option>
              <option value="4">Zone 4</option>
              <option value="5">Zone 5</option>
            </select>
          </label>
          <label className="field">
            Service type
            <span className="hint">Cart, Que, or Sweet Tooth van</span>
            <select
              value={input.vehicle}
              onChange={(e) =>
                set("vehicle")(e.target.value as EventQuoteInput["vehicle"])
              }
            >
              <option value="cart" disabled={serviceTypeDisabled("cart")}>
                Cart
                {serviceTypeDisabled("cart") ? " (unavailable)" : ""}
              </option>
              <option value="que" disabled={serviceTypeDisabled("que")}>
                Que
                {serviceTypeDisabled("que") ? " (unavailable)" : ""}
              </option>
              <option
                value="sweetTooth"
                disabled={serviceTypeDisabled("sweetTooth")}
              >
                Sweet Tooth
                {serviceTypeDisabled("sweetTooth") ? " (unavailable)" : ""}
              </option>
            </select>
          </label>
        </div>
        {!calendarConfigured ? (
          <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.9rem" }}>
            Google Calendar is not configured (or no van calendars linked) —
            availability is not enforced here.
          </p>
        ) : null}
        {calendarConfigured && availabilityLoading ? (
          <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.9rem" }}>
            Checking Google Calendar…
          </p>
        ) : null}
        {availabilityApiError !== undefined && availabilityApiError !== "" ? (
          <p
            className="muted"
            style={{ marginTop: "0.35rem", fontSize: "0.9rem", color: "var(--danger, #b42318)" }}
          >
            Calendar check failed: {availabilityApiError}
          </p>
        ) : null}
        {selectedServiceUnavailable ? (
          <p
            className="muted"
            style={{ marginTop: "0.35rem", fontSize: "0.9rem", color: "var(--danger, #b42318)" }}
          >
            {`Selected service type is busy for this window — pick another van or adjust the schedule.`}
          </p>
        ) : null}
        <label className="field">
          Staffing model
          <span className="hint">Maps to single vs double columns in the sheet</span>
          <select
            value={input.staffingModel}
            onChange={(e) =>
              set("staffingModel")(
                e.target.value as EventQuoteInput["staffingModel"],
              )
            }
          >
            <option value="single">Single-staff pricing column</option>
            <option value="double">Double-staff pricing column</option>
          </select>
        </label>
        <div className="actions">
          <button
            type="button"
            className="btn secondary"
            onClick={onApplyZonePreset}
          >
            Apply zone preset to equipment fee
          </button>
        </div>
        <hr
          style={{
            margin: "1rem 0",
            border: "none",
            borderTop: "1px solid var(--border)",
          }}
        />
        <div className="row2 split">
          <label className="field">
            {"Equipment / base fee ($)"}
            <input
              type="number"
              min={0}
              step={1}
              value={input.equipmentFee}
              onChange={(e) => set("equipmentFee")(num(e.target.value))}
            />
          </label>
          <label className="field">
            {"Price per guest ($)"}
            <input
              type="number"
              min={0}
              step={0.05}
              value={input.pricePerGuest}
              onChange={(e) => set("pricePerGuest")(num(e.target.value))}
            />
          </label>
        </div>
        <div className="row2 split">
          <label className="field">
            Staff count
            <input
              type="number"
              min={0}
              step={1}
              value={input.staffCount}
              onChange={(e) => set("staffCount")(num(e.target.value))}
            />
          </label>
          <label className="field">
            {"Labor rate ($/hr each)"}
            <input
              type="number"
              min={0}
              step={1}
              value={input.laborRatePerHour}
              onChange={(e) => set("laborRatePerHour")(num(e.target.value))}
            />
          </label>
        </div>
        <label className="field">
          Service hours (billable)
          <input
            type="number"
            min={0}
            step={0.25}
            value={input.serviceHours}
            onChange={(e) => set("serviceHours")(num(e.target.value))}
          />
        </label>
        <hr
          style={{
            margin: "1rem 0",
            border: "none",
            borderTop: "1px solid var(--border)",
          }}
        />
        <h2 style={{ marginTop: 0 }}>Package add-ons (menu)</h2>
        <p className="muted" style={{ marginTop: "-0.5rem" }}>
          Check items to show line-by-line pricing. Each line uses{" "}
          <strong>guest count × % of guests × price per serving</strong>. For
          selected packages you can override %, price, and the note on the quote
          (defaults still live in <code>lib/menu-add-ons.ts</code> /{" "}
          <code>Menu cost 26</code>).
        </p>
        <div className="actions" style={{ marginBottom: "0.65rem" }}>
          <button
            type="button"
            className="btn secondary"
            onClick={selectAllAddOns}
          >
            Select all packages
          </button>
          <button type="button" className="btn secondary" onClick={clearAddOns}>
            Clear packages
          </button>
        </div>
        <div className="addon-list">
          {catalog.map((def) => {
            const checked: boolean = input.selectedMenuAddOnIds.includes(
              def.id,
            );
            const rawOverride: MenuAddOnOverride | undefined =
              input.menuAddOnOverrides[def.id];
            const effective = applyMenuAddOnOverrides(def, rawOverride);
            const math = computeMenuAddOnLine(effective, input.guestCount);
            const pctLabel: string = `${Math.round(effective.guestShare * 100)}% of guests`;
            const differs: boolean = menuAddOnOverrideDiffersFromCatalog(
              def,
              rawOverride,
            );
            const lineNoteValue: string =
              rawOverride?.lineNote !== undefined ? rawOverride.lineNote : "";
            return (
              <div key={def.id} className="addon-item">
                <label className="addon-row">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleAddOn(def.id, e.target.checked)}
                  />
                  <span className="addon-meta">
                    <strong>{def.label}</strong>
                    <span className="addon-detail">
                      Catalog: {Math.round(def.guestShare * 100)}% ·{" "}
                      {formatCurrencyUSD(def.pricePerServing)} — {pctLabel} ·{" "}
                      {effective.takeRateNote}
                    </span>
                    <span className="addon-detail">
                      {formatCurrencyUSD(effective.pricePerServing)} per serving ×
                      ≈
                      {math.effectiveServings % 1 === 0
                        ? math.effectiveServings
                        : math.effectiveServings.toFixed(1)}{" "}
                      servings
                    </span>
                    <span className="addon-rollup">
                      ≈ {formatCurrencyUSD(math.lineTotal)} if selected
                    </span>
                  </span>
                </label>
                {checked ? (
                  <div className="addon-customize">
                    <div className="row2 split">
                      <label className="field">
                        % of guests (this quote)
                        <input
                          type="number"
                          min={0}
                          max={200}
                          step={1}
                          value={Math.round(effective.guestShare * 100)}
                          onChange={(e) =>
                            setAddOnGuestSharePercent(def.id, num(e.target.value))
                          }
                        />
                      </label>
                      <label className="field">
                        $ per serving (this quote)
                        <input
                          type="number"
                          min={0}
                          step={0.05}
                          value={effective.pricePerServing}
                          onChange={(e) =>
                            setAddOnPricePerServing(def.id, num(e.target.value))
                          }
                        />
                      </label>
                    </div>
                    <label className="field">
                      Quote line note (optional; overrides catalog note)
                      <input
                        type="text"
                        value={lineNoteValue}
                        placeholder={def.takeRateNote}
                        onChange={(e) => setAddOnLineNote(def.id, e.target.value)}
                        autoComplete="off"
                      />
                    </label>
                    {differs ? (
                      <button
                        type="button"
                        className="addon-reset"
                        onClick={() => resetAddOnRow(def.id)}
                      >
                        Reset this package to catalog defaults
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="row2 split">
          <label className="field">
            {"Travel fee ($)"}
            <input
              type="number"
              min={0}
              step={1}
              value={input.travelFee}
              onChange={(e) => set("travelFee")(num(e.target.value))}
            />
          </label>
          <label className="field">
            {"Gratuity (%)"}
            <input
              type="number"
              min={0}
              step={0.5}
              value={input.gratuityPercent}
              onChange={(e) => set("gratuityPercent")(num(e.target.value))}
            />
          </label>
        </div>
        <label className="field">
          Other add-ons ($ flat)
          <span className="hint">
            Manual line for anything not in the checklist above
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={input.addOnFlatTotal}
            onChange={(e) => set("addOnFlatTotal")(num(e.target.value))}
          />
        </label>
        <label className="field">
          Venue / notes
          <textarea
            value={input.venueNotes}
            onChange={(e) => set("venueNotes")(e.target.value)}
          />
        </label>

        <hr
          style={{
            margin: "1.25rem 0",
            border: "none",
            borderTop: "1px solid var(--border)",
          }}
        />
        <h2 style={{ marginTop: 0 }}>Paste Gmail inquiry (optional)</h2>
        <p className="muted" style={{ marginTop: "-0.5rem" }}>
          Copy the customer email in Gmail, paste here, then apply hints. Full
          Gmail automation can plug into the same JSON shape as{" "}
          <code>/api/quote</code> later.
        </p>
        <label className="field">
          Customer message
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} />
        </label>
        <div className="actions">
          <button
            type="button"
            className="btn secondary"
            onClick={onApplyPasteHints}
          >
            Apply pasted hints
          </button>
        </div>
        {parseNote ? (
          <p className="muted" style={{ marginTop: "0.65rem" }}>
            {parseNote}
          </p>
        ) : null}
      </div>

      <div>
        <div className="card">
          <h2>Quote preview</h2>
          {quote.lineItems.map((li) => (
            <div key={li.key} className="quote-line">
              <span>{li.label}</span>
              <span>
                {formatCurrencyUSD(li.lineTotal)}
                <span className="muted">
                  {" "}
                  ({li.quantity}× @ {formatCurrencyUSD(li.unitAmount)})
                </span>
              </span>
            </div>
          ))}
          <div className="quote-line quote-total">
            <span>Subtotal</span>
            <span>{formatCurrencyUSD(quote.subtotal)}</span>
          </div>
          <div className="quote-line">
            <span>Gratuity ({input.gratuityPercent}%)</span>
            <span>{formatCurrencyUSD(quote.gratuityAmount)}</span>
          </div>
          <div className="quote-line quote-total">
            <span>
              <strong>Total</strong>
            </span>
            <span>
              <strong>{formatCurrencyUSD(quote.grandTotal)}</strong>
            </span>
          </div>
          {quote.internal.minimumFeeWarning ? (
            <div className="warn">{quote.internal.minimumFeeWarning}</div>
          ) : null}
          <p className="muted" style={{ marginBottom: 0 }}>
            {quote.internal.suggestedFromZone}
          </p>
        </div>

        <div className="card" style={{ marginTop: "1.25rem" }}>
          <h2>Email draft</h2>
          <div className="actions">
            <button type="button" className="btn primary" onClick={copyEmail}>
              Copy to clipboard
            </button>
            <button type="button" className="btn secondary" onClick={openAgreement}>
              Printable quote &amp; contract
            </button>
          </div>
          <pre className="email-out">{emailBody}</pre>
        </div>
      </div>
    </div>

    <section
      className="agreement-section"
      aria-label="Printable quote and service agreement"
    >
      {!agreementOpen ? (
        <div className="no-print card" style={{ marginTop: "1.25rem" }}>
          <h2>Quote / invoice PDF</h2>
          <p className="muted" style={{ marginTop: "-0.5rem" }}>
            Generate a print-ready quote with line items, contract terms, and
            signature blocks. Use your browser’s <strong>Print</strong> dialog
            and choose <strong>Save as PDF</strong>.
          </p>
          <div className="actions">
            <button type="button" className="btn primary" onClick={openAgreement}>
              Prepare printable quote &amp; contract
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="no-print agreement-toolbar">
            <div className="field-inline">
              <label htmlFor="mss-valid-through">Quote valid through</label>
              <input
                id="mss-valid-through"
                type="text"
                value={validThroughInput}
                onChange={(e) => setValidThroughInput(e.target.value)}
                placeholder="e.g. April 21, 2026"
              />
            </div>
            <div className="field-inline">
              <label htmlFor="mss-deposit">Deposit % (for contract text)</label>
              <input
                id="mss-deposit"
                type="number"
                min={0}
                max={100}
                step={1}
                value={agreementDepositPercent}
                onChange={(e) =>
                  setAgreementDepositPercent(num(e.target.value))
                }
              />
            </div>
            <div className="field-inline">
              <label htmlFor="mss-client-signer">Client print name</label>
              <input
                id="mss-client-signer"
                type="text"
                value={clientSignerPrintName}
                onChange={(e) => setClientSignerPrintName(e.target.value)}
                placeholder={input.clientName || "Same as client above"}
              />
            </div>
            <div className="field-inline">
              <label htmlFor="mss-caterer-signer">
                Caterer representative (print)
              </label>
              <input
                id="mss-caterer-signer"
                type="text"
                value={catererSignerPrintName}
                onChange={(e) => setCatererSignerPrintName(e.target.value)}
                placeholder="Authorized name"
              />
            </div>
            <button
              type="button"
              className="btn primary"
              onClick={onPrintAgreement}
            >
              Print / Save as PDF
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={closeAgreement}
            >
              Hide document
            </button>
          </div>
          <QuoteAgreementDocument
            input={input}
            quote={quote}
            documentId={activeDocumentId}
            preparedOnLabel={preparedOnLabel}
            validThroughLabel={validThroughInput}
            depositPercent={agreementDepositPercent}
            clientSignerPrintName={clientPrint}
            catererSignerPrintName={
              catererSignerPrintName.trim() || "—"
            }
          />
        </>
      )}
    </section>
    </>
  );
}
