---
layout: page
title: Nginx WebSocket 配置完整指南
category: 技术
tags: nginx websocket
---

WebSocket 长连接在生产环境中经常遇到意外断开的问题，主要原因是 Nginx 的默认超时配置。本文总结了 Nginx 配置 WebSocket 的关键要点和最佳实践。

## 核心问题

Nginx 默认的超时设置会导致 WebSocket 连接在 1-2 小时后自动断开：

- `proxy_read_timeout`: 默认 60 秒
- `proxy_send_timeout`: 默认 60 秒
- `proxy_connect_timeout`: 默认 60 秒

## 基础配置

### 1. 基本 WebSocket 代理配置

```nginx
location /ws {
    proxy_pass http://backend;

    # WebSocket 必需的协议升级配置
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # 标准代理头设置
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 2. 关键超时配置

```nginx
location /ws {
    # ... 基础配置 ...

    # 核心超时设置
    proxy_read_timeout 3600s;    # 从后端读取数据超时时间
    proxy_send_timeout 3600s;    # 向后端发送数据超时时间
    proxy_connect_timeout 60s;   # 连接后端服务器超时时间

    # 可选优化
    proxy_buffering off;         # 禁用缓冲，减少延迟
}
```

## 高级配置

### 1. 后端服务器池配置

```nginx
upstream websocket_backend {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081 backup;

    # 连接保持配置
    keepalive 32;
    keepalive_requests 100;
    keepalive_timeout 60s;
}

location /ws {
    proxy_pass http://websocket_backend;
    # ... 其他配置 ...

    # 重试配置
    proxy_next_upstream error timeout;
    proxy_next_upstream_tries 3;
    proxy_next_upstream_timeout 180s;
}
```

### 2. 全局配置优化

```nginx
http {
    # 全局超时设置
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;

    # 客户端连接配置
    client_header_timeout 60s;
    client_body_timeout 60s;
    send_timeout 60s;

    # 其他优化
    tcp_nopush on;
    tcp_nodelay on;
}
```

## 重要概念解析

### 超时重置机制

- **proxy_read_timeout** 和 **proxy_send_timeout** 在每次数据传输后会重置计时器
- 心跳消息可以有效重置这些超时，保持连接活跃
- **proxy_connect_timeout** 只在建立连接时生效，**不会重试**

### 心跳机制示例

```javascript
// 客户端心跳
setInterval(() => {
    if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({type: 'ping'}));
    }
}, 30000); // 每30秒发送心跳

// 服务端响应
websocket.on('message', (data) => {
    const message = JSON.parse(data);
    if (message.type === 'ping') {
        websocket.send(JSON.stringify({type: 'pong'}));
    }
});
```

## 最佳实践建议

### 1. 超时时间设置

```nginx
# 保守配置（推荐）
proxy_read_timeout 1800s;  # 30分钟
proxy_send_timeout 1800s;  # 30分钟

# 长连接配置
proxy_read_timeout 3600s;  # 1小时
proxy_send_timeout 3600s;  # 1小时
```

### 2. 心跳间隔

- 设置为超时时间的 1/3 到 1/2
- 例如：30分钟超时 → 10-15分钟心跳间隔

### 3. 完整配置示例

```nginx
upstream websocket_servers {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081 backup;
    keepalive 32;
}

server {
    listen 80;
    server_name example.com;

    location /ws {
        proxy_pass http://websocket_servers;

        # WebSocket 协议升级
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 代理头设置
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时配置
        proxy_connect_timeout 60s;
        proxy_read_timeout 1800s;
        proxy_send_timeout 1800s;

        # 性能优化
        proxy_buffering off;
        proxy_cache off;

        # 重试配置
        proxy_next_upstream error timeout;
        proxy_next_upstream_tries 2;
        proxy_next_upstream_timeout 120s;
    }
}
```

## 故障排查

### 1. 检查配置语法

```bash
nginx -t
```

### 2. 重新加载配置

```bash
nginx -s reload
```

### 3. 查看日志

```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### 4. 常见错误排查

- **502 Bad Gateway**: 检查后端服务是否运行
- **连接频繁断开**: 检查超时配置和心跳机制
- **握手失败**: 检查 Upgrade 和 Connection 头设置

## 总结

配置 Nginx WebSocket 代理的关键点：

1. **正确设置协议升级头**：`Upgrade` 和 `Connection`
2. **合理配置超时时间**：根据业务需求设置 `proxy_read_timeout` 和 `proxy_send_timeout`
3. **实现心跳机制**：定期发送数据重置超时计时器
4. **客户端重连逻辑**：处理意外断开的情况
5. **监控和日志**：及时发现和解决连接问题

通过以上配置，可以有效解决 WebSocket 连接意外断开的问题，确保长连接的稳定性。
