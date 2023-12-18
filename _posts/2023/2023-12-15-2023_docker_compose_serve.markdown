---
layout: page
title: docker compose 启动
category: 工具
tags: Docker
---
{% include JB/setup %}


### 一些常用服务使用docker compose 启动

#### Mysql8

```
version: "3"

networks:
  test:
    external: false

services:
  db:
    image: mysql:8
    restart: always
    environment:
      - MYSQL_ROOT_PASSWORD=123456
      - MYSQL_USER=cvuser
      - MYSQL_PASSWORD=123456
    command:
      --default-authentication-plugin=mysql_native_password
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_general_ci
      --explicit_defaults_for_timestamp=true
      --lower_case_table_names=1
    ports:
      - 3306:3306
    networks:
      - test
    volumes:
      - ./mysql:/var/lib/mysql

```

#### Rabbitmq 3

```
version: '3.5'
services:
  rabbitmq:
    image: rabbitmq:3-management
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: 123456
      RABBITMQ_DEFAULT_VHOST: XDBVHOST
      RABBITMQ_MAX_MEMORY: 300M
    ports:
      - 5672:5672
      - 15672:15672
```

#### Jenkins

```
version: '3.1'
services:
  jenkins:
    image: 'jenkins/jenkins:2.346.1'
    container_name: myjenkins
    privileged: true
    user: root
    environment:
      - TZ=Asia/Shanghai
      - JAVA_OPTS=-Xmx1024m -Xms1024m
    ports:
      - '8081:8080'
      - '50000:50000'
    volumes:
      - '/appwork/jenkinsdata/jenkins:/var/jenkins_home'
      - '/var/run/docker.sock:/var/run/docker.sock'
      - '/usr/bin/docker:/usr/bin/docker'
```


