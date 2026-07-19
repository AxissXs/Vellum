import { TZDate, tz } from "@date-fns/tz";
import { addDays, addMinutes } from "date-fns";
import {
  appAllDayEndIso,
  appAllDayStartIso,
  appWallToUtcIso,
  formatInAppTz,
  nowInAppTz,
  toAppDateKey,
} from "@/lib/timezone";

export type DateRangePreset = "today" | "tomorrow" | "week";

export function resolveRange(
  preset: DateRangePreset,
  timeZone: string
): { from: Date; to: Date; label: string } {
  const now = nowInAppTz(timeZone);
  const todayKey = toAppDateKey(now, timeZone);

  if (preset === "today") {
    return {
      from: new Date(appAllDayStartIso(todayKey, timeZone)),
      to: new Date(appAllDayEndIso(todayKey, timeZone)),
      label: "today",
    };
  }

  if (preset === "tomorrow") {
    const tomorrow = addDays(now, 1);
    const key = toAppDateKey(tomorrow, timeZone);
    return {
      from: new Date(appAllDayStartIso(key, timeZone)),
      to: new Date(appAllDayEndIso(key, timeZone)),
      label: "tomorrow",
    };
  }

  const weekEnd = addDays(now, 6);
  const endKey = toAppDateKey(weekEnd, timeZone);
  return {
    from: new Date(appAllDayStartIso(todayKey, timeZone)),
    to: new Date(appAllDayEndIso(endKey, timeZone)),
    label: "week",
  };
}

function parseTimePart(timeStr: string): { h: number; m: number } | null {
  const t = timeStr.trim().toLowerCase().replace(/\s/g, "");
  const match12 = t.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = match12[2] ? parseInt(match12[2], 10) : 0;
    if (match12[3] === "pm" && h < 12) h += 12;
    if (match12[3] === "am" && h === 12) h = 0;
    return { h, m };
  }
  const match24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return { h: parseInt(match24[1], 10), m: parseInt(match24[2], 10) };
  }
  return null;
}

function resolveDayKey(input: string, timeZone: string): string | null {
  const lower = input.trim().toLowerCase();
  const now = nowInAppTz(timeZone);
  if (lower === "today") return toAppDateKey(now, timeZone);
  if (lower === "tomorrow") return toAppDateKey(addDays(now, 1), timeZone);
  if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) return lower;
  return null;
}

export function parseTelegramDateTime(
  input: string,
  timeZone: string
): { ok: true; date: Date } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Empty date/time." };
  }

  const iso = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}T\d/.test(iso)) {
    const d = new Date(iso.length <= 16 ? `${iso}:00` : iso);
    if (!Number.isNaN(d.getTime())) return { ok: true, date: d };
  }

  if (/^\d{4}-\d{2}-\d{2}(\s+\d{1,2}(:\d{2})?(am|pm)?)?$/i.test(trimmed)) {
    const [datePart, ...rest] = trimmed.split(/\s+/);
    const timePart = rest.join(" ");
    if (!timePart) {
      return {
        ok: true,
        date: new Date(appAllDayStartIso(datePart, timeZone)),
      };
    }
    const tm = parseTimePart(timePart);
    if (!tm) return { ok: false, error: `Could not parse time: ${timePart}` };
    const hh = String(tm.h).padStart(2, "0");
    const mm = String(tm.m).padStart(2, "0");
    return {
      ok: true,
      date: new Date(appWallToUtcIso(datePart, `${hh}:${mm}:00`, timeZone)),
    };
  }

  const relative = trimmed.match(/^(today|tomorrow)\s+(.+)$/i);
  if (relative) {
    const dayKey = resolveDayKey(relative[1], timeZone);
    if (!dayKey) return { ok: false, error: "Invalid day." };
    const tm = parseTimePart(relative[2]);
    if (!tm) return { ok: false, error: `Could not parse time: ${relative[2]}` };
    const hh = String(tm.h).padStart(2, "0");
    const mm = String(tm.m).padStart(2, "0");
    return {
      ok: true,
      date: new Date(appWallToUtcIso(dayKey, `${hh}:${mm}:00`, timeZone)),
    };
  }

  return {
    ok: false,
    error: `Use ISO (2026-07-18 10:00), today/tomorrow 2pm, or YYYY-MM-DD HH:MM (${timeZone}).`,
  };
}

export function parseDuration(input: string): number | null {
  const t = input.trim().toLowerCase();
  const h = t.match(/^(\d+(?:\.\d+)?)h$/);
  if (h) return Math.round(parseFloat(h[1]) * 60);
  const m = t.match(/^(\d+)m$/);
  if (m) return parseInt(m[1], 10);
  return null;
}

export function parseEndOrDuration(
  start: Date,
  endInput: string,
  timeZone: string
): { ok: true; end: Date } | { ok: false; error: string } {
  const durationMins = parseDuration(endInput);
  if (durationMins !== null) {
    return { ok: true, end: addMinutes(start, durationMins) };
  }
  const parsed = parseTelegramDateTime(endInput, timeZone);
  if (!parsed.ok) return parsed;
  if (parsed.date <= start) {
    return { ok: false, error: "End must be after start." };
  }
  return { ok: true, end: parsed.date };
}

export function parseLeaveRange(
  args: string[],
  timeZone: string
): { ok: true; startsAt: Date; endsAt: Date } | { ok: false; error: string } {
  if (args.length === 1) {
    const preset = args[0].toLowerCase();
    if (preset === "today" || preset === "tomorrow") {
      const range = resolveRange(preset, timeZone);
      return { ok: true, startsAt: range.from, endsAt: range.to };
    }
  }

  if (args.length >= 2) {
    const startKey = resolveDayKey(args[0], timeZone) || args[0];
    const endKey = resolveDayKey(args[1], timeZone) || args[1];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startKey) || !/^\d{4}-\d{2}-\d{2}$/.test(endKey)) {
      return { ok: false, error: "Use: /leave today | tomorrow | YYYY-MM-DD | YYYY-MM-DD" };
    }
    return {
      ok: true,
      startsAt: new Date(appAllDayStartIso(startKey, timeZone)),
      endsAt: new Date(appAllDayEndIso(endKey, timeZone)),
    };
  }

  return { ok: false, error: "Use: /leave today | tomorrow | start | end" };
}

export function formatTelegramDateTime(date: Date, timeZone: string): string {
  return formatInAppTz(date, "MMM d, HH:mm", timeZone);
}

export function formatTelegramDate(date: Date, timeZone: string): string {
  return formatInAppTz(date, "yyyy-MM-dd", timeZone);
}
