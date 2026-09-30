---
layout: page
title: "VMess + WS + TLS + Cloudflare 延迟 -1？一次\"分层排查\"的复盘"
category: 技术
tags: VMess, TLS, Cloudflare, v2rayN, VPS, Reality, WebSocket, UUID
---


> 现象：昨天还好好的，今天 v2rayN 里节点延迟显示 -1。同一台 VPS 上的 Reality 直连节点一切正常。
> 结论：根因是**本机时间漂移**。TCP、TLS、WebSocket 全都是通的，只有 VMess 认证失败。
> 这篇文章记录完整的排查思路和可直接复制的命令，希望下次能在 5 分钟内定位问题。

文中的域名、IP、UUID 均已替换为占位符：

| 占位符 | 含义 |
|---|---|
| `example.com` | 你的域名（走 Cloudflare 橙云） |
| `VPS_IP` | VPS 真实 IP |
| `/YOUR_UUID` | WebSocket path，一般是 `/` 加 UUID |

---

## 一、环境与架构

```
客户端(v2rayN/Xray) → 本地网络 → Cloudflare → Caddy(443) → sing-box(WS 入站) → 出网
```

- 服务端：sing-box（使用一键脚本部署），Caddy 负责监听 443 并自动签发证书，反代到 sing-box 的 WS 入站
- 节点：`VMess-WS-TLS`，域名开启 Cloudflare 橙云
- 对照节点：同机 `VLESS-REALITY`，直连，不经过 Cloudflare

## 二、先看结论：30 秒快速清单

**遇到"昨天好、今天 -1"，先同步时间。** 这一步最快，也最容易被忽略。

```cmd
:: 立即同步时间（管理员 cmd）
w32tm /resync

:: 查看同步状态和偏差
w32tm /query /status

:: 对比本机时间与网络时间（都是 GMT）
curl -sI https://www.cloudflare.com | findstr /i "^date"
powershell -c "(Get-Date).ToUniversalTime().ToString('ddd, dd MMM yyyy HH:mm:ss') + ' GMT'"
```

两个时间相差超过 30 秒，基本就是它了。

**为什么时间会导致 -1？** VMess 用时间戳参与认证，客户端与服务端时间差超过约 2 分钟（实际建议控制在 30 秒内）就会握手失败。而这一步发生在 TCP、TLS、WebSocket 都建立成功**之后**，所以你用 curl 测底层链路会发现"一切正常"，非常有迷惑性。

## 三、核心方法：按链路分层，逐段验证

不要凭感觉猜，用一条命令确认一层，通了再往下走。

### 第 1 层：DNS

```cmd
nslookup example.com
```

- 返回 `104.x`、`172.67.x` 等 Cloudflare 的 IP：橙云正常
- 返回 VPS 真实 IP：灰云，或者 DNS 记录被改过

### 第 2 层：本地 → Cloudflare → Caddy → sing-box

```cmd
curl -vk https://example.com/YOUR_UUID
```

从输出里找这几个标志：

- `Established connection`：本地到 Cloudflare 通
- `via: 1.1 Caddy`：Cloudflare 回源到 Caddy 通
- `handshake error: bad "Upgrade" header`：请求已到达 sing-box 的 WS 入站。这里返回 400 是**正常的**，因为 curl 没带 WebSocket 升级头

### 第 3 层：WebSocket 升级测试

```cmd
curl -vk --http1.1 -m 15 -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" https://example.com/YOUR_UUID
```

- 返回 `101 Switching Protocols`：WS 通道完全正常。之后 15 秒超时是正常现象，因为 curl 不会发 VMess 数据，连接就一直挂着
- `Sec-WebSocket-Key` 用的是 RFC 6455 里的公开示例值，不是密钥

> **关键判断点：只要 101 通了，而客户端仍然 -1，问题就在 WS 之上的 VMess 层**（时间、UUID、加密方式、客户端配置）。这时不要再折腾 Cloudflare 和服务器了。这次我就是在这里才把方向转对的。

### 第 4 层：响应耗时

```cmd
curl -sk -o NUL -w "connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}\n" https://example.com/
```

多跑几次。`ttfb` 经常超过几秒，说明 Cloudflare 回源到 VPS 这段慢，可能导致测速超时。

## 四、服务端检查（VPS）

```bash
# 服务状态
systemctl status caddy sing-box

# 80/443 谁在监听
ss -tlnp | grep -E ':80|:443'

# 负载与运行时间
uptime

# Caddy 日志：看证书续期、报错
journalctl -u caddy -n 50 --no-pager

# 在 VPS 本机直接测源站（绕过 Cloudflare）
curl -vk --resolve example.com:443:127.0.0.1 https://example.com/YOUR_UUID

# 时间同步状态
date -u
timedatectl
chronyc tracking        # 如果装了 chrony

# 防火墙
firewall-cmd --list-all
iptables -L -n | head -50
fail2ban-client status  # 如果装了 fail2ban

# 线路质量（没装先装）
yum install -y mtr      # Debian/Ubuntu 用 apt install -y mtr-tiny
mtr -rwc 50 104.21.34.165
```

**踩坑提示：** 用一键脚本装的 sing-box，日志通常不走 journald，`journalctl -u sing-box` 会显示 `No entries`，这不代表有问题。用脚本自带命令：

