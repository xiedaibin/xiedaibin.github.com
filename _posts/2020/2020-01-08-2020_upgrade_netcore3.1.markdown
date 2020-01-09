---
layout: page
title: 公司项目.net core 2.2升级到3.1记录
category: 公司
tags: 技术
---
{% include JB/setup %}
&#160; &#160; &#160; &#160;.net core 2.2 在2019年末将停止维护，3.0也会在2020年初停止维护，这就需要我们将.net core 2.2 升级到3.0提上日程。本记录只是记录自己升级中遇到得问题以及解决方法，并不是完整的升级攻略。如需了解更多请查看[参考文章](#jump)  
## 基础框架升级
&#160; &#160; &#160; &#160; 1.在项目文件中，将目标框架名字对象（TFM）更新为 netcoreapp3.1：   

    <Project Sdk="Microsoft.NET.Sdk.Web">

    <PropertyGroup>
    -    <TargetFramework>netcoreapp2.1</TargetFramework>
    +    <TargetFramework>netcoreapp3.1</TargetFramework>
    </PropertyGroup>

    </Project>   

具体操作，在VS中将所有\<TargetFramework>netcoreapp2.1\</TargetFramework>整个解决方案替换成\<TargetFramework>netcoreapp3.1\</TargetFramework>  
&#160; &#160; &#160; &#160; 2.更新以前的 Startup.Configure 代码  
&#160; &#160; &#160; &#160; &#160; &#160; 2.1 app.UseMvc 方法改变。
下面的代码是典型的ASP.NET Core 2.2 应用程序 Startup.Configure 的示例：

    public void Configure(IApplicationBuilder app)
    {
        ...

        app.UseStaticFiles();

        app.UseAuthentication();

        app.UseSignalR(hubs =>
        {
            hubs.MapHub<ChatHub>("/chat");
        });

        app.UseMvc(routes =>
        {
            routes.MapRoute("default", "{controller=Home}/{action=Index}/{id?}");
        });
    }

更新以前的 Startup.Configure 代码后：

    public void Configure(IApplicationBuilder app)
    {
        ...

        app.UseStaticFiles();

        app.UseRouting();

        app.UseCors();

        app.UseAuthentication();
        app.UseAuthorization();

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapHub<ChatHub>("/chat");
            endpoints.MapControllerRoute("default", "{controller=Home}/{action=Index}/{id?}");
        });
    }

对于大多数应用，对 UseAuthentication、UseAuthorization和 UseCors 的调用必须出现在对 UseRouting 的调用之间，然后 UseEndpoints 才有效。注：这里UseCors，UseAuthentication 都要放在UseRouting,UseEndpoints中间。    

&#160; &#160; &#160; &#160; &#160; &#160;2.2 跨域配置AddCors改变。 
   跨域这里有两个改法一个是去掉.AllowCredentials()，在跨域不传递cookie得情况，一种是通过WithOrigins指定具体得目标网站地址。最后不要忘了在Config中app.UseCors()   
原代码：

    services.AddCors(options => options.AddPolicy("AllowAllMethods",
            builder => builder
            .AllowAnyMethod()
            .AllowAnyHeader()
            //允许所有地址
            .AllowAnyOrigin()
            .AllowCredentials()
            //设置 Access-Control-Max-Age 时间 8小时 
            .SetPreflightMaxAge(TimeSpan.FromSeconds(8 * 60 * 60))));

新代码：

    services.AddCors(options => options.AddPolicy("AllowAllMethods",
            builder => builder
            .AllowAnyMethod()
            .AllowAnyHeader()
            //允许所有地址
            .AllowAnyOrigin()
            //.AllowCredentials()
            //设置 Access-Control-Max-Age 时间 8小时 
            .SetPreflightMaxAge(TimeSpan.FromSeconds(8 * 60 * 60))));

***

    services.AddCors(options => options.AddPolicy("AllowAllMethods",
            builder => builder
            .AllowAnyMethod()
            .AllowAnyHeader()
            //允许指定地址
            .WithOrigins("http://www.baidu.com")
            .AllowCredentials()
            //设置 Access-Control-Max-Age 时间 8小时 
            .SetPreflightMaxAge(TimeSpan.FromSeconds(8 * 60 * 60))));

