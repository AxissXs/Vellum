import { cache } from "react";
import { getPlatformSetting } from "@/lib/platform-settings";
import {
  DEFAULT_HOLIDAY_COUNTRY,
  HOLIDAY_COUNTRY_SETTING_KEY,
  isValidHolidayCountry,
  type HolidayCountryCode,
} from "@/lib/holidays";

/** Server-only: configured public-holiday country (cached per request). */
export const getHolidayCountry = cache(async (): Promise<HolidayCountryCode> => {
  const value = await getPlatformSetting(HOLIDAY_COUNTRY_SETTING_KEY);
  if (value && isValidHolidayCountry(value)) return value;
  return DEFAULT_HOLIDAY_COUNTRY;
});
