---
layout: page
title:   Visual Studio Code launch.json 和 tasks.json 配置文件详解
category: 工具
tags: vscode
---

在开发 .NET Core 应用时，`launch.json` 和 `tasks.json` 是两个非常重要的配置文件，它们分别用于定义调试和任务执行的相关设置。本文将通过实例详细介绍这两个文件的配置和用途。

#### 一、`launch.json` 文件详解

`launch.json` 文件用于配置 VS Code 如何启动调试 .NET Core 应用。在此文件中，可以定义不同的启动配置，以便在调试不同模块时使用。

**示例配置：**
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Goods(erp)",
            "type": "coreclr",
            "request": "launch",
            "preLaunchTask": "buildGoods",
            "program": "${workspaceFolder}/src/Goods/GoodsModule.HttpApi.Host/bin/Debug/net8.0/GoodsModule.HttpApi.Host.dll",
            "args": [],
            "cwd": "${workspaceFolder}/src/Goods/GoodsModule.HttpApi.Host",
            "stopAtEntry": false,
            "serverReadyAction": {
                "action": "openExternally",
                "pattern": "\\bNow listening on:\\s+http://\\S+:([0-9]+)",
                "uriFormat": "http://localhost:%s"
            },
            "env": {
                "ASPNETCORE_ENVIRONMENT": "Development"
            },
            "sourceFileMap": {
                "/Views": "${workspaceFolder}/Views"
            }
        },
        {
            "name": "Storehouse(erp)",
            "type": "coreclr",
            "request": "launch",
            "preLaunchTask": "buildStorehouse",
            "program": "${workspaceFolder}/src/Storehouse/StorehouseModule.HttpApi.Host/bin/Debug/net8.0/StorehouseModule.HttpApi.Host.dll",
            "args": [],
            "cwd": "${workspaceFolder}/src/Storehouse/StorehouseModule.HttpApi.Host",
            "stopAtEntry": false,
            "serverReadyAction": {
                "action": "openExternally",
                "pattern": "\\bNow listening on:\\s+http://\\S+:([0-9]+)",
                "uriFormat": "http://localhost:%s"
            },
            "env": {
                "ASPNETCORE_ENVIRONMENT": "DevErp"
            },
            "sourceFileMap": {
                "/Views": "${workspaceFolder}/Views"
            }
        },
        {
            "name": "Shop(erp)",
            "type": "coreclr",
            "request": "launch",
            "preLaunchTask": "buildShop",
            "program": "${workspaceFolder}/src/Shop/ShopModule.HttpApi.Host/bin/Debug/net8.0/ShopModule.HttpApi.Host.dll",
            "args": [],
            "cwd": "${workspaceFolder}/src/Shop/ShopModule.HttpApi.Host",
            "stopAtEntry": false,
            "serverReadyAction": {
                "action": "openExternally",
                "pattern": "\\bNow listening on:\\s+http://\\S+:([0-9]+)",
                "uriFormat": "http://localhost:%s"
            },
            "env": {
                "ASPNETCORE_ENVIRONMENT": "DevErp"
            },
            "sourceFileMap": {
                "/Views": "${workspaceFolder}/Views"
            }
        },
        {
            "name": ".NET Core Attach",
            "type": "coreclr",
            "request": "attach"
        }
    ]
}
```

##### 配置项说明：
- **version**：配置文件版本号。
- **configurations**：包含多个调试配置，常见的 `type` 为 `coreclr`，用于调试 .NET Core 应用。
  - **name**：调试配置名称，可自定义。
  - **type**：指定调试器类型，`.NET Core` 应用使用 `coreclr`。
  - **request**：调试请求类型，`launch` 表示启动调试，`attach` 表示附加到正在运行的进程。
  - **preLaunchTask**：启动调试前执行的任务，一般是 `build` 任务。
  - **program**：可执行文件的路径，通常是编译后的 `.dll` 文件。
  - **cwd**：指定当前工作目录。
  - **stopAtEntry**：设置是否在入口处暂停调试，`false` 表示不暂停。
  - **serverReadyAction**：用于监听开发服务器的输出，并自动打开浏览器。
  - **env**：设置环境变量，比如 `ASPNETCORE_ENVIRONMENT` 指定运行时环境。
  - **sourceFileMap**：用于映射源代码目录，方便调试时定位视图文件。

#### 二、`tasks.json` 文件详解

`tasks.json` 文件用于定义任务，在此文件中可以定义构建、清理等自动化任务，调试时 `preLaunchTask` 就会引用这些任务。

**示例配置：**
```json
{
	"version": "2.0.0",
	"tasks": [
		{
			"type": "dotnet",
			"task": "build d:\\CLWork\\cl.erp\\src\\Storehouse\\StorehouseModule.HttpApi.Host\\StorehouseModule.HttpApi.Host.csproj",
			"file": "d:\\CLWork\\cl.erp\\src\\Storehouse\\StorehouseModule.HttpApi.Host\\StorehouseModule.HttpApi.Host.csproj",
			"group": "build",
			"problemMatcher": [],
			"label": "buildStorehouse"
		},
		{
			"type": "dotnet",
			"task": "build d:\\CLWork\\cl.erp\\src\\Shop\\ShopModule.HttpApi.Host\\ShopModule.HttpApi.Host.csproj",
			"file": "d:\\CLWork\\cl.erp\\src\\Shop\\ShopModule.HttpApi.Host\\ShopModule.HttpApi.Host.csproj",
			"group": "build",
			"problemMatcher": [],
			"label": "buildShop"
		},
		{
			"type": "dotnet",
			"task": "build d:\\CLWork\\cl.erp\\src\\Goods\\GoodsModule.HttpApi.Host\\GoodsModule.HttpApi.Host.csproj",
			"file": "d:\\CLWork\\cl.erp\\src\\Goods\\GoodsModule.HttpApi.Host\\GoodsModule.HttpApi.Host.csproj",
			"group": "build",
			"problemMatcher": [],
			"label": "buildGoods"
		}
	]
}
```

##### 配置项说明：
- **version**：配置文件版本号。
- **tasks**：包含多个任务配置，每个任务代表一个独立的构建操作。
  - **type**：任务类型，`.NET` 构建任务使用 `dotnet`。
  - **task**：任务名称，这里指定了执行 `dotnet build` 命令。
  - **file**：任务对应的 `.csproj` 文件路径。
  - **group**：任务分组，`build` 表示此任务属于构建组。
  - **problemMatcher**：用于匹配构建输出中的问题。
  - **label**：任务标签，便于引用。

#### 三、总结

1. **`launch.json`** 定义了调试配置，支持多模块调试以及自动打开浏览器查看服务启动状态。
2. **`tasks.json`** 定义了构建任务，调试启动前会先执行构建任务，确保代码已编译成功。
3. 配置文件支持灵活的环境变量、服务器监听、源文件映射等特性，有助于提升开发体验。

这两份配置文件共同作用，简化了开发过程中的调试和构建操作，是 VS Code 开发 .NET Core 项目时的重要工具。