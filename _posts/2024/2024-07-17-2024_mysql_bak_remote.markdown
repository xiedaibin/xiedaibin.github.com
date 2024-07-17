---
layout: page
title:   同步备份还原线上数据库脚本并还原到本地
category: 技术
tags: Shell Mysql
---
{% include JB/setup %}

## 

在这篇文章中，我将分享一个用于备份和还原线上数据库的 Bash 脚本，并详细解释每个步骤的功能。该脚本包括从远程服务器同步文件到本地目录、检查同步状态、并行执行 rsync 命令、以及在成功同步后调用数据恢复脚本。

### 脚本内容

以下是脚本的完整代码：

```bash
#!/bin/bash

. /etc/profile
. ~/.bash_profile

# 获取当前脚本所在目录
script_dir="/root/xdb/plan/mysql"

# 引用 logging_utils.sh 脚本
source "$script_dir/logging_utils.sh"
source "$script_dir/send_feishu_notification.sh"

# 启用错误检测
set -e

# 获取当前日期（格式：YY-MM-DD）
current_date=$(date +"%y-%m-%d")

log "执行脚本开始时间:$(date +"%y-%m-%d %H:%M:%S")"
send_feishu_notification "备份还原线上数据库开始:$(date +"%y-%m-%d %H:%M:%S")"

# 定义远程服务器的连接信息
remote_user="root"  # 远程服务器的用户名
remote_host="远程IP地址(需要替换成自己的)"  # 远程服务器的IP地址或主机名
remote_base_directory="/var/backup/mysqlbak"  # 远程服务器上备份文件夹的基本路径

# 定义本地根目录和目标目录变量
local_root_directory="/var/backup/mysqlbak"  # 本地保存下载内容的根目录路径
local_directory="$local_root_directory/$current_date"  # 本地保存下载内容的目录路径
# 线程数
threads=5

# 检查本地目录是否存在，如果不存在则创建
if [ ! -d "$local_directory" ]; then
    mkdir -p "$local_directory"
fi
log "1.文件同步开始！"

# 同步目录结构
rsync -av -f"+ */" -f"- *" "$remote_user@$remote_host:$remote_base_directory/$current_date/" "$local_directory"

# 检查 rsync 命令的返回状态
if [ $? -eq 0 ]; then
    echo "1.目录结构同步成功！"
else
    echo "目录结构同步失败！"
    exit 1
fi

# 从远程服务器获取文件列表并并行同步文件
ssh $remote_user@$remote_host "cd $remote_base_directory/$current_date && find . -type f" | \
xargs -n1 -P$threads -I% rsync -avrh --ignore-existing "$remote_user@$remote_host:$remote_base_directory/$current_date/%" "$local_directory/%"

# 等待所有并行任务完成
wait

# 检查 rsync 命令的返回状态
if [ $? -eq 0 ]; then
    log "1.文件同步成功！"
    # 调用 restore_bakmysqldata.sh
    "$script_dir/restore_bakmysqldata.sh" "$script_dir"
    
    # 检查 restore_bakmysqldata.sh的返回状态
    if [ $? -eq 0 ]; then
        log "数据恢复成功!"
    else
        log "数据恢复失败。"
    fi
else
    log "文件同步失败。"
fi

log "执行脚本结束时间:$(date +"%y-%m-%d %H:%M:%S")"
send_feishu_notification "备份还原线上数据库结束:$(date +"%y-%m-%d %H:%M:%S")"
```

### 脚本解析

#### 环境加载与变量定义

```bash
. /etc/profile
. ~/.bash_profile

script_dir="/root/xdb/plan/mysql"

source "$script_dir/logging_utils.sh"
source "$script_dir/send_feishu_notification.sh"

set -e

current_date=$(date +"%y-%m-%d")
```

- 加载系统和用户的环境变量。
- 设置脚本目录和引用外部脚本（日志和通知脚本）。
- 启用错误检测，一旦命令失败，脚本将立即退出。
- 获取当前日期，格式为 `YY-MM-DD`。

#### 日志记录与通知

```bash
log "执行脚本开始时间:$(date +"%y-%m-%d %H:%M:%S")"
send_feishu_notification "备份还原线上数据库开始:$(date +"%y-%m-%d %H:%M:%S")"
```

- 记录脚本开始执行的时间。
- 发送飞书通知，告知备份还原任务开始。

#### 定义远程与本地目录

```bash
remote_user="root"
remote_host="远程IP地址(需要替换成自己的)"
remote_base_directory="/var/backup/mysqlbak"

local_root_directory="/var/backup/mysqlbak"
local_directory="$local_root_directory/$current_date"
threads=5
```

- 定义远程服务器的连接信息和本地目录。
- 设置并行执行的线程数。

#### 创建本地目录

```bash
if [ ! -d "$local_directory" ]; then
    mkdir -p "$local_directory"
fi
log "1.文件同步开始！"
```

- 检查并创建本地保存下载内容的目录。
- 记录文件同步开始的日志。

#### 同步目录结构

```bash
rsync -av -f"+ */" -f"- *" "$remote_user@$remote_host:$remote_base_directory/$current_date/" "$local_directory"

if [ $? -eq 0 ]; then
    echo "1.目录结构同步成功！"
else
    echo "目录结构同步失败！"
    exit 1
fi
```

- 使用 `rsync` 命令同步远程服务器的目录结构。
- 检查同步状态，并记录结果。

#### 并行同步文件

```bash
ssh $remote_user@$remote_host "cd $remote_base_directory/$current_date && find . -type f" | \
xargs -n1 -P$threads -I% rsync -avrh --ignore-existing "$remote_user@$remote_host:$remote_base_directory/$current_date/%" "$local_directory/%"

wait
```

- 通过 SSH 获取远程服务器的文件列表，并使用 `xargs` 并行执行 `rsync` 命令同步文件。
- 使用 `wait` 命令等待所有并行任务完成。

#### 检查同步状态并恢复数据

```bash
if [ $? -eq 0 ]; then
    log "1.文件同步成功！"
    "$script_dir/restore_bakmysqldata.sh" "$script_dir"
    
    if [ $? -eq 0 ]; then
        log "数据恢复成功!"
    else
        log "数据恢复失败。"
    fi
else
    log "文件同步失败。"
fi
```

- 检查文件同步状态，并记录结果。
- 同步成功后调用数据恢复脚本，并检查恢复状态。

#### 记录结束时间并发送通知

```bash
log "执行脚本结束时间:$(date +"%y-%m-%d %H:%M:%S")"
send_feishu_notification "备份还原线上数据库结束:$(date +"%y-%m-%d %H:%M:%S")"
```

- 记录脚本结束执行的时间。
- 发送飞书通知，告知备份还原任务结束。

### 总结

这个脚本实现了从远程服务器同步数据库备份文件到本地，并在同步成功后执行数据恢复操作。通过并行执行 `rsync` 命令，显著提高了文件同步的效率。希望这篇文章能帮助你更好地理解和应用这个脚本。欢迎在评论区分享你的想法和问题！