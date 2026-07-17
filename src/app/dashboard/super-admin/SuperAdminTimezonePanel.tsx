"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Globe, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  COMMON_TIMEZONES,
  DEFAULT_APP_TIMEZONE,
} from "@/lib/timezone";
import {
  DEFAULT_HOLIDAY_COUNTRY,
  HOLIDAY_COUNTRIES,
  type HolidayCountryCode,
} from "@/lib/holidays";

type TimezoneResponse = {
  timezone: string;
  defaultTimezone: string;
  options: Array<{ value: string; label: string }>;
};

type HolidaysResponse = {
  country: HolidayCountryCode;
  defaultCountry: HolidayCountryCode;
  options: Array<{ value: HolidayCountryCode; label: string }>;
};

export default function SuperAdminTimezonePanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin", "timezone"],
    queryFn: async () =>
      api.get<TimezoneResponse>("/api/super-admin/timezone"),
  });

  const { data: holidaysData, isLoading: holidaysLoading } = useQuery({
    queryKey: ["super-admin", "holidays"],
    queryFn: async () =>
      api.get<HolidaysResponse>("/api/super-admin/holidays"),
  });

  const [draft, setDraft] = useState<string | null>(null);
  const [holidayDraft, setHolidayDraft] = useState<HolidayCountryCode | null>(
    null
  );

  const selected = draft ?? data?.timezone ?? DEFAULT_APP_TIMEZONE;
  const options = data?.options?.length ? data.options : COMMON_TIMEZONES;
  const holidaySelected =
    holidayDraft ?? holidaysData?.country ?? DEFAULT_HOLIDAY_COUNTRY;
  const holidayOptions = holidaysData?.options?.length
    ? holidaysData.options
    : HOLIDAY_COUNTRIES;

  const save = useMutation({
    mutationFn: async (timezone: string) =>
      api.patch<TimezoneResponse>("/api/super-admin/timezone", { timezone }),
    onSuccess: (res) => {
      setDraft(null);
      queryClient.setQueryData(["super-admin", "timezone"], res);
      queryClient.setQueryData(["app-timezone"], res.timezone);
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      toast.success(`Timezone set to ${res.timezone}`);
    },
    onError: () => toast.error("Failed to update timezone"),
  });

  const saveHolidays = useMutation({
    mutationFn: async (country: HolidayCountryCode) =>
      api.patch<HolidaysResponse>("/api/super-admin/holidays", { country }),
    onSuccess: (res) => {
      setHolidayDraft(null);
      queryClient.setQueryData(["super-admin", "holidays"], res);
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      const label =
        res.options.find((o) => o.value === res.country)?.label ?? res.country;
      toast.success(`Public holidays set to ${label}`);
    },
    onError: () => toast.error("Failed to update holiday country"),
  });

  const dirty = data ? selected !== data.timezone : false;
  const holidayDirty = holidaysData
    ? holidaySelected !== holidaysData.country
    : false;

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Globe size={18} />
            Platform timezone
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Calendar, schedules, and date displays use this IANA timezone for the
            whole workspace. Default is {DEFAULT_APP_TIMEZONE}.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="space-y-4 max-w-md">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Timezone
              </span>
              <select
                value={selected}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              >
                {!options.some((o) => o.value === selected) && (
                  <option value={selected}>{selected}</option>
                )}
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} — {o.value}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-xs text-slate-400">
              Current:{" "}
              <span className="font-medium text-slate-600">{data?.timezone}</span>
            </p>

            <button
              type="button"
              disabled={!dirty || save.isPending}
              onClick={() => save.mutate(selected)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
            >
              {save.isPending && <Loader2 size={14} className="animate-spin" />}
              Save timezone
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 pt-8 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <CalendarDays size={18} />
            Public holidays
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Which country&apos;s public holidays appear on the calendar. Choose
            None to hide the holidays layer data. Default is Malaysia.
          </p>
        </div>

        {holidaysLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="space-y-4 max-w-md">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Country
              </span>
              <select
                value={holidaySelected}
                onChange={(e) =>
                  setHolidayDraft(e.target.value as HolidayCountryCode)
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              >
                {holidayOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-xs text-slate-400">
              Current:{" "}
              <span className="font-medium text-slate-600">
                {holidayOptions.find((o) => o.value === holidaysData?.country)
                  ?.label ?? holidaysData?.country}
              </span>
            </p>

            <button
              type="button"
              disabled={!holidayDirty || saveHolidays.isPending}
              onClick={() => saveHolidays.mutate(holidaySelected)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
            >
              {saveHolidays.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Save holidays
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
