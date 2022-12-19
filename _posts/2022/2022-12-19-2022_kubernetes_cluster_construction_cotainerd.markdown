---
layout: page
title: 基于Kubeadm的Kubernetes集群搭建(containerd)(CentOS7)
category: 技术
tags: 技术
---
{% include JB/setup %}
## 环境
系统：Centos7   
kubernetes：v1.26.0     
containerd：1.6.13      
## 服务器准备   
1. 192.168.1.162 mater      
2. 192.168.1.161 node       
更改服务器名称(便于查看)    
192.168.1.162 k8s-master-1    
vi /etc/hostname 将值更改为 k8s-master-1        
192.168.1.161 k8s-node-1   
vi /etc/hostname 将值更改为 k8s-master-1         

## <span id="jump">服务器环境配置</span>  

### 1.禁用selinux  

    [root@k8s-master-1 ~]# setenforce 0 && sed -i 's/^SELINUX=.*/SELINUX=disabled/' /etc/selinux/config     

### 2.禁用firewalld  
    查看防火墙状态： systemctl status firewalld.service     
    关闭防火墙命令： systemctl stop firewalld.service        
    禁用防火墙命令： systemctl disable firewalld.service      

### 3.关闭swap交换区
    
    [root@k8s-master-1 ~]# swapoff -a && sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

![iamge](/images/article/20220429-144741.jpg)   

### 4.在master配置hosts解析各主机

    [root@k8s-master-1 ~]# vi /etc/hosts

![image](/images/article/20220429-144333.jpg)   

### 5.Iptables 以及配置
#### 5.1 启用IPtables

    yum -y install iptables-services && systemctl start iptables && systemctl enable iptables
    # yum -y install iptables-services && systemctl start iptables && systemctl enable iptables && iptables -F && service iptables save

#### 5.2 ipvs配置

    modprobe br_netfilter 
    cat > /etc/sysconfig/modules/ipvs.modules <<EOF
    #!/bin/bash
    modprobe -- ip_vs
    modprobe -- ip_vs_rr
    modprobe -- ip_vs_wrr
    modprobe -- ip_vs_sh
    modprobe -- nf_conntrack
    EOF
    chmod 755 /etc/sysconfig/modules/ipvs.modules && bash /etc/sysconfig/modules/ipvs.modules && lsmod | grep -e ip_vs -e nf_conntrack_ipv4

### 6.Containerd 安装与验证

#### 6.1 安装和配置先决条件

    cat > kubernetes.conf <<EOF
    net.bridge.bridge-nf-call-iptables=1 # 为了让 Linux 节点的 iptables 能够正确查看桥接流量，请确认 sysctl 配置中的 net.bridge.bridge-nf-call-iptables 设置为 1
    net.bridge.bridge-nf-call-ip6tables=1
    net.ipv4.ip_forward=1
    net.ipv4.tcp_tw_recycle=0
    vm.swappiness=0 # 禁止使用 swap 空间，只有当系统 OOM 时才允许使用它 vm.overcommit_memory=1 # 不检查物理内存是否够用
    vm.panic_on_oom=0 # 开启 OOM
    fs.inotify.max_user_instances=8192
    fs.inotify.max_user_watches=1048576
    fs.file-max=52706963
    fs.nr_open=52706963
    net.ipv6.conf.all.disable_ipv6=1
    net.netfilter.nf_conntrack_max=2310720
    EOF
    cp kubernetes.conf /etc/sysctl.d/kubernetes.conf
    sysctl -p /etc/sysctl.d/kubernetes.conf

#### 6.2 Containerd 安装

    # 安装需要的软件包， yum-util 提供yum-config-manager功能，另外两个是devicemapper驱动依赖的
    yum install -y yum-utils device-mapper-persistent-data lvm2
    # 设置 yum 源
    # yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
    yum install containerd -y

    $ containerd config default > /etc/containerd/config.toml
    $ systemctl restart containerd
    $ systemctl status containerd

    # 替换 containerd 默认的 sand_box 镜像，编辑 /etc/containerd/config.toml

    sandbox_image = "registry.aliyuncs.com/google_containers/pause:3.2"

    # 重启containerd
    $ systemctl daemon-reload
    $ systemctl restart containerd      

#### 6.3 CRI 客户端 crictl

    # https://github.com/kubernetes-sigs/cri-tools/releases/ 选择版本
    wget https://github.com/kubernetes-sigs/cri-tools/releases/download/v1.26.0/crictl-v1.26.0-linux-amd64.tar.gz
    sudo tar zxvf crictl-v1.26.0-linux-amd64.tar.gz -C /usr/local/bin

    vi /etc/crictl.yaml 
    runtime-endpoint: unix:///run/containerd/containerd.sock
    image-endpoint: unix:///run/containerd/containerd.sock
    timeout: 10
    debug: false

    # 验证是否可用
    crictl  pull nginx:alpine
    crictl  rmi  nginx:alpine
    crictl  images

## master安装k8s组件，初始化master

