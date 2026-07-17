"use client";

import Link from "next/link";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { clsx } from "clsx";
import { useCalendar } from "@/hooks/useCalendar";

export default function SidebarMiniCalendar() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
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
    const key = format(day, "yyyy-MM-dd");
    const scheduleCount =
      data?.schedules?.filter((s) => {
        const start = format(new Date(s.startsAt), "yyyy-MM-dd");
        const end = format(new Date(s.endsAt), "yyyy-MM-dd");
        return key >= start && key <= end;
      }).length ?? 0;
    const holiday = data?.holidays?.some((h) => h.date === key) ?? false;
    return { scheduleCount, holiday };
  }

  return (
    <div className="mt-3 px-1">
      <div className="flex items-center justify-between mb-2 px-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {format(now, "MMM yyyy")}
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
          const inMonth = isSameMonth(day, monthStart);
          const { scheduleCount, holiday } = density(day);
          const key = format(day, "yyyy-MM-dd");
          return (
            <Link
              key={day.toISOString()}
              href={`/dashboard/calendar?date=${key}&scope=me`}
              className={clsx(
                "relative flex h-7 items-center justify-center rounded text-[11px] transition",
                inMonth ? "text-slate-700 hover:bg-slate-100" : "text-slate-300",
                isToday(day) && "bg-brand-500/10 text-brand-600 font-semibold"
              )}
              title={
                holiday
                  ? "Holiday"
                  : scheduleCount
                    ? `${scheduleCount} schedule${scheduleCount > 1 ? "s" : ""}`
                    : undefined
              }
            >
              {format(day, "d")}
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
