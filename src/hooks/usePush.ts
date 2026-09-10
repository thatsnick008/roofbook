"use client";

import * as React from "react";

export type PushStatus = "unsupported" | "unconfigured" | "denied" | "subscribed" | "unsubscribed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

/** Manages the browser push subscription for reminder notifications on this device. */
export function usePush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [status, setStatus] = React.useState<PushStatus>("unconfigured");
  const [loading, setLoading] = React.useState(false);

  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  const refresh = React.useCallback(async () => {
    if (!supported) return setStatus("unsupported");
    if (!publicKey) return setStatus("unconfigured");
    if (Notification.permission === "denied") return setStatus("denied");

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setStatus(subscription ? "subscribed" : "unsubscribed");
  }, [publicKey, supported]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = React.useCallback(async () => {
    if (!supported || !publicKey) return false;
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON())
      });
      if (!response.ok) {
        await subscription.unsubscribe();
        setStatus("unsubscribed");
        return false;
      }

      setStatus("subscribed");
      return true;
    } finally {
      setLoading(false);
    }
  }, [publicKey, supported]);

  const unsubscribe = React.useCallback(async () => {
    if (!supported) return;
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    } finally {
      setLoading(false);
    }
  }, [supported]);

  return { status, loading, configured: Boolean(publicKey), subscribe, unsubscribe };
}
