import { cache } from "react";
import { getPlatformSetting } from "@/lib/platform-settings";
import {
  DEFAULT_APP_TIMEZONE,
  TIMEZONE_SETTING_KEY,
  isValidIanaTimeZone,
} from "@/lib/timezone";

/** Server-only: resolve configured platform timezone (cached per request). */
export const getAppTimezone = cache(async (): Promise<string> => {
  const value = await getPlatformSetting(TIMEZONE_SETTING_KEY);
  if (value && isValidIanaTimeZone(value)) return value;
  return DEFAULT_APP_TIMEZONE;
});
