# Gemini CLI: 创建并发布自定义技能 (Skill) 的完整闭环指南

> 想要扩展 Gemini CLI 的能力？自己动手写一个 Skill 是最佳方式。本文将带你从零开始，走完从设计到发布的完整闭环。

---

## 什么是 Skill？

Skill 本质上是一个封装好的工具包，包含了一份核心指令文档 (`SKILL.md`)，以及可选的自动化脚本、参考资料或静态资产。它是 Gemini CLI 的“外挂”，让它在特定领域变得更专业。

---

## 核心开发闭环

### 第一步：设计与初始化

在开始写代码前，明确你的 Skill 解决什么问题。使用内置工具快速生成标准模板：

```bash
# 初始化技能目录
node path/to/skill-creator/scripts/init_skill.cjs my-new-skill --path ./_skills/
```

生成后的结构包含：
- `SKILL.md`：**核心指令文件**，Gemini 的大脑。
- `scripts/`：存放 Node.js/Python 脚本。
- `references/`：存放 API 文档或业务逻辑参考。
- `assets/`：存放文件模板或资源。

---

### 第二步：编写核心逻辑 (`SKILL.md`)

这是 Skill 的核心。它分为两部分：

#### 1. 元数据 (YAML Frontmatter)
决定了 Gemini 什么时候激活这个技能。
```yaml
---
name: my-new-skill
description: 当我要求[执行某任务]时激活。它能够[完成具体功能]。
---
```

#### 2. 指令主体 (Markdown)
使用**祈使句**（Do/Don't）告诉 Gemini 具体的执行路径、输出标准和异常处理逻辑。

---

### 第三步：打包与验证

将文件夹转换成可分发的 `.skill` 文件。打包会自动执行 **Validation（验证）**，确保没有遗留的 TODO 或格式错误。

```bash
node path/to/skill-creator/scripts/package_skill.cjs ./_skills/my-new-skill ./_skills/
```

---

### 第四步：安装与加载

将打包好的技能安装到你的 Gemini CLI 环境中并生效。

```bash
# 安装到当前项目空间
gemini skills install ./_skills/my-new-skill.skill --scope workspace

# 手动执行重新加载（关键）
/skills reload
```

---

### 第五步：发布与分享

1. **源码同步**：将 `.skill` 文件和源文件夹提交到 GitHub 仓库。
2. **社区分发**：他人下载 `.skill` 文件后运行 `gemini skills install` 即可使用。
3. **生态集成**：使用 `npx skills` 管理和发现全球社区的技能。

---

## 开发者建议

1. **Description 要精准**：Gemini 依靠它来识别唤起时机。
2. **专注于业务逻辑**：不要教 Gemini 写代码，要教它你的**特定偏好**。
3. **从小处着手**：先写纯文字指令的 `SKILL.md`，仅在必要时添加脚本。

---
*发布日期：2026-03-23 | 适用工具：Gemini CLI*