### 1.执行下面命令安装k8s组件

    cat <<EOF > /etc/yum.repos.d/kubernetes.repo
    [kubernetes]
    name=Kubernetes
    baseurl=http://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64
    enabled=1
    gpgcheck=0
    repo_gpgcheck=0
    gpgkey=http://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg http://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
    EOF
    # 删除旧版本，如果安装了
    # yum remove kubeadm kubectl kubelet kubernetes-cni cri-tools socat 

    # 安装指定版本用下面的命令
    # yum -y install kubeadm-1.26.0 kubectl-1.26.0 kubelet-1.26.0

    # 默认安装最新稳定版，当前版本1.26.0
    yum install kubeadm kubectl kubelet

    # 查看所有可安装版本
    # yum --showduplicates list kubeadm

    # 开机自启
    systemctl enable kubelet.service
    
### 2.修改kubelet配置

    $ vi /usr/lib/systemd/system/kubelet.service.d/10-kubeadm.conf
    # 加入下面内容
    Environment="KUBELET_EXTRA_ARGS=--container-runtime=remote --runtime-request-timeout=15m --container-runtime-endpoint=unix:///run/containerd/containerd.sock"

### 3.初始化master

    kubeadm config print init-defaults > kubeadm-config.yaml
    #修改 kubeadm-config.yaml文件如下部分
    localAPIEndpoint:
    advertiseAddress: 192.168.28.101（这里的ip修改为主机ip）
    # 默认拉取镜像地址k8s.gcr.io国内无法访问，指定阿里云镜像仓库地址
    imageRepository: registry.aliyuncs.com/google_containers
    # kubernetes 版本
    kubernetesVersion: v1.26.0
    nodeRegistration:
        criSocket: /run/containerd/containerd.sock # 这里的内容修改下
    # networking组下新增一行 podSubnet: "10.244.0.0/16" flannel默认使用的网断
    networking:
    podSubnet: "10.244.0.0/16"
    serviceSubnet: 10.96.0.0/12

    # 将 kube-proxy 默认的调度方式改为ipvs
    ---
    apiVersion: kubeproxy.config.k8s.io/v1alpha1
    kind: KubeProxyConfiguration
    mode: ipvs

    # 初始化 --experimental-upload-certs 给其它主节点自动颁发证书 tee kubeadm-init.log 把所有信息写入文件中
    kubeadm init --config=kubeadm-config.yaml --upload-certs | tee kubeadm-init.log


**ps**: 安装出错可以通过 journalctl -xefu kubelet 查看错误细节。    
 初始化错误，解决问题之后，可以通过kubeadm reset 重置，再安装。

初始化命令成功结束后会出现下图内容：
![iamge](/images/article/20220429-144742.png)



## master安装网络插件
本文使用flannel （可能会因为网络问题，镜像下载会比较慢，请耐心），使用kubectl -n kube-system get pod查看状态

    kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml

**ps**: 外网不可访问处理方法 

    # 在https://www.ipaddress.com/查询raw.githubusercontent.com的真实IP。
    sudo vim /etc/hosts
    199.232.28.133 raw.githubusercontent.com

![iamge](/images/article/20220429-144743.png)
![iamge](/images/article/20220429-144744.png)

## 配置node，加入集群

### 1.node环境配置
同master一样需要配置环境并安装cotnainerd。([环境配置](#jump))   

### 2.执行下面命令安装k8s组件

    cat <<EOF > /etc/yum.repos.d/kubernetes.repo
    [kubernetes]
    name=Kubernetes
    baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/
    enabled=1
    gpgcheck=1
    repo_gpgcheck=1
    gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
    EOF
    yum install -y --nogpgcheck kubelet kubeadm kubectl
    systemctl enable kubelet && systemctl start kubelet

**ps**: 由于官网未开放同步方式, 可能会有索引gpg检查失败的情况, 这时请用 yum install -y --nogpgcheck kubelet kubeadm kubectl 安装    
### 3.执行记录下来的join命令

    kubeadm join 192.168.1.162:6443 --token ****** \
    --discovery-token-ca-cert-hash sha256:eb138b1edc2436d8de9ee844392059caecdadbc6e9c2bf6729f8ee2e6151c953

![image](/images/article/20220429-161912.jpg)

**ps**: 加入错误，解决问题之后，可以通过kubeadm reset 重置，再加入  
### 4.在master执行命令查看集群状态

    [root@k8s-master-1 ~]# kubectl get node

![image](/images/article/20220429-155018.jpg)

## 参考文章
[CentOS7下 kubernetes containerd版安装](https://blog.csdn.net/flywingwu/article/details/113482681){:target="_blank"}      
[容器运行时](https://kubernetes.io/zh-cn/docs/setup/production-environment/container-runtimes/){:target="_blank"}     
[基于Kubeadm的Kubernetes集群搭建(CentOS7)](https://xiedaibin.github.io/2022/04/28/2022_kubernetes_cluster_construction){:target="_blank"}    