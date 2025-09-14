# Claude 到 gcli2api 代理

将 Claude API 调用转换为与 gcli2api 的 Gemini 后端兼容的代理服务器，通过 gcli2api 服务使 Claude Code 能够使用 Google 的 Gemini 模型。

## 特性

- **模型映射**：自动将 Claude 模型映射到合适的 Gemini 模型
- **完全兼容**：支持工具调用、MCP 和图像识别
- **多种部署选项**：部署在 Cloudflare Workers 或 Render 上
- **CORS 支持**：可配置 CORS 以支持网络应用
- **错误处理**：全面的错误处理和日志记录

## 模型映射

| Claude 模型          | Gemini 模型                          | 用途               |
|----------------------|--------------------------------------|--------------------|
| claude-sonnet-4-20250514 | gemini-2.5-pro-preview-05-06-maxthinking | 强推理 (Strong reasoning) |
| claude-3-5-sonnet-*   | gemini-2.5-pro-preview-05-06-maxthinking | 强推理 (Strong reasoning) |
| claude-3-5-haiku-*    | gemini-2.5-flash                     | 速度相对快 (Relatively fast) |
| claude-3-opus-*       | gemini-2.5-pro-preview-05-06-maxthinking | 强推理 (Strong reasoning) |

## 先决条件

1. **gcli2api 部署**：您需要一个可正常工作的 gcli2api 部署
   - 仓库：https://github.com/su-kaka/gcli2api
   - 获取您的部署 URL 和密码

## 部署选项

### 选项 1：Cloudflare Workers（推荐）

1. **安装依赖项**：
   ```bash
   npm install
   ```

2. **设置环境变量**：
   ```bash
   # 设置您的 gcli2api 部署 URL 和密码
   wrangler secret put GCLI2API_URL --env production
   wrangler secret put GCLI2API_PASSWORD --env production
   ```

3. **部署**：
   ```bash
   npm run deploy:production
   ```

4. **您的代理将在以下地址可用**：`https://your-worker.your-subdomain.workers.dev`

### 选项 2：Render

1. **将此存储库 fork 到您的 GitHub 账户**

2. **在 Render 上创建新的 Web 服务**：
   - 连接您的 GitHub 存储库
   - 使用以下设置：
     - **构建命令**：`npm install && npm run build`
     - **启动命令**：`npm start`

3. **在 Render 控制面板中设置环境变量**：
   - `GCLI2API_URL`：您的 gcli2api 部署 URL
   - `GCLI2API_PASSWORD`：您的 gcli2api 密码
   - `PORT`：10000（由 Render 自动设置）
   - `CORS_ORIGIN`：`*`（或您的特定域）

4. **部署**：Render 将自动部署您的服务

## Claude Code 配置

### 使用生成的 settings.json

1. **更新 settings.json 文件**：
   ```json
   {
     "apiUrl": "https://your-proxy-deployment.com/v1/messages",
     "apiKey": "sk-your-claude-api-key",
     "models": [
       {
         "id": "claude-sonnet-4-20250514",
         "name": "Claude Sonnet 4（通过 Gemini 2.5 Pro MaxThinking）",
         "contextWindow": 200000,
         "maxTokens": 8192
       }
     ],
     "defaultModel": "claude-sonnet-4-20250514"
   }
   ```

2. **替换占位符**：
   - `https://your-proxy-deployment.com` → 您的实际代理部署 URL
   - `sk-your-claude-api-key` → 任意字符串（未使用，但 Claude Code 所需）

3. **应用配置**：
   - 将配置复制到您的 Claude Code 设置中
   - 或将 settings.json 文件作为参考

### 手动配置

如果您更喜欢手动配置 Claude Code：

```json
{
  "customEndpoints": [
    {
      "name": "通过 gcli2api 的 Gemini",
      "baseUrl": "https://your-proxy-deployment.com",
      "apiKey": "dummy-key",
      "models": [
        "claude-sonnet-4-20250514",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-opus-20240229"
      ]
    }
  ]
}
```

