---
layout: page
title: chmod +x 和-x 详解
category: 技术
tags: ChatGPT问答 linux
---
{% include JB/setup %}


`chmod`命令用于在Linux和Unix系统上更改文件和目录的权限。权限控制了对文件和目录的访问，其中包括读取（r）、写入（w）和执行（x）权限。数字方式和符号方式都可以用来设置权限。

*   `chmod +x file`：这个命令将给文件file添加执行权限。"+"表示添加权限，"x"表示执行权限。

*   `chmod -x file`：这个命令将从文件file中移除执行权限。"-"表示移除权限，"x"表示执行权限。


可以通过以下示例说明：

假设我们有一个名为"script.sh"的文件，它是一个Shell脚本文件，并且没有执行权限。

1.  使用`ls -l`命令查看文件权限：

bash

```bash
$ ls -l script.sh
-rw-r--r-- 1 user group  25 Aug  2 10:00 script.sh
```

上面的输出显示，文件"script.sh"当前的权限是`rw-r--r--`，表示所有者（user）有读写权限，而组用户（group）和其他用户只有读权限。

2.  添加执行权限：

bash

```bash
$ chmod +x script.sh
```

3.  再次使用`ls -l`命令查看文件权限：

bash

```bash
$ ls -l script.sh
-rwxr-xr-x 1 user group  25 Aug  2 10:00 script.sh
```

现在，文件"script.sh"的权限变为`rwxr-xr-x`，表示所有者（user）有读、写和执行权限，而组用户（group）和其他用户也都有读和执行权限。

4.  移除执行权限：

bash

```bash
$ chmod -x script.sh
```

5.  最后再次使用`ls -l`命令查看文件权限：

bash

```bash
$ ls -l script.sh
-rw-r--r-- 1 user group  25 Aug  2 10:00 script.sh
```

现在，文件"script.sh"的权限恢复为最初的状态`rw-r--r--`，执行权限已经被移除了。
