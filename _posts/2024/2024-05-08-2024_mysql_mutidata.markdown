---
layout: page
title:  mysql删除多余重复数据
category: 技术
tags: mysql
---
{% include JB/setup %}

要实现你描述的需求，你可以使用以下步骤：

1. 编写一个查询，用于获取重复的数据，并计算它们的 InventoryCount 的总和。
2. 根据查询结果，更新数据库中的数据以保留总和，删除多余的数据。

以下是实现这个过程的 SQL 语句：

```sql
-- 创建一个临时表来存储需要更新的数据
CREATE TEMPORARY TABLE temp_updates AS
SELECT
    bl.ShopId,
    bl.ProductId,
    bl.SeSku,
    bl.WarehouseId,
    SUM(bl.InventoryCount) AS totalInventory
FROM
    dev_warehouse.warehouse_productinventories bl
GROUP BY
    bl.ShopId,
    bl.ProductId,
    bl.SeSku,
    bl.WarehouseId
HAVING
    count(*) > 1;

-- 更新数据库中的数据
UPDATE
    dev_warehouse.warehouse_productinventories bl
JOIN
    temp_updates tu ON bl.ShopId = tu.ShopId
    AND bl.ProductId = tu.ProductId
    AND bl.SeSku = tu.SeSku
    AND bl.WarehouseId = tu.WarehouseId
SET
    bl.InventoryCount = tu.totalInventory;

-- 删除多余的数据
-- 这个 SQL 查询首先使用 ROW_NUMBER() 函数为每组重复数据分配行号，然后将行号大于 1 的数据删除，从而保留每组重复数据中的一条记录。
DELETE FROM dev_warehouse.warehouse_productinventories
WHERE Id IN (
    SELECT Id
    FROM (
        SELECT Id,ShopId, ProductId, SeSku, WarehouseId, InventoryCount,
               ROW_NUMBER() OVER (PARTITION BY ShopId, ProductId, SeSku, WarehouseId ORDER BY InventoryCount) AS row_num
        FROM dev_warehouse.warehouse_productinventories
    ) AS subquery
    WHERE row_num > 1
);

-- 删除临时表
DROP TEMPORARY TABLE IF EXISTS temp_updates;
```

这个 SQL 脚本首先创建了一个临时表 `temp_updates` 来存储需要更新的数据，其中计算了每组重复数据的 InventoryCount 总和。然后，通过使用 UPDATE 语句将数据库中的数据更新为总和值，并使用 DELETE 语句删除多余的数据。最后，删除临时表以释放资源。
