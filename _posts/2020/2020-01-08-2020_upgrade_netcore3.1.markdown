---
layout: page
title: 公司项目.net core 2.2升级到3.1记录
category: 公司
tags: 技术
---
{% include JB/setup %}
&#160; &#160; &#160; &#160;.net core 2.2 在2019年末将停止维护，3.0也会在2020年初停止维护，这就需要我们将.net core 2.2 升级到3.0提上日程。本记录只是记录自己升级中遇到得问题以及解决方法，并不是完整的升级攻略。如需了解更多请查看[参考文章](#jump)  
## 基础框架升级
&#160; &#160; &#160; &#160; 在项目文件中，将目标框架名字对象（TFM）更新为 netcoreapp3.1：   

    <Project Sdk="Microsoft.NET.Sdk.Web">

    <PropertyGroup>
    -    <TargetFramework>netcoreapp2.1</TargetFramework>
    +    <TargetFramework>netcoreapp3.1</TargetFramework>
    </PropertyGroup>

    </Project>   
    
具体操作，在VS中将所有\<TargetFramework>netcoreapp2.1\</TargetFramework>整个解决方案替换成\<TargetFramework>netcoreapp3.1\</TargetFramework>  
## 引用组件得升级
　　
## docker 变更

## <span id="jump">参考文章</span>
[从 ASP.NET Core 3.0 迁移到 3.1](https://docs.microsoft.com/zh-cn/aspnet/core/migration/30-to-31?view=aspnetcore-3.1&tabs=visual-studio){:target="_blank"}  
[从 ASP.NET Core 2.2 迁移到3.0](https://docs.microsoft.com/zh-cn/aspnet/core/migration/22-to-30?view=aspnetcore-3.1&tabs=visual-studio){:target="_blank"}  
[asp.net core 3.0 中使用 swagger](https://www.cnblogs.com/weihanli/p/ues-swagger-in-aspnetcore3_0.html){:target="_blank"}  
https://docs.microsoft.com/zh-cn/aspnet/core/security/cors?view=aspnetcore-3.1){:target="_blank"}   
[ASP.NET Core 2.2 -> 3.0 upgrade. env.IsDevelopment() not found](https://stackoverflow.com/questions/58070476/asp-net-core-2-2-3-0-upgrade-env-isdevelopment-not-found){:target="_blank"}  
[Where did IMvcBuilder AddJsonOptions go in .Net Core 3.0?](https://stackoverflow.com/questions/55666826/where-did-imvcbuilder-addjsonoptions-go-in-net-core-3-0){:target="_blank"}  