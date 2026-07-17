import {
  useMutation,
  useQueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string;
  assigneeId: string | null;
  creatorId: string;
  dueDate: string | null;
  position: string;
  createdAt: string;
  updatedAt: string;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  projectName?: string | null;
  projectColor?: string | null;
};

type TaskCreateInput = {
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  projectId: string;
  assigneeId?: string | null;
  dueDate?: string | null;
};

type TaskUpdateInput = Partial<TaskCreateInput> & { id: string; position?: string };

export function getTaskQueryKey(projectId?: string) {
  return ["tasks", projectId ? { projectId } : "all"] as QueryKey;
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TaskCreateInput) => {
      const toastId = toast.loading("Creating task...");
      try {
        const res = await api.post<{ task: Task }>("/api/tasks", input);
        toast.success("Task created", { id: toastId });
        return res.task;
      } catch (err) {
        toast.error("Failed to create task", { id: toastId });
        throw err;
      }
    },
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: getTaskQueryKey(newTask.projectId) });

      const previousTasks = queryClient.getQueryData<Task[]>(getTaskQueryKey(newTask.projectId));

      const optimisticTask: Task = {
        id: `temp-${Date.now()}`,
        title: newTask.title,
        description: newTask.description || null,
        status: newTask.status,
        priority: newTask.priority,
        projectId: newTask.projectId,
        assigneeId: newTask.assigneeId || null,
        creatorId: "",
        dueDate: newTask.dueDate || null,
        position: "0",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assigneeName: null,
        assigneeAvatar: null,
      };

      queryClient.setQueryData<Task[]>(getTaskQueryKey(newTask.projectId), (old) =>
        old ? [...old, optimisticTask] : [optimisticTask]
      );

      return { previousTasks };
    },
    onError: (err, newTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(getTaskQueryKey(newTask.projectId), context.previousTasks);
      }
    },
    onSuccess: (data, newTask, context) => {
      queryClient.setQueryData<Task[]>(getTaskQueryKey(newTask.projectId), (old) =>
        old?.map((t) => (t.id.startsWith("temp-") ? data : t)) || []
      );
    },
    onSettled: (data, error, newTask) => {
      queryClient.invalidateQueries({ queryKey: getTaskQueryKey(newTask.projectId) });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TaskUpdateInput) => {
      const toastId = toast.loading("Saving changes...");
      try {
        const { id, ...data } = input;
        const res = await api.patch<{ task: Task }>(`/api/tasks/${id}`, data);
        toast.success("Task updated", { id: toastId });
        return res.task;
      } catch (err) {
        toast.error("Failed to update task", { id: toastId });
        throw err;
      }
    },
    onMutate: async (updatedTask) => {
      const projectId = updatedTask.projectId;
      await queryClient.cancelQueries({ queryKey: getTaskQueryKey(projectId) });

      const previousTasks = queryClient.getQueryData<Task[]>(getTaskQueryKey(projectId));

      queryClient.setQueryData<Task[]>(getTaskQueryKey(projectId), (old) =>
        old?.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t)) || []
      );

      return { previousTasks, projectId };
    },
    onError: (err, updatedTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(getTaskQueryKey(context.projectId), context.previousTasks);
      }
    },
    onSettled: (data, error, updatedTask) => {
      queryClient.invalidateQueries({ queryKey: getTaskQueryKey(updatedTask.projectId) });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const toastId = toast.loading("Deleting task...");
      try {
        await api.delete(`/api/tasks/${taskId}`);
        toast.success("Task deleted", { id: toastId });
        return taskId;
      } catch (err) {
        toast.error("Failed to delete task", { id: toastId });
        throw err;
      }
    },
    onMutate: async (taskId) => {
      const allQueries = queryClient.getQueryCache().findAll({ queryKey: ["tasks"] });

      const previousData = new Map<QueryKey, Task[]>();

      for (const query of allQueries) {
        const data = queryClient.getQueryData<Task[]>(query.queryKey);
        if (data) {
          previousData.set(query.queryKey, data);
          queryClient.setQueryData(query.queryKey, data.filter((t) => t.id !== taskId));
        }
      }

      return { previousData };
    },
    onError: (err, taskId, context) => {
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; position: string; status?: string }[]) => {
      const toastId = toast.loading("Reordering...");
      try {
        await Promise.all(
          updates.map((u) =>
            api.patch(`/api/tasks/${u.id}`, {
              position: u.position,
              status: u.status,
            })
          )
        );
        toast.success("Tasks reordered", { id: toastId });
        return updates;
      } catch (err) {
        toast.error("Failed to reorder tasks", { id: toastId });
        throw err;
      }
    },
    onMutate: async (updates) => {
      const projectIds = new Set<string>();
      const allQueries = queryClient.getQueryCache().findAll({ queryKey: ["tasks"] });

      const previousData = new Map<QueryKey, Task[]>();

      for (const query of allQueries) {
        const data = queryClient.getQueryData<Task[]>(query.queryKey);
        if (data) {
          previousData.set(query.queryKey, data);

          const newData = data.map((task) => {
            const update = updates.find((u) => u.id === task.id);
            if (update) {
              projectIds.add(task.projectId);
              return { ...task, position: update.position, status: update.status || task.status };
            }
            return task;
          });

          queryClient.setQueryData(query.queryKey, newData);
        }
      }

      return { previousData, projectIds };
    },
    onError: (err, updates, context) => {
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: (data, error, updates, context) => {
      for (const projectId of context?.projectIds || []) {
        queryClient.invalidateQueries({ queryKey: getTaskQueryKey(projectId) });
      }
    },
  });
}