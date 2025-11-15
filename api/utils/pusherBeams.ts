/**
 * 后端 Pusher Beams 推送通知工具
 * 用于在 API 端点中发送 Pusher Beams 推送通知
 */

const INSTANCE_ID = "5700852b-9221-447f-ae85-b9b907f56210";
const BEAMS_API_URL = `https://${INSTANCE_ID}.pushnotifications.pusher.com/publish_api/v1/instances/${INSTANCE_ID}/publishes`;

/**
 * 获取 Pusher Beams Secret Key
 */
function getBeamsSecretKey(): string {
  const secretKey = process.env.PUSHER_BEAMS_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "Pusher Beams 配置缺失。请设置 PUSHER_BEAMS_SECRET_KEY 环境变量"
    );
  }
  return secretKey;
}

/**
 * 发送 Pusher Beams 推送通知
 * 
 * @example
 * ```ts
 * await sendPusherBeamsNotification({
 *   interests: ["hello"],
 *   title: "Hello",
 *   body: "This is a test notification",
 *   icon: "https://example.com/icon.png",
 *   deepLink: "https://os.ryo.lu",
 * });
 * ```
 */
export async function sendPusherBeamsNotification(options: {
  /**
   * 兴趣（topics）数组，设备需要订阅这些兴趣才能收到通知
   */
  interests: string[];
  /**
   * 通知标题
   */
  title: string;
  /**
   * 通知内容
   */
  body: string;
  /**
   * 通知图标 URL（可选）
   */
  icon?: string;
  /**
   * 点击通知后跳转的链接（可选）
   */
  deepLink?: string;
  /**
   * 是否静默处理错误（默认 false）
   */
  silent?: boolean;
}): Promise<{ publishId: string }> {
  const { interests, title, body, icon, deepLink, silent = false } = options;

  if (!interests || interests.length === 0) {
    throw new Error("至少需要一个兴趣（interest）");
  }

  try {
    const secretKey = getBeamsSecretKey();
    
    const payload = {
      interests,
      web: {
        notification: {
          title,
          body,
          ...(icon && { icon }),
          ...(deepLink && { deep_link: deepLink }),
        },
      },
    };

    const response = await fetch(BEAMS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(
        `Pusher Beams API 错误: ${response.status} ${response.statusText} - ${errorText}`
      );
      if (!silent) {
        console.error(
          `[Pusher Beams] 发送通知失败 - 兴趣: ${interests.join(", ")}`,
          error
        );
      }
      throw error;
    }

    const result = await response.json() as { publishId: string };
    return { publishId: result.publishId };
  } catch (error) {
    if (!silent) {
      console.error(
        `[Pusher Beams] 发送通知失败 - 兴趣: ${interests.join(", ")}`,
        error
      );
    }
    throw error;
  }
}

/**
 * 批量发送 Pusher Beams 推送通知
 * 
 * @example
 * ```ts
 * await sendMultiplePusherBeamsNotifications([
 *   {
 *     interests: ["hello"],
 *     title: "Hello",
 *     body: "First notification",
 *   },
 *   {
 *     interests: ["world"],
 *     title: "World",
 *     body: "Second notification",
 *   },
 * ]);
 * ```
 */
export async function sendMultiplePusherBeamsNotifications(
  notifications: Array<{
    interests: string[];
    title: string;
    body: string;
    icon?: string;
    deepLink?: string;
  }>
): Promise<Array<{ publishId: string } | { error: Error }>> {
  const promises = notifications.map((notification) =>
    sendPusherBeamsNotification({
      ...notification,
      silent: true, // 批量发送时静默处理单个错误
    })
      .then((result) => ({ publishId: result.publishId }))
      .catch((error) => ({
        error: error instanceof Error ? error : new Error(String(error)),
      }))
  );

  return Promise.all(promises);
}

