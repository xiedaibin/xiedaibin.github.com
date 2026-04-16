# 用 PowerShell 配置文件优雅地调用 Gemini CLI

> 一个字命令，搞定翻墙 + AI 调用，懒人必备配置。

---

## 背景

在国内使用 Gemini CLI 时，往往需要手动设置代理才能访问外网。每次都敲一堆命令既繁琐又容易出错。通过配置 PowerShell 的启动文件（`$PROFILE`），可以一劳永逸地解决这个问题。

---

## 完整配置

配置文件路径：`C:\Users\<你的用户名>\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`

```powershell
# 快捷调用 Gemini CLI（自动走本地代理）
function g {
    $env:HTTP_PROXY = "http://127.0.0.1:10808"
    $env:HTTPS_PROXY = "http://127.0.0.1:10808"
    gemini @args
}

# 扩大终端缓冲区，防止长输出被截断
$host.UI.RawUI.BufferSize = New-Object System.Management.Automation.Host.Size(200, 5000)
```

---

## 逐段解析

### 1. 函数 `g` —— 代理 + 调用一步到位

```powershell
function g {
    $env:HTTP_PROXY = "http://127.0.0.1:10808"
    $env:HTTPS_PROXY = "http://127.0.0.1:10808"
    gemini @args
}
```

| 代码 | 作用 |
|------|------|
| `$env:HTTP_PROXY` / `$env:HTTPS_PROXY` | 设置本地代理（端口 10808，常见于 V2Ray / Clash） |
| `gemini @args` | 调用 Gemini CLI，`@args` 将所有参数原样透传 |

调用示例：

```powershell
g "帮我写一首诗"
g --model gemini-pro "解释一下量子纠缠"
```

效果等价于：

```powershell
$env:HTTP_PROXY = "http://127.0.0.1:10808"
$env:HTTPS_PROXY = "http://127.0.0.1:10808"
gemini "帮我写一首诗"
```

> **注意：** 代理仅在函数执行期间对当前进程生效，不会污染系统全局网络设置。

---

### 2. 扩大缓冲区 —— 告别内容截断

```powershell
$host.UI.RawUI.BufferSize = New-Object System.Management.Automation.Host.Size(200, 5000)
```

Gemini 返回的内容往往很长，默认缓冲区行数不够用，扩展到 **200列 × 5000行** 后，可以自由向上翻查历史输出。

---

## 如何启用

**第一步：** 打开配置文件

```powershell
notepad $PROFILE
```

**第二步：** 将上方配置粘贴进去，保存。

**第三步：** 重启 PowerShell，或执行以下命令立即生效：

```powershell
. $PROFILE
```

---

## 优点总结

- ✅ **简洁**：一个字母 `g` 替代冗长命令
- ✅ **代理隔离**：不影响系统其他程序的网络
- ✅ **无功能损失**：`@args` 完整透传所有参数
- ✅ **输出完整**：大缓冲区防止内容丢失

---

## 适用场景

- 本地已运行 V2Ray、Clash 等代理工具，监听 `10808` 端口
- 已安装 [Gemini CLI](https://github.com/google-gemini/gemini-cli)
- 使用 Windows PowerShell 或 PowerShell 5+

如果你的代理端口不是 `10808`，修改函数中对应的端口号即可。

---

*配置虽小，效率翻倍。Happy Hacking! 🚀*
