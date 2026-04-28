// Minimal service worker — handles push notifications and notification clicks.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "FamilyHub", body: event.data.text() };
  }

  const { title = "FamilyHub", body = "", url = "/" } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const target = new URL(targetUrl, self.location.origin);
      for (const client of clientList) {
        try {
          const cu = new URL(client.url);
          if (cu.pathname === target.pathname && "focus" in client) {
            return client.focus();
          }
        } catch {
          // ignore unparseable urls
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
