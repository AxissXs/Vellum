export type MalaysiaHoliday = {
  date: string; // YYYY-MM-DD
  name: string;
  nameMs?: string;
  religion?: "islamic" | "buddhist" | "hindu" | "chinese" | "christian" | null;
  type: "public" | "religious" | "observance";
  scope?: "federal" | "state";
};

/** Gazetted federal Malaysia holidays (curated; not Hijri-computed). */
const HOLIDAYS_BY_YEAR: Record<number, MalaysiaHoliday[]> = {
  2025: [
    { date: "2025-01-01", name: "New Year's Day", nameMs: "Hari Tahun Baru", type: "public", scope: "federal" },
    { date: "2025-01-29", name: "Chinese New Year", nameMs: "Tahun Baru Cina", religion: "chinese", type: "public", scope: "federal" },
    { date: "2025-01-30", name: "Chinese New Year (Day 2)", nameMs: "Tahun Baru Cina (Hari Kedua)", religion: "chinese", type: "public", scope: "federal" },
    { date: "2025-02-11", name: "Thaipusam", nameMs: "Thaipusam", religion: "hindu", type: "religious", scope: "federal" },
    { date: "2025-03-31", name: "Hari Raya Aidilfitri", nameMs: "Hari Raya Aidilfitri", religion: "islamic", type: "public", scope: "federal" },
    { date: "2025-04-01", name: "Hari Raya Aidilfitri (Day 2)", nameMs: "Hari Raya Aidilfitri (Hari Kedua)", religion: "islamic", type: "public", scope: "federal" },
    { date: "2025-05-01", name: "Labour Day", nameMs: "Hari Pekerja", type: "public", scope: "federal" },
    { date: "2025-05-12", name: "Wesak Day", nameMs: "Hari Wesak", religion: "buddhist", type: "public", scope: "federal" },
    { date: "2025-06-02", name: "Birthday of Yang di-Pertuan Agong", nameMs: "Hari Keputeraan Agong", type: "public", scope: "federal" },
    { date: "2025-06-07", name: "Hari Raya Aidiladha", nameMs: "Hari Raya Aidiladha", religion: "islamic", type: "public", scope: "federal" },
    { date: "2025-06-27", name: "Awal Muharram", nameMs: "Awal Muharram", religion: "islamic", type: "public", scope: "federal" },
    { date: "2025-08-31", name: "National Day", nameMs: "Hari Merdeka", type: "public", scope: "federal" },
    { date: "2025-09-05", name: "Maulidur Rasul", nameMs: "Maulidur Rasul", religion: "islamic", type: "public", scope: "federal" },
    { date: "2025-09-16", name: "Malaysia Day", nameMs: "Hari Malaysia", type: "public", scope: "federal" },
    { date: "2025-10-20", name: "Deepavali", nameMs: "Deepavali", religion: "hindu", type: "public", scope: "federal" },
    { date: "2025-12-25", name: "Christmas Day", nameMs: "Hari Krismas", religion: "christian", type: "public", scope: "federal" },
  ],
  2026: [
    { date: "2026-01-01", name: "New Year's Day", nameMs: "Hari Tahun Baru", type: "public", scope: "federal" },
    { date: "2026-02-01", name: "Thaipusam", nameMs: "Thaipusam", religion: "hindu", type: "religious", scope: "federal" },
    { date: "2026-02-17", name: "Chinese New Year", nameMs: "Tahun Baru Cina", religion: "chinese", type: "public", scope: "federal" },
    { date: "2026-02-18", name: "Chinese New Year (Day 2)", nameMs: "Tahun Baru Cina (Hari Kedua)", religion: "chinese", type: "public", scope: "federal" },
    { date: "2026-03-20", name: "Hari Raya Aidilfitri", nameMs: "Hari Raya Aidilfitri", religion: "islamic", type: "public", scope: "federal" },
    { date: "2026-03-21", name: "Hari Raya Aidilfitri (Day 2)", nameMs: "Hari Raya Aidilfitri (Hari Kedua)", religion: "islamic", type: "public", scope: "federal" },
    { date: "2026-05-01", name: "Labour Day", nameMs: "Hari Pekerja", type: "public", scope: "federal" },
    { date: "2026-05-27", name: "Hari Raya Aidiladha", nameMs: "Hari Raya Aidiladha", religion: "islamic", type: "public", scope: "federal" },
    { date: "2026-05-31", name: "Wesak Day", nameMs: "Hari Wesak", religion: "buddhist", type: "public", scope: "federal" },
    { date: "2026-06-01", name: "Birthday of Yang di-Pertuan Agong", nameMs: "Hari Keputeraan Agong", type: "public", scope: "federal" },
    { date: "2026-06-16", name: "Awal Muharram", nameMs: "Awal Muharram", religion: "islamic", type: "public", scope: "federal" },
    { date: "2026-08-25", name: "Maulidur Rasul", nameMs: "Maulidur Rasul", religion: "islamic", type: "public", scope: "federal" },
    { date: "2026-08-31", name: "National Day", nameMs: "Hari Merdeka", type: "public", scope: "federal" },
    { date: "2026-09-16", name: "Malaysia Day", nameMs: "Hari Malaysia", type: "public", scope: "federal" },
    { date: "2026-11-08", name: "Deepavali", nameMs: "Deepavali", religion: "hindu", type: "public", scope: "federal" },
    { date: "2026-12-25", name: "Christmas Day", nameMs: "Hari Krismas", religion: "christian", type: "public", scope: "federal" },
  ],
  2027: [
    { date: "2027-01-01", name: "New Year's Day", nameMs: "Hari Tahun Baru", type: "public", scope: "federal" },
    { date: "2027-01-22", name: "Thaipusam", nameMs: "Thaipusam", religion: "hindu", type: "religious", scope: "federal" },
    { date: "2027-02-06", name: "Chinese New Year", nameMs: "Tahun Baru Cina", religion: "chinese", type: "public", scope: "federal" },
    { date: "2027-02-07", name: "Chinese New Year (Day 2)", nameMs: "Tahun Baru Cina (Hari Kedua)", religion: "chinese", type: "public", scope: "federal" },
    { date: "2027-03-09", name: "Hari Raya Aidilfitri", nameMs: "Hari Raya Aidilfitri", religion: "islamic", type: "public", scope: "federal" },
    { date: "2027-03-10", name: "Hari Raya Aidilfitri (Day 2)", nameMs: "Hari Raya Aidilfitri (Hari Kedua)", religion: "islamic", type: "public", scope: "federal" },
    { date: "2027-05-01", name: "Labour Day", nameMs: "Hari Pekerja", type: "public", scope: "federal" },
    { date: "2027-05-16", name: "Hari Raya Aidiladha", nameMs: "Hari Raya Aidiladha", religion: "islamic", type: "public", scope: "federal" },
    { date: "2027-05-20", name: "Wesak Day", nameMs: "Hari Wesak", religion: "buddhist", type: "public", scope: "federal" },
    { date: "2027-06-06", name: "Awal Muharram", nameMs: "Awal Muharram", religion: "islamic", type: "public", scope: "federal" },
    { date: "2027-06-07", name: "Birthday of Yang di-Pertuan Agong", nameMs: "Hari Keputeraan Agong", type: "public", scope: "federal" },
    { date: "2027-08-14", name: "Maulidur Rasul", nameMs: "Maulidur Rasul", religion: "islamic", type: "public", scope: "federal" },
    { date: "2027-08-31", name: "National Day", nameMs: "Hari Merdeka", type: "public", scope: "federal" },
    { date: "2027-09-16", name: "Malaysia Day", nameMs: "Hari Malaysia", type: "public", scope: "federal" },
    { date: "2027-10-28", name: "Deepavali", nameMs: "Deepavali", religion: "hindu", type: "public", scope: "federal" },
    { date: "2027-12-25", name: "Christmas Day", nameMs: "Hari Krismas", religion: "christian", type: "public", scope: "federal" },
  ],
};

export function getMalaysiaHolidays(year: number): MalaysiaHoliday[] {
  return HOLIDAYS_BY_YEAR[year] ?? [];
}

export function getMalaysiaHolidaysInRange(
  from: Date,
  to: Date
): MalaysiaHoliday[] {
  const years = new Set<number>();
  years.add(from.getFullYear());
  years.add(to.getFullYear());
  // Cover month edges that span years
  const cursor = new Date(from);
  while (cursor <= to) {
    years.add(cursor.getFullYear());
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const fromStr = toDateKey(from);
  const toStr = toDateKey(to);

  return [...years]
    .flatMap((y) => getMalaysiaHolidays(y))
    .filter((h) => h.date >= fromStr && h.date <= toStr);
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
