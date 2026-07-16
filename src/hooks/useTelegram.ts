"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function useTelegramStatus() {
  return useQuery({
    queryKey: ["telegram-status"],
    queryFn: async () => {
      const res = await api.get<{ linked: boolean; telegramUsername: string | null }>(
        "/api/telegram/status"
      );
      return res;
    },
  });
}

export function useGeneratePairingCode() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.get<{ code: string }>("/api/telegram/pairing-code");
      return res;
    },
    onError: () => {
      toast.error("Failed to generate pairing code");
    },
  });
}

export function useUnlinkTelegram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete("/api/telegram/unlink");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-status"] });
      toast.success("Telegram unlinked");
    },
    onError: () => {
      toast.error("Failed to unlink Telegram");
    },
  });
}
