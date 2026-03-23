---
layout: page
title: 在无法访问外网的服务器上部署代理服务
category: 技术
tags: Docker, V2Ray, OpenCloudOS, 代理
---

> 基于 Docker Compose + V2Ray 的完整实践指南
>
> 发布日期：2026 年 3 月 | 适用系统：OpenCloudOS 9 / RHEL 9 系

---

## 背景与目标

在企业或云服务器环境中，经常会遇到服务器网络受限、无法直接访问外网资源（如 GitHub、Docker Hub、Google 等）的情况，导致拉取镜像、下载依赖包时屡屡受阻。

本文记录了一套完整的解决方案：在 OpenCloudOS 9（腾讯云 Linux，兼容 RHEL 9）服务器上，通过 Docker Compose 部署 V2Ray 客户端，将服务器的出站流量代理到外网，彻底解决下载外网资源受阻的问题。

| 项目 | 内容 |
|------|------|
| 操作系统 | OpenCloudOS 9.4（RHEL 9 兼容） |
| 容器运行时 | Docker CE + Docker Compose Plugin |
| 代理软件 | V2Ray v5.46.0（v2fly/v2ray-core） |
| 代理镜像 | ghcr.io/v2fly/v2ray:v5.46.0-extra |
| 代理协议 | VMess + WebSocket + TLS |
| 本地代理端口 | SOCKS5: 10808 / HTTP: 10809 |

---

## 一、安装 Docker

OpenCloudOS 9 使用 `dnf` 包管理器，与 CentOS 9 / RHEL 9 完全兼容，可直接使用 Docker 官方的 CentOS 源。

### 1.1 添加 Docker 官方源

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
```

### 1.2 安装 Docker Engine 及 Compose 插件

```bash
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 1.3 启动并设置开机自启

```bash
sudo systemctl enable --now docker
```

### 1.4 配置全局日志大小限制（重要）

默认情况下 Docker 日志不设上限，长期运行会耗尽磁盘空间，务必提前配置：

```bash
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl daemon-reload && sudo systemctl restart docker
```

> 💡 此配置为全局兜底策略，每个容器最多保留 3 个日志文件，每个文件上限 10MB，即单容器日志上限 30MB。单容器的日志配置优先级更高，两者不冲突。

### 1.5 验证安装

```bash
docker --version
docker compose version
docker info | grep -A 3 'Logging Driver'
```

输出 `Logging Driver: json-file` 即表示配置生效。

---

## 二、部署 V2Ray

### 2.1 创建目录结构

```bash
mkdir -p ~/v2ray/config
cd ~/v2ray
```

最终结构如下：

```
v2ray/
├── docker-compose.yaml
└── config/
    └── config.json
```

### 2.2 编写 docker-compose.yaml

使用官方 GHCR 镜像（`ghcr.io`），比 Docker Hub 版本更新更及时。选用 `-extra` 后缀版本，内置了 `geoip.dat` 和 `geosite.dat` 路由规则数据文件。

