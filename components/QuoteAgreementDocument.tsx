import {
  getAgreementDisclaimer,
  getAgreementIntro,
  getAgreementSections,
} from "@/lib/agreement-terms";
import { getServiceTypeLabel } from "@/lib/defaults";
import type { EventQuoteInput, QuoteLineItem, QuoteResult } from "@/lib/types";
import type { ReactElement } from "react";

export interface QuoteAgreementDocumentProps {
  input: EventQuoteInput;
  quote: QuoteResult;
  documentId: string;
  preparedOnLabel: string;
  validThroughLabel: string;
  depositPercent: number;
  /** Printed / typed name line above Client signature. */
  clientSignerPrintName: string;
  /** Caterer authorized representative printed name. */
  catererSignerPrintName: string;
}

function usd2(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatWallTimeHm(hm: string): string {
  const t: string = hm.trim();
  const m: RegExpMatchArray | null = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m === null) {
    return hm;
  }
  const h: number = Number.parseInt(m[1], 10);
  const min: number = Number.parseInt(m[2], 10);
  const d: Date = new Date(2000, 0, 1, h, min);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function qtyLabel(li: QuoteLineItem): string {
  const q: number = li.quantity;
  const qDisp: string = Number.isInteger(q) ? String(q) : q.toFixed(2);
  return `${qDisp} ${li.unitLabel}`;
}

export function QuoteAgreementDocument({
  input,
  quote,
  documentId,
  preparedOnLabel,
  validThroughLabel,
  depositPercent,
  clientSignerPrintName,
  catererSignerPrintName,
}: QuoteAgreementDocumentProps): ReactElement {
  const sections: readonly string[] = getAgreementSections(depositPercent);

  return (
    <article className="agreement-doc" aria-label="Quote and service agreement">
      <header className="agreement-doc-header">
        <div className="agreement-brand">
          <h1 className="agreement-title">The Mobile Scoop Shop</h1>
          <p className="agreement-sub">Ice cream catering · Quote &amp; service agreement</p>
        </div>
        <dl className="agreement-meta">
          <div>
            <dt>Document #</dt>
            <dd>{documentId}</dd>
          </div>
          <div>
            <dt>Prepared</dt>
            <dd>{preparedOnLabel}</dd>
          </div>
          <div>
            <dt>Quote valid through</dt>
            <dd>{validThroughLabel || "—"}</dd>
          </div>
        </dl>
      </header>

      <section className="agreement-block">
        <h2>Client &amp; event</h2>
        <table className="agreement-kv">
          <tbody>
            <tr>
              <th scope="row">Client</th>
              <td>{input.clientName || "—"}</td>
            </tr>
            <tr>
              <th scope="row">Event date</th>
              <td>{input.eventDate || "—"}</td>
            </tr>
            {input.serviceDate.trim() !== "" ? (
              <tr>
                <th scope="row">Service window</th>
                <td>
                  {formatWallTimeHm(input.serviceStartTime)} –{" "}
                  {formatWallTimeHm(input.serviceEndTime)} ·{" "}
                  {input.serviceTimeZone}
                </td>
              </tr>
            ) : null}
            <tr>
              <th scope="row">Guest count (est.)</th>
              <td>{input.guestCount}</td>
            </tr>
            <tr>
              <th scope="row">Service</th>
              <td>
                {getServiceTypeLabel(input.vehicle)} · Zone {input.zone}{" "}
                · {input.staffingModel === "single" ? "Single" : "Double"}-staff
                column
              </td>
            </tr>
            {input.venueNotes ? (
              <tr>
                <th scope="row">Venue / notes</th>
                <td>{input.venueNotes}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="agreement-block">
        <h2>Pricing summary</h2>
        <table className="agreement-table">
          <thead>
            <tr>
              <th scope="col">Description</th>
              <th scope="col" className="num">
                Qty
              </th>
              <th scope="col" className="num">
                Rate
              </th>
              <th scope="col" className="num">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {quote.lineItems.map((li: QuoteLineItem) => (
              <tr key={li.key}>
                <td>{li.label}</td>
                <td className="num">{qtyLabel(li)}</td>
                <td className="num">{usd2(li.unitAmount)}</td>
                <td className="num">{usd2(li.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="num strong">
                Subtotal
              </td>
              <td className="num strong">{usd2(quote.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="num">
                Gratuity ({input.gratuityPercent}%)
              </td>
              <td className="num">{usd2(quote.gratuityAmount)}</td>
            </tr>
            <tr className="total-row">
              <td colSpan={3} className="num strong">
                Total due for quoted services
              </td>
              <td className="num strong">{usd2(quote.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
        {quote.internal.minimumFeeWarning ? (
          <p className="agreement-note">{quote.internal.minimumFeeWarning}</p>
        ) : null}
      </section>

      <section className="agreement-block">
        <h2>Terms &amp; conditions</h2>
        <p className="agreement-prose">{getAgreementIntro()}</p>
        <ol className="agreement-ol">
          {sections.map((text: string, i: number) => (
            <li key={i}>{text}</li>
          ))}
        </ol>
        <p className="agreement-disclaimer">{getAgreementDisclaimer()}</p>
      </section>

      <section className="agreement-block agreement-signatures">
        <h2>Acknowledgment &amp; signatures</h2>
        <p className="agreement-prose">
          By signing below, each party agrees to the pricing above and the terms
          in this Agreement.
        </p>
        <div className="signature-grid">
          <div className="signature-party">
            <h3>Client</h3>
            <p className="sign-print">
              <span className="sign-label">Print name</span>
              <span className="sign-line">{clientSignerPrintName || "—"}</span>
            </p>
            <div className="signature-box" aria-label="Client signature">
              <span className="signature-caption">Signature</span>
            </div>
            <p className="sign-date">
              <span className="sign-label">Date</span>
              <span className="sign-line muted-line" />
            </p>
          </div>
          <div className="signature-party">
            <h3>The Mobile Scoop Shop</h3>
            <p className="sign-print">
              <span className="sign-label">Authorized representative (print)</span>
              <span className="sign-line">
                {catererSignerPrintName || "—"}
              </span>
            </p>
            <div className="signature-box" aria-label="Caterer signature">
              <span className="signature-caption">Signature</span>
            </div>
            <p className="sign-date">
              <span className="sign-label">Date</span>
              <span className="sign-line muted-line" />
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}
