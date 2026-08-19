---
layout: page
title: "EF Core \"循环依赖\" 报错真相:一次错误的 IsUnique 标注引发的排查"
category: 技术
tags: Core, IsUnique, Unable, save, changes, because, circular, dependency
---


## 问题现象

在使用 EF Core 调用 `SaveChanges()` 保存数据时,遇到如下异常:

```
Unable to save changes because a circular dependency was detected in the data to be saved:
'TransitBoundTotalInfo [Modified] <- Index { 'InOrOutWarehouseType', 'TransitPlanOrShipmentType', 'PlanId' } TransitBoundTotalInfo [Modified] <- Index { 'InOrOutWarehouseType', 'TransitPlanOrShipmentType', 'PlanId' } TransitBoundTotalInfo [Modified]
To show additional information call 'DbContextOptionsBuilder.EnableSensitiveDataLogging'.
```

实体上的索引定义如下:

```csharp
[Index(nameof(InOrOutWarehouseType), nameof(TransitPlanOrShipmentType), nameof(PlanId), IsUnique = true)]
public class TransitBoundTotalInfo
{
    // ...
}
```

最让人困惑的一点是:**MySQL 端根本没有执行任何 SQL 语句,错误就已经抛出了**,让人一时无法从数据库层面下手排查。

## 排查过程

### 第一步:确认这是不是常规的循环引用

这不是常规业务代码里"实体导航属性互相引用"那种循环引用,而是 EF Core 在 `SaveChanges()` 内部对**唯一约束**做的一种客户端安全检查机制。

EF Core 的 `SaveChanges()` 内部分两个阶段:

1. **变更检测 + 依赖图构建(纯内存,客户端侧)**
   - EF 扫描 ChangeTracker 中所有 `Added`/`Modified`/`Deleted` 状态的实体
   - 结合模型元数据(包括 `[Index(..., IsUnique = true)]`),构建一张"更新执行顺序依赖图"
   - 目的是保证生成的 UPDATE/INSERT 语句按某个顺序执行时,**事务过程中的任意中间状态都不会违反唯一约束**

2. **生成并发送 SQL(与数据库交互)**
   - 只有第 1 步的依赖图排序成功后,EF 才会真正拼出 SQL 并发给数据库执行

本次报错发生在**第 1 步**。也就是说,只要 C# 实体模型上标注了 `IsUnique = true`,EF Core 就会基于这个元数据在本地做预检查,**完全不依赖数据库是否真的建了这个唯一索引,甚至不需要连接数据库**。这也解释了为什么 MySQL 端没有执行任何语句就报错了。

### 第二步:定位真正的根因

按照"唯一索引冲突"的思路排查后发现,问题的根子并不在于批量更新时的顺序问题,而是这个索引**从一开始就不应该被标记为唯一索引**:

```csharp
// 错误写法:多加了 IsUnique = true
[Index(nameof(InOrOutWarehouseType), nameof(TransitPlanOrShipmentType), nameof(PlanId), IsUnique = true)]

// 正确写法:去掉 IsUnique,恢复为普通索引
[Index(nameof(InOrOutWarehouseType), nameof(TransitPlanOrShipmentType), nameof(PlanId))]
```

业务上,`{InOrOutWarehouseType, TransitPlanOrShipmentType, PlanId}` 这三个字段的组合**本来就允许多条记录重复**(例如同一个 PlanId 在不同批次、不同汇总维度下会出现多条 `TransitBoundTotalInfo` 记录)。这个索引的初衷只是为了加速查询,并不是业务上的唯一约束。

由于误加了 `IsUnique = true`,只要一次 `SaveChanges()` 中同时修改了多条记录、并且这些记录在该字段组合上出现了重复或交叉,EF Core 的唯一约束预检查就会认为无法找到一个安全的更新顺序,进而抛出"循环依赖"异常——哪怕数据库表本身根本没有建这个唯一索引。

## 根本原因总结

> 这次的"循环依赖"报错本质上不是数据或代码逻辑的循环引用问题,而是**索引特性误标注为 `IsUnique = true`** 导致 EF Core 的客户端唯一性预检查机制被错误触发。这个字段组合在业务上并不需要唯一,只是普通的查询加速索引。

## 解决方案

去掉多余的 `IsUnique = true`,恢复为普通(非唯一)索引:

```csharp
[Index(nameof(InOrOutWarehouseType), nameof(TransitPlanOrShipmentType), nameof(PlanId))]
public class TransitBoundTotalInfo
{
    // ...
}
```

修改后需要新增一次 EF Core 迁移(Migration)并更新数据库结构(如果数据库中已经生成过对应的唯一索引,需要在迁移中显式 drop 掉旧的唯一索引、创建新的普通索引):

```bash
dotnet ef migrations add RemoveUniqueConstraintOnTransitBoundTotalInfo
dotnet ef database update
```

## 排查技巧记录

若报错信息中的字段值不够直观,可以在开发环境临时开启:

```csharp
optionsBuilder.EnableSensitiveDataLogging();
```

这样异常信息会带上具体冲突的字段值,便于快速定位是哪几条记录、哪些字段"撞车"。

> **注意**:`EnableSensitiveDataLogging()` 会在日志中暴露实际数据值,仅建议在开发/调试环境使用,生产环境务必关闭。

## 总结

EF Core 的 circular dependency 异常,根源在于模型上带 `IsUnique = true` 的索引触发了**客户端唯一性预检查**,这个检查发生在 SQL 生成之前、完全独立于数据库实际情况。本次排查最终发现,真正的问题并不是"批量更新顺序"层面的技术问题,而是**索引特性配置错误**——业务上并不需要这个字段组合唯一,去掉 `IsUnique = true` 才是正确的修复方式,而不是去折腾更新顺序或分批 SaveChanges。

这也提醒我们:在给实体加 `[Index(..., IsUnique = true)]` 之前,一定要认真确认这个字段组合在业务上是否真的具备唯一性语义,否则很容易埋下类似的隐蔽坑。
