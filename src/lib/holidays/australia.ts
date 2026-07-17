import type { Holiday } from "./types";

/** Australia national public holidays (curated; excludes most state-only). */
const HOLIDAYS_BY_YEAR: Record<number, Holiday[]> = {
  2025: [
    { date: "2025-01-01", name: "New Year's Day", type: "public", scope: "national" },
    { date: "2025-01-27", name: "Australia Day (Observed)", type: "public", scope: "national" },
    { date: "2025-04-18", name: "Good Friday", religion: "christian", type: "public", scope: "national" },
    { date: "2025-04-21", name: "Easter Monday", religion: "christian", type: "public", scope: "national" },
    { date: "2025-04-25", name: "ANZAC Day", type: "public", scope: "national" },
    { date: "2025-06-09", name: "King's Birthday", type: "public", scope: "national" },
    { date: "2025-12-25", name: "Christmas Day", religion: "christian", type: "public", scope: "national" },
    { date: "2025-12-26", name: "Boxing Day", type: "public", scope: "national" },
  ],
  2026: [
    { date: "2026-01-01", name: "New Year's Day", type: "public", scope: "national" },
    { date: "2026-01-26", name: "Australia Day", type: "public", scope: "national" },
    { date: "2026-04-03", name: "Good Friday", religion: "christian", type: "public", scope: "national" },
    { date: "2026-04-06", name: "Easter Monday", religion: "christian", type: "public", scope: "national" },
    { date: "2026-04-25", name: "ANZAC Day", type: "public", scope: "national" },
    { date: "2026-06-08", name: "King's Birthday", type: "public", scope: "national" },
    { date: "2026-12-25", name: "Christmas Day", religion: "christian", type: "public", scope: "national" },
    { date: "2026-12-28", name: "Boxing Day (Substitute)", type: "public", scope: "national" },
  ],
  2027: [
    { date: "2027-01-01", name: "New Year's Day", type: "public", scope: "national" },
    { date: "2027-01-26", name: "Australia Day", type: "public", scope: "national" },
    { date: "2027-03-26", name: "Good Friday", religion: "christian", type: "public", scope: "national" },
    { date: "2027-03-29", name: "Easter Monday", religion: "christian", type: "public", scope: "national" },
    { date: "2027-04-26", name: "ANZAC Day (Observed)", type: "public", scope: "national" },
    { date: "2027-06-14", name: "King's Birthday", type: "public", scope: "national" },
    { date: "2027-12-27", name: "Christmas Day (Substitute)", religion: "christian", type: "public", scope: "national" },
    { date: "2027-12-28", name: "Boxing Day (Substitute)", type: "public", scope: "national" },
  ],
};

export function getAustraliaHolidays(year: number): Holiday[] {
  return HOLIDAYS_BY_YEAR[year] ?? [];
}
