import { toAppDateKey } from "@/lib/timezone";
import type { Holiday, HolidayCountryCode, HolidayCountryOption } from "./types";
import { getMalaysiaHolidays } from "./malaysia";
import { getSingaporeHolidays } from "./singapore";
import { getIndonesiaHolidays } from "./indonesia";
import { getUnitedStatesHolidays } from "./united-states";
import { getUnitedKingdomHolidays } from "./united-kingdom";
import { getAustraliaHolidays } from "./australia";
import { getPhilippinesHolidays } from "./philippines";
import { getThailandHolidays } from "./thailand";

export type { Holiday, HolidayCountryCode, HolidayCountryOption };

/** @deprecated Use Holiday */
export type MalaysiaHoliday = Holiday;

export const HOLIDAY_COUNTRY_SETTING_KEY = "holiday_country";
export const DEFAULT_HOLIDAY_COUNTRY: HolidayCountryCode = "MY";

export const HOLIDAY_COUNTRIES: HolidayCountryOption[] = [
  { value: "none", label: "None (hide public holidays)" },
  { value: "MY", label: "Malaysia" },
  { value: "SG", label: "Singapore" },
  { value: "ID", label: "Indonesia" },
  { value: "PH", label: "Philippines" },
  { value: "TH", label: "Thailand" },
  { value: "AU", label: "Australia" },
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
];

const BY_COUNTRY: Record<
  Exclude<HolidayCountryCode, "none">,
  (year: number) => Holiday[]
> = {
  MY: getMalaysiaHolidays,
  SG: getSingaporeHolidays,
  ID: getIndonesiaHolidays,
  US: getUnitedStatesHolidays,
  GB: getUnitedKingdomHolidays,
  AU: getAustraliaHolidays,
  PH: getPhilippinesHolidays,
  TH: getThailandHolidays,
};

export function isValidHolidayCountry(
  code: string
): code is HolidayCountryCode {
  return HOLIDAY_COUNTRIES.some((c) => c.value === code);
}

export function getHolidaysForYear(
  country: HolidayCountryCode,
  year: number
): Holiday[] {
  if (country === "none") return [];
  return BY_COUNTRY[country](year);
}

export function getHolidaysInRange(
  country: HolidayCountryCode,
  from: Date,
  to: Date,
  timeZone?: string
): Holiday[] {
  if (country === "none") return [];
  const fromStr = toAppDateKey(from, timeZone);
  const toStr = toAppDateKey(to, timeZone);
  const years = new Set<number>();
  years.add(Number(fromStr.slice(0, 4)));
  years.add(Number(toStr.slice(0, 4)));

  return [...years]
    .flatMap((y) => getHolidaysForYear(country, y))
    .filter((h) => h.date >= fromStr && h.date <= toStr);
}
