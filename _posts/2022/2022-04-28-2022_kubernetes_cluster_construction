---
layout: page
title: 基于Kubeadm的Kubernetes集群搭建(CentOS7)
category: 技术
tags: 技术
---
{% include JB/setup %}
## 环境
系统：Centos7
kubernetes：v1.23.6
docker：20.10.14
## 服务器准备   
1. 192.168.1.162 mater  
2. 192.168.1.161 node   
更改服务器名称(便于查看)  
192.168.1.162 k8s-master-1    
vi /etc/hostname 将值更改为 k8s-master-1    
192.168.1.161 k8s-node-1    vi /etc/hostname 将值更改为 k8s-master-1 
## <span id="jump">服务器环境配置</span>
1.禁用selinux  
    
    [root@k8s-master-1 ~]# setenforce 0          #临时关闭
    [root@k8s-master-1 ~]# vi /etc/selinux/config   #永久，将config 中SELINUX设置为disabled

2.禁用firewalld  
    查看防火墙状态： systemctl status firewalld.service     
    关闭防火墙命令： systemctl stop firewalld.service        
    禁用防火墙命令： systemctl disable firewalld.service  
3.关闭swap交换区
    
    [root@k8s-master-1 ~]# swapoff -a #临时关闭
    [root@k8s-master-1 ~]# vi  /etc/fstab #永久，编辑/etc/fstab，注释关于swap那行   

![iamge](../../images/article/20220429-144333.jpg)
4.修改iptable规则，打开内置的桥功能

    echo "1" >/proc/sys/net/bridge/bridge-nf-call-iptables
    
5.在master配置hosts解析各主机

    [root@k8s-master-1 ~]# vi /etc/hosts

![image](../../images/article/20220429-144333.jpg)   
6.docker环境搭建与配置

    curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun

配置 (kubernetes官方推荐docker等使用systemd作为cgroupdriver)

    mkdir /etc/docker
    cat > /etc/docker/daemon.json <<EOF
    {
    "exec-opts": ["native.cgroupdriver=systemd"],
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "100m"
    },
    "storage-driver": "overlay2",
    "storage-opts": [
        "overlay2.override_kernel_check=true"
    ],
    "data-root": "/data/docker"
    }
    EOF
重启docker

    systemctl daemon-reload
    systemctl restart docker
检查 docker info|grep "Cgroup Driver" 是否输出 Cgroup Driver: systemd

## master安装k8s组件，初始化master

1.执行下面命令安装k8s组件

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
2.初始化master

    kubeadm init --image-repository registry.aliyuncs.com/google_containers --kubernetes-version v1.23.6 --pod-network-cidr=10.244.0.0/16

**ps**: 安装出错可以通过 journalctl -xefu kubelet 查看错误细节。    
 初始化错误，解决问题之后，可以通过kubeadm reset 重置，再安装。

初始化命令成功结束后会出现下图内容：
![iamge](../../images/article/20220429-144742.png)



## master安装网络插件
本文使用flannel （可能会因为网络问题，镜像下载会比较慢，请耐心），使用kubectl -n kube-system get pod查看状态

    kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml

**ps**: 外网不可访问处理方法 

    # 在https://www.ipaddress.com/查询raw.githubusercontent.com的真实IP。
    sudo vim /etc/hosts
    199.232.28.133 raw.githubusercontent.com

![iamge](../../images/article/20220429-144743.png)
![iamge](../../images/article/20220429-144744.png)

## 配置node，加入集群
1.node环境配置
    同master一样需要配置环境并安装docker。[环境配置](#jump)
2.执行下面命令安装k8s组件

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
3.执行记录下来的join命令

    kubeadm join 192.168.1.162:6443 --token ****** \
    --discovery-token-ca-cert-hash sha256:eb138b1edc2436d8de9ee844392059caecdadbc6e9c2bf6729f8ee2e6151c953

![image](../../images/article/20220429-161912.jpg)

**ps**: 加入错误，解决问题之后，可以通过kubeadm reset 重置，再加入  
4.在master执行命令查看集群状态

    [root@k8s-master-1 ~]# kubectl  get node

![image](../../images/article/20220429-155018.jpg)

## 参考文章
[002.使用kubeadm安装kubernetes 1.17.0](https://www.cnblogs.com/zyxnhr/p/12181721.html){:target="_blank"}     
[Kubernetes 镜像](https://developer.aliyun.com/mirror/kubernetes?spm=a2c6h.13651102.0.0.53322f705Hg6zu){:target="_blank"}   
[安装 kubeadm](https://kubernetes.io/zh/docs/setup/production-environment/tools/kubeadm/install-kubeadm/){:target="_blank"}  
[Kubernetes 加入主节点报错](https://www.cnblogs.com/wangzy-Zj/p/13130877.html){:target="_blank"}        
[【kubeadm初始化报错】failed to run Kubelet: misconfiguration: kubelet cgroup driver: "cgroupfs" is different from docker cgroup driver: "systemd"
](https://www.cnblogs.com/hellxz/p/kubelet-cgroup-driver-different-from-docker.html){:target="_blank"}  
[如何解决 kubernetes 重启后,启来不来的问题](https://www.cnblogs.com/jackluo/p/10337230.html){:target="_blank"}  
[CentOS Docker 安装](https://m.runoob.com/docker/centos-docker-install.html){:target="_blank"}          
[解决k8s执行kubeadm join遇到could not find a JWS signature的问题](https://segmentfault.com/a/1190000023107314){:target="_blank"}       