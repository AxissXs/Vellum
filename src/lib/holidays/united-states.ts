import type { Holiday } from "./types";

/** US federal holidays (curated observed dates). */
const HOLIDAYS_BY_YEAR: Record<number, Holiday[]> = {
  2025: [
    { date: "2025-01-01", name: "New Year's Day", type: "public", scope: "federal" },
    { date: "2025-01-20", name: "Martin Luther King Jr. Day", type: "public", scope: "federal" },
    { date: "2025-02-17", name: "Presidents' Day", type: "public", scope: "federal" },
    { date: "2025-05-26", name: "Memorial Day", type: "public", scope: "federal" },
    { date: "2025-06-19", name: "Juneteenth", type: "public", scope: "federal" },
    { date: "2025-07-04", name: "Independence Day", type: "public", scope: "federal" },
    { date: "2025-09-01", name: "Labor Day", type: "public", scope: "federal" },
    { date: "2025-10-13", name: "Columbus Day", type: "public", scope: "federal" },
    { date: "2025-11-11", name: "Veterans Day", type: "public", scope: "federal" },
    { date: "2025-11-27", name: "Thanksgiving", type: "public", scope: "federal" },
    { date: "2025-12-25", name: "Christmas Day", religion: "christian", type: "public", scope: "federal" },
  ],
  2026: [
    { date: "2026-01-01", name: "New Year's Day", type: "public", scope: "federal" },
    { date: "2026-01-19", name: "Martin Luther King Jr. Day", type: "public", scope: "federal" },
    { date: "2026-02-16", name: "Presidents' Day", type: "public", scope: "federal" },
    { date: "2026-05-25", name: "Memorial Day", type: "public", scope: "federal" },
    { date: "2026-06-19", name: "Juneteenth", type: "public", scope: "federal" },
    { date: "2026-07-03", name: "Independence Day (Observed)", type: "public", scope: "federal" },
    { date: "2026-09-07", name: "Labor Day", type: "public", scope: "federal" },
    { date: "2026-10-12", name: "Columbus Day", type: "public", scope: "federal" },
    { date: "2026-11-11", name: "Veterans Day", type: "public", scope: "federal" },
    { date: "2026-11-26", name: "Thanksgiving", type: "public", scope: "federal" },
    { date: "2026-12-25", name: "Christmas Day", religion: "christian", type: "public", scope: "federal" },
  ],
  2027: [
    { date: "2027-01-01", name: "New Year's Day", type: "public", scope: "federal" },
    { date: "2027-01-18", name: "Martin Luther King Jr. Day", type: "public", scope: "federal" },
    { date: "2027-02-15", name: "Presidents' Day", type: "public", scope: "federal" },
    { date: "2027-05-31", name: "Memorial Day", type: "public", scope: "federal" },
    { date: "2027-06-18", name: "Juneteenth (Observed)", type: "public", scope: "federal" },
    { date: "2027-07-05", name: "Independence Day (Observed)", type: "public", scope: "federal" },
    { date: "2027-09-06", name: "Labor Day", type: "public", scope: "federal" },
    { date: "2027-10-11", name: "Columbus Day", type: "public", scope: "federal" },
    { date: "2027-11-11", name: "Veterans Day", type: "public", scope: "federal" },
    { date: "2027-11-25", name: "Thanksgiving", type: "public", scope: "federal" },
    { date: "2027-12-24", name: "Christmas Day (Observed)", religion: "christian", type: "public", scope: "federal" },
  ],
};

export function getUnitedStatesHolidays(year: number): Holiday[] {
  return HOLIDAYS_BY_YEAR[year] ?? [];
}
