import {
  useMutation,
  useQueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Comment = {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
  authorAvatar: string | null;
};

type CommentCreateInput = {
  content: string;
  taskId: string;
  parentId?: string | null;
};

type CommentUpdateInput = { id: string; taskId: string; content?: string };

export function getCommentQueryKey(taskId: string) {
  return ["comments", taskId] as QueryKey;
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CommentCreateInput) => {
      const res = await api.post<{ comment: Comment }>("/api/comments", input);
      return res.comment;
    },
    onMutate: async (newComment) => {
      const queryKey = getCommentQueryKey(newComment.taskId);
      await queryClient.cancelQueries({ queryKey });

      const previousComments = queryClient.getQueryData<Comment[]>(queryKey);

      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        content: newComment.content,
        taskId: newComment.taskId,
        authorId: "",
        parentId: newComment.parentId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorName: null,
        authorAvatar: null,
      };

      queryClient.setQueryData<Comment[]>(queryKey, (old) =>
        old ? [...old, optimisticComment] : [optimisticComment]
      );

      return { previousComments, taskId: newComment.taskId };
    },
    onError: (_err, _newComment, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(getCommentQueryKey(context.taskId), context.previousComments);
      }
      toast.error("Failed to add comment");
    },
    onSuccess: (data, newComment) => {
      queryClient.setQueryData<Comment[]>(getCommentQueryKey(newComment.taskId), (old) =>
        old?.map((c) => (c.id.startsWith("temp-") ? data : c)) || []
      );
    },
    onSettled: (_data, _error, newComment) => {
      queryClient.invalidateQueries({ queryKey: getCommentQueryKey(newComment.taskId) });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CommentUpdateInput) => {
      const { id, ...data } = input;
      const res = await api.patch<{ comment: Comment }>(`/api/comments/${id}`, data);
      return res.comment;
    },
    onMutate: async (updatedComment) => {
      const queryKey = getCommentQueryKey(updatedComment.taskId);
      await queryClient.cancelQueries({ queryKey });

      const previousComments = queryClient.getQueryData<Comment[]>(queryKey);

      queryClient.setQueryData<Comment[]>(queryKey, (old) =>
        old?.map((c) => (c.id === updatedComment.id ? { ...c, ...updatedComment } : c)) || []
      );

      return { previousComments, taskId: updatedComment.taskId };
    },
    onError: (_err, _updatedComment, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(getCommentQueryKey(context.taskId), context.previousComments);
      }
      toast.error("Failed to update comment");
    },
    onSettled: (_data, _error, updatedComment) => {
      queryClient.invalidateQueries({ queryKey: getCommentQueryKey(updatedComment.taskId) });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/api/comments/${commentId}`);
      return commentId;
    },
    onMutate: async (commentId) => {
      const allQueries = queryClient.getQueryCache().findAll({ queryKey: ["comments"] });

      const previousData = new Map<QueryKey, Comment[]>();

      for (const query of allQueries) {
        const data = queryClient.getQueryData<Comment[]>(query.queryKey);
        if (data) {
          previousData.set(query.queryKey, data);
          queryClient.setQueryData(
            query.queryKey,
            data.filter((c) => c.id !== commentId && c.parentId !== commentId)
          );
        }
      }

      return { previousData };
    },
    onError: (_err, _commentId, context) => {
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error("Failed to delete comment");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
  });
}
