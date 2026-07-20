import {
  useMutation,
  useQuery,
  useQueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export type Sprint = {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type SprintCreateInput = {
  projectId: string;
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
};

type SprintUpdateInput = Partial<SprintCreateInput> & { id: string; projectId: string };

function getSprintQueryKey(projectId: string) {
  return ["sprints", projectId] as QueryKey;
}

export function useSprints(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? getSprintQueryKey(projectId) : ["sprints", "none"],
    queryFn: async () => {
      const res = await api.get<{ sprints: Sprint[] }>(
        `/api/sprints?projectId=${projectId}`
      );
      return res.sprints;
    },
    enabled: !!projectId,
  });
}

export function useCreateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SprintCreateInput) => {
      const res = await api.post<{ sprint: Sprint }>(`/api/sprints`, input);
      return res.sprint;
    },
    onMutate: async (newSprint) => {
      const queryKey = getSprintQueryKey(newSprint.projectId);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Sprint[]>(queryKey);

      const optimistic: Sprint = {
        id: `temp-${Date.now()}`,
        projectId: newSprint.projectId,
        name: newSprint.name,
        goal: newSprint.goal || null,
        startDate: newSprint.startDate || null,
        endDate: newSprint.endDate || null,
        status: newSprint.status || "planned",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Sprint[]>(queryKey, (old) =>
        old ? [...old, optimistic] : [optimistic]
      );

      return { previous, projectId: newSprint.projectId };
    },
    onError: (err, newSprint, context) => {
      if (context?.previous) {
        queryClient.setQueryData(getSprintQueryKey(context.projectId), context.previous);
      }
      toast.error("Failed to create sprint");
    },
    onSuccess: (data, newSprint) => {
      queryClient.setQueryData<Sprint[]>(getSprintQueryKey(newSprint.projectId), (old) =>
        old?.map((s) => (s.id.startsWith("temp-") ? data : s)) || []
      );
    },
    onSettled: (data, error, newSprint) => {
      queryClient.invalidateQueries({ queryKey: getSprintQueryKey(newSprint.projectId) });
    },
  });
}

export function useUpdateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SprintUpdateInput) => {
      const { id, ...data } = input;
      const res = await api.patch<{ sprint: Sprint }>(`/api/sprints/${id}`, data);
      return res.sprint;
    },
    onMutate: async (updated) => {
      const queryKey = getSprintQueryKey(updated.projectId);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Sprint[]>(queryKey);

      queryClient.setQueryData<Sprint[]>(queryKey, (old) =>
        old?.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)) || []
      );

      return { previous, projectId: updated.projectId };
    },
    onError: (err, updated, context) => {
      if (context?.previous) {
        queryClient.setQueryData(getSprintQueryKey(context.projectId), context.previous);
      }
      toast.error("Failed to update sprint");
    },
    onSettled: (data, error, updated) => {
      queryClient.invalidateQueries({ queryKey: getSprintQueryKey(updated.projectId) });
    },
  });
}

export function useDeleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; projectId: string }) => {
      await api.delete(`/api/sprints/${input.id}`);
      return input;
    },
    onMutate: async (input) => {
      const queryKey = getSprintQueryKey(input.projectId);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Sprint[]>(queryKey);

      queryClient.setQueryData<Sprint[]>(queryKey, (old) =>
        old?.filter((s) => s.id !== input.id)
      );

      return { previous, projectId: input.projectId };
    },
    onError: (err, input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(getSprintQueryKey(context.projectId), context.previous);
      }
      toast.error("Failed to delete sprint");
    },
    onSettled: (data, error, input) => {
      queryClient.invalidateQueries({ queryKey: getSprintQueryKey(input.projectId) });
    },
  });
}
