import type { ParsedInquiryHints } from "./types";

/**
 * Lightweight parsers for pasted Gmail threads (no OAuth required).
 * Fuzzy on purpose — always have a human confirm before sending a quote.
 */
export function parseInquiryFromText(body: string): ParsedInquiryHints {
  const normalized: string = body.replace(/\s+/g, " ").trim();
  const snippets: string[] = [];

  const guestPatterns: RegExp[] = [
    /(\d{1,4})\s*(?:guests?|people|attendees|ppl|persons?)\b/i,
    /(?:about|approx\.?|around|~)\s*(\d{1,4})\b/i,
    /\b(?:for|expecting)\s+(\d{1,4})\b/i,
  ];

  let guestCount: number | null = null;
  for (const re of guestPatterns) {
    const m: RegExpExecArray | null = re.exec(normalized);
    if (m && m[1]) {
      const n: number = Number.parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > 0 && n <= 5000) {
        guestCount = n;
        snippets.push(`Detected guest hint: ${n}`);
        break;
      }
    }
  }

  const dateLike: RegExp =
    /\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)\b/i;
  const dm: RegExpExecArray | null = dateLike.exec(normalized);
  if (dm) {
    snippets.push(`Possible date text: “${dm[0]}”`);
  }

  if (!snippets.length) {
    snippets.push("No automated hints — fill the form manually.");
  }

  return { guestCount, rawSnippets: snippets };
}
