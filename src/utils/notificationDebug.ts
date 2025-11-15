/**
 * 通知调试工具
 * 用于检查浏览器通知权限和 Pusher Beams 状态
 */

/**
 * 检查通知权限状态
 */
export async function checkNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.error("[Notification Debug] 浏览器不支持通知功能");
    return "denied";
  }

  const permission = Notification.permission;
  console.log(`[Notification Debug] 当前通知权限: ${permission}`);

  return permission;
}

/**
 * 请求通知权限
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.error("[Notification Debug] 浏览器不支持通知功能");
    return "denied";
  }

  if (Notification.permission === "granted") {
    console.log("[Notification Debug] 通知权限已授予");
    return "granted";
  }

  if (Notification.permission === "denied") {
    console.warn("[Notification Debug] 通知权限已被拒绝，需要在浏览器设置中手动启用");
    return "denied";
  }

  // 请求权限
  const permission = await Notification.requestPermission();
  console.log(`[Notification Debug] 权限请求结果: ${permission}`);
  return permission;
}

/**
 * 发送测试通知（使用浏览器原生 API）
 */
export function sendTestNotification(title: string = "测试通知", body: string = "这是一条测试通知") {
  if (!("Notification" in window)) {
    console.error("[Notification Debug] 浏览器不支持通知功能");
    return;
  }

  if (Notification.permission !== "granted") {
    console.warn("[Notification Debug] 通知权限未授予，无法发送测试通知");
    return;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: "/favicon.png",
      badge: "/favicon.png",
    });

    notification.onclick = () => {
      console.log("[Notification Debug] 通知被点击");
      notification.close();
    };

    // 自动关闭通知（5秒后）
    setTimeout(() => {
      notification.close();
    }, 5000);

    console.log("[Notification Debug] 测试通知已发送");
  } catch (error) {
    console.error("[Notification Debug] 发送测试通知失败:", error);
  }
}

/**
 * 检查 Service Worker 状态
 */
export async function checkServiceWorkerStatus(): Promise<{
  supported: boolean;
  registered: boolean;
  active: boolean;
  scope: string | null;
}> {
  if (!("serviceWorker" in navigator)) {
    console.error("[Notification Debug] 浏览器不支持 Service Worker");
    return {
      supported: false,
      registered: false,
      active: false,
      scope: null,
    };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const isRegistered = !!registration;
    const isActive = !!registration?.active;

    console.log(`[Notification Debug] Service Worker 状态:`);
    console.log(`  - 已注册: ${isRegistered}`);
    console.log(`  - 已激活: ${isActive}`);
    console.log(`  - 作用域: ${registration?.scope || "N/A"}`);

    return {
      supported: true,
      registered: isRegistered,
      active: isActive,
      scope: registration?.scope || null,
    };
  } catch (error) {
    console.error("[Notification Debug] 检查 Service Worker 状态失败:", error);
    return {
      supported: true,
      registered: false,
      active: false,
      scope: null,
    };
  }
}

/**
 * 检查 Pusher Beams 客户端状态
 */
export async function checkPusherBeamsStatus(): Promise<{
  sdkLoaded: boolean;
  clientInitialized: boolean;
  interests: string[];
}> {
  const sdkLoaded = typeof window !== "undefined" && !!window.PusherPushNotifications;
  console.log(`[Notification Debug] Pusher Beams SDK 已加载: ${sdkLoaded}`);

  if (!sdkLoaded) {
    return {
      sdkLoaded: false,
      clientInitialized: false,
      interests: [],
    };
  }

  try {
    // 尝试获取客户端实例（如果已初始化）
    const { getPusherBeamsClient, getSubscribedInterests } = await import("./pusherBeams");
    
    try {
      const client = getPusherBeamsClient();
      const interests = await getSubscribedInterests();
      
      console.log(`[Notification Debug] Pusher Beams 客户端状态:`);
      console.log(`  - 已初始化: true`);
      console.log(`  - 已订阅的兴趣: ${interests.join(", ") || "无"}`);

      return {
        sdkLoaded: true,
        clientInitialized: true,
        interests,
      };
    } catch (error) {
      console.log(`[Notification Debug] Pusher Beams 客户端未初始化`);
      return {
        sdkLoaded: true,
        clientInitialized: false,
        interests: [],
      };
    }
  } catch (error) {
    console.error("[Notification Debug] 检查 Pusher Beams 状态失败:", error);
    return {
      sdkLoaded: true,
      clientInitialized: false,
      interests: [],
    };
  }
}

/**
 * 完整的诊断报告
 */
export async function runFullDiagnostic(): Promise<void> {
  console.log("\n🔍 [Notification Debug] 开始完整诊断...\n");

  // 1. 检查通知权限
  console.log("1️⃣ 检查通知权限:");
  const permission = await checkNotificationPermission();
  if (permission !== "granted") {
    console.warn("⚠️  通知权限未授予，这是导致无法接收通知的主要原因！");
    console.log("💡 建议：调用 requestNotificationPermission() 来请求权限");
  }

  // 2. 检查 Service Worker
  console.log("\n2️⃣ 检查 Service Worker:");
  const swStatus = await checkServiceWorkerStatus();
  if (!swStatus.supported) {
    console.error("❌ 浏览器不支持 Service Worker");
  } else if (!swStatus.registered) {
    console.warn("⚠️  Service Worker 未注册");
  } else if (!swStatus.active) {
    console.warn("⚠️  Service Worker 未激活");
  }

  // 3. 检查 Pusher Beams
  console.log("\n3️⃣ 检查 Pusher Beams:");
  const beamsStatus = await checkPusherBeamsStatus();
  if (!beamsStatus.sdkLoaded) {
    console.error("❌ Pusher Beams SDK 未加载");
  } else if (!beamsStatus.clientInitialized) {
    console.warn("⚠️  Pusher Beams 客户端未初始化");
  } else if (beamsStatus.interests.length === 0) {
    console.warn("⚠️  未订阅任何兴趣");
  }

  // 4. 发送测试通知（如果权限已授予）
  if (permission === "granted") {
    console.log("\n4️⃣ 发送测试通知:");
    sendTestNotification("诊断测试", "如果你看到这条通知，说明浏览器通知功能正常");
  }

  console.log("\n✅ [Notification Debug] 诊断完成\n");
}

