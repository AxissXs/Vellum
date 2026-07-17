import type { Holiday } from "./types";

/** Gazetted federal Malaysia holidays (curated; not Hijri-computed). */
const HOLIDAYS_BY_YEAR: Record<number, Holiday[]> = {
  2025: [
    { date: "2025-01-01", name: "New Year's Day", localName: "Hari Tahun Baru", type: "public", scope: "federal" },
    { date: "2025-01-29", name: "Chinese New Year", localName: "Tahun Baru Cina", religion: "chinese", type: "public", scope: "federal" },
    { date: "2025-01-30", name: "Chinese New Year (Day 2)", localName: "Tahun Baru Cina (Hari Kedua)", religion: "chinese", type: "public", scope: "federal" },
    { date: "2025-02-11", name: "Thaipusam", localName: "Thaipusam", religion: "hindu", type: "religious", scope: "federal" },
    { date: "2025-03-31", name: "Hari Raya Aidilfitri", localName: "Hari Raya Aidilfitri", religion: "islamic", type: "public", scope: "federal" },
    { date: "2025-04-01", name: "Hari Raya Aidilfitri (Day 2)", localName: "Hari Raya Aidilfitri (Hari Kedua)", religion: "islamic", type: "public", scope: "federal" },
    { date: "2025-05-01", name: "Labour Day", localName: "Hari Pekerja", type: "public", scope: "federal" },
    { date: "2025-05-12", name: "Wesak Day", localName: "Hari Wesak", religion: "buddhist", type: "public", scope: "federal" },
    { date: "2025-06-02", name: "Birthday of Yang di-Pertuan Agong", localName: "Hari Keputeraan Agong", type: "public", scope: "federal" },
    { date: "2025-06-07", name: "Hari Raya Aidiladha", localName: "Hari Raya Aidiladha", religion: "islamic", type: "public", scope: "federal" },
    { date: "2025-06-27", name: "Awal Muharram", localName: "Awal Muharram", religion: "islamic", type: "public", scope: "federal" },
    { date: "2025-08-31", name: "National Day", localName: "Hari Merdeka", type: "public", scope: "federal" },
    { date: "2025-09-05", name: "Maulidur Rasul", localName: "Maulidur Rasul", religion: "islamic", type: "public", scope: "federal" },
    { date: "2025-09-16", name: "Malaysia Day", localName: "Hari Malaysia", type: "public", scope: "federal" },
    { date: "2025-10-20", name: "Deepavali", localName: "Deepavali", religion: "hindu", type: "public", scope: "federal" },
    { date: "2025-12-25", name: "Christmas Day", localName: "Hari Krismas", religion: "christian", type: "public", scope: "federal" },
  ],
  2026: [
    { date: "2026-01-01", name: "New Year's Day", localName: "Hari Tahun Baru", type: "public", scope: "federal" },
    { date: "2026-02-01", name: "Thaipusam", localName: "Thaipusam", religion: "hindu", type: "religious", scope: "federal" },
    { date: "2026-02-17", name: "Chinese New Year", localName: "Tahun Baru Cina", religion: "chinese", type: "public", scope: "federal" },
    { date: "2026-02-18", name: "Chinese New Year (Day 2)", localName: "Tahun Baru Cina (Hari Kedua)", religion: "chinese", type: "public", scope: "federal" },
    { date: "2026-03-20", name: "Hari Raya Aidilfitri", localName: "Hari Raya Aidilfitri", religion: "islamic", type: "public", scope: "federal" },
    { date: "2026-03-21", name: "Hari Raya Aidilfitri (Day 2)", localName: "Hari Raya Aidilfitri (Hari Kedua)", religion: "islamic", type: "public", scope: "federal" },
    { date: "2026-05-01", name: "Labour Day", localName: "Hari Pekerja", type: "public", scope: "federal" },
    { date: "2026-05-27", name: "Hari Raya Aidiladha", localName: "Hari Raya Aidiladha", religion: "islamic", type: "public", scope: "federal" },
    { date: "2026-05-31", name: "Wesak Day", localName: "Hari Wesak", religion: "buddhist", type: "public", scope: "federal" },
    { date: "2026-06-01", name: "Birthday of Yang di-Pertuan Agong", localName: "Hari Keputeraan Agong", type: "public", scope: "federal" },
    { date: "2026-06-16", name: "Awal Muharram", localName: "Awal Muharram", religion: "islamic", type: "public", scope: "federal" },
    { date: "2026-08-25", name: "Maulidur Rasul", localName: "Maulidur Rasul", religion: "islamic", type: "public", scope: "federal" },
    { date: "2026-08-31", name: "National Day", localName: "Hari Merdeka", type: "public", scope: "federal" },
    { date: "2026-09-16", name: "Malaysia Day", localName: "Hari Malaysia", type: "public", scope: "federal" },
    { date: "2026-11-08", name: "Deepavali", localName: "Deepavali", religion: "hindu", type: "public", scope: "federal" },
    { date: "2026-12-25", name: "Christmas Day", localName: "Hari Krismas", religion: "christian", type: "public", scope: "federal" },
  ],
  2027: [
    { date: "2027-01-01", name: "New Year's Day", localName: "Hari Tahun Baru", type: "public", scope: "federal" },
    { date: "2027-01-22", name: "Thaipusam", localName: "Thaipusam", religion: "hindu", type: "religious", scope: "federal" },
    { date: "2027-02-06", name: "Chinese New Year", localName: "Tahun Baru Cina", religion: "chinese", type: "public", scope: "federal" },
    { date: "2027-02-07", name: "Chinese New Year (Day 2)", localName: "Tahun Baru Cina (Hari Kedua)", religion: "chinese", type: "public", scope: "federal" },
    { date: "2027-03-09", name: "Hari Raya Aidilfitri", localName: "Hari Raya Aidilfitri", religion: "islamic", type: "public", scope: "federal" },
    { date: "2027-03-10", name: "Hari Raya Aidilfitri (Day 2)", localName: "Hari Raya Aidilfitri (Hari Kedua)", religion: "islamic", type: "public", scope: "federal" },
    { date: "2027-05-01", name: "Labour Day", localName: "Hari Pekerja", type: "public", scope: "federal" },
    { date: "2027-05-16", name: "Hari Raya Aidiladha", localName: "Hari Raya Aidiladha", religion: "islamic", type: "public", scope: "federal" },
    { date: "2027-05-20", name: "Wesak Day", localName: "Hari Wesak", religion: "buddhist", type: "public", scope: "federal" },
    { date: "2027-06-06", name: "Awal Muharram", localName: "Awal Muharram", religion: "islamic", type: "public", scope: "federal" },
    { date: "2027-06-07", name: "Birthday of Yang di-Pertuan Agong", localName: "Hari Keputeraan Agong", type: "public", scope: "federal" },
    { date: "2027-08-14", name: "Maulidur Rasul", localName: "Maulidur Rasul", religion: "islamic", type: "public", scope: "federal" },
    { date: "2027-08-31", name: "National Day", localName: "Hari Merdeka", type: "public", scope: "federal" },
    { date: "2027-09-16", name: "Malaysia Day", localName: "Hari Malaysia", type: "public", scope: "federal" },
    { date: "2027-10-28", name: "Deepavali", localName: "Deepavali", religion: "hindu", type: "public", scope: "federal" },
    { date: "2027-12-25", name: "Christmas Day", localName: "Hari Krismas", religion: "christian", type: "public", scope: "federal" },
  ],
};

export function getMalaysiaHolidays(year: number): Holiday[] {
  return HOLIDAYS_BY_YEAR[year] ?? [];
}
