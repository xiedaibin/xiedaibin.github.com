---
layout: page
title: CentOS 7.9 安装 MySQL 8.0 客户端指南
category: 技术
tags: mysql
---

在 CentOS 7.9 上安装 MySQL 8.0 客户端可以通过 MySQL 官方提供的 YUM 存储库进行，以下是详细的安装步骤。

## 1. 以 root 用户登录系统

首先，打开终端并使用 `root` 用户登录 CentOS 7.9 服务器。

## 2. 导入 MySQL 官方存储库密钥

运行以下命令导入 MySQL 官方的 GPG 密钥，以确保软件包的来源可信：

```bash
rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql
```

## 3. 添加 MySQL 官方 YUM 存储库

下载 MySQL 官方提供的 YUM 存储库定义文件，并将其安装到系统：

```bash
wget https://dev.mysql.com/get/mysql80-community-release-el7-3.noarch.rpm
rpm -ivh mysql80-community-release-el7-3.noarch.rpm
```

## 4. 安装 MySQL 8.0 客户端

使用 `yum` 命令安装 MySQL 客户端，并跳过 GPG 密钥检查（可选）：

```bash
yum install --nogpgcheck mysql-community-client
```

在安装过程中，系统会提示确认安装，输入 `y` 并回车即可继续。

## 5. 验证 MySQL 客户端安装

安装完成后，可以运行以下命令检查 MySQL 客户端是否成功安装：

```bash
mysql --version
```

示例输出：

```
mysql  Ver 8.0.34 for Linux on x86_64 (MySQL Community Server - GPL)
```

## 6. 总结

通过以上步骤，您已经成功在 CentOS 7.9 上安装了 MySQL 8.0 客户端。现在，您可以使用 `mysql` 命令与远程 MySQL 服务器进行连接和管理数据库。
