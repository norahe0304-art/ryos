# 部署指南

## Vercel 部署（推荐）

### 1. 准备工作

确保你的代码已推送到 GitHub：
```bash
git add .
git commit -m "Add chat room feature"
git push origin main
```

### 2. 在 Vercel 部署

1. 访问 [Vercel](https://vercel.com) 并登录
2. 点击 "Add New Project"
3. 导入你的 GitHub 仓库
4. 配置项目：
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (默认)
   - **Build Command**: `bun run build`
   - **Output Directory**: `dist`
   - **Install Command**: `bun install`

### 3. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

#### 必需的环境变量

```bash
# Google Gemini API (用于 Chat Room AI)
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyByuhMoUdDIVPGaJmJVTCRjkxTfD7dG5kQ

# Anthropic Claude API (用于主聊天)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# OpenAI API (用于音频转录)
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs API (用于语音合成)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Redis 配置 (用于速率限制和缓存)
REDIS_KV_REST_API_URL=your_redis_rest_api_url_here
REDIS_KV_REST_API_TOKEN=your_redis_rest_api_token_here

# Pusher 配置 (用于实时聊天)
PUSHER_APP_ID=your_pusher_app_id_here
PUSHER_KEY=your_pusher_key_here
PUSHER_SECRET=your_pusher_secret_here
PUSHER_CLUSTER=us2
```

**重要**：确保为 Production、Preview 和 Development 环境都设置了这些变量。

### 4. 配置自定义域名

如果使用 `os.ryo.lu` 域名：

1. 在 Vercel 项目设置中进入 "Domains"
2. 添加域名 `os.ryo.lu`
3. 按照 Vercel 的指示配置 DNS 记录

### 5. 部署后检查

部署完成后，检查：

1. ✅ API 路由是否正常工作：`https://your-domain.vercel.app/api/chat-room-ai`
2. ✅ 前端页面是否正常加载
3. ✅ 环境变量是否正确设置（查看 Vercel 函数日志）

## 其他部署选项

### Netlify

也可以部署到 Netlify，但需要：
- 配置 `netlify.toml`
- 使用 Netlify Functions 替代 Vercel Serverless Functions

### 自托管

如果需要自托管：
- 使用 Node.js 服务器运行 API routes
- 使用 Nginx 或类似工具作为反向代理
- 配置 SSL 证书

## 故障排除

### API 调用失败

1. 检查 Vercel 函数日志：项目设置 → Functions → 查看日志
2. 确认环境变量已正确设置
3. 检查 API key 是否有效

### CORS 错误

确保 `vercel.json` 中的 CORS 配置包含你的域名。

### 构建失败

1. 检查 `package.json` 中的依赖
2. 确认 Node.js 版本兼容性（Vercel 默认使用 Node.js 18+）
3. 查看构建日志中的具体错误信息

