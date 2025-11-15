# Pusher 实时响应使用指南

本文档介绍如何在项目中使用 Pusher 实现实时响应功能。

## 概述

项目已经集成了 Pusher 实时通信系统，可以用于：
- 实时消息推送
- 状态更新通知
- 数据同步
- 实时协作

## 架构

### 前端
- `src/lib/pusherClient.ts` - Pusher 客户端单例
- `src/lib/pusherRealtime.ts` - 实时响应工具函数
- `src/hooks/usePusherRealtime.ts` - React Hook

### 后端
- `api/utils/pusherRealtime.ts` - 后端 Pusher 工具函数

## 快速开始

### 1. 后端：发送实时事件

在 API 端点中使用 `sendPusherRealtimeEvent` 发送事件：

```typescript
import { sendPusherRealtimeEvent } from "../utils/pusherRealtime";

export default async function handler(req: Request) {
  // 处理请求...
  
  // 发送实时事件
  await sendPusherRealtimeEvent({
    channel: "app-updates",
    event: "app-updated",
    data: {
      appId: "123",
      status: "updated",
      timestamp: Date.now(),
    },
  });
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
```

### 2. 前端：使用 Hook 订阅事件

在 React 组件中使用 `usePusherRealtime` Hook：

```tsx
import { usePusherRealtime } from "@/hooks/usePusherRealtime";

interface AppUpdate {
  appId: string;
  status: string;
  timestamp: number;
}

function AppUpdatesComponent() {
  const { data, isConnected, error } = usePusherRealtime<AppUpdate>({
    channel: "app-updates",
    event: "app-updated",
    enabled: true, // 可选：控制是否启用
  });

  if (error) {
    return <div>连接错误: {error.message}</div>;
  }

  if (!isConnected) {
    return <div>正在连接...</div>;
  }

  return (
    <div>
      {data && (
        <div>
          <p>App ID: {data.appId}</p>
          <p>状态: {data.status}</p>
          <p>更新时间: {new Date(data.timestamp).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
```

### 3. 前端：使用工具函数订阅事件

如果需要更细粒度的控制，可以直接使用工具函数：

```typescript
import { subscribePusherRealtime } from "@/lib/pusherRealtime";

// 订阅事件
const subscription = subscribePusherRealtime({
  channel: "app-updates",
  event: "app-updated",
  onEvent: (data) => {
    console.log("收到更新:", data);
    // 处理数据...
  },
  onError: (error) => {
    console.error("订阅错误:", error);
  },
  debug: true, // 启用调试日志
});

// 取消订阅
subscription.unsubscribe();
```

## 使用场景示例

### 场景 1: Applet 更新通知

**后端 (`api/share-applet.ts`)**:
```typescript
import { sendPusherRealtimeEvent } from "./utils/pusherRealtime";

// 当 applet 更新时
await sendPusherRealtimeEvent({
  channel: "public-applets",
  event: "applet-updated",
  data: {
    appletId: applet.id,
    title: applet.title,
    version: applet.version,
  },
});
```

**前端组件**:
```tsx
function AppStore() {
  const { data: appletUpdate } = usePusherRealtime({
    channel: "public-applets",
    event: "applet-updated",
  });

  useEffect(() => {
    if (appletUpdate) {
      // 刷新 applet 列表
      fetchApplets();
      toast.success(`Applet "${appletUpdate.title}" 已更新`);
    }
  }, [appletUpdate]);

  // ...
}
```

### 场景 2: 用户特定的实时更新

**后端**:
```typescript
import { createPrivateChannelName, sendPusherRealtimeEvent } from "./utils/pusherRealtime";

// 为用户发送私有更新
const userId = "user123";
const channel = createPrivateChannelName(userId);

await sendPusherRealtimeEvent({
  channel,
  event: "user-notification",
  data: {
    type: "library-updated",
    message: "你的音乐库已更新",
  },
});
```

**前端**:
```tsx
function UserNotifications() {
  const userId = "user123";
  const channel = createPrivateChannelName(userId);

  const { data: notification } = usePusherRealtime({
    channel,
    event: "user-notification",
  });

  useEffect(() => {
    if (notification) {
      toast.info(notification.message);
    }
  }, [notification]);

  // ...
}
```

### 场景 3: 批量事件发送

**后端**:
```typescript
import { sendMultiplePusherRealtimeEvents } from "./utils/pusherRealtime";

await sendMultiplePusherRealtimeEvents([
  {
    channel: "app-updates",
    event: "app-updated",
    data: { appId: "1" },
  },
  {
    channel: "library-updates",
    event: "library-updated",
    data: { libraryId: "2" },
  },
]);
```

## 频道命名规范

### 公共频道
使用 `createPublicChannelName` 创建公共频道名称：
```typescript
const channel = createPublicChannelName("app-updates"); 
// 结果: "public-app-updates"
```

### 私有频道
使用 `createPrivateChannelName` 创建私有频道名称：
```typescript
const channel = createPrivateChannelName("user123");
// 结果: "private-user123"
```

## 错误处理

### 后端错误处理
```typescript
try {
  await sendPusherRealtimeEvent({
    channel: "app-updates",
    event: "app-updated",
    data: { appId: "123" },
    silent: false, // 是否静默处理错误
  });
} catch (error) {
  // 处理错误，但不影响主流程
  console.error("Pusher 事件发送失败:", error);
}
```

### 前端错误处理
```tsx
function MyComponent() {
  const { data, error, isConnected } = usePusherRealtime({
    channel: "app-updates",
    event: "app-updated",
  });

  if (error) {
    // 显示错误提示或重试
    return <ErrorDisplay error={error} onRetry={() => resubscribe()} />;
  }

  // ...
}
```

## 最佳实践

1. **频道命名**: 使用有意义的频道名称，遵循命名规范
2. **事件命名**: 使用清晰的事件名称，如 `app-updated`, `message-received`
3. **数据格式**: 保持事件数据结构一致，使用 TypeScript 类型定义
4. **错误处理**: 始终处理错误情况，避免影响主流程
5. **性能**: 避免在高频更新的场景中发送过多事件
6. **清理**: 在组件卸载时取消订阅，避免内存泄漏

## 环境变量配置

确保在 `.env` 文件中配置了 Pusher 相关环境变量：

```env
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=us3
```

前端 Pusher 配置在 `src/lib/pusherClient.ts` 中：
```typescript
const PUSHER_APP_KEY = "b47fd563805c8c42da1a";
const PUSHER_CLUSTER = "us3";
```

## 调试

启用调试模式查看详细日志：

```typescript
const subscription = subscribePusherRealtime({
  channel: "app-updates",
  event: "app-updated",
  debug: true, // 启用调试日志
  onEvent: (data) => {
    // ...
  },
});
```

## 参考

- [Pusher 官方文档](https://pusher.com/docs)
- 现有实现参考: `src/apps/chats/hooks/useChatRoom.ts`
- 后端实现参考: `api/chat-rooms.js`

