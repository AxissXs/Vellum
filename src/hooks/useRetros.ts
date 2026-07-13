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