***
    app.UseRouting();

    //通过终结点路由，CORS 中间件必须配置为在对 UseRouting 和 UseEndpoints的调用之间执行。 配置不正确将导致中间件停止正常运行。
    app.UseCors();
    
    app.UseAuthentication();

    app.UseEndpoints(endpoints =>
    {
        endpoints.MapControllers().RequireCors("AllowAllMethods");
    });

&#160; &#160; &#160; &#160; &#160; &#160;2.3 IHostingEnvironment 已被弃用 使用IWebHostEnvironment 替换。
需要添加引用 using Microsoft.Extensions.Hosting;



## 引用组件得升级

3.1 Newtonsoft.Json升级。  
需要在项目文件中添加程序包 \<PackageReference Include="Microsoft.AspNetCore.Mvc.NewtonsoftJson" Version="3.1.0" />    
原代码：

    services
        .AddMvc()
        .AddJsonOptions(options => options.SerializerSettings.ContractResolver = new ConverterContractResolver())
        .SetCompatibilityVersion(CompatibilityVersion.Version_2_1);

新代码：

    services
        .AddControllersWithViews()
        .AddNewtonsoftJson(options =>
        {
            options.SerializerSettings.ContractResolver = new ConverterContractResolver();
        });

3.2 版本控制Microsoft.AspNetCore.Mvc.Versioning升级   
需要在项目文件中添加程序包\<PackageReference Include="Microsoft.AspNetCore.Mvc.Versioning" Version="4.1.1" />    

3.3 swagger 升级。具体请查看[asp.net core 3.0 中使用 swagger](https://www.cnblogs.com/weihanli/p/ues-swagger-in-aspnetcore3_0.html){:target="_blank"}       
程序包升级到 \<PackageReference Include="Swashbuckle.AspNetCore" Version="5.00-rc4" />    
添加程序包  \<PackageReference Include="Microsoft.OpenApi" Version="1.1.4" /> 该包将一些属性规范化    
原代码    

    //获取版本信息
    var appsetting = Configuration.GetSection("AppSettings").Get<MyHostAppSettings>();
    apiVersions = appsetting.ApiVersion;

    //添加版本控制信息
    services.AddApiVersioning(options =>
    {
        options.ApiVersionReader = new HeaderApiVersionReader("api-version");
        options.AssumeDefaultVersionWhenUnspecified = true;
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.ReportApiVersions = true;
    });
    services
    .AddSwaggerGen(options =>
    {
        foreach (var apiVersion in apiVersions)
        {
            options.SwaggerDoc($"v{apiVersion}",
                new Info
                {
                    Title = $"{Configuration["Service:Title"]} 版本{apiVersion}",
                    Version = $"v{apiVersion}",
                    Description = $"{Configuration["Service:Description"]}",
                    Contact = new Contact
                    {
                        Name = Configuration["Service:Contact:Name"],
                        Email = Configuration["Service:Contact:Email"]
                    }
                });
        }
        var xmlFiles = Configuration["Service:XmlFiles"].Split(',').ToList();
        foreach (var xmlFile in xmlFiles)
        {
            var xmlpath = Path.Combine(basePath, xmlFile);
            options.IncludeXmlComments(xmlpath, true);
        }
        //设置bearer认证
        var security = new Dictionary<string, IEnumerable<string>> { { "Bearer", new string[] { } }, };
        options.AddSecurityRequirement(security);//添加一个必须的全局安全信息，和AddSecurityDefinition方法指定的方案名称要一致，这里是Bearer。
        options.AddSecurityDefinition("Bearer", new ApiKeyScheme
        {
            Description = "JWT授权(数据将在请求头中进行传输) 参数结构: \"Authorization: Bearer {token}\"",
            Name = "Authorization",//jwt默认的参数名称
            In = "header",//jwt默认存放Authorization信息的位置(请求头中)
            Type = "apiKey"
        });

        options.DocInclusionPredicate((docName, apiDesc) =>
        {
            if (!apiDesc.TryGetMethodInfo(out MethodInfo methodInfo)) return false;

            var versions = methodInfo.DeclaringType
                .GetCustomAttributes(true)
                .OfType<ApiVersionAttribute>()
                .SelectMany(attr => attr.Versions);

            var versionList = versions.Select(n => n.ToString()).ToList();

            return versionList.Any(v => $"v{v.ToString()}" == docName);
        });
    });

新代码     

    //添加版本控制信息
    services.AddApiVersioning(options =>
    {
        options.ApiVersionReader = new HeaderApiVersionReader("api-version");
        options.AssumeDefaultVersionWhenUnspecified = true;
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.ReportApiVersions = true;
    });
    services
    .AddSwaggerGen(options =>
    {
        foreach (var apiVersion in apiVersions)
        {
            options.SwaggerDoc($"v{apiVersion}",
                new Microsoft.OpenApi.Models.OpenApiInfo
                {
                    Title = $"{Configuration["Service:Title"]} 版本{apiVersion}",
                    Version = $"v{apiVersion}",
                    Description = $"{Configuration["Service:Description"]}",
                    Contact = new OpenApiContact
                    {
                        Name = Configuration["Service:Contact:Name"],
                        Email = Configuration["Service:Contact:Email"]
                    }
                });
        }
        var xmlFiles = Configuration["Service:XmlFiles"].Split(',').ToList();
        foreach (var xmlFile in xmlFiles)
        {
            var xmlpath = Path.Combine(basePath, xmlFile);
            options.IncludeXmlComments(xmlpath, true);
        }
        //设置bearer认证

        //var security = new Dictionary<string, IEnumerable<string>> { { "Bearer", new string[] { } }, };
        options.AddSecurityRequirement(new OpenApiSecurityRequirement() {
            {
                new OpenApiSecurityScheme(){
                Reference = new OpenApiReference()
                {
                    Id = "Bearer",
                    Type = ReferenceType.SecurityScheme
                }
            },Array.Empty<string>() }
        });//添加一个必须的全局安全信息，和AddSecurityDefinition方法指定的方案名称要一致，这里是Bearer。
        options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Description = "JWT授权(数据将在请求头中进行传输) 参数结构: \"Authorization: Bearer {token}\"",
            Name = "Authorization",//jwt默认的参数名称
            In = ParameterLocation.Header,//jwt默认存放Authorization信息的位置(请求头中)
            Type = SecuritySchemeType.ApiKey
        });

        options.DocInclusionPredicate((docName, apiDesc) =>
        {
            if (!apiDesc.TryGetMethodInfo(out MethodInfo methodInfo)) return false;

            var versions = methodInfo.DeclaringType
                .GetCustomAttributes(true)
                .OfType<ApiVersionAttribute>()
                .SelectMany(attr => attr.Versions);

            var versionList = versions.Select(n => n.ToString()).ToList();

            return versionList.Any(v => $"v{v.ToString()}" == docName);
        });
    });