## 环境变量

| 变量               | 描述                          | 是否必需 | 默认值   |
|--------------------|-------------------------------|----------|----------|
| `GCLI2API_URL`      | 您的 gcli2api 部署 URL         | ✅       | -        |
| `GCLI2API_PASSWORD` | 您的 gcli2api 密码             | ✅       | -        |
| `CORS_ORIGIN`       | 允许的 CORS 起源               | ❌       | `*`      |
| `PORT`              | 服务器端口（仅 Render 适用）   | ❌       | `10000`  |

## API 端点

| 端点           | 方法 | 描述                     |
|----------------|------|--------------------------|
| `/v1/messages` | POST | 与 Claude 兼容的聊天补全 |
| `/v1/models`   | GET  | 可用模型列表             |
| `/health`      | GET  | 健康检查                 |

## 测试

测试您的部署：

```bash
curl -X POST "https://your-proxy-deployment.com/v1/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dummy-key" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "messages": [
      {"role": "user", "content": "你好，你怎么样？"}
    ],
    "max_tokens": 1000
  }'
```

## 故障排除

### 常见问题

1. **"缺少必需的环境变量"**：
   - 确保 GCLI2API_URL 和 GCLI2API_PASSWORD 设置正确

2. **CORS 错误**：
   - 将 CORS_ORIGIN 设置为您的 Claude Code 客户端域
   - 或在开发时使用 *（不建议在生产中使用）

3. **gcli2api 连接错误**：
   - 验证您的 gcli2api 部署是否正在运行
   - 检查 URL 格式（应包含 https://）
   - 验证密码是否正确

### 日志

- **Cloudflare Workers**：使用 `wrangler tail` 查看日志
- **Render**：在 Render 仪表板中查看日志

## 架构

```
Claude Code → 代理服务器 → gcli2api → Google Gemini API
```

1. **Claude Code** 发送以 Claude API 格式封装的请求
2. **代理服务器** 转换请求并映射模型
3. **gcli2api** 处理身份验证和 API 转换
4. **Google Gemini API** 处理请求

## 许可协议

MIT 许可证 - 详情见 [LICENSE](LICENSE) 文件。

## 贡献

1. 叉出存储库
2. 创建功能分支
3. 进行修改
4. 彻底测试
5. 提交合并请求

## 支持

如果您遇到问题：

1. 查看故障排除部分
2. 查看日志
3. 确保您的 gcli2api 部署正常运行
4. 提交包含详细信息的问题单
# Claude to gcli2api Proxy

A proxy server that converts Claude API calls to work with gcli2api's Gemini backend, enabling Claude Code to use Google's Gemini models through the gcli2api service.

## Features

- **Model Mapping**: Automatically maps Claude models to appropriate Gemini models
- **Full Compatibility**: Supports tool calls, MCP, and image recognition
- **Multiple Deployment Options**: Deploy on Cloudflare Workers or Render
- **CORS Support**: Configurable CORS for web applications
- **Error Handling**: Comprehensive error handling and logging

## Model Mappings

| Claude Model | Gemini Model | Purpose |
|--------------|--------------|---------|
| claude-sonnet-4-20250514 | gemini-2.5-pro-preview-05-06-maxthinking | 强推理 (Strong reasoning) |
| claude-3-5-sonnet-* | gemini-2.5-pro-preview-05-06-maxthinking | 强推理 (Strong reasoning) |
| claude-3-5-haiku-* | gemini-2.5-flash | 速度相对快 (Relatively fast) |
| claude-3-opus-* | gemini-2.5-pro-preview-05-06-maxthinking | 强推理 (Strong reasoning) |

## Prerequisites

1. **gcli2api Deployment**: You need a working gcli2api deployment
   - Repository: https://github.com/su-kaka/gcli2api
   - Get your deployment URL and password

