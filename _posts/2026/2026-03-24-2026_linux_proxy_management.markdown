---
layout: page
title: "Linux 下灵活代理管理：开关、状态显示与自动检测"
category: 技术
tags: Linux, Proxy, Shell, 运维
---

在 Linux 开发和运维环境中，使用 HTTP/HTTPS 代理十分常见，例如加速访问或穿透网络。然而，当代理服务关闭后，如果系统或程序仍然读取环境变量，就可能导致无法联网。本文总结了一套 **可控代理管理方案** ，支持手动开关、状态查询以及自动检测代理状态，帮助你轻松管理开发环境的网络访问。

---

## 一、问题背景

常见代理配置方式：

```bash
export http_proxy=http://127.0.0.1:10809
export https_proxy=http://127.0.0.1:10809
```

代理关闭后：

* 使用这些环境变量的命令行工具（如 `curl`、`wget`、`git`、`npm` 等）会 **无法联网** 。
* 不读取环境变量的程序（部分 GUI 浏览器、系统服务）仍可直接访问网络。

因此，我们需要一种方法： **仅在代理可用时使用代理，关闭代理时恢复正常联网** 。

---

## 二、手动管理代理

### 1. 脚本方式

可以通过两个简单脚本来切换代理。

**开启代理：**

```bash
# ~/proxy_on.sh
export http_proxy=http://127.0.0.1:10809
export https_proxy=http://127.0.0.1:10809
export all_proxy=socks5://127.0.0.1:10809
echo "Proxy ON"
```

**关闭代理：**

```bash
# ~/proxy_off.sh
unset http_proxy
unset https_proxy
unset all_proxy
echo "Proxy OFF"
```

> 使用 `source ~/proxy_on.sh` 或 `source ~/proxy_off.sh` 才能让当前 shell 生效。

---

### 2. Shell 函数方式（推荐）

在 `~/.bashrc` 或 `~/.zshrc` 添加：

```bash
proxy_on () {
    export http_proxy=http://127.0.0.1:10809
    export https_proxy=http://127.0.0.1:10809
    export all_proxy=socks5://127.0.0.1:10809
    echo "Proxy enabled"
}

proxy_off () {
    unset http_proxy
    unset https_proxy
    unset all_proxy
    echo "Proxy disabled"
}
```

刷新配置：

```bash
source ~/.bashrc
```

使用方法：

```bash
proxy_on   # 开启代理
proxy_off  # 关闭代理
```

---

## 三、自动检测代理状态

为了避免手动操作，可以通过 **端口检测** 自动判断代理是否可用。

```bash
proxy_auto () {
    if timeout 1 bash -c "</dev/tcp/127.0.0.1/10809" 2>/dev/null; then
        proxy_on
    else
        proxy_off
    fi
}
```

使用：

```bash
proxy_auto
```

* 代理运行 → 自动开启环境变量
* 代理关闭 → 自动取消环境变量

> 无需安装额外工具，如 `nc`，使用 Linux 内置 `/dev/tcp` 即可。

---

## 四、完整可用代理管理脚本

整合开关、状态、自动检测功能，保存为 `~/proxy.sh`：

```bash
#!/bin/bash
# Linux 代理管理脚本
# 支持：proxy on/off/status/auto

PROXY_HOST="127.0.0.1"
PROXY_PORT="10809"

proxy_on() {
    export http_proxy="http://$PROXY_HOST:$PROXY_PORT"
    export https_proxy="http://$PROXY_HOST:$PROXY_PORT"
    export all_proxy="socks5://$PROXY_HOST:$PROXY_PORT"
    echo "Proxy enabled"
}

proxy_off() {
    unset http_proxy
    unset https_proxy
    unset all_proxy
    echo "Proxy disabled"
}

proxy_status() {
    if [ -n "$http_proxy" ] || [ -n "$https_proxy" ]; then
        echo "Proxy is ON: $http_proxy"
    else
        echo "Proxy is OFF"
    fi
}

proxy_auto() {
    if timeout 1 bash -c "</dev/tcp/$PROXY_HOST/$PROXY_PORT" 2>/dev/null; then
        proxy_on
    else
        proxy_off
    fi
}

# 根据参数调用函数
case "$1" in
    on)
        proxy_on
        ;;
    off)
        proxy_off
        ;;
    status)
        proxy_status
        ;;
    auto)
        proxy_auto
        ;;
    *)
        echo "Usage: $0 {on|off|status|auto}"
        ;;
esac
```

### 使用方法

1. 赋予执行权限：

```bash
chmod +x ~/proxy.sh
```

2. 在当前终端使用：

```bash
source ~/proxy.sh on     # 开启代理
source ~/proxy.sh off    # 关闭代理
source ~/proxy.sh status # 查看状态
source ~/proxy.sh auto   # 自动检测并设置
```

> 注意使用 `source`，确保环境变量生效于当前 shell。

---

## 五、高级技巧

1. **终端自动检测代理** ：

在 `~/.bashrc` 或 `~/.zshrc` 添加：

```bash
source ~/proxy.sh auto
```

每次打开终端都会自动判断代理状态。

2. **注意工具配置文件** ：

部分工具可能还会读取配置文件中的代理，例如：

* `~/.gitconfig`（Git）
* `~/.npmrc`（Node.js）
* `~/.pip/pip.conf`（Python）
* `/etc/apt/apt.conf`（APT）

即使环境变量被 unset，这些程序可能仍然使用代理，需要单独清理。

---

## 六、总结

* **手动切换** ：通过脚本或函数快速开启/关闭代理。
* **状态查询** ：随时了解当前代理状态。
* **自动检测** ：代理可用时自动启用，不可用时自动取消，提升开发效率。
* **安全与灵活** ：关闭代理时不会影响其它网络访问，兼顾开发和调试环境。

这套方法可以帮助 Linux 用户实现 **“代理开启时使用，关闭时不影响联网”** 的灵活管理方案，是开发环境中最实用的代理管理方式。

---

*— END —*
