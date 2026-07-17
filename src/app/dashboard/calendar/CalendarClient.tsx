"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { tz } from "@date-fns/tz";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";
import {
  useCalendar,
  useCreateSchedule,
  useDeleteSchedule,
  useUpdateSchedule,
  type CalendarLayers,
  type ScheduleEvent,
} from "@/hooks/useCalendar";
import { hasPermission } from "@/lib/permissions";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  appAllDayEndIso,
  appAllDayStartIso,
  appWallToUtcIso,
  formatInAppTz,
  nowInAppTz,
  parseAppDateKey,
  toAppDateKey,
} from "@/lib/timezone";
import { useAppTimezone } from "@/providers/TimezoneProvider";

type UserOption = { id: string; name: string; email: string };

const TYPE_COLORS: Record<ScheduleEvent["type"], string> = {
  work: "bg-blue-500",
  meeting: "bg-violet-500",
  leave: "bg-amber-500",
  training: "bg-emerald-500",
  other: "bg-slate-500",
};

const TYPE_LABELS: Record<ScheduleEvent["type"], string> = {
  work: "Work",
  meeting: "Meeting",
  leave: "Leave",
  training: "Training",
  other: "Other",
};

const DEFAULT_LAYERS: CalendarLayers = {
  schedules: true,
  activity: true,
  tasks: true,
  holidays: true,
};

function userColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 55% 45%)`;
}

export default function CalendarClient({
  userId,
  userRole,
}: {
  userId: string;
  userRole: string;
}) {
  const timeZone = useAppTimezone();
  const inTz = tz(timeZone);
  const searchParams = useSearchParams();
  const initialDate = searchParams.get("date");
  const initialScope = searchParams.get("scope") === "team" ? "team" : "me";

  const [cursor, setCursor] = useState<Date>(() =>
    initialDate ? parseAppDateKey(initialDate, timeZone) : nowInAppTz(timeZone)
  );
  const [scope, setScope] = useState<"me" | "team">(initialScope);
  const [selectedDay, setSelectedDay] = useState<Date>(() =>
    initialDate ? parseAppDateKey(initialDate, timeZone) : nowInAppTz(timeZone)
  );
  const [layers, setLayers] = useState<CalendarLayers>(DEFAULT_LAYERS);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);

  const canManage = hasPermission(userRole, "manage_schedules");
  const canCreateOwn = hasPermission(userRole, "create_own_schedule");

  const range = (() => {
    const monthStart = startOfMonth(cursor, { in: inTz });
    const monthEnd = endOfMonth(cursor, { in: inTz });
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1, in: inTz });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1, in: inTz });
    return {
      from: gridStart.toISOString(),
      to: gridEnd.toISOString(),
      days: eachDayOfInterval({ start: gridStart, end: gridEnd }),
    };
  })();

  const { data, isLoading } = useCalendar({
    from: range.from,
    to: range.to,
    scope,
    layers,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const res = await api.get<{ users: UserOption[] }>("/api/users");
      return res.users;
    },
    enabled: canManage && showModal,
  });

  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const selectedKey = toAppDateKey(selectedDay, timeZone);

  const daySchedules =
    data?.schedules
      ?.filter((s) => {
        const start = toAppDateKey(s.startsAt, timeZone);
        const end = toAppDateKey(s.endsAt, timeZone);
        return selectedKey >= start && selectedKey <= end;
      })
      .slice()
      .sort(
        (a, b) =>
          new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()
      ) ?? [];

  const dayActivity =
    data?.activity?.filter(
      (a) => toAppDateKey(a.createdAt, timeZone) === selectedKey
    ) ?? [];

  const dayTasks =
    data?.tasks?.filter(
      (t) => toAppDateKey(t.dueDate, timeZone) === selectedKey
    ) ?? [];

  const dayHolidays =
    data?.holidays?.filter((h) => h.date === selectedKey) ?? [];

  const dayConflicts =
    data?.conflicts?.filter(
      (c) => toAppDateKey(c.dueDate, timeZone) === selectedKey
    ) ?? [];

  function eventsForDay(day: Date) {
    const key = toAppDateKey(day, timeZone);
    const schedules =
      data?.schedules
        ?.filter((s) => {
          const start = toAppDateKey(s.startsAt, timeZone);
          const end = toAppDateKey(s.endsAt, timeZone);
          return key >= start && key <= end;
        })
        .slice()
        .sort(
          (a, b) =>
            new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()
        ) ?? [];
    const holidays = data?.holidays?.filter((h) => h.date === key) ?? [];
    const tasks =
      data?.tasks?.filter((t) => toAppDateKey(t.dueDate, timeZone) === key) ??
      [];
    const activityCount =
      data?.activity?.filter(
        (a) => toAppDateKey(a.createdAt, timeZone) === key
      ).length ?? 0;
    return { schedules, holidays, tasks, activityCount };
  }

  function openCreate(day?: Date) {
    setEditing(null);
    if (day) setSelectedDay(day);
    setShowModal(true);
  }

  function openEdit(schedule: ScheduleEvent) {
    setEditing(schedule);
    setShowModal(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this schedule?")) return;
    await deleteSchedule.mutateAsync(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="text-slate-500 text-sm mt-1">
            Schedules, activity, tasks, and public holidays
          </p>
        </div>
        {(canCreateOwn || canManage) && (
          <button
            onClick={() => openCreate(selectedDay)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition"
          >
            <Plus size={16} />
            Add schedule
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          {(["me", "team"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={clsx(
                "px-3 py-1.5 text-sm font-medium rounded-md transition",
                scope === s
                  ? "bg-brand-500/10 text-brand-600"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {s === "me" ? "My calendar" : "Team"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          {(Object.keys(layers) as Array<keyof CalendarLayers>).map((key) => (
            <label key={key} className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={() =>
                  setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
                }
                className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="capitalize">{key}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <button
              onClick={() => setCursor(subMonths(cursor, 1, { in: inTz }))}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-sm font-semibold text-slate-900">
              {formatInAppTz(cursor, "MMMM yyyy", timeZone)}
            </h2>
            <button
              onClick={() => setCursor(addMonths(cursor, 1, { in: inTz }))}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="px-2 py-2 text-center">
                {d}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : (
            <div className="grid grid-cols-7 auto-rows-[minmax(88px,1fr)]">
              {range.days.map((day) => {
                const { schedules, holidays, tasks, activityCount } =
                  eventsForDay(day);
                const inMonth = isSameMonth(day, cursor, { in: inTz });
                const selected = isSameDay(day, selectedDay, { in: inTz });
                return (
                  <button
                    key={toAppDateKey(day, timeZone)}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    onDoubleClick={() => openCreate(day)}
                    className={clsx(
                      "border-t border-r border-slate-100 p-1.5 text-left align-top transition hover:bg-slate-50",
                      !inMonth && "bg-slate-50/60 text-slate-400",
                      selected && "bg-brand-500/5 ring-1 ring-inset ring-brand-500/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={clsx(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                          isToday(day, { in: inTz }) && "bg-brand-500 text-white",
                          !isToday(day, { in: inTz }) && inMonth && "text-slate-800",
                          !isToday(day, { in: inTz }) && !inMonth && "text-slate-400"
                        )}
                      >
                        {formatInAppTz(day, "d", timeZone)}
                      </span>
                      {holidays.length > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" title={holidays[0].name} />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {holidays.slice(0, 1).map((h) => (
                        <div
                          key={h.date + h.name}
                          className="truncate text-[10px] px-1 py-0.5 rounded bg-rose-500/10 text-rose-700"
                        >
                          {h.name}
                        </div>
                      ))}
                      {schedules.slice(0, 2).map((s) => (
                        <div
                          key={s.id}
                          className={clsx(
                            "truncate text-[10px] px-1 py-0.5 rounded text-white",
                            scope !== "team" && TYPE_COLORS[s.type]
                          )}
                          style={
                            scope === "team"
                              ? { backgroundColor: userColor(s.userId) }
                              : undefined
                          }
                        >
                          {scope === "team" && s.userName
                            ? `${s.userName.split(" ")[0]}: `
                            : ""}
                          {s.title}
                        </div>
                      ))}
                      {tasks.slice(0, 1).map((t) => (
                        <div
                          key={t.id}
                          className="truncate text-[10px] px-1 py-0.5 rounded bg-sky-500/10 text-sky-700"
                        >
                          Due: {t.title}
                        </div>
                      ))}
                      {(schedules.length > 2 || activityCount > 0) && (
                        <div className="text-[10px] text-slate-400 px-1">
                          {schedules.length > 2
                            ? `+${schedules.length - 2} more`
                            : null}
                          {activityCount > 0
                            ? `${schedules.length > 2 ? " · " : ""}${activityCount} act.`
                            : null}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 h-fit xl:sticky xl:top-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">Selected</p>
            <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
              {formatInAppTz(selectedDay, "EEEE, d MMM yyyy", timeZone)}
              <span className="block text-xs font-normal text-slate-400 mt-0.5">
                {timeZone}
              </span>
            </h3>
          </div>

          {dayConflicts.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 space-y-1">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertTriangle size={14} />
                Leave conflicts
              </div>
              {dayConflicts.map((c) => (
                <p key={`${c.scheduleId}-${c.taskId}`}>
                  {c.scheduleTitle} overlaps task &ldquo;{c.taskTitle}&rdquo;
                </p>
              ))}
            </div>
          )}

          {dayHolidays.length > 0 && (
            <Section title="Holidays">
              {dayHolidays.map((h) => (
                <div key={h.date + h.name} className="text-sm text-rose-700">
                  <span className="font-medium">{h.name}</span>
                  {h.localName ? (
                    <span className="text-rose-500/80"> · {h.localName}</span>
                  ) : null}
                  {h.religion ? (
                    <span className="ml-1 text-[10px] uppercase tracking-wider text-rose-400">
                      {h.religion}
                    </span>
                  ) : null}
                </div>
              ))}
            </Section>
          )}

          <Section title="Schedules">
            {daySchedules.length === 0 ? (
              <Empty>No schedules</Empty>
            ) : (
              daySchedules.map((s) => {
                const canEdit =
                  canManage || (s.userId === userId && canCreateOwn);
                return (
                  <div
                    key={s.id}
                    className="group flex items-start gap-2 rounded-lg border border-slate-100 p-2 hover:border-slate-200"
                  >
                    <span
                      className={clsx(
                        "mt-1 h-2 w-2 rounded-full shrink-0",
                        TYPE_COLORS[s.type]
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => canEdit && openEdit(s)}
                        className="text-sm font-medium text-slate-900 text-left hover:text-brand-600"
                      >
                        {s.title}
                      </button>
                      <p className="text-xs text-slate-500">
                        {TYPE_LABELS[s.type]}
                        {scope === "team" && s.userName ? ` · ${s.userName}` : ""}
                        {s.allDay
                          ? " · All day"
                          : ` · ${formatInAppTz(s.startsAt, "HH:mm", timeZone)}–${formatInAppTz(s.endsAt, "HH:mm", timeZone)}`}
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition"
                        aria-label="Delete schedule"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </Section>

          <Section title="Task due dates">
            {dayTasks.length === 0 ? (
              <Empty>No due tasks</Empty>
            ) : (
              dayTasks.map((t) => (
                <div key={t.id} className="text-sm text-slate-700">
                  <span className="font-medium">{t.title}</span>
                  {t.assigneeName ? (
                    <span className="text-slate-400"> · {t.assigneeName}</span>
                  ) : null}
                </div>
              ))
            )}
          </Section>

          <Section title="Activity">
            {dayActivity.length === 0 ? (
              <Empty>No activity</Empty>
            ) : (
              dayActivity.slice(0, 12).map((a) => (
                <div key={a.id} className="text-sm text-slate-600">
                  <span className="text-slate-400 text-xs">
                    {formatInAppTz(a.createdAt, "HH:mm", timeZone)}
                  </span>{" "}
                  <span className="font-medium text-slate-800">
                    {a.userName || "Someone"}
                  </span>{" "}
                  {a.details || a.action}
                </div>
              ))
            )}
          </Section>
        </div>
      </div>

      {showModal && (
        <ScheduleModal
          users={usersData || []}
          canManage={canManage}
          currentUserId={userId}
          defaultDay={selectedDay}
          editing={editing}
          timeZone={timeZone}
          saving={createSchedule.isPending || updateSchedule.isPending}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSubmit={async (payload) => {
            if (editing) {
              await updateSchedule.mutateAsync({ id: editing.id, ...payload });
            } else {
              await createSchedule.mutateAsync(payload);
            }
            setShowModal(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-2">
        {title}
      </h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400">{children}</p>;
}

function ScheduleModal({
  users,
  canManage,
  currentUserId,
  defaultDay,
  editing,
  timeZone,
  saving,
  onClose,
  onSubmit,
}: {
  users: UserOption[];
  canManage: boolean;
  currentUserId: string;
  defaultDay: Date;
  editing: ScheduleEvent | null;
  timeZone: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    description: string | null;
    type: ScheduleEvent["type"];
    startsAt: string;
    endsAt: string;
    allDay: boolean;
    visibility: ScheduleEvent["visibility"];
    userId?: string;
  }) => Promise<void>;
}) {
  const dayStr = toAppDateKey(defaultDay, timeZone);
  const [title, setTitle] = useState(editing?.title || "");
  const [description, setDescription] = useState(editing?.description || "");
  const [type, setType] = useState<ScheduleEvent["type"]>(editing?.type || "work");
  const [visibility, setVisibility] = useState<ScheduleEvent["visibility"]>(
    editing?.visibility || "team"
  );
  const [allDay, setAllDay] = useState(editing?.allDay ?? true);
  const [assigneeId, setAssigneeId] = useState(
    editing?.userId || currentUserId
  );
  const [startDate, setStartDate] = useState(
    editing ? toAppDateKey(editing.startsAt, timeZone) : dayStr
  );
  const [endDate, setEndDate] = useState(
    editing ? toAppDateKey(editing.endsAt, timeZone) : dayStr
  );
  const [startTime, setStartTime] = useState(
    editing && !editing.allDay
      ? formatInAppTz(editing.startsAt, "HH:mm", timeZone)
      : "09:00"
  );
  const [endTime, setEndTime] = useState(
    editing && !editing.allDay
      ? formatInAppTz(editing.endsAt, "HH:mm", timeZone)
      : "17:00"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const startsAt = allDay
      ? appAllDayStartIso(startDate, timeZone)
      : appWallToUtcIso(startDate, startTime, timeZone);
    const endsAt = allDay
      ? appAllDayEndIso(endDate, timeZone)
      : appWallToUtcIso(endDate, endTime, timeZone);

    await onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      type,
      startsAt,
      endsAt,
      allDay,
      visibility,
      ...(canManage ? { userId: assigneeId } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <CalendarIcon size={18} />
            {editing ? "Edit schedule" : "New schedule"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-500">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            placeholder="Team standup / Leave / Training"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-500">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-500">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ScheduleEvent["type"])}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {(Object.keys(TYPE_LABELS) as ScheduleEvent["type"][]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-500">Visibility</span>
            <select
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as ScheduleEvent["visibility"])
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="team">Team</option>
              <option value="private">Private</option>
            </select>
          </label>
        </div>

        {canManage && (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-500">Assign to</span>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {users.length === 0 ? (
                <option value={currentUserId}>Me</option>
              ) : (
                users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))
              )}
            </select>
          </label>
        )}

        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="rounded border-slate-300 text-brand-500"
          />
          All day
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-500">Start date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-500">End date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>

        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Start time</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">End time</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {editing ? "Save" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
