import type { Holiday } from "./types";

/** Singapore gazetted public holidays (curated). */
const HOLIDAYS_BY_YEAR: Record<number, Holiday[]> = {
  2025: [
    { date: "2025-01-01", name: "New Year's Day", type: "public", scope: "national" },
    { date: "2025-01-29", name: "Chinese New Year", religion: "chinese", type: "public", scope: "national" },
    { date: "2025-01-30", name: "Chinese New Year (Day 2)", religion: "chinese", type: "public", scope: "national" },
    { date: "2025-03-31", name: "Hari Raya Puasa", religion: "islamic", type: "public", scope: "national" },
    { date: "2025-04-18", name: "Good Friday", religion: "christian", type: "public", scope: "national" },
    { date: "2025-05-01", name: "Labour Day", type: "public", scope: "national" },
    { date: "2025-05-12", name: "Vesak Day", religion: "buddhist", type: "public", scope: "national" },
    { date: "2025-06-07", name: "Hari Raya Haji", religion: "islamic", type: "public", scope: "national" },
    { date: "2025-08-09", name: "National Day", type: "public", scope: "national" },
    { date: "2025-10-20", name: "Deepavali", religion: "hindu", type: "public", scope: "national" },
    { date: "2025-12-25", name: "Christmas Day", religion: "christian", type: "public", scope: "national" },
  ],
  2026: [
    { date: "2026-01-01", name: "New Year's Day", type: "public", scope: "national" },
    { date: "2026-02-17", name: "Chinese New Year", religion: "chinese", type: "public", scope: "national" },
    { date: "2026-02-18", name: "Chinese New Year (Day 2)", religion: "chinese", type: "public", scope: "national" },
    { date: "2026-03-20", name: "Hari Raya Puasa", religion: "islamic", type: "public", scope: "national" },
    { date: "2026-04-03", name: "Good Friday", religion: "christian", type: "public", scope: "national" },
    { date: "2026-05-01", name: "Labour Day", type: "public", scope: "national" },
    { date: "2026-05-27", name: "Hari Raya Haji", religion: "islamic", type: "public", scope: "national" },
    { date: "2026-05-31", name: "Vesak Day", religion: "buddhist", type: "public", scope: "national" },
    { date: "2026-08-09", name: "National Day", type: "public", scope: "national" },
    { date: "2026-11-08", name: "Deepavali", religion: "hindu", type: "public", scope: "national" },
    { date: "2026-12-25", name: "Christmas Day", religion: "christian", type: "public", scope: "national" },
  ],
  2027: [
    { date: "2027-01-01", name: "New Year's Day", type: "public", scope: "national" },
    { date: "2027-02-06", name: "Chinese New Year", religion: "chinese", type: "public", scope: "national" },
    { date: "2027-02-07", name: "Chinese New Year (Day 2)", religion: "chinese", type: "public", scope: "national" },
    { date: "2027-03-09", name: "Hari Raya Puasa", religion: "islamic", type: "public", scope: "national" },
    { date: "2027-03-26", name: "Good Friday", religion: "christian", type: "public", scope: "national" },
    { date: "2027-05-01", name: "Labour Day", type: "public", scope: "national" },
    { date: "2027-05-16", name: "Hari Raya Haji", religion: "islamic", type: "public", scope: "national" },
    { date: "2027-05-20", name: "Vesak Day", religion: "buddhist", type: "public", scope: "national" },
    { date: "2027-08-09", name: "National Day", type: "public", scope: "national" },
    { date: "2027-10-28", name: "Deepavali", religion: "hindu", type: "public", scope: "national" },
    { date: "2027-12-25", name: "Christmas Day", religion: "christian", type: "public", scope: "national" },
  ],
};

export function getSingaporeHolidays(year: number): Holiday[] {
  return HOLIDAYS_BY_YEAR[year] ?? [];
}
