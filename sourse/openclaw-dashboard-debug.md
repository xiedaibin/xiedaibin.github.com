# OpenClaw Dashboard 无法登录排查全记录

> 本文记录了一次 OpenClaw Dashboard 显示 `unauthorized: too many failed authentication attempts` 的完整排查过程，核心方法论对排查各类 Gateway 认证问题有通用参考价值。

---

## 问题现象

访问 `http://127.0.0.1:18789/` 时报错：

```
unauthorized: too many failed authentication attempts (retry later)
```

看起来像是被封锁了，实际上并非如此。

---

## 排查过程

### 第一步：确认 Gateway 是否正常运行

```bash
openclaw gateway status
```

输出显示 `Runtime: running (pid xxxxxx, state active)`，说明 Gateway 本身没有问题，排除服务崩溃的可能。

### 第二步：重启 Gateway 尝试解除封锁

```bash
openclaw gateway restart
```

重启后问题依然存在，说明封锁状态不是根因。

### 第三步：查找锁定文件

```bash
find ~/.openclaw -name "*.lock" -o -name "auth-state*" -o -name "rate-limit*"
```

没有找到任何锁定文件，进一步排除"被封锁"的判断。

### 第四步：读日志（关键步骤）

```bash
tail -50 /tmp/openclaw/openclaw-2026-03-12.log | grep -i "auth\|failed\|block\|rate"
```

日志输出片段：

```json
{
  "authReason": "token_missing",
  "reason": "unauthorized: gateway token missing (open the dashboard URL and paste the token in Control UI settings)"
}
```

**真相大白**：错误原因不是"封锁"，而是 **token 根本没有传给服务器**。浏览器访问 Dashboard 时没有携带认证 token，Gateway 持续拒绝连接，触发了"too many failed attempts"的表面错误，掩盖了真正原因。

---

## 根本原因

OpenClaw Dashboard 使用 WebSocket 连接，认证 token 需要在 **Control UI 设置界面** 中手动填入，而不是通过 HTTP Basic Auth 或 Cookie 自动传递。

配置文件中虽然有 token：

```json
"auth": {
  "mode": "token",
  "token": "your-token-here"
}
```

但这只是服务端校验用的，客户端（浏览器）需要主动提交这个 token。

---

## 解决方法

**方法一：在 Dashboard UI 中填入 token**

打开 Dashboard 后找到 Control UI Settings，将 `openclaw.json` 中的 token 粘贴进去。

**方法二：通过 URL 参数传入 token**

```
http://127.0.0.1:18789/?token=your-token-here
```

或：

```
http://127.0.0.1:18789/chat?session=main&token=your-token-here
```

---

## 核心方法论总结

### 1. 不要被表面错误误导

`too many failed authentication attempts` 这类错误信息往往是结果，不是原因。本案例中真正的原因是 `token_missing`，但被"多次失败"的表象掩盖了。

### 2. 日志是最可靠的信息源

任何排查的第一动作应该是读日志，而不是凭经验猜测：

```bash
# 读最新日志并过滤关键词
tail -50 /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log | grep -i "auth\|failed\|block\|rate\|error"
```

日志中的 `authReason` 字段直接告诉你认证失败的精确原因，比任何错误提示都可靠。

### 3. 排查顺序：从简单到复杂

| 步骤 | 命令 | 目的 |
|------|------|------|
| 1 | `openclaw gateway status` | 确认服务是否运行 |
| 2 | `openclaw gateway restart` | 尝试清除内存状态 |
| 3 | `find ~/.openclaw -name "*.lock"` | 查找锁定文件 |
| 4 | `tail -50 /tmp/openclaw/*.log \| grep -i "auth"` | **读日志找真因** |

### 4. grep 过滤日志的关键词组合

针对不同问题类型，常用的过滤关键词：

```bash
# 认证问题
grep -i "auth\|token\|unauthorized\|forbidden"

# 连接问题
grep -i "failed\|error\|timeout\|refused"

# 限流/封锁问题
grep -i "rate\|limit\|block\|retry"

# 组合使用
grep -i "auth\|failed\|block\|rate\|error"
```

---

## 延伸：SSH 隧道访问内网 Dashboard

OpenClaw Gateway 默认绑定在 `127.0.0.1`（loopback），不对外暴露。在本地访问远程服务器的 Dashboard，需要 SSH 隧道：

```bash
# 在本地电脑执行
ssh -L 18789:127.0.0.1:18789 root@your-server-ip -N
```

然后本地浏览器打开 `http://127.0.0.1:18789/` 即可。

---

*排查环境：OpenClaw 2026.2.26，OpenCloudOS 9，Node 22.22.0*