3.4 打开nuget包管理器查看是否还有可从2.1.1升级到3.1得包。有的话升级。　   

## docker 变更
原 docker 文件    

    FROM mcr.microsoft.com/dotnet/core/aspnet:2.1-stretch-slim AS base
    WORKDIR /app
    EXPOSE 80

    FROM mcr.microsoft.com/dotnet/core/sdk:2.1-stretch AS build

新 docker 文件   

    FROM mcr.microsoft.com/dotnet/core/aspnet:3.1-buster-slim AS base
    WORKDIR /app
    EXPOSE 80

    FROM mcr.microsoft.com/dotnet/core/sdk:3.1-buster AS build

## <span id="jump">参考文章</span>
[从 ASP.NET Core 3.0 迁移到 3.1](https://docs.microsoft.com/zh-cn/aspnet/core/migration/30-to-31?view=aspnetcore-3.1&tabs=visual-studio){:target="_blank"}  
[从 ASP.NET Core 2.2 迁移到3.0](https://docs.microsoft.com/zh-cn/aspnet/core/migration/22-to-30?view=aspnetcore-3.1&tabs=visual-studio){:target="_blank"}  
[asp.net core 3.0 中使用 swagger](https://www.cnblogs.com/weihanli/p/ues-swagger-in-aspnetcore3_0.html){:target="_blank"}  
[启用 ASP.NET Core 中的跨域请求](https://docs.microsoft.com/zh-cn/aspnet/core/security/cors?view=aspnetcore-3.1){:target="_blank"}   
[ASP.NET Core 2.2 -> 3.0 upgrade. env.IsDevelopment() not found](https://stackoverflow.com/questions/58070476/asp-net-core-2-2-3-0-upgrade-env-isdevelopment-not-found){:target="_blank"}  
[Where did IMvcBuilder AddJsonOptions go in .Net Core 3.0?](https://stackoverflow.com/questions/55666826/where-did-imvcbuilder-addjsonoptions-go-in-net-core-3-0){:target="_blank"}  