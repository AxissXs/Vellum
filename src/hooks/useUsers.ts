import {
  useMutation,
  useQueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type UserCreateInput = {
  name: string;
  email: string;
  password: string;
  role?: string;
};

type UserUpdateInput = Partial<UserCreateInput> & { id: string };

function getUserQueryKey() {
  return ["users"] as QueryKey;
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UserCreateInput) => {
      const toastId = toast.loading("Creating user...");
      try {
        const res = await api.post<{ user: User }>("/api/users", input);
        toast.success("User created", { id: toastId });
        return res.user;
      } catch (err) {
        toast.error("Failed to create user", { id: toastId });
        throw err;
      }
    },
    onMutate: async (newUser) => {
      await queryClient.cancelQueries({ queryKey: getUserQueryKey() });

      const previousUsers = queryClient.getQueryData<User[]>(getUserQueryKey());

      const optimisticUser: User = {
        id: `temp-${Date.now()}`,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role || "member",
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<User[]>(getUserQueryKey(), (old) =>
        old ? [...old, optimisticUser] : [optimisticUser]
      );

      return { previousUsers };
    },
    onError: (err, newUser, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(getUserQueryKey(), context.previousUsers);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData<User[]>(getUserQueryKey(), (old) =>
        old?.map((u) => (u.id.startsWith("temp-") ? data : u)) || []
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getUserQueryKey() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UserUpdateInput) => {
      const toastId = toast.loading("Saving changes...");
      try {
        const { id, ...data } = input;
        const res = await api.patch<{ user: User }>(`/api/users/${id}`, data);
        toast.success("User updated", { id: toastId });
        return res.user;
      } catch (err) {
        toast.error("Failed to update user", { id: toastId });
        throw err;
      }
    },
    onMutate: async (updatedUser) => {
      await queryClient.cancelQueries({ queryKey: getUserQueryKey() });

      const previousUsers = queryClient.getQueryData<User[]>(getUserQueryKey());

      queryClient.setQueryData<User[]>(getUserQueryKey(), (old) =>
        old?.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u)) || []
      );

      return { previousUsers };
    },
    onError: (err, updatedUser, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(getUserQueryKey(), context.previousUsers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getUserQueryKey() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const toastId = toast.loading("Deleting user...");
      try {
        await api.delete(`/api/users/${userId}`);
        toast.success("User deleted", { id: toastId });
        return userId;
      } catch (err) {
        toast.error("Failed to delete user", { id: toastId });
        throw err;
      }
    },
    onMutate: async (userId) => {
      const previousUsers = queryClient.getQueryData<User[]>(getUserQueryKey());

      queryClient.setQueryData<User[]>(getUserQueryKey(), (old) =>
        old?.filter((u) => u.id !== userId) || []
      );

      return { previousUsers };
    },
    onError: (err, userId, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(getUserQueryKey(), context.previousUsers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getUserQueryKey() });
    },
  });
}