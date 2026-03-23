---
name: jekyll-blog-formatter
description: 专门用于 Jekyll 博客文章的格式化和整理，包括生成规范的文件名、提取 Front Matter 标头（layout, title, category, tags）以及清理 Markdown 正文。
---

# Jekyll 博客格式化指令

该技能专门用于处理博客文章的发布。

## 1. 文件名生成规则
- **路径**：`_posts/YYYY/` (根据当前日期或发布日期确定年份)。
- **格式**：`YYYY-MM-DD-YYYY_文件名.markdown`。
  - `YYYY-MM-DD`：今天的日期。
  - `YYYY_文件名`：从原标题生成的标识符。
  - 示例：`_posts/2026/2026-03-23-2026_v2ray_docker_guide.markdown`。

## 2. 标头 (Front Matter) 规则
生成以下 YAML 标头：
- `layout`: `page`
- `title`: 提取自文章的第一行一级标题 (`# 标题`)。
- `category`: 默认为 `技术`。
- `tags`: 从内容关键词中提取（如 `Docker`, `V2Ray`, `MySQL` 等）。

## 3. 内容处理
- **删除标题行**：移除作为 `title` 提取的一级标题及其后的空行。
- **保留正文**：除标题外的所有正文内容必须完整保留。
- **存放到指定目录**：确保文件存储在正确的年份目录。

## 4. 示例
源文件：`# 标题\n\n正文内容...`
目标文件：
---
layout: page
title: 标题
category: 技术
tags: 标签
---
正文内容...
