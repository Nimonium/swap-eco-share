// Web Push Notification Utilities
// src/utils/pushNotifications.ts

/**
 * Converts a base64 URL-encoded VAPID public key into a Uint8Array
 * required by the browser's PushManager.subscribe()
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if the current browser environment supports Push Notifications
 */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

/**
 * Subscribes the current browser to Web Push using the Service Worker and VAPID key
 */
export async function subscribeToPushNotifications(vapidPublicKey: string): Promise<{
  success: boolean;
  subscription?: PushSubscription;
  error?: string;
  permission?: NotificationPermission;
}> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      error: "Web Push Notifications are not supported by this browser.",
    };
  }

  // 1. Request Notification Permission
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    return {
      success: false,
      permission,
      error:
        permission === "denied"
          ? "Notification permission was blocked in browser settings."
          : "Notification permission was dismissed.",
    };
  }

  try {
    // 2. Register Service Worker if not already registered
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;

    // 3. Check for existing subscription or create new one with active VAPID key
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Check if existing browser subscription was created with a different VAPID key
      let keyMismatch = false;
      if (subscription.options && subscription.options.applicationServerKey) {
        const existingKey = new Uint8Array(subscription.options.applicationServerKey);
        if (existingKey.length !== convertedVapidKey.length) {
          keyMismatch = true;
        } else {
          for (let i = 0; i < existingKey.length; i++) {
            if (existingKey[i] !== convertedVapidKey[i]) {
              keyMismatch = true;
              break;
            }
          }
        }
      }

      if (keyMismatch) {
        console.log("[WebPush] VAPID key rotated. Unsubscribing stale browser subscription...");
        await subscription.unsubscribe();
        subscription = null;
      }
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    return {
      success: true,
      subscription,
      permission: "granted",
    };
  } catch (err: any) {
    console.error("[WebPush] subscribeToPushNotifications failed:", err);
    return {
      success: false,
      error: err.message || "Failed to register push subscription with the browser.",
    };
  }
}

/**
 * Unsubscribes the current browser from Web Push
 */
export async function unsubscribeFromPushNotifications(): Promise<{
  success: boolean;
  endpoint?: string;
  error?: string;
}> {
  if (!isPushNotificationSupported()) {
    return { success: true };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!registration) {
      return { success: true };
    }

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      return { success: true, endpoint };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[WebPush] unsubscribeFromPushNotifications failed:", err);
    return {
      success: false,
      error: err.message || "Failed to unsubscribe browser from push service.",
    };
  }
}
