---
layout: page
title: 根据 Shop No 批量变更合作伙伴并记录变更日志（my Sql 实战）
category: 技术
tags: mysql
---

## 背景

在实际业务中，经常会遇到这样的需求：

* 一个合作伙伴（Partner）可能关联多个店铺（Shop）
* 由于业务调整，需要**根据 shopNo 批量变更店铺所属的合作伙伴**
* 同时要求**完整记录变更历史**，用于审计、回溯或问题排查

本文通过一个完整的 MySQL 实战示例，演示如何：

1. 根据 `shopNo` 批量更新 `supplier_PartnerShopRls` 中的 `PartnerId`
2. 同步写入变更记录表 `supplier_partnershoprlchangerecords`
3. 使用变量 + 事务，保证可复用性与数据安全

---

## 一、相关表说明

### 1️⃣ 合作伙伴表（supplier_Partners）

* `Id`
* `PartnerNo`

### 2️⃣ 店铺表（product_shops）

* `Id`
* `shopNo`

### 3️⃣ 合作伙伴与店铺关系表（supplier_PartnerShopRls）

* `ShopId`
* `PartnerId`

### 4️⃣ 变更记录表（supplier_partnershoprlchangerecords）

用于记录 Partner 变更历史，核心字段包括：

* `Id`：手动生成（当前最大值 + 1）
* `ShopId`
* `OldPartnerId`
* `NewPartnerId`
* `ConcurrencyStamp`：`MD5(UUID())`
* `CreationTime`

---

## 二、变量化设计（可重复执行）

实际操作中，最容易变化的只有两个条件：

* **目标合作伙伴编号**
* **需要处理的 shopNo 列表**

因此我们通过变量统一管理：

```sql
SET @TargetPartnerNo = 'P20240001';
SET @ShopNos = 'S001,S002,S003';
SET @CreateUserId = 0;
```

后续脚本无需改动主体逻辑，只需替换变量即可。

---

## 三、核心思路

整个操作分为两个步骤，且必须放在同一个事务中：

1. **先插入变更记录**（记录旧值 → 新值）
2. **再更新关系表数据**

并额外注意：

* 只记录“确实发生变化”的数据
* 防止重复执行导致脏数据

---

## 四、获取变更记录 Id 起始值

由于 `Id` 不是自增，需要手动生成：

```sql
SELECT @StartId := IFNULL(MAX(Id), 0)
FROM dev_supplier.supplier_partnershoprlchangerecords;

SET @RowNum := 0;
```

后续通过 `@StartId + 行号` 的方式生成连续 Id。

---

## 五、插入变更记录

```sql
INSERT INTO dev_supplier.supplier_partnershoprlchangerecords
(
    Id,
    ShopId,
    OldPartnerId,
    NewPartnerId,
    ExtraProperties,
    ConcurrencyStamp,
    CreationTime,
    CreateUserId,
    LastModificationTime,
    DeletionTime,
    IsDeleted
)
SELECT
    @StartId + (@RowNum := @RowNum + 1) AS Id,
    rl.ShopId,
    rl.PartnerId AS OldPartnerId,
    newp.Id      AS NewPartnerId,
    '{}',
    MD5(UUID()),
    NOW(),
    @CreateUserId,
    NULL,
    NULL,
    0
FROM supplier_PartnerShopRls rl
JOIN dev_product.product_shops shop
    ON rl.ShopId = shop.Id
JOIN supplier_Partners newp
    ON newp.PartnerNo = @TargetPartnerNo
WHERE FIND_IN_SET(shop.shopNo, @ShopNos) > 0
  AND rl.PartnerId <> newp.Id;
```

关键点：

* `rl.PartnerId <> newp.Id`：避免无变化也写日志
* `MD5(UUID())`：符合 ABP 常见并发标识风格

---

## 六、更新主表关系

```sql
UPDATE supplier_PartnerShopRls rl
JOIN dev_product.product_shops shop
    ON rl.ShopId = shop.Id
JOIN supplier_Partners newp
    ON newp.PartnerNo = @TargetPartnerNo
SET rl.PartnerId = newp.Id
WHERE FIND_IN_SET(shop.shopNo, @ShopNos) > 0
  AND rl.PartnerId <> newp.Id;
```

---

## 七、完整事务版本（生产推荐）

```sql
START TRANSACTION;

SET @TargetPartnerNo = 'P20240001';
SET @ShopNos = 'S001,S002,S003';
SET @CreateUserId = 0;

SELECT @StartId := IFNULL(MAX(Id), 0)
FROM dev_supplier.supplier_partnershoprlchangerecords;

SET @RowNum := 0;

-- 插入变更记录
INSERT INTO dev_supplier.supplier_partnershoprlchangerecords
(
    Id, ShopId, OldPartnerId, NewPartnerId,
    ExtraProperties, ConcurrencyStamp, CreationTime,
    CreateUserId, LastModificationTime, DeletionTime, IsDeleted
)
SELECT
    @StartId + (@RowNum := @RowNum + 1),
    rl.ShopId,
    rl.PartnerId,
    newp.Id,
    '{}',
    MD5(UUID()),
    NOW(),
    @CreateUserId,
    NULL,
    NULL,
    0
FROM supplier_PartnerShopRls rl
JOIN dev_product.product_shops shop ON rl.ShopId = shop.Id
JOIN supplier_Partners newp ON newp.PartnerNo = @TargetPartnerNo
WHERE FIND_IN_SET(shop.shopNo, @ShopNos) > 0
  AND rl.PartnerId <> newp.Id;

-- 更新主表
UPDATE supplier_PartnerShopRls rl
JOIN dev_product.product_shops shop ON rl.ShopId = shop.Id
JOIN supplier_Partners newp ON newp.PartnerNo = @TargetPartnerNo
SET rl.PartnerId = newp.Id
WHERE FIND_IN_SET(shop.shopNo, @ShopNos) > 0
  AND rl.PartnerId <> newp.Id;

COMMIT;
```

如有问题，可直接 `ROLLBACK`。

---

## 八、方案优点总结

* ✅ 变量化设计，复用成本极低
* ✅ 日志与数据强一致（事务）
* ✅ 避免无效更新与重复记录
* ✅ Id 规则与现有系统完全兼容
* ✅ 非侵入式，适合直接用于生产


如果你在项目中也遇到类似的“批量变更 + 审计日志”需求，这套模式可以直接复用。
