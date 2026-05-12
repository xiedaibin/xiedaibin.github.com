---
layout: page
title: "EF Core 结合 EFCore.BulkExtensions 实现高性能批量插入"
category: 技术
tags: Core, EFCore, BulkExtensions, Entity, Framework, SQL, Server, MySQL
---


## 1. 简介
在处理大量数据插入时，传统的 Entity Framework Core (EF Core) `AddRange` 或 `Add` 方法会为每一条记录生成独立的 `INSERT` 语句，执行效率较差。`EFCore.BulkExtensions` 是一个强大的开源第三方库，它通过调用底层数据库的批量操作特性（如 SQL Server 的 `SqlBulkCopy`，MySQL 的 `LOAD DATA LOCAL INFILE`）实现了极速的批量数据操作。

## 2. 安装依赖
通过 NuGet 安装 `EFCore.BulkExtensions` 包。**注意：** 安装的版本需要与项目中的 EF Core 版本兼容（例如，EF Core 8.x 对应 EFCore.BulkExtensions 8.x 版本）。

```bash
dotnet add package EFCore.BulkExtensions -v 8.0.2
```

## 3. 代码集成与事务
在基于仓储模式（如 ABP 框架混合 Dapper 与 EF Core）中，调用非常简单。只需获取当前的 `DbContext` 并调用扩展方法 `BulkInsertAsync`。

### 3.1 示例代码
在您的 Repository 实现中（例如 `SupplierSqlRepository`），可以按照如下方式添加重载方法：

```csharp
using EFCore.BulkExtensions;
using Microsoft.EntityFrameworkCore;

// ...

public async Task<int> InsertManyWithBulk<T>(List<T> list) where T : class
{
    if (list?.Count > 0)
    {
        // 1. 获取当前的 DbContext
        var db = await _dbContextProvider.GetDbContextAsync();
        
        // 2. 将对象转为 DbContext 接口并调用扩展方法
        await ((DbContext)db).BulkInsertAsync(list);
        
        return list.Count;
    }
    return 0;
}
```

### 3.2 事务一致性
`EFCore.BulkExtensions` 会自动检测并融入当前的环境事务中，您**不需要**额外手动控制它的事务：
- **自动检测：** 它会检查 `DbContext.Database.CurrentTransaction`。
- **与工作单元集成：** 在如 ABP 等框架中，获取的 `DbContext` 已经默认绑定到当前请求的**工作单元 (UoW)** 事务中。
- **一致性：** 批量插入与普通的 EF Core 操作或 Dapper 操作处于同一个数据库事务中。如果后续代码抛出异常，批量插入的数据会一同回滚，反之则一同提交。

## 4. MySQL 环境的特殊配置
如果底层使用的是 MySQL 数据库，由于 `EFCore.BulkExtensions` 使用了 `LOAD DATA LOCAL INFILE` 语法来实现极速插入，因此必须在**客户端**和**服务端**同时开启相关配置。

### 4.1 客户端配置：连接字符串
在应用程序端的数据库连接字符串 (Connection String) 中，必须追加 `AllowLoadLocalInfile=true;` 参数。通常在 `appsettings.json` 中配置：

```json
"ConnectionStrings": {
  "Default": "Server=127.0.0.1;Port=3306;Database=cl_translog;Uid=root;Pwd=123456;AllowLoadLocalInfile=true;"
}
```

### 4.2 服务端配置：开启 local_infile
只有当连接字符串开启了 `AllowLoadLocalInfile`，且数据库服务的 `local_infile` 变量为 `ON` 时，极速批量插入才能正常工作。

通过执行以下 SQL 检查服务端是否开启了该功能：
```sql
SHOW GLOBAL VARIABLES LIKE 'local_infile';
```

若返回结果为 `OFF` (或 0)，需要进行开启：

*   **临时开启（重启 MySQL 后失效）：**
    ```sql
    SET GLOBAL local_infile = 1;
    ```
*   **永久开启（推荐，修改配置文件 `my.cnf` 或 `my.ini`）：**
    ```ini
    [mysqld]
    local_infile=1
    ```
    修改后需重启 MySQL 服务生效。

## 5. 总结
引入 `EFCore.BulkExtensions` 能够显著提升大批量数据入库的性能。在实际应用中，不仅需要完成代码层面的集成，还要特别注意底层数据库引擎的要求。特别是在 MySQL 环境下，正确配置客户端与服务端的 `local_infile` 参数，是确保批量插入成功执行的关键。
