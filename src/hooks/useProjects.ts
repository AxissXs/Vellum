import {
  useMutation,
  useQueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  status: string;
  health: string;
  visibility: string;
  goal: string | null;
  keyResults: string | null;
  risks: string | null;
  startDate: string | null;
  targetDate: string | null;
  ownerId: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

type ProjectCreateInput = {
  name: string;
  description?: string | null;
  color?: string;
  icon?: string;
  status?: string;
  health?: string;
  visibility?: string;
  goal?: string | null;
  keyResults?: string | null;
  risks?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  ownerId: string;
};

type ProjectUpdateInput = Partial<ProjectCreateInput> & { id: string };

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

function getProjectQueryKey() {
  return ["projects"] as QueryKey;
}

function getMilestoneQueryKey(projectId: string) {
  return ["milestones", projectId] as QueryKey;
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProjectCreateInput) => {
      const toastId = toast.loading("Creating project...");
      try {
        const res = await api.post<{ project: Project }>("/api/projects", input);
        toast.success("Project created", { id: toastId });
        return res.project;
      } catch (err) {
        toast.error("Failed to create project", { id: toastId });
        throw err;
      }
    },
    onMutate: async (newProject) => {
      await queryClient.cancelQueries({ queryKey: getProjectQueryKey() });

      const previousProjects = queryClient.getQueryData<Project[]>(getProjectQueryKey());

      const optimisticProject: Project = {
        id: `temp-${Date.now()}`,
        name: newProject.name,
        description: newProject.description || null,
        color: newProject.color || "#6366f1",
        icon: newProject.icon || "folder",
        status: newProject.status || "active",
        health: newProject.health || "on_track",
        visibility: newProject.visibility || "team",
        goal: newProject.goal || null,
        keyResults: newProject.keyResults || null,
        risks: newProject.risks || null,
        startDate: newProject.startDate || null,
        targetDate: newProject.targetDate || null,
        ownerId: newProject.ownerId,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Project[]>(getProjectQueryKey(), (old) =>
        old ? [...old, optimisticProject] : [optimisticProject]
      );

      return { previousProjects };
    },
    onError: (err, newProject, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(getProjectQueryKey(), context.previousProjects);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Project[]>(getProjectQueryKey(), (old) =>
        old?.map((p) => (p.id.startsWith("temp-") ? data : p)) || []
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getProjectQueryKey() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProjectUpdateInput) => {
      const toastId = toast.loading("Saving changes...");
      try {
        const { id, ...data } = input;
        const res = await api.patch<{ project: Project }>(`/api/projects/${id}`, data);
        toast.success("Project updated", { id: toastId });
        return res.project;
      } catch (err) {
        toast.error("Failed to update project", { id: toastId });
        throw err;
      }
    },
    onMutate: async (updatedProject) => {
      await queryClient.cancelQueries({ queryKey: getProjectQueryKey() });

      const previousProjects = queryClient.getQueryData<Project[]>(getProjectQueryKey());

      queryClient.setQueryData<Project[]>(getProjectQueryKey(), (old) =>
        old?.map((p) => (p.id === updatedProject.id ? { ...p, ...updatedProject } : p)) || []
      );

      return { previousProjects };
    },
    onError: (err, updatedProject, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(getProjectQueryKey(), context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getProjectQueryKey() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const toastId = toast.loading("Deleting project...");
      try {
        await api.delete(`/api/projects/${projectId}`);
        toast.success("Project deleted", { id: toastId });
        return projectId;
      } catch (err) {
        toast.error("Failed to delete project", { id: toastId });
        throw err;
      }
    },
    onMutate: async (projectId) => {
      const previousProjects = queryClient.getQueryData<Project[]>(getProjectQueryKey());

      queryClient.setQueryData<Project[]>(getProjectQueryKey(), (old) =>
        old?.filter((p) => p.id !== projectId) || []
      );

      return { previousProjects };
    },
    onError: (err, projectId, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(getProjectQueryKey(), context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getProjectQueryKey() });
    },
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MilestoneCreateInput) => {
      const toastId = toast.loading("Creating milestone...");
      try {
        const res = await api.post<{ milestone: Milestone }>(`/api/projects/${input.projectId}/milestones`, input);
        toast.success("Milestone created", { id: toastId });
        return res.milestone;
      } catch (err) {
        toast.error("Failed to create milestone", { id: toastId });
        throw err;
      }
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
      const toastId = toast.loading("Saving changes...");
      try {
        const { id, projectId, ...data } = input;
        const res = await api.patch<{ milestone: Milestone }>(`/api/milestones/${id}`, data);
        toast.success("Milestone updated", { id: toastId });
        return res.milestone;
      } catch (err) {
        toast.error("Failed to update milestone", { id: toastId });
        throw err;
      }
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
      const toastId = toast.loading("Deleting milestone...");
      try {
        await api.delete(`/api/milestones/${milestoneId}`);
        toast.success("Milestone deleted", { id: toastId });
        return milestoneId;
      } catch (err) {
        toast.error("Failed to delete milestone", { id: toastId });
        throw err;
      }
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
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
    },
  });
}