import { useEffect, useRef, useCallback, useState } from "react";
import {
  subscribePusherRealtime,
  type PusherRealtimeOptions,
  type PusherRealtimeSubscription,
} from "@/lib/pusherRealtime";

/**
 * React Hook for subscribing to Pusher real-time events
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data, isConnected, error } = usePusherRealtime({
 *     channel: "app-updates",
 *     event: "app-updated",
 *     enabled: true, // 可选：控制是否启用订阅
 *   });
 * 
 *   if (error) {
 *     return <div>错误: {error.message}</div>;
 *   }
 * 
 *   return <div>最新数据: {JSON.stringify(data)}</div>;
 * }
 * ```
 */
export function usePusherRealtime<T = unknown>(
  options: PusherRealtimeOptions & {
    /**
     * 是否启用订阅（默认 true）
     */
    enabled?: boolean;
    /**
     * 初始数据
     */
    initialData?: T;
  }
) {
  const {
    enabled = true,
    initialData,
    ...pusherOptions
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const subscriptionRef = useRef<PusherRealtimeSubscription<T> | null>(null);

  const handleEvent = useCallback((eventData: T) => {
    setData(eventData);
    setIsConnected(true);
    setError(null);
  }, []);

  const handleError = useCallback((err: Error) => {
    setError(err);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // 创建订阅
    const subscription = subscribePusherRealtime<T>({
      ...pusherOptions,
      onEvent: handleEvent,
      onError: handleError,
    });

    subscriptionRef.current = subscription;
    setIsConnected(subscription.isSubscribed);

    // 清理函数
    return () => {
      subscription.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [
    enabled,
    pusherOptions.channel,
    pusherOptions.event,
    handleEvent,
    handleError,
  ]);

  return {
    data,
    isConnected,
    error,
    /**
     * 手动重新订阅
     */
    resubscribe: useCallback(() => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      const subscription = subscribePusherRealtime<T>({
        ...pusherOptions,
        onEvent: handleEvent,
        onError: handleError,
      });
      subscriptionRef.current = subscription;
      setIsConnected(subscription.isSubscribed);
    }, [pusherOptions, handleEvent, handleError]),
  };
}

