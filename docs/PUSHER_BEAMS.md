# Pusher Beams 推送通知使用指南

本文档介绍如何在项目中使用 Pusher Beams 实现推送通知功能。

## 概述

项目已经集成了 Pusher Beams 推送通知系统，可以用于：
- Web 推送通知
- 跨设备通知同步
- 实时消息提醒
- 用户活动通知

## 架构

### 前端
- `src/utils/pusherBeams.ts` - Pusher Beams 客户端工具函数
- `src/utils/serviceWorker.ts` - Service Worker 注册
- `public/service-worker.js` - Service Worker 文件

### 后端
- `api/utils/pusherBeams.ts` - 后端 Pusher Beams 工具函数
- `api/pusher-beams.ts` - API 端点

## 快速开始

### 1. 环境配置

确保设置了 `PUSHER_BEAMS_SECRET_KEY` 环境变量：

```bash
PUSHER_BEAMS_SECRET_KEY=your_secret_key_here
```

获取方式：
1. 访问 [Pusher Dashboard](https://dashboard.pusher.com/)
2. 选择你的 Beams 实例
3. 进入 "Credentials" 标签页
4. 复制 "Secret Key"

### 2. 前端：初始化 Pusher Beams

应用启动时会自动初始化 Pusher Beams（在 `src/App.tsx` 中）：

```typescript
import { initializePusherBeams } from "@/utils/pusherBeams";

// 初始化并订阅兴趣
await initializePusherBeams("your-instance-id", ["hello", "world"]);
```

### 3. 前端：订阅/取消订阅兴趣

```typescript
import { subscribeToInterest, unsubscribeFromInterest } from "@/utils/pusherBeams";

// 订阅兴趣
await subscribeToInterest("hello");

// 取消订阅
await unsubscribeFromInterest("hello");
```

### 4. 后端：发送推送通知

#### 方式一：在 API 端点中使用工具函数

```typescript
import { sendPusherBeamsNotification } from "../utils/pusherBeams";

export default async function handler(req: Request) {
  // 处理请求...
  
  // 发送推送通知
  await sendPusherBeamsNotification({
    interests: ["hello"],
    title: "新消息",
    body: "您有一条新消息",
    icon: "https://example.com/icon.png",
    deepLink: "https://os.ryo.lu",
  });
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
```

#### 方式二：通过 API 端点发送

```typescript
// 从前端或其他服务调用
const response = await fetch("/api/pusher-beams", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    interests: ["hello"],
    title: "Hello",
    body: "This is a test notification",
    icon: "https://example.com/icon.png", // 可选
    deepLink: "https://os.ryo.lu", // 可选
  }),
});

const result = await response.json();
console.log("Publish ID:", result.publishId);
```

#### 方式三：使用 curl 命令（测试）

```bash
curl -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -X POST "https://5700852b-9221-447f-ae85-b9b907f56210.pushnotifications.pusher.com/publish_api/v1/instances/5700852b-9221-447f-ae85-b9b907f56210/publishes" \
  -d '{
    "interests": ["hello"],
    "web": {
      "notification": {
        "title": "Hello",
        "body": "Hello from Pusher Beams!"
      }
    }
  }'
```

或使用项目中的测试脚本：

```bash
PUSHER_BEAMS_SECRET_KEY=your_secret_key bun run scripts/test-pusher-beams.ts
```

## API 参考

### 后端工具函数

#### `sendPusherBeamsNotification(options)`

发送单个推送通知。

**参数：**
- `interests: string[]` - 兴趣数组（必需）
- `title: string` - 通知标题（必需）
- `body: string` - 通知内容（必需）
- `icon?: string` - 通知图标 URL（可选）
- `deepLink?: string` - 点击通知后跳转的链接（可选）
- `silent?: boolean` - 是否静默处理错误（默认 false）

**返回：**
- `Promise<{ publishId: string }>`

**示例：**
```typescript
const result = await sendPusherBeamsNotification({
  interests: ["hello", "world"],
  title: "新消息",
  body: "您有一条新消息",
  icon: "https://example.com/icon.png",
  deepLink: "https://os.ryo.lu",
});
console.log("Publish ID:", result.publishId);
```

#### `sendMultiplePusherBeamsNotifications(notifications)`

批量发送推送通知。

**参数：**
- `notifications: Array<{ interests, title, body, icon?, deepLink? }>`

**返回：**
- `Promise<Array<{ publishId: string } | { error: Error }>>`

### 前端工具函数

#### `initializePusherBeams(instanceId, interests?)`

初始化 Pusher Beams 客户端并订阅兴趣。

**参数：**
- `instanceId: string` - Beams 实例 ID
- `interests?: string[]` - 要订阅的兴趣数组（可选）

#### `subscribeToInterest(interest)`

订阅一个兴趣。

**参数：**
- `interest: string` - 兴趣名称

#### `unsubscribeFromInterest(interest)`

取消订阅一个兴趣。

**参数：**
- `interest: string` - 兴趣名称

#### `getSubscribedInterests()`

获取所有已订阅的兴趣。

**返回：**
- `Promise<string[]>`

## 实际应用示例

### 示例 1：漂流瓶应用 - 新瓶子通知

```typescript
// api/message-in-bottle.ts
import { sendPusherBeamsNotification } from "./utils/pusherBeams";

// 当有新瓶子时发送通知
await sendPusherBeamsNotification({
  interests: ["bottles"],
  title: "🌊 新漂流瓶",
  body: "有人向大海扔了一个新的漂流瓶！",
  deepLink: "https://os.ryo.lu/message-in-bottle",
});
```

### 示例 2：聊天应用 - 新消息通知

```typescript
// api/chat-rooms.js
import { sendPusherBeamsNotification } from "./utils/pusherBeams";

// 当有新消息时发送通知
await sendPusherBeamsNotification({
  interests: [`room-${roomId}`],
  title: "💬 新消息",
  body: `${username}: ${messagePreview}`,
  deepLink: `https://os.ryo.lu/chats/${roomId}`,
});
```

## 注意事项

1. **权限要求**：用户需要授予浏览器通知权限才能收到推送通知
2. **Service Worker**：确保 Service Worker 已正确注册（应用会自动处理）
3. **兴趣订阅**：只有订阅了相应兴趣的设备才会收到通知
4. **环境变量**：确保在生产环境中设置了 `PUSHER_BEAMS_SECRET_KEY`
5. **HTTPS**：推送通知需要 HTTPS 连接（本地开发可以使用 localhost）

## 故障排除

### 通知没有收到

1. 检查浏览器通知权限是否已授予
2. 确认设备已订阅相应的兴趣
3. 检查 Service Worker 是否已注册
4. 查看浏览器控制台是否有错误信息
5. 验证 `PUSHER_BEAMS_SECRET_KEY` 是否正确设置

### API 调用失败

1. 检查 `PUSHER_BEAMS_SECRET_KEY` 环境变量是否正确设置
2. 验证兴趣数组不为空
3. 检查标题和内容是否有效
4. 查看 Vercel 函数日志以获取详细错误信息

## 相关资源

- [Pusher Beams 文档](https://pusher.com/docs/beams)
- [Pusher Dashboard](https://dashboard.pusher.com/)
- [Web Push API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

