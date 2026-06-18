const notificationServiceWorkerPath = "/hush-service-worker.js";

export async function registerHushServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register(notificationServiceWorkerPath);
  } catch {
    return null;
  }
}

export async function showHushMessageNotification({
  body,
  chatUserId,
  tag,
  title,
}: {
  body: string;
  chatUserId: string | null;
  tag: string;
  title: string;
}) {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return false;
  }

  const registration = await registerHushServiceWorker();

  if (!registration?.showNotification) {
    return false;
  }

  try {
    await registration.showNotification(title, {
      badge: "/hush-favicon.svg",
      body,
      data: {
        chatUserId,
        url: chatUserId
          ? `/?hushChat=${encodeURIComponent(chatUserId)}`
          : "/",
      },
      icon: "/hush-logo.png",
      tag,
    });
  } catch {
    return false;
  }

  return true;
}
