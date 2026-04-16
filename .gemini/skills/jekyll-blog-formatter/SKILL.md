---
name: jekyll-blog-formatter
description: 专门用于 Jekyll 博客文章的格式化、整理及一键发布。支持从源文件自动生成规范标题、文件名、YAML 标头并推送至 GitHub。
---

# Jekyll 博客格式化指令

该技能专门用于处理博客文章的整理与发布。

## 1. 一键发布模式 (Recommended)
当用户明确要求“整理并发布”某篇源文件时，**优先直接运行自动化脚本**。无需手动生成内容。

- **脚本路径**：`_skills/jekyll-blog-formatter/scripts/auto_publish.cjs`
- **用法**：使用 `node` 执行，传入源文件路径作为第一个参数，**传入英文 Slug (由标题翻译/概括) 作为第二个参数**。
- **示例**：`node D:\MyGit\xiedaibin.github.com\_skills\jekyll-blog-formatter\scripts\auto_publish.cjs sourse/blog.md git_password_fix`
- **脚本功能**：
  1. 自动从第一行一级标题提取 `title`。
  2. 自动生成规范的文件名：`YYYY-MM-DD-YYYY_slug.markdown` (Slug 优先使用传入的英文标识)。
  3. 自动生成 YAML Front Matter。
  4. 自动创建年份目录并移动文件到 `_posts/YYYY/`。
  5. 自动删除原始源文件。
  6. 自动执行 `git add`, `git commit` 和 `git push`。

## 2. 手动格式化规则 (Fallback)
若自动化脚本不可用，请遵循以下规则手动处理：

### 2.1 文件名生成规则
- **路径**：`_posts/YYYY/` (根据当前日期或发布日期确定年份)。
- **格式**：`YYYY-MM-DD-YYYY_slug.markdown`。
  - `YYYY-MM-DD`：今天的日期。
  - `YYYY_slug`：从原标题生成的**英文**标识符。

### 2.2 标头 (Front Matter) 规则
生成以下 YAML 标头：
- `layout`: `page`
- **`title`**: 提取自文章的第一行一级标题 (`# 标题`)。**必须始终包裹在双引号中**。
- `category`: 默认为 `技术`。
- `tags`: 从内容关键词中提取。

## 3. 内容处理
- **删除标题行**：移除作为 `title` 提取的一级标题及其后的空行。
- **保留正文**：除标题外的所有正文内容必须完整保留。
- **存放到指定目录**：确保文件存储在正确的年份目录。
