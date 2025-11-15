/**
 * Pusher Beams Client Initialization
 * 
 * This module provides a wrapper around Pusher Beams SDK for push notifications.
 * The SDK is loaded via script tag in index.html.
 */

// Extend Window interface to include PusherBeams
declare global {
  interface Window {
    PusherPushNotifications?: {
      Client: new (config: { instanceId: string }) => PusherBeamsClient;
    };
  }
}

interface PusherBeamsClient {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  getDeviceId: () => Promise<string>;
  setUserId: (userId: string, tokenProvider: {
    fetchToken: () => Promise<{ token: string }>;
  }) => Promise<void>;
  clearAllState: () => Promise<void>;
  addDeviceInterest: (interest: string) => Promise<void>;
  removeDeviceInterest: (interest: string) => Promise<void>;
  getDeviceInterests: () => Promise<string[]>;
  setDeviceInterests: (interests: string[]) => Promise<void>;
}

// Store the client instance
let beamsClientInstance: PusherBeamsClient | null = null;

/**
 * Get or create Pusher Beams client instance
 */
export function getPusherBeamsClient(instanceId?: string): PusherBeamsClient {
  if (typeof window === "undefined") {
    throw new Error("Pusher Beams can only be used in the browser");
  }

  if (!window.PusherPushNotifications) {
    console.error("[Pusher Beams] SDK not loaded. Available on window:", Object.keys(window).filter(k => k.toLowerCase().includes('pusher')));
    throw new Error(
      "Pusher Beams SDK not loaded. Make sure the script tag is included in index.html and check network connection."
    );
  }

  if (!window.PusherPushNotifications.Client) {
    console.error("[Pusher Beams] Client constructor not available. PusherPushNotifications:", window.PusherPushNotifications);
    throw new Error(
      "Pusher Beams Client constructor not available. SDK may not be fully loaded."
    );
  }

  // Return existing instance if available
  if (beamsClientInstance) {
    return beamsClientInstance;
  }

  // Create new instance if instanceId is provided
  if (instanceId) {
    try {
      beamsClientInstance = new window.PusherPushNotifications.Client({
        instanceId,
      });
      console.log("[Pusher Beams] Client instance created with instanceId:", instanceId);
      return beamsClientInstance;
    } catch (error) {
      console.error("[Pusher Beams] Failed to create client instance:", error);
      throw error;
    }
  }

  throw new Error(
    "Pusher Beams client not initialized. Call initializePusherBeams() first."
  );
}

/**
 * Initialize Pusher Beams with instance ID
 * 
 * @param instanceId - Your Pusher Beams instance ID
 * @param interests - Optional array of interests to subscribe to after initialization
 * @returns Promise that resolves when initialization is complete
 */
export async function initializePusherBeams(
  instanceId: string,
  interests: string[] = []
): Promise<void> {
  try {
    // Create and start the client
    const client = getPusherBeamsClient(instanceId);
    await client.start();
    console.log("[Pusher Beams] Initialized with instance ID:", instanceId);

    // Subscribe to interests if provided
    if (interests.length > 0) {
      for (const interest of interests) {
        await client.addDeviceInterest(interest);
        console.log("[Pusher Beams] Subscribed to interest:", interest);
      }
    }

    // Log success message (matching Pusher documentation)
    console.log("Successfully registered and subscribed!");
  } catch (error) {
    console.error("[Pusher Beams] Initialization failed:", error);
    throw error;
  }
}

/**
 * Set user ID for targeted notifications
 * 
 * @param userId - User identifier
 * @param tokenProvider - Function that returns an auth token
 */
export async function setPusherBeamsUserId(
  userId: string,
  tokenProvider: () => Promise<{ token: string }>
): Promise<void> {
  try {
    const client = getPusherBeamsClient();
    await client.setUserId(userId, {
      fetchToken: tokenProvider,
    });
    console.log("[Pusher Beams] User ID set:", userId);
  } catch (error) {
    console.error("[Pusher Beams] Failed to set user ID:", error);
    throw error;
  }
}

/**
 * Subscribe to an interest (topic)
 * 
 * @param interest - Interest name to subscribe to
 */
export async function subscribeToInterest(interest: string): Promise<void> {
  try {
    const client = getPusherBeamsClient();
    await client.addDeviceInterest(interest);
    console.log("[Pusher Beams] Subscribed to interest:", interest);
  } catch (error) {
    console.error("[Pusher Beams] Failed to subscribe to interest:", error);
    throw error;
  }
}

/**
 * Unsubscribe from an interest
 * 
 * @param interest - Interest name to unsubscribe from
 */
export async function unsubscribeFromInterest(interest: string): Promise<void> {
  try {
    const client = getPusherBeamsClient();
    await client.removeDeviceInterest(interest);
    console.log("[Pusher Beams] Unsubscribed from interest:", interest);
  } catch (error) {
    console.error("[Pusher Beams] Failed to unsubscribe from interest:", error);
    throw error;
  }
}

/**
 * Get all subscribed interests
 */
export async function getSubscribedInterests(): Promise<string[]> {
  try {
    const client = getPusherBeamsClient();
    return await client.getDeviceInterests();
  } catch (error) {
    console.error("[Pusher Beams] Failed to get interests:", error);
    throw error;
  }
}

/**
 * Get device ID
 */
export async function getDeviceId(): Promise<string> {
  try {
    const client = getPusherBeamsClient();
    return await client.getDeviceId();
  } catch (error) {
    console.error("[Pusher Beams] Failed to get device ID:", error);
    throw error;
  }
}

/**
 * Stop Pusher Beams client
 */
export async function stopPusherBeams(): Promise<void> {
  try {
    const client = getPusherBeamsClient();
    await client.stop();
    console.log("[Pusher Beams] Stopped");
  } catch (error) {
    console.error("[Pusher Beams] Failed to stop:", error);
    throw error;
  }
}

/**
 * Clear all Pusher Beams state
 */
export async function clearPusherBeamsState(): Promise<void> {
  try {
    const client = getPusherBeamsClient();
    await client.clearAllState();
    console.log("[Pusher Beams] State cleared");
  } catch (error) {
    console.error("[Pusher Beams] Failed to clear state:", error);
    throw error;
  }
}

