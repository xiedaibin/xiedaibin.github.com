---
layout: page
title: "Docker 部署 Certbot + Nginx 自动申请与续期 HTTPS"
category: 技术
tags: Docker, Certbot, Nginx, HTTPS, webroot, Encrypt, reload, 443
---


## 思路

* Certbot 用  **webroot 模式** ：Let's Encrypt 访问 `http://域名/.well-known/acme-challenge/`，Nginx 从共享目录 `./www` 提供验证文件。
* 证书存放在 `./certbot/conf`，Nginx 和 Certbot 两个容器共享。
* Certbot 容器每 12 小时执行一次 `renew`，Nginx 每 12 小时 reload 一次以加载新证书。

## 前置条件

1. 域名 A 记录已解析到服务器公网 IP。
2. 服务器的 80、443 端口对公网开放。
3. `./conf/nginx.conf` 的 `http {}` 块里有 `include /etc/nginx/conf.d/*.conf;`。

## 第 1 步：修改 docker-compose.yaml

```yaml
version: '3'

services:
  mynginx:
    image: nginx
    container_name: mynginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./conf/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./config:/etc/nginx/conf.d
      - ./tcpconfig:/etc/nginx/tcp.d
      - ./ssl:/etc/nginx/ssl
      - ./www:/usr/share/nginx/html
      - ./certbot/conf:/etc/letsencrypt:ro      # 新增：证书目录
    # 新增：每 12 小时 reload 一次，加载续期后的新证书
    command: /bin/sh -c 'while :; do sleep 12h & wait $${!}; nginx -s reload; done & exec nginx -g "daemon off;"'
    restart: always

  certbot:                                      # 新增
    image: certbot/certbot
    container_name: certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./www:/usr/share/nginx/html
    entrypoint: /bin/sh -c 'trap exit TERM; while :; do certbot renew --webroot -w /usr/share/nginx/html; sleep 12h & wait $${!}; done;'
    restart: always
```

## 第 2 步：先放一个仅 HTTP 的站点配置

此时证书还不存在，如果直接写 443 的配置，Nginx 会启动失败。

`./config/example.com.conf`：

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    location /.well-known/acme-challenge/ {
        root /usr/share/nginx/html;
    }

    location / {
        return 200 'ok';
    }
}
```

启动 Nginx：

```bash
mkdir -p certbot/conf www
docker compose up -d mynginx
```

## 第 3 步：首次申请证书

建议先用 `--dry-run` 测试，避免触发 Let's Encrypt 的频率限制：

```bash
docker compose run --rm --entrypoint certbot certbot certonly \
  --webroot -w /usr/share/nginx/html \
  -d example.com -d www.example.com \
  --email you@example.com --agree-tos --no-eff-email \
  --dry-run
```

测试通过后去掉 `--dry-run` 再执行一次。成功后可以看到：

```bash
ls certbot/conf/live/example.com/
# fullchain.pem  privkey.pem  ...
```

## 第 4 步：改成 HTTPS 配置

替换 `./config/example.com.conf`：

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    location /.well-known/acme-challenge/ {
        root /usr/share/nginx/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    http2 on;                      # nginx >= 1.25.1；旧版本写成 listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;

    location / {
        # 按需改成你的后端，例如：
        # proxy_pass http://host.docker.internal:5000;
        # proxy_set_header Host $host;
        # proxy_set_header X-Real-IP $remote_addr;
        # proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # proxy_set_header X-Forwarded-Proto $scheme;
        root /usr/share/nginx/html;
        index index.html;
    }
}
```

检查配置并重载：

```bash
docker exec mynginx nginx -t && docker exec mynginx nginx -s reload
```

然后启动 certbot 续期容器：

```bash
docker compose up -d
```

## 第 5 步：验证

```bash
curl -I https://example.com

# 模拟续期（不会真的签发）
docker compose run --rm --entrypoint certbot certbot renew --dry-run
```

## 补充说明

* **新增域名** ：重复第 2 到第 4 步，每个新域名先放 HTTP 配置，再用 `certonly` 申请，最后改成 HTTPS 配置。
* **后端是另一个 compose 里的服务** ：把它们加入同一个 Docker network，`proxy_pass` 用容器名。
* **泛域名证书（`*.example.com`）** ：webroot 方式不支持，需要 DNS-01 验证，要用对应 DNS 厂商的 certbot 插件，例如 `certbot/dns-cloudflare`、`certbot-dns-aliyun` 等。
* **续期时机** ：certbot 只会在证书剩余不足 30 天时才真正续期，每 12 小时检查一次属正常频率。
* **`./ssl` 目录** ：原来的 `./ssl` 挂载可以保留给手动证书使用，Let's Encrypt 证书不依赖它。
* **日志排查** ：`docker logs certbot`，证书申请失败多半是 80 端口不通或域名解析未生效。
