import Pusher, { Channel } from "pusher-js";

// App-wide singleton so we don't open/close the WebSocket on every React Strict-Mode remount.

const globalWithPusher = globalThis as typeof globalThis & {
  __pusherClient?: Pusher;
};

// Updated to match new Pusher Channels app
const PUSHER_APP_KEY = "ad76e79a837a7d0c4313";
const PUSHER_CLUSTER = "us3";

export function getPusherClient(): Pusher {
  if (!globalWithPusher.__pusherClient) {
    // Create once and cache
    globalWithPusher.__pusherClient = new Pusher(PUSHER_APP_KEY, {
      cluster: PUSHER_CLUSTER,
      forceTLS: true,
    });
  }
  return globalWithPusher.__pusherClient;
}

export type PusherChannel = Channel;
