# Gemini CLI 项目宪法：xiedaibin.github.com

本文件定义了本项目在 Gemini CLI 环境下的核心操作标准、自动化流程及技术规范。**本指令具有最高优先级，所有 AI 助手必须严格遵守。**

## 1. 核心准则 (General Mandates)
- **交流语境**：**必须始终使用中文与用户进行交流。** 即使底层工具输出为英文，反馈给用户的解释、建议和总结必须转换为中文。
- **操作安全**：严禁在未授权的情况下提交敏感信息，所有 Git 提交需符合语义化规范。

## 2. 项目定位
本项目是 **xiedaibin 的个人技术博客**，基于 Jekyll 构建。

## 2. 博客发布标准 (Mandatory)

### 2.1 文件命名与存放
- **路径格式**：必须存放在 `_posts/YYYY/` 目录下（根据博文日期归档）。
- **文件名规范**：必须遵循 `YYYY-MM-DD-YYYY_filename.markdown`。
- **源文件来源**：通常从 `sourse/` 目录获取待整理的博文。

### 2.2 YAML Front Matter 规范
所有生成的博文必须包含以下标头，且格式必须严谨：
- `layout`: 始终设为 `page`。
- `title`: **必须始终使用双引号包裹**（例如 `title: "我的文章标题"`），以防止冒号导致的解析错误。
- `category`: 默认设为 `技术`。
- `tags`: 根据内容自动提取关键技术标签。

## 3. 自动化技能 (Custom Skills)

本项目依赖以下定制技能来保证操作的原子性和一致性：
- **`jekyll-blog-formatter`**: 用于从源文件提取标题、生成 Front Matter 及规范文件名。
- **`git-publisher`**: 用于暂存变更、智能分析内容生成语义化 Commit Message 并推送至 `master`。

**指令**：在执行相关任务时，必须先通过 `activate_skill` 激活对应技能。

## 4. Git 工作流
- **分支管理**：主开发分支为 `master`。
- **提交规范**：遵循语义化提交（Conventional Commits），格式为 `<type>: <description> (YYYY-MM-DD)`。
- **智能分析**：在提交前需分析暂存区内容（尤其是博客标题），以生成精准的描述。

## 5. 目录导航
- `_posts/`: 博客文章存储库（按年份分层）。
- `sourse/`: 待处理的原始博文。
- `_skills/`: 项目专属技能包的源码与打包文件。
- `.gemini/skills/`: 当前工作区已安装的技能实例。

---
*最后更新：2026-04-16 | 维护者：Gemini CLI & xiedaibin*
