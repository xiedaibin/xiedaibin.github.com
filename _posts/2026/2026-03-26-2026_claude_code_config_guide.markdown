---
layout: page
title: "Claude Code 接入国产大模型完整配置指南"
category: 技术
tags: Claude, Claude Code, AI, 国产模型, 智谱, GLM, 阿里, Qwen, DeepSeek
---

> 适用于智谱 GLM / 阿里 Qwen / DeepSeek 等兼容 Anthropic 协议的服务商

---

## 一、背景与原理

**Claude Code** 是 Anthropic 官方推出的命令行 AI 编程工具，默认使用 Claude 系列模型。但通过环境变量配置，可以将其底层模型替换为任意兼容 Anthropic Messages API 协议的第三方服务商，比如国内的智谱 GLM、阿里 Qwen、DeepSeek 等。

其核心原理是：Claude Code 通过三个「别名」来调用模型：

| 别名 | 用途 |
|------|------|
| `haiku` | 轻量快速任务 |
| `sonnet` | 日常主力任务 |
| `opus` | 复杂高质量任务 |

只需将这三个别名映射到国产模型对应的真实 ID，并将 API 请求地址指向支持 Anthropic 协议的服务商端点，即可完成接入。

> ⚠️ **前提条件**：服务商必须支持 Anthropic Messages API 格式（`/v1/messages` 端点）。智谱 GLM、阿里百炼、DeepSeek 均已支持该协议。

---

## 二、核心配置文件

Claude Code 的全局配置文件位于：

```
~/.claude/settings.json
```

如果文件不存在，手动创建即可。以下是关键的环境变量说明：

| 配置项 | 说明 |
|--------|------|
| `ANTHROPIC_AUTH_TOKEN` | 对应服务商的 API Key |
| `ANTHROPIC_BASE_URL` | 服务商兼容 Anthropic 协议的 API 地址 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | 映射到 haiku 别名的实际模型 ID |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | 映射到 sonnet 别名的实际模型 ID |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | 映射到 opus 别名的实际模型 ID |
| `API_TIMEOUT_MS` | 请求超时时间（毫秒），建议设为 `3000000` |

---

## 三、以智谱 GLM 为例（完整配置）

### 3.1 国内版（open.bigmodel.cn）

编辑 `~/.claude/settings.json`，填入以下内容：

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "your_zhipu_api_key",
    "ANTHROPIC_BASE_URL": "https://open.bigmodel.cn/api/anthropic",
    "API_TIMEOUT_MS": "3000000",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-4.5-air",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-4.7",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-4.7"
  }
}
```

### 3.2 国际版（Z.AI）

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "your_zai_api_key",
    "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
    "API_TIMEOUT_MS": "3000000",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-4.5-air",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-4.7",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-4.7"
  }
}
```

---

## 四、其他国产模型参考

| 服务商 | 主要模型 ID | Base URL |
|--------|-------------|----------|
| 智谱 AI（国内） | `glm-4.7` / `glm-4.5-air` | `https://open.bigmodel.cn/api/anthropic` |
| Z.AI（国际） | `glm-4.7` / `glm-4.5-air` | `https://api.z.ai/api/anthropic` |
| 阿里云百炼 | `qwen-max` / `qwen-plus` | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| DeepSeek | `deepseek-chat` / `deepseek-coder` | `https://api.deepseek.com/v1` |

> 💡 不同服务商的 Base URL 路径可能不同，请以各服务商官方文档为准。部分服务商需要在 URL 末尾加 `/v1`，请注意区分。

---

## 五、跳过 Anthropic 账号登录

Claude Code 首次启动时会要求登录 Anthropic 账号。若使用第三方模型，需要跳过此步骤，编辑 `~/.claude.json`，确保包含以下字段：

```json
{ "hasCompletedOnboarding": true }
```

也可以通过命令行快速写入：

```bash
echo '{"hasCompletedOnboarding": true}' > ~/.claude.json
```

---

## 六、常见错误排查

### 错误：`There's an issue with the selected model (GLM-5)`

- **原因**：模型 ID 填写有误，`GLM-5` 并不是真实存在的模型名。
- **解决**：将模型 ID 改为真实 ID，例如 `glm-4.7` 或 `glm-4.5-air`。运行 `/model` 命令可查看当前配置。

### 错误：`401 Unauthorized`

- **原因**：API Key 不正确或已过期。
- **解决**：检查 `ANTHROPIC_AUTH_TOKEN` 的值是否为目标服务商的 Key，而非 Anthropic 官方 Key。

### 错误：请求超时

- **原因**：默认超时时间过短，国内网络请求部分模型延迟较高。
- **解决**：在配置中加入 `"API_TIMEOUT_MS": "3000000"`（即 50 分钟超时）。

---

## 七、验证配置是否生效

重新启动 Claude Code 后，在对话中执行：

```
/model
```

查看输出中的模型名，确认已切换到目标模型 ID（如 `glm-4.7`）。首次响应正常返回，即说明配置成功。

---

配置完成后，即可在 Claude Code 中享受国产大模型的编程辅助能力 🚀
