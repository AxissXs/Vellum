import {
  useMutation,
  useQueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Milestone = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
};

type MilestoneCreateInput = {
  projectId: string;
  title: string;
  description?: string | null;
  status?: string;
  dueDate?: string | null;
  ownerId?: string | null;
};

type MilestoneUpdateInput = Partial<MilestoneCreateInput> & { id: string; projectId: string };

function getMilestoneQueryKey(projectId: string) {
  return ["milestones", projectId] as QueryKey;
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MilestoneCreateInput) => {
      const res = await api.post<{ milestone: Milestone }>(`/api/projects/${input.projectId}/milestones`, input);
      return res.milestone;
    },
    onMutate: async (newMilestone) => {
      const queryKey = getMilestoneQueryKey(newMilestone.projectId);
      await queryClient.cancelQueries({ queryKey });

      const previousMilestones = queryClient.getQueryData<Milestone[]>(queryKey);

      const optimisticMilestone: Milestone = {
        id: `temp-${Date.now()}`,
        projectId: newMilestone.projectId,
        title: newMilestone.title,
        description: newMilestone.description || null,
        status: newMilestone.status || "planned",
        dueDate: newMilestone.dueDate || null,
        ownerId: newMilestone.ownerId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Milestone[]>(queryKey, (old) =>
        old ? [...old, optimisticMilestone] : [optimisticMilestone]
      );

      return { previousMilestones, projectId: newMilestone.projectId };
    },
    onError: (err, newMilestone, context) => {
      if (context?.previousMilestones) {
        queryClient.setQueryData(getMilestoneQueryKey(context.projectId), context.previousMilestones);
      }
      toast.error("Failed to create milestone");
    },
    onSuccess: (data, newMilestone) => {
      queryClient.setQueryData<Milestone[]>(getMilestoneQueryKey(newMilestone.projectId), (old) =>
        old?.map((m) => (m.id.startsWith("temp-") ? data : m)) || []
      );
    },
    onSettled: (data, error, newMilestone) => {
      queryClient.invalidateQueries({ queryKey: getMilestoneQueryKey(newMilestone.projectId) });
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MilestoneUpdateInput) => {
      const { id, ...data } = input;
      const res = await api.patch<{ milestone: Milestone }>(`/api/milestones/${id}`, data);
      return res.milestone;
    },
    onMutate: async (updatedMilestone) => {
      const queryKey = getMilestoneQueryKey(updatedMilestone.projectId);
      await queryClient.cancelQueries({ queryKey });

      const previousMilestones = queryClient.getQueryData<Milestone[]>(queryKey);

      queryClient.setQueryData<Milestone[]>(queryKey, (old) =>
        old?.map((m) => (m.id === updatedMilestone.id ? { ...m, ...updatedMilestone } : m)) || []
      );

      return { previousMilestones, projectId: updatedMilestone.projectId };
    },
    onError: (err, updatedMilestone, context) => {
      if (context?.previousMilestones) {
        queryClient.setQueryData(getMilestoneQueryKey(context.projectId), context.previousMilestones);
      }
      toast.error("Failed to update milestone");
    },
    onSettled: (data, error, updatedMilestone) => {
      queryClient.invalidateQueries({ queryKey: getMilestoneQueryKey(updatedMilestone.projectId) });
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (milestoneId: string) => {
      await api.delete(`/api/milestones/${milestoneId}`);
      return milestoneId;
    },
    onMutate: async (milestoneId) => {
      const allQueries = queryClient.getQueryCache().findAll({ queryKey: ["milestones"] });

      const previousData = new Map<QueryKey, Milestone[]>();

      for (const query of allQueries) {
        const data = queryClient.getQueryData<Milestone[]>(query.queryKey);
        if (data) {
          previousData.set(query.queryKey, data);
          queryClient.setQueryData(query.queryKey, data.filter((m) => m.id !== milestoneId));
        }
      }

      return { previousData };
    },
    onError: (err, milestoneId, context) => {
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error("Failed to delete milestone");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
    },
  });
}