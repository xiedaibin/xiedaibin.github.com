---
layout: page
title: "Git 推送报错 \"Password authentication is not supported\" 解决全过程"
category: 技术
tags: page, Git, Password, authentication, not, GitHub, SSH, git
---

---
layout: page
title: "Git 推送报错 'Password authentication is not supported' 解决全过程"
category: 技术
tags: [Git, GitHub, SSH, 认证, 推送]
---

> 记录一次排查 GitHub 推送认证失败的完整过程，坑点不少，留存备忘。

## 问题现象

执行 `git push` 时弹出用户名/密码输入框，输入后报错：

```
remote: Invalid username or token. Password authentication is not supported for Git operations.
fatal: Authentication failed for 'https://github.com/xxx/xxx.git/'
```

## 根本原因

GitHub 自 2021 年 8 月起**不再支持密码认证**，推送必须使用 SSH 密钥或 Personal Access Token。

---

## 解决步骤

### 第一步：配置 SSH 密钥

**检查是否已有密钥：**

```bash
ls ~/.ssh/id_rsa.pub ~/.ssh/id_ed25519.pub 2>/dev/null
```

**没有则生成：**

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# 一路回车即可
```

**复制公钥，添加到 GitHub：**

```bash
cat ~/.ssh/id_ed25519.pub
```

GitHub → Settings → SSH and GPG keys → New SSH key，粘贴保存。

---

### 第二步：修复私钥权限

验证 SSH 连接时报错：

```
Permissions 0644 for '/root/.ssh/id_rsa' are too open.
This private key will be ignored.
```

SSH 要求私钥权限必须是 `600`，修复：

```bash
chmod 600 ~/.ssh/id_rsa
```

再次验证：

```bash
ssh -T git@github.com
# Hi xxx! You've successfully authenticated...
```

---

### 第三步：修改远程地址为 SSH

```bash
git remote set-url origin git@github.com:用户名/仓库名.git
```

验证：

```bash
git remote -v
```

---

### 第四步（关键坑）：排查 insteadOf 配置

改完远程地址后，`git push` 仍然提示输入用户名密码，且报错地址依然是 HTTPS。

明明 `.git/config` 里已经是 SSH 地址：

```ini
[remote "origin"]
    url = git@github.com:xxx/xxx.git
```

排查全局配置：

```bash
git config --list | grep -i instead
```

发现问题所在：

```
url.https://github.com/.insteadof=ssh://git@github.com/
url.https://github.com/.insteadof=git@github.com:
```

这两条规则存在于 `~/.gitconfig` 中，会**强制将所有 SSH 地址替换为 HTTPS**，导致配置文件里写的是 SSH，实际请求走的却是 HTTPS。

**删除这两条规则：**

```bash
git config --global --unset url.https://github.com/.insteadof "ssh://git@github.com/"
git config --global --unset url.https://github.com/.insteadof "git@github.com:"
```

验证已清除：

```bash
git config --list | grep -i instead
# 无输出即为干净
```

---

### 第五步：正常推送

```bash
git push
```

成功！

---

## insteadOf 是怎么来的？

这类配置通常来源于：

- 早期自己按某些教程配置过，用于在不支持 SSH 的网络环境下强制走 HTTPS
- 某个初始化脚本或工具（conda、IDE 等）自动写入
- 服务器运维批量下发的环境配置

可以用以下命令查看完整的全局配置文件：

```bash
cat ~/.gitconfig
```

---

## 总结

| 步骤 | 问题 | 解决方法 |
|------|------|----------|
| 1 | GitHub 不支持密码推送 | 配置 SSH 密钥 |
| 2 | 私钥权限过宽 | `chmod 600 ~/.ssh/id_rsa` |
| 3 | 远程地址是 HTTPS | `git remote set-url` 改为 SSH |
| 4 | `insteadOf` 强制覆盖 SSH 为 HTTPS | `git config --global --unset` 删除规则 |

最隐蔽的坑是第四步，配置文件看起来完全正确，却被全局规则悄悄覆盖，排查时需要用 `git config --list | grep -i instead` 专门检查。