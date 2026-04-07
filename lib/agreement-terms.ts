/**
 * Default service agreement bullets for printed quotes.
 * Edit this file to match your attorney-approved language, deposit %, and policies.
 */

export function getAgreementIntro(): string {
  return (
    "This Quote & Service Agreement (“Agreement”) summarizes the event services and pricing " +
    "proposed by The Mobile Scoop Shop (“Caterer”) for the Client named below. Upon signature " +
    "by both parties, it confirms the commercial terms for the booked event, subject to any " +
    "written changes both parties initial or sign."
  );
}

export function getAgreementSections(depositPercent: number): readonly string[] {
  const dp: number = Math.max(0, Math.min(100, Math.round(depositPercent)));
  return [
    `Deposit & payment. Client pays a ${dp}% non-refundable deposit to secure the date, unless otherwise stated in writing. Remaining balance and gratuity (if any) are due as agreed in writing before or on the event date. Omitted items do not reduce quoted pricing unless Caterer agrees in writing.`,
    "Event details. Guest counts, service window, location access, power, and equipment space must match what Client represented. Material changes (guest count, add-ons, duration, or venue restrictions) may require a revised quote.",
    "Cancellations & rescheduling. If Client cancels or materially reschedules, Caterer may retain the deposit and recover reasonable costs already incurred, except where a different cancellation policy is signed in writing.",
    "Conduct & safety. Caterer follows customary food-safety practices. Client provides safe working conditions, reasonable access, and cooperation with venue rules. Client is responsible for guest conduct that damages equipment or creates unsafe conditions.",
    "Inclement weather / venue. Outdoor events may require contingency plans (cover, power, surface). Client is responsible for obtaining permits or approvals the venue requires.",
    "Photography / promotion. Unless Client opts out in writing before the event, Caterer may use non-confidential event photos for marketing.",
    "Limitation of liability. Except where prohibited by law, Caterer’s total liability for any claim arising from the event is limited to fees paid for that event. Neither party is liable for indirect or consequential damages.",
    "Entire agreement. This document (with any attachments) is the full understanding between the parties regarding these services and supersedes prior oral discussions, except for fraud or written side letters both parties sign.",
  ] as const;
}

export function getAgreementDisclaimer(): string {
  return (
    "Draft template — not legal advice. Have qualified counsel review and adopt terms for " +
    "your jurisdiction and business. The Caterer may issue a separate invoice or payment link " +
    "for deposits and final balances."
  );
}
