/**
 * Human-readable reference for printed quotes / agreements (not a legal invoice #).
 */
export function generateDocumentId(): string {
  const d: Date = new Date();
  const y: number = d.getFullYear();
  const m: string = String(d.getMonth() + 1).padStart(2, "0");
  const day: string = String(d.getDate()).padStart(2, "0");
  const rand: string = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MSS-${y}${m}${day}-${rand}`;
}

export function formatLocaleDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** `eventDate` helper when using `serviceDate` as `YYYY-MM-DD`. */
export function formatLongDateFromYyyyMmDd(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) {
    return "";
  }
  const [y, m, d]: number[] = iso.split("-").map((x) => Number.parseInt(x, 10));
  const local: Date = new Date(y, m - 1, d);
  return local.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function addDays(base: Date, days: number): Date {
  const next: Date = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}
