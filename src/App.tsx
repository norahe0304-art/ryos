import { AppManager } from "./apps/base/AppManager";
import { appRegistry } from "./config/appRegistry";
import { useEffect, useState } from "react";
import { applyDisplayMode } from "./utils/displayMode";
import { Toaster } from "./components/ui/sonner";
import { useAppStoreShallow } from "@/stores/helpers";
import { BootScreen } from "./components/dialogs/BootScreen";
import { getNextBootMessage, clearNextBootMessage } from "./utils/bootMessage";
import { AnyApp } from "./apps/base/types";
import { registerServiceWorker } from "./utils/serviceWorker";
import { initializePusherBeams } from "./utils/pusherBeams";
import { requestNotificationPermission, runFullDiagnostic } from "./utils/notificationDebug";

// Convert registry to array
const apps: AnyApp[] = Object.values(appRegistry);

export function App() {
  const { displayMode, isFirstBoot, setHasBooted } = useAppStoreShallow(
    (state) => ({
      displayMode: state.displayMode,
      isFirstBoot: state.isFirstBoot,
      setHasBooted: state.setHasBooted,
    })
  );
  const [bootScreenMessage, setBootScreenMessage] = useState<string | null>(
    null
  );
  const [showBootScreen, setShowBootScreen] = useState(false);

  useEffect(() => {
    applyDisplayMode(displayMode);
  }, [displayMode]);

  useEffect(() => {
    // Register service worker for Pusher Beams
    registerServiceWorker()
      .then(() => {
        console.log("[App] Service Worker registered, waiting for Pusher Beams SDK...");
        
        // Wait for SDK to load, then initialize Pusher Beams
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait time
        
        const checkSDK = () => {
          attempts++;
          
          if (typeof window !== "undefined" && window.PusherPushNotifications) {
            console.log("[App] Pusher Beams SDK detected, initializing...");
            
            // Request notification permission first
            requestNotificationPermission()
              .then((permission) => {
                if (permission === "granted") {
                  console.log("[App] ✅ 通知权限已授予");
                } else if (permission === "denied") {
                  console.warn("[App] ⚠️  通知权限被拒绝，请在浏览器设置中手动启用");
                } else {
                  console.log("[App] ℹ️  通知权限待定，用户尚未做出选择");
                }

                // Initialize Pusher Beams with instance ID
                // TODO: Move instance ID to environment variable
                const instanceId = "5700852b-9221-447f-ae85-b9b907f56210";
                return initializePusherBeams(instanceId, ["hello"]);
              })
              .then(() => {
                // Success message is already logged by initializePusherBeams
                // Additional info for debugging
                console.log("[App] Pusher Beams setup complete. Check notification permission in browser settings if needed.");
                
                // Make diagnostic function available in console
                (window as any).debugNotifications = runFullDiagnostic;
                console.log("[App] 💡 提示：在控制台运行 debugNotifications() 可以查看完整的诊断信息");
                
                // Make test push notification function available in console
                (window as any).testPush = async () => {
                  try {
                    console.log("[Test] 正在发送测试推送通知...");
                    const response = await fetch("/api/pusher-beams", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        interests: ["hello"],
                        title: "测试通知",
                        body: "这是通过我们自己的 API 发送的测试通知！",
                      }),
                    });
                    
                    // Check if response is ok
                    if (!response.ok) {
                      const text = await response.text();
                      console.error("❌ API 返回错误状态:", response.status, response.statusText);
                      console.error("❌ 响应内容:", text);
                      throw new Error(`API 错误: ${response.status} - ${text}`);
                    }
                    
                    // Try to parse as JSON
                    let result;
                    try {
                      result = await response.json();
                    } catch (parseError) {
                      const text = await response.text();
                      console.error("❌ 响应不是有效的 JSON");
                      console.error("❌ 响应内容:", text);
                      throw new Error(`无法解析响应为 JSON: ${text}`);
                    }
                    
                    console.log("[Test] API 响应:", result);
                    if (result.success) {
                      console.log("✅ 推送通知已发送！Publish ID:", result.publishId);
                      console.log("📱 检查浏览器是否收到通知...");
                    } else {
                      console.error("❌ 发送失败:", result);
                    }
                    return result;
                  } catch (error) {
                    console.error("❌ 发送测试通知时出错:", error);
                    if (error instanceof Error) {
                      console.error("❌ 错误详情:", error.message);
                    }
                    throw error;
                  }
                };
                console.log("[App] 💡 提示：在控制台运行 testPush() 可以发送测试推送通知");
              })
              .catch((error) => {
                console.error("[App] Failed to initialize Pusher Beams:", error);
                console.error("[App] Error details:", error);
                console.warn("[App] If notification permission prompt didn't appear, check browser address bar settings.");
              });
          } else if (attempts < maxAttempts) {
            // SDK not loaded yet, try again after a short delay
            setTimeout(checkSDK, 100);
          } else {
            console.error("[App] Pusher Beams SDK failed to load after", maxAttempts * 100, "ms");
            console.error("[App] Check if script tag is present in index.html and network connection is working");
            console.log("[App] window.PusherPushNotifications:", window.PusherPushNotifications);
          }
        };
        
        // Start checking immediately
        checkSDK();
      })
      .catch((error) => {
        console.error("[App] Failed to register service worker:", error);
        console.error("[App] Service Worker error details:", error);
      });
  }, []);

  useEffect(() => {
    // Only show boot screen for system operations (reset/restore/format/debug)
    const persistedMessage = getNextBootMessage();
    if (persistedMessage) {
      setBootScreenMessage(persistedMessage);
      setShowBootScreen(true);
    }

    // Set first boot flag without showing boot screen
    if (isFirstBoot) {
      setHasBooted();
    }
  }, [isFirstBoot, setHasBooted]);

  if (showBootScreen) {
    return (
      <BootScreen
        isOpen={true}
        onOpenChange={() => {}}
        title={bootScreenMessage || "System Restoring..."}
        onBootComplete={() => {
          clearNextBootMessage();
          setShowBootScreen(false);
        }}
      />
    );
  }

  return (
    <>
      <AppManager apps={apps} />
      <Toaster
        position="bottom-left"
        offset={`calc(env(safe-area-inset-bottom, 0px) + 32px)`}
      />
    </>
  );
}
