# XDB's Blog

记录生活，记录感悟 —— 谢代彬的个人技术博客（[https://19920625.xyz](https://19920625.xyz)）。

本项目使用 **Jekyll 4** 与 [**Chirpy (`jekyll-theme-chirpy`)**](https://github.com/cotes2020/jekyll-theme-chirpy) 主题构建，并通过 GitHub Actions 自动构建部署至 GitHub Pages。

## 本地运行与校验

需要 Ruby（`>= 3.1`）与 Bundler 环境：

```bash
bundle install
bundle exec jekyll s -l
```

构建与静态链接检查：

```bash
bash tools/test.sh
```

## License

[MIT](https://opensource.org/licenses/MIT)
