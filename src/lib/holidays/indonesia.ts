import type { Holiday } from "./types";

/** Indonesia national public holidays (curated major days). */
const HOLIDAYS_BY_YEAR: Record<number, Holiday[]> = {
  2025: [
    { date: "2025-01-01", name: "New Year's Day", localName: "Tahun Baru Masehi", type: "public", scope: "national" },
    { date: "2025-01-27", name: "Isra Mi'raj", religion: "islamic", type: "public", scope: "national" },
    { date: "2025-01-29", name: "Chinese New Year", religion: "chinese", type: "public", scope: "national" },
    { date: "2025-03-29", name: "Nyepi", religion: "hindu", type: "public", scope: "national" },
    { date: "2025-03-31", name: "Idul Fitri", religion: "islamic", type: "public", scope: "national" },
    { date: "2025-04-01", name: "Idul Fitri (Day 2)", religion: "islamic", type: "public", scope: "national" },
    { date: "2025-04-18", name: "Good Friday", religion: "christian", type: "public", scope: "national" },
    { date: "2025-05-01", name: "Labour Day", localName: "Hari Buruh", type: "public", scope: "national" },
    { date: "2025-05-12", name: "Waisak", religion: "buddhist", type: "public", scope: "national" },
    { date: "2025-05-29", name: "Ascension Day", religion: "christian", type: "public", scope: "national" },
    { date: "2025-06-01", name: "Pancasila Day", type: "public", scope: "national" },
    { date: "2025-06-06", name: "Idul Adha", religion: "islamic", type: "public", scope: "national" },
    { date: "2025-06-27", name: "Islamic New Year", religion: "islamic", type: "public", scope: "national" },
    { date: "2025-08-17", name: "Independence Day", localName: "Hari Kemerdekaan", type: "public", scope: "national" },
    { date: "2025-09-05", name: "Prophet's Birthday", religion: "islamic", type: "public", scope: "national" },
    { date: "2025-12-25", name: "Christmas Day", religion: "christian", type: "public", scope: "national" },
  ],
  2026: [
    { date: "2026-01-01", name: "New Year's Day", localName: "Tahun Baru Masehi", type: "public", scope: "national" },
    { date: "2026-01-16", name: "Isra Mi'raj", religion: "islamic", type: "public", scope: "national" },
    { date: "2026-02-17", name: "Chinese New Year", religion: "chinese", type: "public", scope: "national" },
    { date: "2026-03-19", name: "Nyepi", religion: "hindu", type: "public", scope: "national" },
    { date: "2026-03-20", name: "Idul Fitri", religion: "islamic", type: "public", scope: "national" },
    { date: "2026-03-21", name: "Idul Fitri (Day 2)", religion: "islamic", type: "public", scope: "national" },
    { date: "2026-04-03", name: "Good Friday", religion: "christian", type: "public", scope: "national" },
    { date: "2026-05-01", name: "Labour Day", localName: "Hari Buruh", type: "public", scope: "national" },
    { date: "2026-05-14", name: "Ascension Day", religion: "christian", type: "public", scope: "national" },
    { date: "2026-05-27", name: "Idul Adha", religion: "islamic", type: "public", scope: "national" },
    { date: "2026-05-31", name: "Waisak", religion: "buddhist", type: "public", scope: "national" },
    { date: "2026-06-01", name: "Pancasila Day", type: "public", scope: "national" },
    { date: "2026-06-16", name: "Islamic New Year", religion: "islamic", type: "public", scope: "national" },
    { date: "2026-08-17", name: "Independence Day", localName: "Hari Kemerdekaan", type: "public", scope: "national" },
    { date: "2026-08-25", name: "Prophet's Birthday", religion: "islamic", type: "public", scope: "national" },
    { date: "2026-12-25", name: "Christmas Day", religion: "christian", type: "public", scope: "national" },
  ],
  2027: [
    { date: "2027-01-01", name: "New Year's Day", localName: "Tahun Baru Masehi", type: "public", scope: "national" },
    { date: "2027-01-06", name: "Isra Mi'raj", religion: "islamic", type: "public", scope: "national" },
    { date: "2027-02-06", name: "Chinese New Year", religion: "chinese", type: "public", scope: "national" },
    { date: "2027-03-08", name: "Nyepi", religion: "hindu", type: "public", scope: "national" },
    { date: "2027-03-09", name: "Idul Fitri", religion: "islamic", type: "public", scope: "national" },
    { date: "2027-03-10", name: "Idul Fitri (Day 2)", religion: "islamic", type: "public", scope: "national" },
    { date: "2027-03-26", name: "Good Friday", religion: "christian", type: "public", scope: "national" },
    { date: "2027-05-01", name: "Labour Day", localName: "Hari Buruh", type: "public", scope: "national" },
    { date: "2027-05-06", name: "Ascension Day", religion: "christian", type: "public", scope: "national" },
    { date: "2027-05-16", name: "Idul Adha", religion: "islamic", type: "public", scope: "national" },
    { date: "2027-05-20", name: "Waisak", religion: "buddhist", type: "public", scope: "national" },
    { date: "2027-06-01", name: "Pancasila Day", type: "public", scope: "national" },
    { date: "2027-06-06", name: "Islamic New Year", religion: "islamic", type: "public", scope: "national" },
    { date: "2027-08-14", name: "Prophet's Birthday", religion: "islamic", type: "public", scope: "national" },
    { date: "2027-08-17", name: "Independence Day", localName: "Hari Kemerdekaan", type: "public", scope: "national" },
    { date: "2027-12-25", name: "Christmas Day", religion: "christian", type: "public", scope: "national" },
  ],
};

export function getIndonesiaHolidays(year: number): Holiday[] {
  return HOLIDAYS_BY_YEAR[year] ?? [];
}
