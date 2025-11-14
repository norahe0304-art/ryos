# 环境变量配置指南

本文档说明如何配置 ryOS 项目所需的环境变量。

## 必需的环境变量

### AI 模型配置

#### Google Gemini API
用于 AI 聊天、代码生成、图像生成等功能。

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_google_gemini_api_key_here
```

获取方式：访问 [Google AI Studio](https://aistudio.google.com/app/apikey) 创建 API 密钥。

#### Anthropic Claude API
用于 AI 聊天，是默认模型。

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

获取方式：访问 [Anthropic Console](https://console.anthropic.com/settings/keys) 创建 API 密钥。

#### OpenAI API
用于音频转录功能。

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

获取方式：访问 [OpenAI Platform](https://platform.openai.com/api-keys) 创建 API 密钥。

#### ElevenLabs API
用于语音合成（TTS）功能。

```bash
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

获取方式：访问 [ElevenLabs Settings](https://elevenlabs.io/app/settings/api-keys) 创建 API 密钥。

### 基础设施配置

#### Redis 配置
用于速率限制、缓存、聊天认证等功能。

```bash
REDIS_KV_REST_API_URL=your_redis_rest_api_url_here
REDIS_KV_REST_API_TOKEN=your_redis_rest_api_token_here
```

获取方式：
- 推荐使用 [Upstash Redis](https://upstash.com/)（提供免费的 REST API）
- 或其他支持 REST API 的 Redis 服务

#### Pusher 配置
用于实时聊天功能。

```bash
PUSHER_APP_ID=your_pusher_app_id_here
PUSHER_KEY=your_pusher_key_here
PUSHER_SECRET=your_pusher_secret_here
PUSHER_CLUSTER=us2
```

获取方式：访问 [Pusher Dashboard](https://dashboard.pusher.com/) 创建应用并获取凭证。

## 配置方法

### 本地开发

1. 在项目根目录创建 `.env` 文件（不要提交到 Git）
2. 复制上述所有环境变量到 `.env` 文件
3. 替换 `your_*_here` 为实际的 API 密钥和配置值

### Vercel 部署

1. 访问你的 Vercel 项目设置
2. 进入 "Environment Variables" 页面
3. 添加上述所有环境变量
4. 确保为 Production、Preview 和 Development 环境都设置了变量

## 环境变量使用说明

### API 路由中的使用

- `api/chat.ts` - 使用 `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `REDIS_KV_REST_API_URL`, `REDIS_KV_REST_API_TOKEN`
- `api/speech.ts` - 使用 `ELEVENLABS_API_KEY`, `REDIS_KV_REST_API_URL`, `REDIS_KV_REST_API_TOKEN`
- `api/audio-transcribe.ts` - 使用 `OPENAI_API_KEY`
- `api/chat-rooms.js` - 使用 `REDIS_KV_REST_API_URL`, `REDIS_KV_REST_API_TOKEN`, `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`
- `api/chat-room-ai.ts` - 使用 `GOOGLE_GENERATIVE_AI_API_KEY`
- `api/applet-ai.ts` - 使用 `GOOGLE_GENERATIVE_AI_API_KEY`, `REDIS_KV_REST_API_URL`, `REDIS_KV_REST_API_TOKEN`
- `api/lyrics.ts` - 使用 `REDIS_KV_REST_API_URL`, `REDIS_KV_REST_API_TOKEN`
- `api/translate-lyrics.ts` - 使用 `REDIS_KV_REST_API_URL`, `REDIS_KV_REST_API_TOKEN`
- `api/share-applet.ts` - 使用 `REDIS_KV_REST_API_URL`, `REDIS_KV_REST_API_TOKEN`
- `api/ie-generate.ts` - 使用 `GOOGLE_GENERATIVE_AI_API_KEY`, `REDIS_KV_REST_API_URL`, `REDIS_KV_REST_API_TOKEN`
- `api/iframe-check.ts` - 使用 `REDIS_KV_REST_API_URL`, `REDIS_KV_REST_API_TOKEN`

## 注意事项

1. **安全性**：永远不要将 `.env` 文件提交到 Git 仓库
2. **API 限制**：注意各 API 服务的速率限制和配额
3. **成本控制**：监控 API 使用情况，避免意外产生高额费用
4. **测试环境**：建议为开发和生产环境使用不同的 API 密钥

## 故障排除

如果遇到 API 调用失败：

1. 检查环境变量是否正确设置
2. 验证 API 密钥是否有效且未过期
3. 检查 API 服务的配额和限制
4. 查看 Vercel 函数日志以获取详细错误信息

