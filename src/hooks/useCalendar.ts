import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { MalaysiaHoliday } from "@/lib/holidays/malaysia";

export type ScheduleEvent = {
  id: string;
  userId: string;
  createdById: string | null;
  title: string;
  description: string | null;
  type: "work" | "meeting" | "leave" | "training" | "other";
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  visibility: "team" | "private";
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  userName?: string | null;
  userAvatar?: string | null;
};

export type CalendarActivity = {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  userName: string | null;
  userAvatar: string | null;
};

export type CalendarTask = {
  id: string;
  title: string;
  dueDate: string;
  assigneeId: string | null;
  assigneeName: string | null;
  projectId: string;
  status: string;
};

export type CalendarConflict = {
  scheduleId: string;
  scheduleTitle: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  dueDate: string;
};

export type CalendarData = {
  schedules: ScheduleEvent[];
  activity: CalendarActivity[];
  tasks: CalendarTask[];
  holidays: MalaysiaHoliday[];
  conflicts: CalendarConflict[];
  scope: "me" | "team";
};

export type CalendarLayers = {
  schedules: boolean;
  activity: boolean;
  tasks: boolean;
  holidays: boolean;
};

export type CalendarQueryParams = {
  from: string;
  to: string;
  scope: "me" | "team";
  userId?: string;
  layers: CalendarLayers;
};

function layersToParam(layers: CalendarLayers): string {
  return (Object.keys(layers) as Array<keyof CalendarLayers>)
    .filter((k) => layers[k])
    .join(",");
}

export function getCalendarQueryKey(params: CalendarQueryParams): QueryKey {
  return [
    "calendar",
    params.from,
    params.to,
    params.scope,
    params.userId ?? null,
    layersToParam(params.layers),
  ];
}

export function useCalendar(params: CalendarQueryParams, enabled = true) {
  return useQuery({
    queryKey: getCalendarQueryKey(params),
    queryFn: async () => {
      const search = new URLSearchParams({
        from: params.from,
        to: params.to,
        scope: params.scope,
        layers: layersToParam(params.layers) || "schedules",
      });
      if (params.userId) search.set("userId", params.userId);
      return api.get<CalendarData>(`/api/calendar?${search}`);
    },
    enabled,
  });
}

type ScheduleCreateInput = {
  title: string;
  description?: string | null;
  type?: ScheduleEvent["type"];
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  visibility?: ScheduleEvent["visibility"];
  projectId?: string | null;
  userId?: string;
};

type ScheduleUpdateInput = Partial<ScheduleCreateInput> & { id: string };

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ScheduleCreateInput) => {
      return api.post<{ schedule: ScheduleEvent; conflicts: CalendarConflict[] }>(
        "/api/schedules",
        input
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Schedule created");
      if (data.conflicts.length > 0) {
        toast.warning(
          `Leave overlaps ${data.conflicts.length} task due date${data.conflicts.length > 1 ? "s" : ""}`
        );
      }
    },
    onError: () => {
      toast.error("Failed to create schedule");
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ScheduleUpdateInput) => {
      const { id, ...body } = input;
      return api.patch<{ schedule: ScheduleEvent; conflicts: CalendarConflict[] }>(
        `/api/schedules/${id}`,
        body
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Schedule updated");
      if (data.conflicts.length > 0) {
        toast.warning(
          `Leave overlaps ${data.conflicts.length} task due date${data.conflicts.length > 1 ? "s" : ""}`
        );
      }
    },
    onError: () => {
      toast.error("Failed to update schedule");
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete<{ success: boolean }>(`/api/schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Schedule deleted");
    },
    onError: () => {
      toast.error("Failed to delete schedule");
    },
  });
}