```bash
sing-box info       # 查看配置、链接、UUID、path
sing-box log        # 查看日志
sing-box restart    # 重启
sing-box change     # 修改配置（如更换 UUID）
```

这次服务端的结果：负载几乎为 0，Caddy 只有正常的证书续期检查日志，证书有效期充足。服务端完全没问题。

## 五、客户端检查（v2rayN）

**开 debug 日志：** 设置 → Core 基础设置 → 日志级别改为 `debug`，点"真实延迟测试"，在日志里找报错：

| 日志关键字 | 含义 |
|---|---|
| `i/o timeout` | 本地到 Cloudflare 网络不通，换网络或用优选 IP |
| `connection reset` | 被干扰 |
| `tls: handshake` | 证书或 SNI 问题 |
| `websocket: bad handshake` | 已到服务端，查 Caddy 反代和 path |
| `EOF` / `vmess` 相关 | 多半是 UUID、时间或加密方式问题 |

**节点配置核对清单：**

- 地址填域名，端口 `443`，TLS 开启
- Host 和 SNI 都填域名
- path 与服务端完全一致
- ALPN 留空或填 `http/1.1`，**不要填 `h2`**（WS 必须走 HTTP/1.1）
- alterId 填 `0`，加密方式 `auto`
- Mux、分片（Fragment）、自定义 DNS 先关掉，用最干净的配置测

**最保险的做法：** 删掉节点，用服务端 `sing-box info` 输出的链接重新导入，避免手动改坏某个字段。

## 六、状态码速查

| 返回 | 含义 | 处理 |
|---|---|---|
| 101 | WS 升级成功 | 通道正常，查 VMess 层（时间、UUID） |
| 400 / 426 | 到达 Caddy 或 sing-box | 链路通 |
| 520 / 521 / 522 | Cloudflare 连不上源站 | 查 Caddy 是否运行、443 是否放行 |
| 523 / 524 | 源站不可达或响应超时 | 查 VPS 线路、负载 |
| 525 / 526 | Cloudflare 与源站 TLS 失败 | 查证书、SSL 模式（用 Full / Full strict，不能用 Flexible） |
| 超时或连接重置 | 本地到 Cloudflare 网络问题 | 换网络，或使用优选 IP |

## 七、排查决策顺序

```
延迟 -1
 ├─ 1. 同步时间 (w32tm /resync)           ← 最快，最容易被忽略
 ├─ 2. 换节点对照（如 Reality 是否正常）   ← 区分客户端问题还是该节点问题
 ├─ 3. 分层 curl，找到断在哪一层
 │     DNS → TCP/TLS → Caddy → sing-box → 101
 ├─ 4. 101 正常 → 只查 VMess 层，别再查 Cloudflare
 ├─ 5. debug 日志看真实报错
 ├─ 6. 服务端：status、日志、证书、防火墙
 ├─ 7. 灰云对照：区分 Cloudflare 问题还是源站问题
 └─ 8. 最后才考虑：SSL 模式、优选 IP、运营商干扰
```

## 八、这次走过的弯路

最开始我把重点放在了 Cloudflare 的 SSL 模式、Caddy 证书、本地到 Cloudflare 的网络质量上。这些确实是"节点连不上"最常见的原因，但这次全都不是。

教训有两点：

1. **"昨天好今天坏"意味着有东西变了。** 服务端 117 天没重启、配置没动，那变的多半是客户端侧的状态，时间就是典型。
2. **能分层验证就不要猜。** 一旦 `101` 这一层通了，排查范围立刻从"整条链路"缩小到"VMess 认证"，后面的方向就清晰了。

## 九、预防措施

**让 Windows 自动同步时间：**

```cmd
w32tm /config /manualpeerlist:"ntp.aliyun.com time.windows.com" /syncfromflags:manual /update
net stop w32time && net start w32time
w32tm /resync
```

也可以在 设置 → 时间和语言 → 日期和时间 里开启"自动设置时间"。经常休眠、CMOS 电池老化、在虚拟机里运行的机器，时间更容易漂移。

**VPS 也保持同步：** `timedatectl` 确认 `System clock synchronized: yes`。

**不要在公开场合暴露凭证：** UUID 等同于节点密码，vmess 链接是 base64 编码，解码后包含 UUID、域名和 path。贴日志、截图之前务必打码，泄露后用 `sing-box change` 更换。

**别把鸡蛋放一个篮子里：** Xray 新版本已经在日志中提示 VMess 和 WebSocket 传输被标记为弃用。如果有条件，把不依赖时间精度、不经过 CDN 的 Reality 直连作为主力，Cloudflare 这条留作备用。

## 十、总结

- VMess 对时间敏感，时间漂移会让 TCP、TLS、WS 全部正常，只有认证失败，表现为延迟 -1
- 排查用"分层验证"：DNS → TCP/TLS → Caddy → sing-box → WS 101，每层一条命令
- 101 通了就只查 VMess 层，不要再怀疑 Cloudflare 和服务器
- "昨天好今天坏"，先同步时间，再考虑其他
- 保留一条备用节点做对照，能一下子区分是客户端问题还是节点问题
