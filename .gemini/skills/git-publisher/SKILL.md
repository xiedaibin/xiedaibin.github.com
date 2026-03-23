---
name: git-publisher
description: 专门用于自动化 Git 变更的提交和推送。当用户提到“推送到 GitHub”、“发布”或“推送 master”时触发。自动执行 git add、生成语义化 commit message 并 push 到 master。
---

# Git Publisher 指令

当用户要求“推送”、“发布”或“更新到 GitHub”时，请激活此技能。

## 核心流程

### 1. 检查状态 (Pre-check)
- 首先运行 `git status` 以确认当前工作树的变更情况。
- 如果没有需要提交的变更，请告知用户。

### 2. 准备提交 (Stage & Commit)
- **暂存**：运行 `git add .` 将所有变更（包括新博客文件）加入暂存区。
- **生成 Message**：根据变更内容生成简洁的语义化 commit message。
  - 示例：`feat: add new blog post (2026-03-23)`
  - 示例：`docs: update jekyll-blog-formatter skill`
  - 示例：`chore: update site content`
- **提交**：运行 `git commit -m "[message]"`。

### 3. 推送 (Push)
- 运行 `git push origin master`（或用户指定的远程/分支）。
- 确认推送成功。

## 异常处理
- 如果推送由于冲突失败，请告知用户并停止操作，等待用户手动处理冲突。
- 不要尝试强制推送 (`--force`)，除非用户明确要求。

## 示例
用户： "推送到 github"
技能执行：
1. `git status`
2. `git add .`
3. `git commit -m "feat: add blog and update skills"`
4. `git push origin master`