## Deployment Options

### Option 1: Cloudflare Workers (Recommended)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set environment variables**:
   ```bash
   # Set your gcli2api deployment URL and password
   wrangler secret put GCLI2API_URL --env production
   wrangler secret put GCLI2API_PASSWORD --env production
   ```

3. **Deploy**:
   ```bash
   npm run deploy:production
   ```

4. **Your proxy will be available at**: `https://your-worker.your-subdomain.workers.dev`

### Option 2: Render

1. **Fork this repository** to your GitHub account

2. **Create a new Web Service on Render**:
   - Connect your GitHub repository
   - Use the following settings:
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`

3. **Set Environment Variables in Render Dashboard**:
   - `GCLI2API_URL`: Your gcli2api deployment URL
   - `GCLI2API_PASSWORD`: Your gcli2api password
   - `PORT`: 10000 (automatically set by Render)
   - `CORS_ORIGIN`: `*` (or your specific domain)

4. **Deploy**: Render will automatically deploy your service

## Claude Code Configuration

### Using the Generated settings.json

1. **Update the settings.json file**:
   ```json
   {
     "apiUrl": "https://your-proxy-deployment.com/v1/messages",
     "apiKey": "sk-your-claude-api-key",
     "models": [
       {
         "id": "claude-sonnet-4-20250514",
         "name": "Claude Sonnet 4 (via Gemini 2.5 Pro MaxThinking)",
         "contextWindow": 200000,
         "maxTokens": 8192
       }
     ],
     "defaultModel": "claude-sonnet-4-20250514"
   }
   ```

2. **Replace placeholders**:
   - `https://your-proxy-deployment.com` → Your actual proxy deployment URL
   - `sk-your-claude-api-key` → Any string (not used, but required by Claude Code)

3. **Apply configuration**:
   - Copy the configuration to your Claude Code settings
   - Or use the settings.json file as reference

### Manual Configuration

If you prefer to configure Claude Code manually:

```json
{
  "customEndpoints": [
    {
      "name": "Gemini via gcli2api",
      "baseUrl": "https://your-proxy-deployment.com",
      "apiKey": "dummy-key",
      "models": [
        "claude-sonnet-4-20250514",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-opus-20240229"
      ]
    }
  ]
}
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GCLI2API_URL` | Your gcli2api deployment URL | ✅ | - |
| `GCLI2API_PASSWORD` | Your gcli2api password | ✅ | - |
| `CORS_ORIGIN` | Allowed CORS origins | ❌ | `*` |
| `PORT` | Server port (Render only) | ❌ | `10000` |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/messages` | POST | Claude-compatible chat completions |
| `/v1/models` | GET | Available models list |
| `/health` | GET | Health check |

## Testing

Test your deployment:

```bash
curl -X POST "https://your-proxy-deployment.com/v1/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dummy-key" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "max_tokens": 1000
  }'
```

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**:
   - Ensure `GCLI2API_URL` and `GCLI2API_PASSWORD` are set correctly

2. **CORS errors**:
   - Set `CORS_ORIGIN` to your Claude Code client domain
   - Or use `*` for development (not recommended for production)

3. **gcli2api connection errors**:
   - Verify your gcli2api deployment is running
   - Check the URL format (should include `https://`)
   - Verify the password is correct

### Logs

- **Cloudflare Workers**: Use `wrangler tail` to view logs
- **Render**: Check the logs in the Render dashboard

## Architecture

```
Claude Code → Proxy Server → gcli2api → Google Gemini API
```

1. **Claude Code** sends requests in Claude API format
2. **Proxy Server** converts requests and maps models
3. **gcli2api** handles authentication and API conversion
4. **Google Gemini API** processes the requests

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

If you encounter issues:

1. Check the troubleshooting section
2. Review the logs
3. Ensure your gcli2api deployment is working
4. Open an issue with detailed information