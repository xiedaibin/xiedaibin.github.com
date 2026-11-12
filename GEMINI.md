# Gemini CLI 项目规范：xiedaibin.github.com

本项目遵循统一的跨 Agent 规范体系，完整标准请参考 [AGENTS.md](./AGENTS.md)。

## 1. 核心准则 (General Mandates)
- **交流语境**：**必须始终使用中文与用户进行交流。** 即使底层工具输出为英文，反馈给用户的解释、建议和总结必须转换为中文。
- **操作安全**：严禁在未授权的情况下提交敏感信息，所有 Git 提交需符合语义化规范。

## 2. 项目定位
本项目是 **xiedaibin 的个人技术博客**（`https://19920625.xyz`），基于 Jekyll 4 + **Chirpy (`jekyll-theme-chirpy`)** 主题构建，并通过 GitHub Actions 自动部署至 GitHub Pages。

## 3. 博客发布标准 (Mandatory)

### 3.1 文件命名与存放
- **路径格式**：必须存放在 `_posts/YYYY/` 目录下（根据博文日期归档）。
- **文件名规范**：必须遵循 `YYYY-MM-DD-YYYY_filename.markdown`。
- **源文件来源**：通常从 `sourse/` 目录获取待整理的博文。

### 3.2 YAML Front Matter 规范
所有生成的博文必须包含以下标头，且格式必须严谨：
- `layout`: 始终设为 `post`。
- `title`: **必须始终使用双引号包裹**（例如 `title: "我的文章标题"`），以防止冒号导致的解析错误。
- `categories`: 默认设为 `[技术]`。
- `tags`: 标准 YAML 数组格式（例如 `tags: [Docker, Nginx]`），根据内容自动提取关键技术标签。

## 4. 自动化技能 (Agent Skills)

本项目配备了以下标准化技能来保证操作的原子性和一致性：
- **`jekyll-blog-formatter`**: 用于从源文件提取标题、生成 Front Matter 及规范文件名，并支持一键发布。
- **`git-publisher`**: 用于暂存变更、智能分析内容生成语义化 Commit Message 并推送至 `master`。

**说明**：技能定义文件与执行脚本存放在 `.agents/skills/`、`.gemini/skills/` 及 `_skills/` 目录下。

## 5. Git 工作流
- **分支管理**：主开发分支为 `master`。
- **提交规范**：遵循语义化提交（Conventional Commits），格式为 `<type>: <description> (YYYY-MM-DD)`。
- **智能分析**：在提交前需分析暂存区内容（尤其是博客标题），以生成精准的描述。

---
*维护者：xiedaibin & AI Agents*
