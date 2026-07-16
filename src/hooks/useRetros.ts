import {
  useMutation,
  useQuery,
  useQueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export type RetroItem = {
  id: string;
  sprintId: string;
  authorId: string | null;
  category: "went_well" | "went_wrong" | "action_item";
  content: string;
  createdAt: string;
};

type RetroInput = {
  sprintId: string;
  category: RetroItem["category"];
  content: string;
};

function getRetroQueryKey(sprintId: string) {
  return ["retros", sprintId] as QueryKey;
}

export function useRetros(sprintId: string) {
  return useQuery({
    queryKey: getRetroQueryKey(sprintId),
    queryFn: async () => {
      const res = await api.get<{ retroItems: RetroItem[] }>(
        `/api/retros?sprintId=${sprintId}`
      );
      return res.retroItems;
    },
    enabled: !!sprintId,
  });
}

export function useCreateRetroItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RetroInput) => {
      const res = await api.post<{ retroItem: RetroItem }>(`/api/retros`, input);
      return res.retroItem;
    },
    onError: () => {
      toast.error("Failed to add retro item");
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: getRetroQueryKey(data.sprintId) });
      }
    },
  });
}

export function useUpdateRetroItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      sprintId: string;
      content?: string;
      category?: RetroItem["category"];
    }) => {
      const { id, sprintId: _sprintId, ...data } = input;
      const res = await api.patch<{ retroItem: RetroItem }>(`/api/retros/${id}`, data);
      return res.retroItem;
    },
    onMutate: async (input) => {
      const queryKey = getRetroQueryKey(input.sprintId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<RetroItem[]>(queryKey);
      queryClient.setQueryData<RetroItem[]>(queryKey, (old) =>
        old?.map((r) =>
          r.id === input.id
            ? {
                ...r,
                ...(input.content !== undefined ? { content: input.content } : {}),
                ...(input.category !== undefined ? { category: input.category } : {}),
              }
            : r
        )
      );
      return { previous };
    },
    onError: (err, input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(getRetroQueryKey(input.sprintId), context.previous);
      }
      toast.error("Failed to update retro item");
    },
    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({ queryKey: getRetroQueryKey(input.sprintId) });
    },
  });
}

export function useDeleteRetroItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; sprintId: string }) => {
      await api.delete(`/api/retros/${input.id}`);
      return input;
    },
    onMutate: async (input) => {
      const queryKey = getRetroQueryKey(input.sprintId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<RetroItem[]>(queryKey);
      queryClient.setQueryData<RetroItem[]>(queryKey, (old) =>
        old?.filter((r) => r.id !== input.id)
      );
      return { previous };
    },
    onError: (err, input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(getRetroQueryKey(input.sprintId), context.previous);
      }
      toast.error("Failed to delete retro item");
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: getRetroQueryKey(data.sprintId) });
      }
    },
  });
}
