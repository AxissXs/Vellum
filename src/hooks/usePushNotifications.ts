"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\\-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getPushSupport() {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window;
}

export function usePushNotifications() {
  const isSupported = getPushSupport();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isSupported) return;
    let cancelled = false;

    async function init() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) setIsSubscribed(!!subscription);
      } catch {
        if (!cancelled) setIsSubscribed(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!vapidPublicKey) {
      toast.error("Push notifications are not configured");
      return;
    }

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const subData = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subData),
      });

      if (!res.ok) throw new Error("Failed to save subscription");

      setIsSubscribed(true);
      toast.success("Push notifications enabled");
    } catch (err: any) {
      toast.error(err.message || "Failed to enable push notifications");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const subData = subscription.toJSON();
        await subscription.unsubscribe();

        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subData.endpoint }),
        });
      }

      setIsSubscribed(false);
      toast.success("Push notifications disabled");
    } catch (err: any) {
      toast.error(err.message || "Failed to disable push notifications");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
