/**
 * 后端 Pusher 实时响应工具
 * 用于在 API 端点中发送 Pusher 事件
 */

import Pusher from "pusher";

// 获取 Pusher 实例（单例模式）
let pusherInstance: Pusher | null = null;

/**
 * 获取 Pusher 实例
 * @returns Pusher 实例，如果配置缺失则返回 null
 */
export function getPusherInstance(): Pusher | null {
  if (pusherInstance) {
    return pusherInstance;
  }

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER || "us3";

  if (!appId || !key || !secret) {
    console.warn(
      "[Pusher Realtime] 配置缺失。实时通知功能将不可用。请设置 PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET 环境变量"
    );
    return null;
  }

  pusherInstance = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  return pusherInstance;
}

/**
 * 发送 Pusher 实时事件
 * 
 * @example
 * ```ts
 * await sendPusherRealtimeEvent({
 *   channel: "app-updates",
 *   event: "app-updated",
 *   data: { appId: "123", status: "updated" }
 * });
 * ```
 */
export async function sendPusherRealtimeEvent<T = unknown>(options: {
  /**
   * 频道名称
   */
  channel: string;
  /**
   * 事件名称
   */
  event: string;
  /**
   * 事件数据
   */
  data: T;
  /**
   * 是否静默处理错误（默认 false）
   */
  silent?: boolean;
}): Promise<void> {
  const { channel, event, data, silent = false } = options;

  try {
    const pusher = getPusherInstance();
    if (!pusher) {
      // Pusher 未配置，静默返回（不影响主要功能）
      if (!silent) {
        console.warn(
          `[Pusher Realtime] Pusher 未配置，跳过事件发送 - 频道: ${channel}, 事件: ${event}`
        );
      }
      return;
    }
    await pusher.trigger(channel, event, data);
  } catch (error) {
    if (!silent) {
      console.error(
        `[Pusher Realtime] 发送事件失败 - 频道: ${channel}, 事件: ${event}`,
        error
      );
    }
    throw error;
  }
}

/**
 * 批量发送 Pusher 实时事件
 * 
 * @example
 * ```ts
 * await sendMultiplePusherRealtimeEvents([
 *   {
 *     channel: "app-updates",
 *     event: "app-updated",
 *     data: { appId: "123" }
 *   },
 *   {
 *     channel: "library-updates",
 *     event: "library-updated",
 *     data: { libraryId: "456" }
 *   }
 * ]);
 * ```
 */
export async function sendMultiplePusherRealtimeEvents<T = unknown>(
  events: Array<{
    channel: string;
    event: string;
    data: T;
  }>
): Promise<void> {
  const pusher = getPusherInstance();
  const promises = events.map(({ channel, event, data }) =>
    pusher.trigger(channel, event, data).catch((error) => {
      console.error(
        `[Pusher Realtime] 批量发送事件失败 - 频道: ${channel}, 事件: ${event}`,
        error
      );
      // 继续处理其他事件，不抛出错误
    })
  );

  await Promise.all(promises);
}

/**
 * 创建私有频道名称（用于用户特定的实时更新）
 */
export function createPrivateChannelName(
  userId: string,
  prefix = "private"
): string {
  // 清理用户 ID，确保符合 Pusher 频道命名规范
  const sanitized = userId.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
  return `${prefix}-${sanitized}`;
}

/**
 * 创建公共频道名称
 */
export function createPublicChannelName(
  name: string,
  prefix = "public"
): string {
  const sanitized = name.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
  return `${prefix}-${sanitized}`;
}

