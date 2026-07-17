import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export type UserSession = {
  id: string;
  isCurrent: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
};

function parseUserAgent(ua: string | null): { browser: string; os: string } {
  if (!ua) return { browser: "Unknown", os: "Unknown" };

  let browser = "Unknown";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  let os = "Unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return { browser, os };
}

export { parseUserAgent };

export function useMySessions() {
  return useQuery({
    queryKey: ["sessions", "me"],
    queryFn: async () => {
      const res = await api.get<{ sessions: UserSession[] }>("/api/sessions/me");
      return res.sessions;
    },
    staleTime: 10000,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const toastId = toast.loading("Revoking session...");
      try {
        await api.delete(`/api/sessions/me/${sessionId}`);
        toast.success("Session revoked", { id: toastId });
      } catch (err) {
        toast.error("Failed to revoke session", { id: toastId });
        throw err;
      }
    },
    onMutate: async (sessionId) => {
      await queryClient.cancelQueries({ queryKey: ["sessions", "me"] });
      const previous = queryClient.getQueryData<UserSession[]>(["sessions", "me"]);
      queryClient.setQueryData<UserSession[]>(["sessions", "me"], (old) =>
        old?.filter((s) => s.id !== sessionId) || []
      );
      return { previous };
    },
    onError: (err, sessionId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["sessions", "me"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", "me"] });
    },
  });
}

export function useRevokeAllOtherSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const toastId = toast.loading("Revoking all other sessions...");
      try {
        await api.delete("/api/sessions/me");
        toast.success("All other sessions revoked", { id: toastId });
      } catch (err) {
        toast.error("Failed to revoke sessions", { id: toastId });
        throw err;
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["sessions", "me"] });
      const previous = queryClient.getQueryData<UserSession[]>(["sessions", "me"]);
      queryClient.setQueryData<UserSession[]>(["sessions", "me"], (old) =>
        old?.filter((s) => s.isCurrent) || []
      );
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["sessions", "me"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions", "me"] });
    },
  });
}
