const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取命令行参数：源文件路径
const sourceFile = process.argv[2];
if (!sourceFile) {
  console.error('Error: Source file path is required.');
  process.exit(1);
}

const sourcePath = path.resolve(sourceFile);
if (!fs.existsSync(sourcePath)) {
  console.error(`Error: Source file not found at ${sourcePath}`);
  process.exit(1);
}

// 1. 读取源文件
const content = fs.readFileSync(sourcePath, 'utf8');
const lines = content.split('\n');

// 2. 提取一级标题并移除之
let title = '';
let bodyLines = [];
let titleFound = false;

for (let line of lines) {
  if (!titleFound && line.startsWith('# ')) {
    title = line.substring(2).trim();
    titleFound = true;
  } else if (titleFound || line.trim() !== '') {
    bodyLines.push(line);
  }
}

if (!title) {
  title = path.basename(sourceFile, path.extname(sourceFile));
}

// 3. 生成文件名和路径
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const dateStr = `${year}-${month}-${day}`;

// 处理文件名（去除特殊字符，替换空格为下划线）
const safeFileName = title.toLowerCase()
  .replace(/[:：]/g, '')
  .replace(/\s+/g, '_')
  .replace(/[^\w\u4e00-\u9fa5]/g, '_')
  .replace(/_+/g, '_');

const targetFileName = `${dateStr}-${year}_${safeFileName}.markdown`;
const targetDir = path.join('_posts', String(year));
const targetPath = path.join(targetDir, targetFileName);

// 4. 提取标签 (简单逻辑：从正文中提取英文词组，或固定常用)
const tagsMatch = content.match(/[A-Za-z0-9+#]+(?=\s|,|\.)/g) || [];
const uniqueTags = [...new Set(tagsMatch.filter(t => t.length > 2 && !['the', 'and', 'for', 'with'].includes(t.toLowerCase())))].slice(0, 8);
const tagsStr = uniqueTags.join(', ');

// 5. 构造 Front Matter 和新内容
const frontMatter = `---
layout: page
title: "${title.replace(/"/g, '\\"')}"
category: 技术
tags: ${tagsStr}
---

`;

const finalContent = frontMatter + bodyLines.join('\n');

// 6. 确保目标目录存在并写入
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

fs.writeFileSync(targetPath, finalContent);
console.log(`✅ File created at: ${targetPath}`);

// 7. 删除源文件
fs.unlinkSync(sourcePath);
console.log(`🗑️ Source file deleted: ${sourceFile}`);

// 8. Git 操作
try {
  const commitMsg = `feat: publish "${title}" (${dateStr})`;
  console.log(`🚀 Committing and pushing: ${commitMsg}`);
  
  // 使用 ; 作为连接符 (适配 Windows)
  execSync(`git add . ; git commit -m "${commitMsg.replace(/"/g, '\\"')}" ; git push origin master`, { stdio: 'inherit' });
  console.log('🏁 Successfully published to GitHub!');
} catch (error) {
  console.error('❌ Git operation failed:', error.message);
}
