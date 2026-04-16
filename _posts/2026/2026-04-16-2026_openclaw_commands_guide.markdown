---
layout: page
title: "OpenClaw 常用指令全指南（速查手册）"
category: 技术
tags: OpenClaw, CLI, openclaw, gateway, logs, ###, Logs, follow
---


在使用 OpenClaw 进行日常运维或调试时，掌握高效的 CLI 指令可以大大提升效率。本文将指令分为六大核心模块，并总结了最高频的运维场景。

## 1. 核心运维速查（最常用）

如果你是初学者或日常维护人员，以下四条命令可以解决 90% 的问题：
* **应用配置：** `openclaw gateway restart`（修改 `~/.openclaw/openclaw.json` 后必须执行）
* **实时排错：** `openclaw logs --follow`
* **全面体检：** `openclaw doctor`（支持自动修复常见环境问题）
* **状态确认：** `openclaw gateway status`

---

## 2. 功能指令详解

### 🌐 网关管理 (Gateway)
用于控制 OpenClaw 核心服务的运行状态。
| 指令 | 说明 |
| :--- | :--- |
| `openclaw gateway start` | 启动网关服务 |
| `openclaw gateway stop` | 停止网关服务 |
| `openclaw gateway restart` | **重启网关（修改配置后必用）** |
| `openclaw gateway status` | 查看网关运行状态 |
| `openclaw gateway health` | 快速健康检查 |
| `openclaw gateway probe` | 连接探测（调试连接性） |
| `openclaw gateway install` | 将 OpenClaw 安装为系统服务（支持开机自启） |

### 🔍 日志与诊断 (Logs & Diagnostics)
当服务运行异常或需要观察流量时使用。
| 指令 | 说明 |
| :--- | :--- |
| `openclaw logs --follow` | 实时跟踪日志（按 `Ctrl+C` 退出） |
| `openclaw logs --follow --json` | 以 JSON 格式输出日志（方便配合 `jq` 使用） |
| `openclaw logs --tail 300` | 查看最近 300 行历史日志 |
| `openclaw doctor` | 系统环境体检 |
| `openclaw doctor --fix` | **自动修复**常见的配置或依赖问题 |
| `openclaw doctor --deep` | 深度扫描（含各插件与服务连接检测） |
| `openclaw status --all` | 输出全量系统状态 |

### 🧠 模型与认证 (Models & Auth)
管理大语言模型（LLM）的接入与 API 密钥。
| 指令 | 说明 |
| :--- | :--- |
| `openclaw models list --all` | 列出当前所有可用的模型列表 |
| `openclaw models status --probe` | 实时探测模型 API 的认证状态 |
| `openclaw models set <model>` | 设置全局默认主模型 |
| `openclaw models auth setup-token` | 配置 Anthropic 官方认证 Token |
| `openclaw models auth add --provider <p>` | 添加其他服务商（如 OpenAI, Groq 等）的 API Key |
| `/model status` | **（对话内指令）** 查看当前会话的模型与端点信息 |

### 🛠️ 提示词与上下文调试 (Debug)
用于优化 Agent 的表现及排查 Prompt 注入问题。
| 指令 | 说明 |
| :--- | :--- |
| `openclaw agents view-system-prompt` | 查看 Agent 当前加载的完整系统提示词 |
| `/context detail` | **（对话内指令）** 查看当前上下文的组成部分与 Token 大小 |
| `/verbose` | **（对话内指令）** 开启详细输出模式 |
| `/trace` | **（对话内指令）** 开启插件执行的 Trace 路径输出 |
| `openclaw --log-level debug gateway` | 以 Debug 级别启动网关（排查深层 Bug） |

### 📱 频道管理 (Channels)
配置 Telegram、Discord、WhatsApp 等外部接入渠道。
| 指令 | 说明 |
| :--- | :--- |
| `openclaw channels list` | 列出所有已配置的通讯频道 |
| `openclaw channels status --probe` | 检测各频道（如 Bot 是否在线）的实际连接健康度 |
| `openclaw channels add telegram --bot-token <tok>` | 快速添加 Telegram Bot |
| `openclaw channels add discord --bot-token <tok>` | 快速添加 Discord Bot |
| `openclaw channels login` | 弹出 WhatsApp 扫码配对界面 |

### ⚙️ 系统与配置 (System)
直接操作配置文件及系统更新。
| 指令 | 说明 |
| :--- | :--- |
| `openclaw config get <key>` | 读取特定配置项 |
| `openclaw config set <key> <value>` | 写入特定配置项 |
| `openclaw dashboard` | 在浏览器中打开 Web 控制面板 |
| `openclaw update` | 检查并更新 OpenClaw 到最新版本 |
| `openclaw --version` | 查看版本信息 |

---

## 3. 运维小贴士

1.  **配置生效：** 所有的配置修改推荐通过 `openclaw config set` 命令完成，这比直接编辑 `openclaw.json` 更安全，能避免格式错误。修改后切记执行 `openclaw gateway restart`。
2.  **静默运行：** 建议使用 `openclaw gateway install` 将其注册为守护进程，这样即使关闭终端，OpenClaw 也会在后台持续运行。
3.  **调试利器：** 如果模型不听话，先用 `/context detail` 看看上下文是否过载，再用 `view-system-prompt` 检查逻辑是否被正确注入。

---
*本文档基于 OpenClaw 常用指令速查表整理。*