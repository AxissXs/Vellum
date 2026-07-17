import type { Holiday } from "./types";

/** Philippines regular holidays (curated national). */
const HOLIDAYS_BY_YEAR: Record<number, Holiday[]> = {
  2025: [
    { date: "2025-01-01", name: "New Year's Day", type: "public", scope: "national" },
    { date: "2025-04-09", name: "Araw ng Kagitingan", type: "public", scope: "national" },
    { date: "2025-04-17", name: "Maundy Thursday", religion: "christian", type: "public", scope: "national" },
    { date: "2025-04-18", name: "Good Friday", religion: "christian", type: "public", scope: "national" },
    { date: "2025-05-01", name: "Labour Day", type: "public", scope: "national" },
    { date: "2025-06-12", name: "Independence Day", type: "public", scope: "national" },
    { date: "2025-08-25", name: "National Heroes Day", type: "public", scope: "national" },
    { date: "2025-11-30", name: "Bonifacio Day", type: "public", scope: "national" },
    { date: "2025-12-25", name: "Christmas Day", religion: "christian", type: "public", scope: "national" },
    { date: "2025-12-30", name: "Rizal Day", type: "public", scope: "national" },
  ],
  2026: [
    { date: "2026-01-01", name: "New Year's Day", type: "public", scope: "national" },
    { date: "2026-04-02", name: "Maundy Thursday", religion: "christian", type: "public", scope: "national" },
    { date: "2026-04-03", name: "Good Friday", religion: "christian", type: "public", scope: "national" },
    { date: "2026-04-09", name: "Araw ng Kagitingan", type: "public", scope: "national" },
    { date: "2026-05-01", name: "Labour Day", type: "public", scope: "national" },
    { date: "2026-06-12", name: "Independence Day", type: "public", scope: "national" },
    { date: "2026-08-31", name: "National Heroes Day", type: "public", scope: "national" },
    { date: "2026-11-30", name: "Bonifacio Day", type: "public", scope: "national" },
    { date: "2026-12-25", name: "Christmas Day", religion: "christian", type: "public", scope: "national" },
    { date: "2026-12-30", name: "Rizal Day", type: "public", scope: "national" },
  ],
  2027: [
    { date: "2027-01-01", name: "New Year's Day", type: "public", scope: "national" },
    { date: "2027-03-25", name: "Maundy Thursday", religion: "christian", type: "public", scope: "national" },
    { date: "2027-03-26", name: "Good Friday", religion: "christian", type: "public", scope: "national" },
    { date: "2027-04-09", name: "Araw ng Kagitingan", type: "public", scope: "national" },
    { date: "2027-05-01", name: "Labour Day", type: "public", scope: "national" },
    { date: "2027-06-12", name: "Independence Day", type: "public", scope: "national" },
    { date: "2027-08-30", name: "National Heroes Day", type: "public", scope: "national" },
    { date: "2027-11-30", name: "Bonifacio Day", type: "public", scope: "national" },
    { date: "2027-12-25", name: "Christmas Day", religion: "christian", type: "public", scope: "national" },
    { date: "2027-12-30", name: "Rizal Day", type: "public", scope: "national" },
  ],
};

export function getPhilippinesHolidays(year: number): Holiday[] {
  return HOLIDAYS_BY_YEAR[year] ?? [];
}
