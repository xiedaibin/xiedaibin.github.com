---
layout: page
title: GitHub高级搜索过滤器
category: 常用命令
tags: Github
---
{% include JB/setup %}


| 过滤器       | 用法示例            | 描述                                     |
|--------------|---------------------|------------------------------------------|
| filename     | `filename:example.py` | 搜索具有文件名为 "example.py" 的文件。    |
| extension    | `extension:pdf`       | 搜索具有扩展名为 ".pdf" 的文件。         |
| path         | `path:src/main`       | 搜索位于 "src/main" 路径下的文件。      |
| -            | `keyword1 -keyword2`  | 搜索包含 "keyword1" 关键字但不包含 "keyword2" 关键字的结果。 |
| size         | `size:<100`           | 搜索文件大小小于 100 字节的结果。       |
|              | `size:>=100`          | 搜索文件大小大于等于 100 字节的结果。  |
| created      | `created:<2022-01-01` | 搜索创建日期早于 2022 年 1 月 1 日的结果。 |
| pushed       | `pushed:>2021-01-01`  | 搜索推送日期晚于 2021 年 1 月 1 日的结果。 |
| stars        | `stars:>1000`         | 搜索具有超过 1000 个星标的仓库。         |
| forks        | `forks:<=50`          | 搜索具有最多 50 个派生的仓库。           |
| language     | `language:python`     | 搜索使用 Python 编程语言的结果。         |
| org          | `org:openai`          | 搜索 OpenAI 组织的结果。                |
| archived     | `archived:false`      | 搜索未归档的仓库。                      |

