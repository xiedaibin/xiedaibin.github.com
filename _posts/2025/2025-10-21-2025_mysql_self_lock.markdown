---
layout: page
title: MySQL InnoDB 死锁案例分析与优化：UPDATE 嵌套子查询导致的锁冲突
category: 技术
tags: mysql
---

## 死锁排查

```sql
SHOW ENGINE INNODB STATUS;
```

## 定位死锁语句
在更新 `warehouse_TransitShipments` 表时，执行如下 SQL 出现 **InnoDB 死锁**：

```sql
UPDATE warehouse_TransitShipments AS t
JOIN (
    SELECT ShipmentId,
        CASE
            WHEN SUM(CASE WHEN ShipmentTag = 30 THEN 1 ELSE 0 END) = COUNT(*) THEN 30
            WHEN SUM(CASE WHEN ShipmentTag IS NULL THEN 1 ELSE 0 END) = COUNT(*) THEN NULL
            ELSE (
                SELECT MAX(ShipmentTag)
                FROM warehouse_TransitShipmentDetails
                WHERE ShipmentId = td.ShipmentId AND ShipmentTag != 30
            )
        END AS new_tag
    FROM warehouse_TransitShipmentDetails AS td
    GROUP BY ShipmentId
) temp ON t.Id = temp.ShipmentId
SET t.ShipmentTag = temp.new_tag;
```

系统日志显示两个事务同时在更新不同的 `ShipmentId`，却因访问同一张表 `warehouse_TransitShipmentDetails` 而发生死锁。

---

## 🧠 原因分析

该 SQL 在执行时存在以下特征：

1. **在 CASE 表达式中嵌套子查询**
   导致 MySQL 在一次更新中多次访问同一张表；
2. **多个事务同时执行相似更新**
   不同事务访问相同的数据页，锁顺序不一致；
3. **GROUP BY + 子查询 + JOIN 更新**
   引起行级锁交叉等待，最终触发死锁。

换句话说：

> A 事务锁住部分行等待另一部分；
> B 事务锁住另一部分等待 A。
> ——典型的交叉等待死锁。

---

## 🛠️ 解决方案

将嵌套子查询重构为单层聚合查询，并限制明细表扫描范围：

```sql
UPDATE warehouse_TransitShipments AS t
JOIN (
    SELECT 
        ShipmentId,
        CASE 
            WHEN SUM(CASE WHEN ShipmentTag = 30 THEN 1 ELSE 0 END) = COUNT(*) THEN 30
            WHEN SUM(CASE WHEN ShipmentTag IS NULL THEN 1 ELSE 0 END) = COUNT(*) THEN NULL
            ELSE MAX(CASE WHEN ShipmentTag != 30 THEN ShipmentTag END)
        END AS NewTag
    FROM warehouse_TransitShipmentDetails
    WHERE ShipmentId IN (7375937246723129342)
    GROUP BY ShipmentId
) temp ON t.Id = temp.ShipmentId
SET t.ShipmentTag = temp.NewTag;
```

### ✅ 优化要点

1. **去掉嵌套子查询** → 避免同表多次访问；
2. **增加 WHERE 条件** → 限定扫描范围；
3. **添加索引**：

   ```sql
   ALTER TABLE warehouse_TransitShipmentDetails 
   ADD INDEX idx_shipmentid_tag (ShipmentId, ShipmentTag);
   ```
4. **分批更新或串行执行** → 减少事务交叉。

---

## 🚀 效果与结论

优化后：

* 死锁不再发生；
* 查询执行计划更简单；
* 更新性能明显提升。

> 💡 经验总结：
> **在 UPDATE 中嵌套访问同一张表是高危操作**。
> 尽量使用单层聚合、分步计算或临时表方式重构，
> 才能避免锁冲突和性能问题。