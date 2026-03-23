---
name: git-publisher
description: 专门用于自动化 Git 变更的提交和推送。当用户提到“推送到 GitHub”、“发布”或“推送 master”时触发。自动执行 git add、智能分析变更内容生成语义化 commit message 并 push 到 master。
---

# Git Publisher 指令

当用户要求“推送”、“发布”或“更新到 GitHub”时，请激活此技能。

## 核心流程

### 1. 检查状态 (Pre-check)
- 运行 `git status` 确认变更。
- 如果没有变更，告知用户并停止。

### 2. 准备提交 (Stage & Commit)
- **暂存**：运行 `git add .`。
- **智能分析**：使用 `git diff --name-only --cached` 查看暂存文件。
- **提取关键信息**：
  - **博客文章** (`_posts/`)：读取新文件的内容，从 Front Matter 中提取 `title`。
  - **自定义技能** (`_skills/` 或 `.gemini/skills/`)：提取技能文件夹名称。
  - **其他文件**：使用文件名或路径。
- **合成语义化 Message**：
  - **格式**：`<type>: <description> (YYYY-MM-DD)`。
  - **Type 规则**：
    - `feat`: 发表新博文或新增技能。
    - `fix`: 修复博客内容或技能逻辑。
    - `docs`: 文档类更新。
    - `chore`: 其他杂项。
  - **示例**：`feat: publish "Gemini CLI 技能创建指南" (2026-03-23)`。
- **提交**：运行 `git commit -m "[合成的消息]"`。

### 3. 推送 (Push)
- 运行 `git push origin master`。

## 异常处理
- 遇到冲突停止操作，等待用户处理。
- 绝不使用 `--force` 除非明确要求。
