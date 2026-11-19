---
layout: post
title: "Cloudflare CDN + VMess-WS-TLS 节点连不上:`bad timestamp` 排查与修复"
categories: [技术]
tags: [Cloudflare, CDN, VMess-WS-TLS, bad, boy, sing-box, Caddy, v2rayN]
---


## 问题现象

使用 233boy 的 sing-box 脚本搭建了 `VMess-WS-TLS` 节点(Caddy 监听 443,反代到 sing-box),直连服务器 IP 可以用,套上 Cloudflare 橙云后,v2rayN 却连不上。

环境:

* 服务器:CentOS 7
* 服务端:sing-box + Caddy(233boy 一键脚本)
* 客户端:v2rayN
* 节点:VMess + WS + TLS,端口 443,域名走 Cloudflare 代理

## 排查思路:逐层缩小范围

链路是 `客户端 → Cloudflare → Caddy(443) → sing-box`,请求能走到哪一层,问题就在哪一层。

### 1. 浏览器访问 ws 路径

访问 `https://你的域名/你的ws路径`,服务端日志里出现:

```
handshake error: bad "Upgrade" header
```

这个报错是 sing-box 的 WebSocket 处理器给出的,说明 **请求已经穿过 Cloudflare 和 Caddy 到达了 sing-box** ,只是浏览器没带 WebSocket 升级头被拒绝。所以 Cloudflare 的 SSL 模式、证书、Caddy 反代、路径都没问题,不用再改这些。

### 2. 用客户端连接,看 sing-box 日志

```bash
sb log
```

用 v2rayN 连一次,日志里全是:

```
inbound/vmess[...]: process connection from 104.23.x.x:xxxxx: bad timestamp
```

来源 IP 都是 Cloudflare 的 IP,说明客户端的请求确实到了服务端,并且已经走到了 VMess 认证阶段, **卡在时间戳校验** 。

### 3. 原因:VMess 对时间敏感

VMess 的认证信息里带有时间戳, **客户端和服务端的时间误差必须在 90 秒以内** ,否则服务端直接拒绝。

本地电脑时间是准的,换另一个节点也能连,说明客户端没问题,于是检查服务器:

```bash
date -u
curl -sI https://www.cloudflare.com | grep -i '^date:'
```

结果:

```
Thu Nov 19 02:39:19 UTC 2026            # 服务器
Date: Thu, 19 Nov 2026 02:37:12 GMT     # Cloudflare 返回的真实时间
```

 **服务器时间比真实时间快了 127 秒** ,超过了 90 秒的容忍范围。

再看 `timedatectl`:

```
NTP enabled: yes
NTP synchronized: no
```

NTP 开着,但从来没有同步成功。`chronyc sources` 显示源数量为 0,这台机器的时钟一直在漂移。

## 修复方法

不依赖 NTP(UDP 123),直接用 HTTPS 响应头里的时间校准服务器:

```bash
date -u -s "$(curl -sI https://www.cloudflare.com | grep -i '^date:' | cut -d' ' -f2-)"
hwclock --systohc
date -u
systemctl restart sing-box
```

命令说明:

* 第 1 行:从 Cloudflare 响应头取标准时间,设为系统时间
* 第 2 行:把系统时间写入硬件时钟(RTC)
* 第 3 行:确认校准后的时间
* 第 4 行:重启 sing-box

校准后在 v2rayN 里断开再重连,`sb log` 中的 `bad timestamp` 消失,节点恢复正常。

## 长期方案:防止时钟再次漂移

这台机器的时钟漂移很快,只校准一次撑不了多久。有两种办法。

**办法一:修好 chrony**

检查 `/etc/chrony.conf` 里有没有可用的时间源:

```
server time.cloudflare.com iburst
server time.google.com iburst
server pool.ntp.org iburst
```

重启后用 `chronyc sources -v` 查看,出现 `^*` 开头的行才算同步成功。如果源一直是 `?`,多半是服务商屏蔽了出站 UDP 123,需要联系服务商放行。

> 补充:CentOS 7 默认的 `*.centos.pool.ntp.org` 在停止维护后可能不稳定,建议换成上面的源。

**办法二:定时任务用 HTTPS 对时(不走 UDP 123)**

```bash
cat > /usr/local/bin/synctime.sh <<'EOF'
#!/bin/bash
t=$(curl -sI --max-time 10 https://www.cloudflare.com | grep -i '^date:' | cut -d' ' -f2-)
[ -n "$t" ] && date -u -s "$t" >/dev/null && hwclock --systohc
EOF
chmod +x /usr/local/bin/synctime.sh

(crontab -l 2>/dev/null; echo "*/10 * * * * /usr/local/bin/synctime.sh") | crontab -
```

每 10 分钟对一次时。如果之后 chrony 修好了,记得 `crontab -e` 删掉这条,避免两边互相干扰。

## 总结:VMess 节点连不上的排查顺序

| 现象                                   | 含义                           | 处理                                 |
| -------------------------------------- | ------------------------------ | ------------------------------------ |
| 浏览器访问 ws 路径返回 521/522/525/526 | Cloudflare 与源站之间有问题    | 检查 SSL 模式(用 Full)、证书、防火墙 |
| 返回 400 或 `bad "Upgrade" header`   | 链路已通                       | 转向客户端和协议参数                 |
| 日志 `bad timestamp`                 | 客户端与服务端时间差超过 90 秒 | 校准服务器时间                       |
| 日志 `invalid user`                  | UUID 不一致                    | 重新导入脚本生成的节点链接           |

**经验:**

1. 日志比猜测可靠。看服务端日志停在哪一层,就能知道该查哪里。
2. 套 CDN 后出现的问题,不一定是 CDN 的问题。这次根源是服务器时间不准,和 Cloudflare 无关,只是直连时碰巧没暴露,或当时时间偏差还没超过 90 秒。
3. 用 VMess 的服务器一定要保证时间准确。条件允许时也可以考虑改用对时间不敏感的 VLESS。
4. 老旧系统(如已停止维护的 CentOS 7)的 NTP 源可能失效,同步状态要自己确认。
