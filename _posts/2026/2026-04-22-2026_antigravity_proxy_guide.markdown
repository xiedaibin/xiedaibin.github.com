---
layout: page
title: "在中国使用 Antigravity 编辑器：无需 TUN 模式的代理配置指南"
category: 技术
tags: Antigravity, TUN, v2rayN, baidu, github, proxy, ###, Proxy
---


## 问题背景

Antigravity 编辑器在中国无法直接使用，通常需要开启 Clash/v2rayN 的 TUN 模式才能正常工作。TUN 模式会全局接管所有流量，导致访问国内网站（如 baidu.com）变慢，且需要管理员权限。

本文介绍如何通过 **Antigravity-Proxy** 工具，在不开启 TUN 模式的情况下让 Antigravity 正常使用，同时不影响国内网站访问速度。

---

## 工具准备

- **Antigravity-Proxy**：https://github.com/yuaotian/antigravity-proxy
- **v2rayN**：代理客户端（本文以 v2rayN 为例，使用其他客户端原理相同）

---

## 配置步骤

### 第一步：部署 Antigravity-Proxy

从 Release 页面下载 `version.dll` 和 `config.json`，复制到 Antigravity 安装目录（与 `Antigravity.exe` 同级）：

```
C:\Users\<用户名>\AppData\Local\Programs\Antigravity\
├── Antigravity.exe
├── version.dll      ← 放这里
└── config.json      ← 放这里
```

### 第二步：配置 config.json

关键点有三个：
- `proxy.type` 必须是 `socks5`，对应 v2rayN 的 10808 端口（**不能用 http**，10808 是 SOCKS5 入站，协议不匹配会静默失败）
- `dns_mode` 必须是 `proxy`（该版本不支持 `fake_ip` 作为 dns_mode 的值）
- 超时时间适当调大，避免流式响应被截断

完整配置如下：

```json
{
    "_version": "1.8",
    "proxy": {
        "host": "127.0.0.1",
        "port": 10808,
        "type": "socks5"
    },
    "fake_ip": {
        "enabled": true,
        "cidr": "198.18.0.0/15"
    },
    "timeout": {
        "connect": 10000,
        "send": 30000,
        "recv": 60000
    },
    "child_injection": true,
    "child_injection_mode": "filtered",
    "child_injection_exclude": [],
    "target_processes": [
        "language_server_windows",
        "Antigravity.exe"
    ],
    "proxy_rules": {
        "allowed_ports": [80, 443],
        "dns_mode": "proxy",
        "ipv6_mode": "proxy",
        "udp_mode": "block",
        "udp_fallback": "block",
        "routing": {
            "enabled": true,
            "default_action": "proxy",
            "use_default_private": true,
            "priority_mode": "order",
            "rules": []
        }
    },
    "traffic_logging": false,
    "log_level": "info"
}
```

### 第三步：配置 v2rayN 路由规则

Antigravity 的部分请求走 Windows 系统代理（WinINet），不经过 Winsock，antigravity-proxy 的 Hook 拦截不到这部分流量，因此需要在 v2rayN 的路由规则里明确指定这些域名走代理。

打开 v2rayN → 设置 → 路由设置 → 在**代理（Proxy）**域名列表中添加：

```
domain:googleapis.com
domain:googleusercontent.com
domain:goog
domain:google.com
```

路由模式选择**绕过大陆**（而非全局），这样国内域名直连，Google 相关域名强制走代理。

### 第四步：配置 v2rayN 系统代理

系统代理设置选择**自动配置系统代理**（普通模式），**不要用 PAC 模式**。

PAC 模式只代理 PAC 文件中匹配的域名，Google AI 服务域名不在 PAC 规则里，会导致部分请求无法走代理。

---

## 常见问题排查

### 问题一：日志中大量 UDP 阻断警告
```
connect: 已阻止 UDP 连接(策略: udp_mode=block, 说明: 禁用 QUIC/HTTP3)
```
**这是正常现象**，不是故障。日志中也明确说明"WSA错误码为策略阻断返回，并非真实网络故障"。Antigravity 尝试用 QUIC/HTTP3（UDP）连接 Google DNS，被策略阻断后会自动回退到 TCP，不影响正常使用。

### 问题二：配置 dns_mode: fake_ip 报错
```
配置: proxy_rules.dns_mode 无效(fake_ip)，已回退为 direct
```
v2rayN 1.8 版本的 `dns_mode` 只支持 `direct` 和 `proxy` 两个值，不支持 `fake_ip`，改为 `proxy` 即可。

### 问题三：隧道建立成功但 AI 回复一直 Loading
流量链路正常但没有响应，通常有两个原因：
1. v2rayN 路由模式不是全局/绕过大陆+自定义规则，导致 Google AI 服务域名被直连或拦截
2. 系统代理用了 PAC 模式，部分请求没走代理

按本文第三、四步配置即可解决。

---

## 原理说明

Antigravity 的网络请求分为两类：

| 请求类型 | 走的接口 | antigravity-proxy 能否拦截 |
|---------|---------|--------------------------|
| 大部分连接请求 | Winsock（connect/ConnectEx） | ✅ 能拦截，SOCKS5 隧道转发 |
| 部分认证/系统请求 | Windows 系统代理（WinINet） | ❌ 拦截不到，需要 v2rayN 系统代理接管 |

因此需要 **antigravity-proxy + v2rayN 系统代理** 两者配合，缺一不可。

---

## 最终效果

- ✅ 无需开启 TUN 模式
- ✅ 无需全局代理
- ✅ Antigravity AI 功能正常使用
- ✅ 国内网站（baidu.com 等）直连，速度不受影响
- ✅ 普通用户权限即可运行