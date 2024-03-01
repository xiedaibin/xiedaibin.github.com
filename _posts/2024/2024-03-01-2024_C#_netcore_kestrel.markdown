---
layout: page
title:  解决ASP.NET Core上传大文件报502错误的方法
category: 技术
tags: netcore
---
{% include JB/setup %}

在使用ASP.NET Core提供的上传接口时，有时会碰到上传较大文件时出现502错误的情况。经过查询发现，这是由于ASP.NET Core自带的Kestrel服务器对上传文件大小进行了限制。为了解决这个问题，我们需要对Kestrel服务器进行相应的配置。

### 1. 限制说明

在解决问题之前，首先了解一下Kestrel服务器的限制是很重要的。KestrelServerLimits类提供了一系列参数来控制服务器的行为，其中包括了对上传文件大小的限制。你可以在[官方文档](https://learn.microsoft.com/zh-cn/dotnet/api/microsoft.aspnetcore.server.kestrel.core.kestrelserverlimits?view=aspnetcore-8.0)中找到更详细的信息。

### 2. JSON配置

一种配置Kestrel服务器的方法是通过JSON文件来指定参数。下面是一个示例配置，将最大请求体大小设定为100,000,000字节：

```json
"Kestrel": {
  "Limits": {
    "MaxRequestBodySize": 100000000
  }
}
```

### 3. 代码中配置

另一种常见的配置方式是直接在代码中进行配置。通过在Startup.cs文件中的ConfigureServices方法中添加如下代码，我们可以实现对Kestrel服务器的配置：

```csharp
//配置Kestrel服务器
services.Configure<KestrelServerOptions>(config.GetSection("Kestrel"));
```

这段代码会读取我们之前在JSON文件中定义的Kestrel节点下的配置，并将其应用到Kestrel服务器上。

### 结论

通过对Kestrel服务器的配置，我们可以轻松地解决ASP.NET Core上传大文件报502错误的问题。无论是通过JSON文件配置还是在代码中进行配置，都可以根据实际需求来调整服务器的行为，从而满足项目的需求。