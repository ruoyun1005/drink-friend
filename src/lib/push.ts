"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function enablePush(supabase: SupabaseClient, viewerId: string) {
  if (!isPushSupported()) {
    throw new Error("這個瀏覽器不支援推播通知");
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error("推播設定不完整");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("沒有允許推播通知，無法開啟");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .insert({ user_id: viewerId, subscription: subscription.toJSON() });
  if (error) throw error;

  const { error: userError } = await supabase
    .from("users")
    .update({ push_enabled: true })
    .eq("id", viewerId);
  if (userError) throw userError;
}

export async function disablePush(supabase: SupabaseClient, viewerId: string) {
  if (isPushSupported()) {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
  }

  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", viewerId);
  if (error) throw error;

  const { error: userError } = await supabase
    .from("users")
    .update({ push_enabled: false })
    .eq("id", viewerId);
  if (userError) throw userError;
}
