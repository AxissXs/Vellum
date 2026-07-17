"use client";

import Link from "next/link";
import {
  eachDayOfInterval,
  endOfMonth,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { tz } from "@date-fns/tz";
import { clsx } from "clsx";
import { useCalendar } from "@/hooks/useCalendar";
import {
  formatInAppTz,
  nowInAppTz,
  toAppDateKey,
} from "@/lib/timezone";
import { useAppTimezone } from "@/providers/TimezoneProvider";

export default function SidebarMiniCalendar() {
  const timeZone = useAppTimezone();
  const inTz = tz(timeZone);
  const now = nowInAppTz(timeZone);
  const monthStart = startOfMonth(now, { in: inTz });
  const monthEnd = endOfMonth(now, { in: inTz });
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1, in: inTz });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1, in: inTz });
  const from = gridStart.toISOString();
  const to = gridEnd.toISOString();
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const { data } = useCalendar({
    from,
    to,
    scope: "me",
    layers: {
      schedules: true,
      activity: false,
      tasks: false,
      holidays: true,
    },
  });

  function density(day: Date) {
    const key = toAppDateKey(day, timeZone);
    const scheduleCount =
      data?.schedules?.filter((s) => {
        const start = toAppDateKey(s.startsAt, timeZone);
        const end = toAppDateKey(s.endsAt, timeZone);
        return key >= start && key <= end;
      }).length ?? 0;
    const holiday = data?.holidays?.some((h) => h.date === key) ?? false;
    return { scheduleCount, holiday };
  }

  return (
    <div className="mt-3 px-1">
      <div className="flex items-center justify-between mb-2 px-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {formatInAppTz(now, "MMM yyyy", timeZone)}
        </p>
        <Link
          href="/dashboard/calendar?scope=me"
          className="text-[11px] text-brand-600 hover:text-brand-700"
        >
          Open
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-[9px] text-center text-slate-400 mb-1 px-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 px-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, monthStart, { in: inTz });
          const { scheduleCount, holiday } = density(day);
          const key = toAppDateKey(day, timeZone);
          return (
            <Link
              key={key}
              href={`/dashboard/calendar?date=${key}&scope=me`}
              className={clsx(
                "relative flex h-7 items-center justify-center rounded text-[11px] transition",
                inMonth ? "text-slate-700 hover:bg-slate-100" : "text-slate-300",
                isToday(day, { in: inTz }) &&
                  "bg-brand-500/10 text-brand-600 font-semibold"
              )}
              title={
                holiday
                  ? "Holiday"
                  : scheduleCount
                    ? `${scheduleCount} schedule${scheduleCount > 1 ? "s" : ""}`
                    : undefined
              }
            >
              {formatInAppTz(day, "d", timeZone)}
              {(scheduleCount > 0 || holiday) && (
                <span
                  className={clsx(
                    "absolute bottom-0.5 h-1 w-1 rounded-full",
                    holiday ? "bg-rose-500" : "bg-brand-500"
                  )}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
