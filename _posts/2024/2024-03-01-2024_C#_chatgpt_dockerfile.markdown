---
layout: page
title:  Dockerfile优化
category: 技术
tags: ChatGPT问答
---
{% include JB/setup %}

``` shell
    #See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

    FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
    USER root
    WORKDIR /app
    EXPOSE 6903

    FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
    ARG BUILD_CONFIGURATION=Release
    WORKDIR /src
    COPY ["src/Shop/ShopModule.HttpApi.Host/ShopModule.HttpApi.Host.csproj", "src/Shop/ShopModule.HttpApi.Host/"]
    COPY ["src/Shop/ShopModule.HttpApi/ShopModule.HttpApi.csproj", "src/Shop/ShopModule.HttpApi/"]
    COPY ["src/Shop/ShopModule.Application.Contracts/ShopModule.Application.Contracts.csproj", "src/Shop/ShopModule.Application.Contracts/"]
    COPY ["src/Comm/CL.Common.Business.Sc/CL.Common.Business.Sc.csproj", "src/Comm/CL.Common.Business.Sc/"]
    COPY ["src/Shop/ShopModule.Domain.Shared/ShopModule.Domain.Shared.csproj", "src/Shop/ShopModule.Domain.Shared/"]
    COPY ["src/Shop/ShopModule.EntityFrameworkCore/ShopModule.EntityFrameworkCore.csproj", "src/Shop/ShopModule.EntityFrameworkCore/"]
    COPY ["src/Shop/ShopModule.Domain/ShopModule.Domain.csproj", "src/Shop/ShopModule.Domain/"]
    COPY ["src/Shop/ShopModule.Application/ShopModule.Application.csproj", "src/Shop/ShopModule.Application/"]
    RUN dotnet restore "./src/Shop/ShopModule.HttpApi.Host/./ShopModule.HttpApi.Host.csproj"
    COPY . .
    WORKDIR "/src/src/Shop/ShopModule.HttpApi.Host"
    RUN dotnet build "./ShopModule.HttpApi.Host.csproj" -c $BUILD_CONFIGURATION -o /app/build

    FROM build AS publish
    ARG BUILD_CONFIGURATION=Release
    RUN dotnet publish "./ShopModule.HttpApi.Host.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

    FROM base AS final
    WORKDIR /app
    COPY --from=publish /app/publish .

    # install tz
    RUN rm -rf /etc/localtime && ln -s /usr/share/zoneinfo/Asia/Shanghai /etc/localtime

    USER app

    ENTRYPOINT ["dotnet", "ShopModule.HttpApi.Host.dll"]
```

这个 Dockerfile 看起来基本上是可以的，但有一些小问题需要注意：

1. 在第一阶段中，你使用了 `FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base` 作为基础镜像。这个镜像已经包含了 ASP.NET Core 运行时，并且已经配置好了普通用户 `app`。因此，不需要在这个阶段再次切换用户到 `root`。这也意味着，在你构建镜像的过程中，你的应用程序不需要在构建阶段使用 `root` 权限。

2. 在安装时区的步骤中，最好将其移动到基础镜像的构建阶段之前。因为时区设置是一个系统级的操作，不依赖于应用程序，所以最好在最早的阶段设置。这样做可以最大程度地利用 Docker 镜像的缓存，避免在每次构建镜像时都重新安装时区。

基于以上建议，你可以稍作修改，将 Dockerfile 调整如下：

```Dockerfile
# See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 6903

# Install tzdata
RUN apt-get update && apt-get install -y tzdata && rm -rf /var/lib/apt/lists/*
RUN ln -fs /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && dpkg-reconfigure -f noninteractive tzdata

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["src/Shop/ShopModule.HttpApi.Host/ShopModule.HttpApi.Host.csproj", "src/Shop/ShopModule.HttpApi.Host/"]
COPY ["src/Shop/ShopModule.HttpApi/ShopModule.HttpApi.csproj", "src/Shop/ShopModule.HttpApi/"]
COPY ["src/Shop/ShopModule.Application.Contracts/ShopModule.Application.Contracts.csproj", "src/Shop/ShopModule.Application.Contracts/"]
COPY ["src/Comm/CL.Common.Business.Sc/CL.Common.Business.Sc.csproj", "src/Comm/CL.Common.Business.Sc/"]
COPY ["src/Shop/ShopModule.Domain.Shared/ShopModule.Domain.Shared.csproj", "src/Shop/ShopModule.Domain.Shared/"]
COPY ["src/Shop/ShopModule.EntityFrameworkCore/ShopModule.EntityFrameworkCore.csproj", "src/Shop/ShopModule.EntityFrameworkCore/"]
COPY ["src/Shop/ShopModule.Domain/ShopModule.Domain.csproj", "src/Shop/ShopModule.Domain/"]
COPY ["src/Shop/ShopModule.Application/ShopModule.Application.csproj", "src/Shop/ShopModule.Application/"]
RUN dotnet restore "./src/Shop/ShopModule.HttpApi.Host/./ShopModule.HttpApi.Host.csproj"
COPY . .
WORKDIR "/src/src/Shop/ShopModule.HttpApi.Host"
RUN dotnet build "./ShopModule.HttpApi.Host.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./ShopModule.HttpApi.Host.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

ENTRYPOINT ["dotnet", "ShopModule.HttpApi.Host.dll"]
```

这个修改后的 Dockerfile 移动了时区设置步骤到了基础镜像的构建阶段之前，并删除了无用的 `USER root` 和 `USER app` 指令。
