/**
 * Service Worker Registration for Pusher Beams
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("[Service Worker] Service workers are not supported in this browser");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js", {
      scope: "/",
    });

    console.log("[Service Worker] Registration successful:", registration.scope);

    // Check for updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[Service Worker] New service worker available");
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error("[Service Worker] Registration failed:", error);
    return null;
  }
}

/**
 * Unregister service worker (useful for development)
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const result = await registration.unregister();
    console.log("[Service Worker] Unregistered:", result);
    return result;
  } catch (error) {
    console.error("[Service Worker] Unregistration failed:", error);
    return false;
  }
}

