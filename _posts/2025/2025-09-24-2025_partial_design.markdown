---
layout: page
title: 使用 `partial class` 拆分大型 Service 的最佳实践
category: 技术
tags: 软件设计
---


在实际项目中，随着业务不断扩展，一个 Service 很容易变得越来越庞大，甚至上万行代码。比如我这里的 `TransportPlanService`，已经有 1w+ 行代码，维护成本极高。

为了让代码更清晰、易于维护，可以使用 **C# 的 `partial class`** 特性，将类的实现按业务场景拆分到不同文件。本文总结了一套实用的拆分方法与命名规范。

---

## 1. 基础思路

* **主文件**：放通用逻辑、依赖注入、接口实现。
* **扩展文件**：按不同业务场景（如仓库端、司机端、调度端等）进行拆分，每个文件只专注于某一个领域的逻辑。

这样做的好处：

1. 逻辑分层更清晰
2. 文件行数减少，维护更容易
3. 不同角色/场景的逻辑一目了然

---

## 2. 文件拆分与命名规范

假设原来的文件是：

```
TransportPlanService.cs
```

现在可以拆分为：

```
TransportPlanService.cs               // 主文件，接口实现 + 通用逻辑
TransportPlanService.Warehouse.cs     // 仓库端逻辑
TransportPlanService.Driver.cs        // 司机端逻辑
TransportPlanService.Dispatcher.cs    // 调度端逻辑
```

> 如果项目中端逻辑非常多，也可以建子文件夹：

```
/Services/TransportPlan
   TransportPlanService.cs
   Warehouse/TransportPlanService.Warehouse.cs
   Driver/TransportPlanService.Driver.cs
```

---

## 3. 类声明规范

主文件示例：

```csharp
public partial class TransportPlanService : ITransportPlanService
{
    private readonly IRepository _repository;

    public TransportPlanService(IRepository repository)
    {
        _repository = repository;
    }

    // 通用逻辑...
}
```

扩展文件（仓库端逻辑）：

```csharp
/// <summary>
/// TransportPlanService 的仓库端逻辑
/// </summary>
public partial class TransportPlanService
{
    public Task AssignPlanToWarehouseAsync(int planId, int warehouseId)
    {
        // 仓库端专属逻辑
    }

    public Task<List<PlanDto>> GetWarehousePlansAsync(int warehouseId)
    {
        // 仓库端专属逻辑
    }
}
```

> 注意：
>
> * `: ITransportPlanService` 只写在 **主文件**，其他 `partial` 文件不用重复声明。
> * 扩展文件只保留 `public partial class TransportPlanService`。

---

## 4. 方法命名规范

为了避免混淆，建议方法名加上业务场景前缀/后缀：

* 仓库端：`AssignPlanToWarehouseAsync`、`GetWarehousePlansAsync`
* 司机端：`GetDriverTasksAsync`、`ReportDriverStatusAsync`
* 调度端：`RecalculateDispatchPlanAsync`

这样在调用和维护时，能快速区分方法的适用范围。

---

## 5. 注释与文档规范

在每个 `partial` 文件的开头写明用途：

```csharp
/// <summary>
/// TransportPlanService 的仓库端逻辑实现
/// </summary>
```

这样维护人员一眼就能知道这个文件的职责。

---

## 总结

通过 `partial class` 将超大 Service 拆分为多个小文件，并遵循 **统一的命名、结构和注释规范**，可以大大提升代码的可读性和可维护性。

推荐规范：

* 文件命名：`TransportPlanService.Warehouse.cs`
* 类声明：`public partial class TransportPlanService`
* 方法命名：带业务场景标识
* 文档注释：每个 `partial` 文件开头写明用途
* 文件夹组织：根据业务端/场景拆分子目录（可选）

这样一来，`TransportPlanService` 即使有 1w+ 行，也能被拆分成多个清晰的小模块，维护体验会好很多。