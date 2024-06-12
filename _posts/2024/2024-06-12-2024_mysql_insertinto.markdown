---
layout: page
title:   使用MySQL将A表中存在但B表中不存在的数据插入到B表中的方法
category: 技术
tags: mysql
---
{% include JB/setup %}

###

在数据处理和数据库操作中，常常需要将一张表中的数据插入到另一张表中，但前提是这些数据在目标表中尚不存在。本文将探讨如何使用MySQL实现这一目标，特别是如何将 `prod_warehouse.warehouse_agentorders` 表中存在但在 `prod_product.product_salesources` 表中不存在的 `SaleSourceName` 数据插入到 `product_salesources` 表中。

#### 场景描述

我们有两张表：
1. `prod_warehouse.warehouse_agentorders`：存储订单信息。
2. `prod_product.product_salesources`：存储产品销售信息。

我们的目标是将 `warehouse_agentorders` 表中 `SaleSourceName` 不为空且在 `product_salesources` 表中不存在的记录插入到 `product_salesources` 表中，同时生成一个唯一且递增的ID。

#### 解决方案

以下是实现这一目标的SQL脚本：

```sql
-- 定义变量
SET @next_id = 7206233966201471140;

-- 插入数据
INSERT INTO `prod_product`.`product_salesources` (`Id`, `Name`, `ShopId`, `ExtraProperties`, `ConcurrencyStamp`, `DeletionTime`, `IsDeleted`, `CreationTime`, `CreateUserId`)
SELECT
    @next_id := @next_id + 1 AS Id,  -- 使用变量生成自增ID
    SaleSourceName,
    ShopId,
    '{}',  -- ExtraProperties
    MD5(UUID()),  -- ConcurrencyStamp
    NULL,  -- DeletionTime
    0,  -- IsDeleted
    NOW(),  -- CreationTime
    0   -- CreateUserId
FROM (
    SELECT
        ShopId,
        SaleSourceName
    FROM
        prod_warehouse.warehouse_agentorders
    WHERE
        SaleSourceName IS NOT NULL
    GROUP BY
        ShopId, SaleSourceName
) AS source
LEFT JOIN prod_product.product_salesources AS target
ON source.ShopId = target.ShopId AND source.SaleSourceName = target.Name
WHERE target.Name IS NULL;
```

#### 详细解释

1. **初始化变量**
    ```sql
    SET @next_id = 7206233966201471140;
    ```
    使用 `SET` 语句初始化一个变量 `@next_id`，初始值为7206233966201471140。

2. **插入数据**
    ```sql
    INSERT INTO `prod_product`.`product_salesources` (`Id`, `Name`, `ShopId`, `ExtraProperties`, `ConcurrencyStamp`, `DeletionTime`, `IsDeleted`, `CreationTime`, `CreateUserId`)
    SELECT
        @next_id := @next_id + 1 AS Id,  -- 使用变量生成自增ID
        SaleSourceName,
        ShopId,
        '{}',  -- ExtraProperties
        MD5(UUID()),  -- ConcurrencyStamp
        NULL,  -- DeletionTime
        0,  -- IsDeleted
        NOW(),  -- CreationTime
        0   -- CreateUserId
    FROM (
        SELECT
            ShopId,
            SaleSourceName
        FROM
            prod_warehouse.warehouse_agentorders
        WHERE
            SaleSourceName IS NOT NULL
        GROUP BY
            ShopId, SaleSourceName
    ) AS source
    LEFT JOIN prod_product.product_salesources AS target
    ON source.ShopId = target.ShopId AND source.SaleSourceName = target.Name
    WHERE target.Name IS NULL;
    ```

    - **子查询（source）**：
        ```sql
        SELECT
            ShopId,
            SaleSourceName
        FROM
            prod_warehouse.warehouse_agentorders
        WHERE
            SaleSourceName IS NOT NULL
        GROUP BY
            ShopId, SaleSourceName
        ```
        从 `warehouse_agentorders` 表中选择 `ShopId` 和 `SaleSourceName`，并使用 `GROUP BY` 确保结果的唯一性。

    - **主查询和插入操作**：
        使用 `LEFT JOIN` 将子查询的结果与 `product_salesources` 表进行连接，筛选出在 `product_salesources` 表中不存在的记录（`target.Name IS NULL`），并将这些记录插入 `product_salesources` 表。

        其中，`@next_id := @next_id + 1` 用于生成自增的ID，并将其作为插入的ID值。其他字段如 `ExtraProperties`、`ConcurrencyStamp`、`DeletionTime`、`IsDeleted`、`CreationTime` 和 `CreateUserId` 也同时插入。

#### 总结

通过上述SQL脚本，我们成功地将 `prod_warehouse.warehouse_agentorders` 表中存在但在 `prod_product.product_salesources` 表中不存在的 `SaleSourceName` 数据插入到 `product_salesources` 表中，并确保每条新插入的数据具有唯一且递增的ID。这种方法可以有效地管理数据插入过程，确保数据的一致性和唯一性。

希望这篇文章对你有所帮助。如果你有任何问题或需要进一步的帮助，请随时联系我。
