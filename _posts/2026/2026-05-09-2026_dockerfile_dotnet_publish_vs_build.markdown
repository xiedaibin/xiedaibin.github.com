---
layout: page
title: "Dockerfile 中 `dotnet build` + `dotnet publish` 的真相"
category: 技术
tags: Dockerfile, dotnet, dockerfile, RUN, build, Release, publish, Visual
---


## 结论先行

> 生产用 Dockerfile 直接用 `dotnet publish` 一步即可，无需先跑 `dotnet build`。

---

## 常见写法的由来

很多项目的 Dockerfile 里会看到这样的写法：

```dockerfile
RUN dotnet build -c Release -o /app/build
RUN dotnet publish -c Release -o /app/publish
```

这其实是 **Visual Studio 自动生成的多阶段模板**带来的习惯，被广泛复制沿用，并非最佳实践。

---

## VS 模板为什么分两步

VS 自动生成的 Dockerfile 结构是这样的：

```dockerfile
# build 阶段：给 VS 调试用
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
RUN dotnet build "...csproj" -c Release -o /app/build

# publish 阶段：继承 build 阶段，给生产用
FROM build AS publish
RUN dotnet publish "...csproj" -c Release -o /app/publish
```

两个阶段 **职责不同** ：

* `build` 阶段输出 `/app/build`，供 VS 快速调试挂载
* `publish` 阶段输出 `/app/publish`，供生产镜像使用

这是 VS 工具链的设计考量，不是通用最佳实践。

---

## `FROM build AS publish` 会跳过编译吗

理论上 `publish` 继承了 `build` 阶段的 `obj/` 增量标记，应该跳过编译。

但实际上由于 **输出目录不同** （`/app/build` vs `/app/publish`），MSBuild 会重新走一遍编译。

可以加 `--no-build` 强制跳过：

```dockerfile
RUN dotnet publish "...csproj" -c Release -o /app/publish --no-build
```

但这样就要求 build 和 publish 的配置完全一致，维护成本反而增加。

---

## 真正的缓存加速在哪里

Docker 构建加速的核心是 **分离 csproj 和源码的复制顺序** ：

```dockerfile
# 第一步：只复制 csproj，利用缓存层
COPY ["src/Project/Project.csproj", "src/Project/"]
RUN dotnet restore   # ← 最耗时，.csproj 没变就直接命中缓存

# 第二步：再复制全部源码
COPY . .
RUN dotnet publish -c Release -o /app/publish
```

只改业务代码时的缓存效果：

```
COPY *.csproj   ✅ 命中（.csproj 没变）
dotnet restore  ✅ 命中（省去 NuGet 下载时间）
COPY . .        ❌ 失效（源码有改动）
dotnet publish  重新执行
```

**缓存加速来自 restore 层，和有没有单独的 build 步骤无关。**

---

## 自己写发布用 Dockerfile 的推荐写法

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# 只复制 csproj，锁定 restore 缓存层
COPY ["src/Project/Project.csproj", "src/Project/"]
RUN dotnet restore "./src/Project/Project.csproj"

# 复制源码，直接 publish
COPY . .
WORKDIR "/src/src/Project"
RUN dotnet publish "./Project.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Project.dll"]
```

---

## 对比总结

| 场景                          | 是否需要单独 build               |
| ----------------------------- | -------------------------------- |
| VS 自动生成的模板             | ✅ 保留，有其设计意图            |
| 自己写的发布用 Dockerfile     | ❌ 不需要，publish 一步即可      |
| 去掉 build 后缓存加速是否丢失 | ❌ 不会，缓存来自 restore 层     |
| 去掉 build 的收益             | 少跑一次重复编译，项目越大越明显 |

---

## 一句话总结

> `dotnet publish` 内部已包含 build 步骤。Dockerfile 里单独写 `dotnet build` 的习惯源于 VS 模板的特殊设计，自己写发布用 Dockerfile 时直接用 `dotnet publish` 即可，缓存加速来自 `restore` 层，不受影响。
>
