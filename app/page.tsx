import { QuoteWorkspace } from "@/components/QuoteWorkspace";
import type { ReactElement } from "react";

export default function HomePage(): ReactElement {
  return (
    <main className="shell">
      <header className="top no-print">
        <h1>The Mobile Scoop Shop — Quote</h1>
        <p>
          Event intake and customer-facing totals. Numbers are aligned with the
          workbook’s quoting block; always reconcile with your master Excel file
          before sending a final bid.
        </p>
      </header>
      <QuoteWorkspace />
    </main>
  );
}
