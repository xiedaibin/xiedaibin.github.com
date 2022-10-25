---
layout: page
title: Docker 安装常用软件
category: 技术
tags: Docker
---
{% include JB/setup %}

## Mysql
~~~ PowerShell   
docker run -itd --name mysql-test -p 3306:3306 -e MYSQL_ROOT_PASSWORD=123456 mysql --lower_case_table_names=0 //区分大小写
~~~

## rabbitmq
~~~ PowerShell
docker run -d --hostname my-rabbit --name rabbit -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=123456 -e RABBITMQ_DEFAULT_VHOST=XDBVHOST -p 15672:15672 -p 5672:5672 rabbitmq:3-management
~~~

## redis
~~~ PowerShell
docker run -p 6379:6379 -v $PWD/data:/data -v $PWD/conf/redis.conf:/etc/redis/redis.conf --privileged=true --restart=always --name myredis -d redis redis-server /etc/redis/redis.conf
~~~

## jenkins
~~~ PowerShell
docker run \
  --name jenkins-blueocean \ 
  --privileged=true \
  --restart=always \
  -d \
  -p 8081:8080 \
  -p 50000:50000 \
  -v /usr/bin/docker:/usr/bin/docker \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /appwork/jenkinsdata/jenkins:/var/jenkins_home \
  jenkinsci/blueocean    
~~~

## nuget-server
baget.env    
~~~ Plain Text
ApiKey=c94c2be6-d754-11ec-8f72-00163e17680c
Storage__Type=FileSystem
Storage__Path=/var/baget/packages
Database__Type=Sqlite
Database__ConnectionString=Data Source=/var/baget/baget.db
Search__Type=Database
~~~
~~~ PowerShell
docker run -itd --name nuget-server --restart=always -p 7002:80 --env-file baget.env -v "$(pwd)/baget-data:/var/baget" loicsharma/baget:latest
~~~

## Portainer  
~~~ PowerShell
docker run -d -p 9000:9000 --restart=always  -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data -v /public:/public --name prtainer-test  portainer/portainer
~~~

## 禅道
~~~ PowerShell
docker run --name zentao -p 8080:80 -v /appwork/zentao/www/zentaopms:/www/zentaopms -v /appwork/zentao/www/mysqldata:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=123456 -d easysoft/zentao:15.0.3 --restart=always
~~~