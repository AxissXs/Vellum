/**
 * Client-safe timezone helpers. Do NOT import DB / platform-settings here —
 * client components (TimezoneProvider, calendar UI) import this module.
 */
import { TZDate, tz } from "@date-fns/tz";
import { format } from "date-fns";

/** Default when unset / invalid. */
export const DEFAULT_APP_TIMEZONE = "Asia/Kuala_Lumpur";

export const TIMEZONE_SETTING_KEY = "app_timezone";

/** @deprecated Prefer useAppTimezone() / getAppTimezone(); kept as default alias. */
export const APP_TIMEZONE = DEFAULT_APP_TIMEZONE;

/** Common IANA zones for Super Admin picker. */
export const COMMON_TIMEZONES: Array<{ value: string; label: string }> = [
  { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (MY)" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Jakarta", label: "Jakarta" },
  { value: "Asia/Bangkok", label: "Bangkok" },
  { value: "Asia/Manila", label: "Manila" },
  { value: "Asia/Hong_Kong", label: "Hong Kong" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Seoul", label: "Seoul" },
  { value: "Asia/Kolkata", label: "Kolkata" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Australia/Perth", label: "Perth" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "America/New_York", label: "New York" },
  { value: "America/Chicago", label: "Chicago" },
  { value: "America/Los_Angeles", label: "Los Angeles" },
  { value: "Pacific/Auckland", label: "Auckland" },
  { value: "UTC", label: "UTC" },
];

export function isValidIanaTimeZone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== "string") return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function nowInAppTz(timeZone: string = DEFAULT_APP_TIMEZONE): TZDate {
  return TZDate.tz(timeZone);
}

export function parseAppDateKey(
  ymd: string,
  timeZone: string = DEFAULT_APP_TIMEZONE
): TZDate {
  return new TZDate(`${ymd}T12:00:00`, timeZone);
}

export function toAppDateKey(
  date: Date | string,
  timeZone: string = DEFAULT_APP_TIMEZONE
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "yyyy-MM-dd", { in: tz(timeZone) });
}

export function formatInAppTz(
  date: Date | string,
  pattern: string,
  timeZone: string = DEFAULT_APP_TIMEZONE
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, pattern, { in: tz(timeZone) });
}

export function appWallToUtcIso(
  dateYmd: string,
  time = "00:00:00",
  timeZone: string = DEFAULT_APP_TIMEZONE
): string {
  const normalized =
    time.length === 5 ? `${time}:00` : time.length === 8 ? time : `${time}:00`;
  return new TZDate(`${dateYmd}T${normalized}`, timeZone).toISOString();
}

export function appAllDayStartIso(
  dateYmd: string,
  timeZone: string = DEFAULT_APP_TIMEZONE
): string {
  return appWallToUtcIso(dateYmd, "00:00:00", timeZone);
}

export function appAllDayEndIso(
  dateYmd: string,
  timeZone: string = DEFAULT_APP_TIMEZONE
): string {
  return appWallToUtcIso(dateYmd, "23:59:59", timeZone);
}
