self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};
  const chatUserId = typeof data.chatUserId === "string" ? data.chatUserId : null;
  const url = typeof data.url === "string" ? data.url : "/";

  event.notification.close();

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });

      for (const client of windowClients) {
        if ("focus" in client) {
          await client.focus();
          client.postMessage({
            type: "hush-open-chat",
            userId: chatUserId,
          });
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })(),
  );
});
