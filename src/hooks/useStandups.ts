import {
  useMutation,
  useQuery,
  useQueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export type Standup = {
  id: string;
  userId: string;
  sprintId: string | null;
  date: string;
  yesterday: string | null;
  today: string | null;
  blockers: string | null;
  createdAt: string;
};

type StandupInput = {
  userId?: string;
  sprintId?: string | null;
  yesterday?: string | null;
  today?: string | null;
  blockers?: string | null;
  date?: string;
};

function getStandupQueryKey(params: { userId?: string; sprintId?: string; date?: string }) {
  return ["standups", params] as QueryKey;
}

export function useStandups(params: { userId?: string; sprintId?: string; date?: string } = {}) {
  const queryKey = getStandupQueryKey(params);
  return useQuery({
    queryKey,
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params.userId) search.set("userId", params.userId);
      if (params.sprintId) search.set("sprintId", params.sprintId);
      if (params.date) search.set("date", params.date);
      const res = await api.get<{ standups: Standup[] }>(`/api/standups?${search.toString()}`);
      return res.standups;
    },
  });
}

export function useCreateStandup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: StandupInput) => {
      const res = await api.post<{ standup: Standup }>(`/api/standups`, input);
      return res.standup;
    },
    onError: () => {
      toast.error("Failed to save standup");
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["standups"] });
      }
    },
  });
}
