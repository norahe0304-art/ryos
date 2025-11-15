import { getPusherClient, type PusherChannel } from "./pusherClient";

/**
 * 通用的 Pusher 实时响应工具
 * 用于订阅和接收实时事件更新
 */

export interface PusherRealtimeEvent<T = unknown> {
  event: string;
  data: T;
  channel: string;
}

export interface PusherRealtimeOptions {
  /**
   * 频道名称
   */
  channel: string;
  /**
   * 事件名称
   */
  event: string;
  /**
   * 是否自动订阅（默认 true）
   */
  autoSubscribe?: boolean;
  /**
   * 是否启用调试日志（默认 false）
   */
  debug?: boolean;
}

export interface PusherRealtimeSubscription<T = unknown> {
  /**
   * 取消订阅
   */
  unsubscribe: () => void;
  /**
   * 当前订阅状态
   */
  isSubscribed: boolean;
  /**
   * 频道实例
   */
  channel: PusherChannel | null;
}

/**
 * 订阅 Pusher 实时事件
 * 
 * @example
 * ```ts
 * const subscription = subscribePusherRealtime({
 *   channel: "app-updates",
 *   event: "app-updated",
 *   onEvent: (data) => {
 *     console.log("收到更新:", data);
 *   }
 * });
 * 
 * // 取消订阅
 * subscription.unsubscribe();
 * ```
 */
export function subscribePusherRealtime<T = unknown>(
  options: PusherRealtimeOptions & {
    /**
     * 事件回调函数
     */
    onEvent: (data: T) => void;
    /**
     * 错误回调函数（可选）
     */
    onError?: (error: Error) => void;
  }
): PusherRealtimeSubscription<T> {
  const {
    channel: channelName,
    event: eventName,
    onEvent,
    onError,
    autoSubscribe = true,
    debug = false,
  } = options;

  let channel: PusherChannel | null = null;
  let isSubscribed = false;
  const eventHandler = (data: T) => {
    if (debug) {
      console.log(`[Pusher Realtime] 收到事件 ${eventName} 在频道 ${channelName}:`, data);
    }
    onEvent(data);
  };

  const unsubscribe = () => {
    if (channel && isSubscribed) {
      if (debug) {
        console.log(`[Pusher Realtime] 取消订阅频道 ${channelName} 的事件 ${eventName}`);
      }
      channel.unbind(eventName, eventHandler);
      isSubscribed = false;
    }
  };

  if (autoSubscribe) {
    try {
      const pusher = getPusherClient();
      channel = pusher.subscribe(channelName);
      
      channel.bind(eventName, eventHandler);
      
      channel.bind("pusher:subscription_error", (error: { status?: number; error?: string }) => {
        const err = new Error(
          `订阅频道 ${channelName} 失败: ${error.error || "未知错误"}`
        );
        if (debug) {
          console.error(`[Pusher Realtime] 订阅错误:`, err);
        }
        onError?.(err);
      });

      channel.bind("pusher:subscription_succeeded", () => {
        isSubscribed = true;
        if (debug) {
          console.log(`[Pusher Realtime] 成功订阅频道 ${channelName}`);
        }
      });

      isSubscribed = true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (debug) {
        console.error(`[Pusher Realtime] 订阅失败:`, err);
      }
      onError?.(err);
    }
  }

  return {
    unsubscribe,
    isSubscribed,
    channel,
  };
}

/**
 * 订阅多个 Pusher 实时事件
 * 
 * @example
 * ```ts
 * const subscriptions = subscribeMultiplePusherRealtime([
 *   {
 *     channel: "app-updates",
 *     event: "app-updated",
 *     onEvent: (data) => console.log("App updated:", data)
 *   },
 *   {
 *     channel: "library-updates",
 *     event: "library-updated",
 *     onEvent: (data) => console.log("Library updated:", data)
 *   }
 * ]);
 * 
 * // 取消所有订阅
 * subscriptions.forEach(sub => sub.unsubscribe());
 * ```
 */
export function subscribeMultiplePusherRealtime<T = unknown>(
  subscriptions: Array<
    PusherRealtimeOptions & {
      onEvent: (data: T) => void;
      onError?: (error: Error) => void;
    }
  >
): Array<PusherRealtimeSubscription<T>> {
  return subscriptions.map((options) =>
    subscribePusherRealtime<T>(options)
  );
}

/**
 * 创建私有频道名称（用于用户特定的实时更新）
 */
export function createPrivateChannelName(userId: string, prefix = "private"): string {
  // 清理用户 ID，确保符合 Pusher 频道命名规范
  const sanitized = userId.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
  return `${prefix}-${sanitized}`;
}

/**
 * 创建公共频道名称
 */
export function createPublicChannelName(name: string, prefix = "public"): string {
  const sanitized = name.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
  return `${prefix}-${sanitized}`;
}