```yaml
# ~/v2ray/docker-compose.yaml
services:
  v2ray:
    image: ghcr.io/v2fly/v2ray:v5.46.0-extra
    container_name: v2ray
    restart: unless-stopped
    ports:
      - "10808:10808"
      - "10809:10809"
    volumes:
      - ./config:/etc/v2ray:ro
    command: run -c /etc/v2ray/config.json
    environment:
      - TZ=Asia/Shanghai
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

> ⚠️ 镜像版本已固定为 `v5.46.0-extra`，生产环境务必固定版本，避免自动升级带来兼容性风险。升级时修改 tag 后执行 `docker compose pull && docker compose up -d` 即可。

### 2.3 编写 config/config.json

V2Ray 支持客户端与服务端两种模式。本方案部署的是**客户端模式**：本地监听 SOCKS5/HTTP 代理端口，出站流量通过 VMess 协议转发至上游代理服务器。

> 💡 **关键点**：在 Docker 容器中，`inbound` 的 `listen` 必须设置为 `0.0.0.0`，否则宿主机无法访问代理端口（`127.0.0.1` 仅限容器内部访问）。

配置核心结构说明：

| 配置块 | 作用 |
|--------|------|
| `inbounds` | 本地监听，socks(10808) + http(10809)，listen 设为 0.0.0.0 |
| `outbounds / proxy` | VMess + WebSocket + TLS 连接上游服务器 |
| `outbounds / direct` | 国内流量直接出网（不走代理） |
| `outbounds / block` | 广告域名黑洞拦截 |
| `dns` | 国内域名用阿里 DNS，其余走 1.1.1.1 / 8.8.8.8 |
| `routing` | 分流策略：国内直连 / 广告拦截 / 其余走代理 |

```json
{
  "log": {
    "loglevel": "warning"
  },
  "inbounds": [
    {
      "tag": "socks",
      "port": 10808,
      "listen": "0.0.0.0",
      "protocol": "socks",
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls"],
        "routeOnly": false
      },
      "settings": {
        "auth": "noauth",
        "udp": true,
        "allowTransparent": false
      }
    },
    {
      "tag": "http",
      "port": 10809,
      "listen": "0.0.0.0",
      "protocol": "http",
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls"],
        "routeOnly": false
      },
      "settings": {
        "auth": "noauth",
        "udp": true,
        "allowTransparent": false
      }
    }
  ],
  "outbounds": [
    {
      "tag": "proxy",
      "protocol": "vmess",
      "settings": {
        "vnext": [
          {
            "address": "your.proxy.server",
            "port": 443,
            "users": [
              {
                "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
                "alterId": 0,
                "email": "t@t.tt",
                "security": "auto"
              }
            ]
          }
        ]
      },
      "streamSettings": {
        "network": "ws",
        "security": "tls",
        "tlsSettings": {
          "allowInsecure": false,
          "serverName": "your.proxy.server"
        },
        "wsSettings": {
          "path": "/your-path",
          "headers": {
            "Host": "your.proxy.server"
          }
        }
      },
      "mux": {
        "enabled": false,
        "concurrency": -1
      }
    },
    {
      "tag": "direct",
      "protocol": "freedom",
      "settings": {}
    },
    {
      "tag": "block",
      "protocol": "blackhole",
      "settings": {
        "response": {
          "type": "http"
        }
      }
    }
  ],
  "dns": {
    "hosts": {
      "dns.google": "8.8.8.8"
    },
    "servers": [
      {
        "address": "223.5.5.5",
        "domains": ["geosite:cn"],
        "expectIPs": ["geoip:cn"]
      },
      "1.1.1.1",
      "8.8.8.8"
    ]
  },
  "routing": {
    "domainStrategy": "AsIs",
    "rules": [
      {
        "type": "field",
        "outboundTag": "proxy",
        "domain": ["domain:googleapis.cn", "domain:gstatic.com"]
      },
      {
        "type": "field",
        "port": "443",
        "network": "udp",
        "outboundTag": "block"
      },
      {
        "type": "field",
        "outboundTag": "block",
        "domain": ["geosite:category-ads-all"]
      },
      {
        "type": "field",
        "outboundTag": "direct",
        "ip": ["geoip:private"]
      },
      {
        "type": "field",
        "outboundTag": "direct",
        "domain": ["geosite:private", "geosite:cn"]
      },
      {
        "type": "field",
        "outboundTag": "direct",
        "ip": ["geoip:cn"]
      },
      {
        "type": "field",
        "port": "0-65535",
        "outboundTag": "proxy"
      }
    ]
  }
}
```

### 2.4 启动服务

```bash
docker compose up -d
docker compose logs -f
```

正常启动后日志输出如下：

```
V2Ray 5.46.0 (V2Fly, a community-driven edition of V2Ray.) Custom (go1.26.0 linux/amd64)
2026/03/13 11:18:20 [Warning] V2Ray 5.46.0 started
```

---

## 三、验证代理可用性

### 3.1 测试 SOCKS5 代理

```bash
curl --socks5 127.0.0.1:10808 https://www.google.com -I --max-time 10
```

返回 `HTTP/2 200` 即表示代理完全正常：

```
HTTP/2 200
content-type: text/html; charset=ISO-8859-1
server: gws
```

### 3.2 测试 HTTP 代理

```bash
curl -x http://127.0.0.1:10809 https://www.google.com -I --max-time 10
```

### 3.3 为终端会话临时设置代理

设置后，当前终端的所有 HTTP/HTTPS 请求均会走代理：

```bash
export http_proxy=http://127.0.0.1:10809
export https_proxy=http://127.0.0.1:10809

# 取消代理
unset http_proxy https_proxy
```

---

## 四、常用管理命令

| 操作 | 命令 |
|------|------|
| 查看容器状态 | `docker compose ps` |
| 查看实时日志 | `docker compose logs -f` |
| 重启（修改配置后） | `docker compose restart` |
| 停止并删除容器 | `docker compose down` |
| 拉取新版本并重启 | `docker compose pull && docker compose up -d` |

---

## 五、常见问题排查

### Q1：启动报错 `open /opt/v2ray/share/geosite.dat: no such file or directory`

**原因**：使用了不含地理数据文件的精简镜像。

**解决**：将镜像从 `v5.46.0` 改为 `v5.46.0-extra`，该版本内置了 `geoip.dat` 和 `geosite.dat`。

### Q2：代理端口无法从宿主机访问

**原因**：`config.json` 中 `inbound` 的 `listen` 配置为 `127.0.0.1`。

**解决**：改为 `0.0.0.0`，重启容器生效。

```bash
docker compose restart
```

### Q3：日志不断增长占满磁盘

**解决**：在 `/etc/docker/daemon.json` 中配置全局日志上限（见第一章），并在 `docker-compose.yaml` 的 `logging` 字段单独为容器设置上限，两者均配置可双重保险。

---

## 总结

通过本文的方案，我们在一台原本无法访问外网的 OpenCloudOS 服务器上，用不到 30 分钟完成了：

- Docker CE 及 Compose 插件的安装与配置
- V2Ray 客户端容器化部署（固定版本、日志限制、开机自启）
- VMess + WebSocket + TLS 代理链路的验证
- 国内直连 / 国外代理 / 广告拦截的智能分流路由

该方案容器化部署，迁移方便，配置统一，非常适合在多台受限服务器上快速复制。后续也可以结合 Docker 代理配置，让 `docker pull` 也走代理通道，进一步提升外网资源的拉取速度。

---

*— END —*