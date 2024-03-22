---
layout: page
title:  部署安全的 Docker Registry
category: 技术
tags: docker
---
{% include JB/setup %}

### 部署安全的 Docker Registry

在现代 IT 环境中，安全性是至关重要的一环。为了保护您的容器镜像，您需要使用安全的 Docker Registry。以下是一套步骤，帮助您快速部署一个安全的 Docker Registry，并解决可能出现的一些常见问题。

### 1. 配置服务端

#### 1.1. 生成证书

首先，我们需要生成一个安全的证书来保护您的 Registry。证书生成需要升级您的 OpenSSL 到版本 1.1.1。

```bash
openssl req \
  -newkey rsa:4096 -nodes -sha256 -keyout certs/domain.key \
  -addext "subjectAltName = DNS:registry.xdb.com" \
  -x509 -days 365 -out certs/domain.crt
```

#### 1.2. 运行脚本

接下来，您可以运行以下脚本来启动 Docker Registry。请确保将证书挂载到容器中，并设置相应的环境变量。

```bash
docker run -d \
  --restart=always \
  --name registry.xdb.com \
  -v `pwd`/certs:/certs \
  -e REGISTRY_HTTP_ADDR=0.0.0.0:443 \
  -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/domain.crt \
  -e REGISTRY_HTTP_TLS_KEY=/certs/domain.key \
  -p 443:443 \
  registry:2
```

### 2. 配置客户端

客户端需要进行一些配置以确保安全连接到 Registry。

#### 2.1. 首先，您需要在 `/etc/hosts` 中添加域名映射：

```bash
cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.1.132 registry.xdb.com
```

#### 2.2. 接着，将证书添加到 `/etc/docker/certs.d/{域名}/ca.certs`。

#### 2.3. 重启 containerd 服务：

```bash
#重新加载配置
systemctl daemon-reload
#重启containerd
systemctl restart docker
```

### 3. 推送镜像

现在，您可以通过以下命令来推送您的镜像到安全的 Registry：

```bash
docker push registry.xdb.com/{您的镜像}:{标签}
```

### 4. 检查上传

您可以通过访问以下 URL 来检查是否已经成功上传镜像：

```
https://registry.xdb.com/v2/_catalog
```

#### 参考连接

- [部署 Registry 服务器](https://docs.docker.com/registry/deploying/#get-a-certificate)
- [测试不安全的 Registry](https://docs.docker.com/registry/insecure/#deploy-a-plain-http-registry)
- [常见问题：x509 证书依赖于传统的 Common Name 字段](https://jfrog.com/knowledge-base/general-what-should-i-do-if-i-get-an-x509-certificate-relies-on-legacy-common-name-field-error/)
- [containerd 拉取私有仓库镜像报错 x509: certificate signed by unknown authority](https://blog.csdn.net/qq_37837432/article/details/124159248)

通过以上步骤，您可以安全地部署和管理您的 Docker Registry，并确保镜像传输的安全性和完整性。如果您遇到任何问题，可以参考上述参考连接或随时联系我们的支持团队。
