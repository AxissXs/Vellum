import type { Holiday } from "./types";

/** UK bank holidays — England & Wales (curated). */
const HOLIDAYS_BY_YEAR: Record<number, Holiday[]> = {
  2025: [
    { date: "2025-01-01", name: "New Year's Day", type: "public", scope: "national" },
    { date: "2025-04-18", name: "Good Friday", religion: "christian", type: "public", scope: "national" },
    { date: "2025-04-21", name: "Easter Monday", religion: "christian", type: "public", scope: "national" },
    { date: "2025-05-05", name: "Early May Bank Holiday", type: "public", scope: "national" },
    { date: "2025-05-26", name: "Spring Bank Holiday", type: "public", scope: "national" },
    { date: "2025-08-25", name: "Summer Bank Holiday", type: "public", scope: "national" },
    { date: "2025-12-25", name: "Christmas Day", religion: "christian", type: "public", scope: "national" },
    { date: "2025-12-26", name: "Boxing Day", type: "public", scope: "national" },
  ],
  2026: [
    { date: "2026-01-01", name: "New Year's Day", type: "public", scope: "national" },
    { date: "2026-04-03", name: "Good Friday", religion: "christian", type: "public", scope: "national" },
    { date: "2026-04-06", name: "Easter Monday", religion: "christian", type: "public", scope: "national" },
    { date: "2026-05-04", name: "Early May Bank Holiday", type: "public", scope: "national" },
    { date: "2026-05-25", name: "Spring Bank Holiday", type: "public", scope: "national" },
    { date: "2026-08-31", name: "Summer Bank Holiday", type: "public", scope: "national" },
    { date: "2026-12-25", name: "Christmas Day", religion: "christian", type: "public", scope: "national" },
    { date: "2026-12-28", name: "Boxing Day (Substitute)", type: "public", scope: "national" },
  ],
  2027: [
    { date: "2027-01-01", name: "New Year's Day", type: "public", scope: "national" },
    { date: "2027-03-26", name: "Good Friday", religion: "christian", type: "public", scope: "national" },
    { date: "2027-03-29", name: "Easter Monday", religion: "christian", type: "public", scope: "national" },
    { date: "2027-05-03", name: "Early May Bank Holiday", type: "public", scope: "national" },
    { date: "2027-05-31", name: "Spring Bank Holiday", type: "public", scope: "national" },
    { date: "2027-08-30", name: "Summer Bank Holiday", type: "public", scope: "national" },
    { date: "2027-12-27", name: "Christmas Day (Substitute)", religion: "christian", type: "public", scope: "national" },
    { date: "2027-12-28", name: "Boxing Day (Substitute)", type: "public", scope: "national" },
  ],
};

export function getUnitedKingdomHolidays(year: number): Holiday[] {
  return HOLIDAYS_BY_YEAR[year] ?? [];
}
