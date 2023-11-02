---
layout: page
title: Kubeadm证书过期处理
category: 运维
tags: K8s
---
{% include JB/setup %}


**1\. 查看证书信息**

sql

```sql
kubeadm certs check-expiration
```

此命令用于检查Kubernetes集群中的证书到期情况，以确保证书的有效性。

**2\. 更新证书**

css

```css
sudo kubeadm certs renew all
```

该命令用于更新Kubernetes集群中的所有证书，以确保它们的有效性。

**3\. 重启Kubernetes容器**

perl

```perl
docker ps | grep -E 'k8s_kube-apiserver|k8s_kube-controller-manager|k8s_kube-scheduler|k8s_etcd_etcd' | awk -F ' ' '{print $1}' | xargs docker restart
```

此命令用于重启Kubernetes集群中的特定Docker容器，包括kube-apiserver、kube-controller-manager、kube-scheduler和etcd容器。

**4\. 更新连接信息**

bash

```bash
rm -rf ~/.kube
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

这组命令用于更新Kubectl的配置文件，将其拷贝到用户主目录下的`.kube`目录，并设置正确的文件权限。

**5\. 检查**

sql

```sql
kubeadm certs check-expiration
kubectl get pod
```

这两个命令用于再次检查证书到期情况，以及查看当前集群中的Pod状态。

这些命令可以帮助您维护和管理Kubernetes集群的证书以及相关的连接信息，确保集群的正常运行。
