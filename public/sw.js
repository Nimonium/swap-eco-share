// Service Worker for EcoSwapSquare Web Push Notifications
// public/sw.js

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "🌱 EcoSwapSquare",
    body: "You have a new update on EcoSwapSquare.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: "/swap" },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || payload.body,
        icon: parsed.icon || payload.icon,
        badge: parsed.badge || payload.badge,
        data: {
          url: parsed.data?.url || parsed.url || "/swap",
        },
      };
    } catch {
      const text = event.data.text();
      if (text) {
        payload.body = text;
      }
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    data: payload.data,
    vibrate: [100, 50, 100],
    tag: "ecoswapsquare-notification",
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/swap";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, navigate and focus it
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise, open a new browser window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
