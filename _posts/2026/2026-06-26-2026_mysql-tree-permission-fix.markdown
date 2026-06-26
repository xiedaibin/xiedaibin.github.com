---
layout: page
title: "巧用 RightCode 前缀匹配，一条 SQL 解决树形权限补全问题"
category: 技术
tags: RightCode, SQL, MySQL, sql, rightinfo, RightId, BIGINT, RightName
---


## 背景

在做角色权限系统重构时，遇到了一个经典问题：对权限做了重新归类调整后，出现了**角色拥有子权限，但缺少对应父权限**的数据不一致情况。

例如角色 A 被分配了权限「仓库管理 > 入库管理 > 入库单编辑」，但「仓库管理」和「入库管理」这两个父级权限却没有被分配。这会导致前端菜单渲染异常、权限校验逻辑出错等问题。

需要写一个 MySQL 脚本，自动找出所有这类缺口并补全。

---

## 表结构

```sql
-- 权限表（树形结构）
rightinfo (
    RightId       BIGINT,        -- 权限ID
    RightName     VARCHAR,       -- 权限名称
    ParentRightId BIGINT,        -- 父权限ID
    RightCode     VARCHAR,       -- 权限编码（关键字段）
    IsDelete      BIT
)

-- 角色表
role (
    RoleId    BIGINT,
    RoleName  VARCHAR,
    IsDelete  BIT
)

-- 角色权限关联表
rolerightrelation (
    RoleRightRelationId  BIGINT,
    RoleId               BIGINT,
    RightId              BIGINT,
    CreateTime           INT
)
```

---

## 关键发现：RightCode 隐含了树的层级关系

权限表中有一个 `RightCode` 字段，每级固定 **5 位**，层级通过字符串长度区分：

```
第1级（根）：00003
第2级：     0000300004
第3级：     000030000400001
```

规律非常明显——**子节点的 RightCode 一定以所有祖先节点的 RightCode 为前缀**。

这个特性让我们可以完全绕开 `ParentRightId`，不需要递归查询，仅用**字符串前缀匹配**就能判断任意两个权限节点之间的祖先关系：

```sql
-- ancestor 是 child 的祖先，当且仅当：
LEFT(child.RightCode, CHAR_LENGTH(ancestor.RightCode)) = ancestor.RightCode
AND CHAR_LENGTH(ancestor.RightCode) < CHAR_LENGTH(child.RightCode)
-- 同时要求两者长度都是5的倍数，过滤脏数据
AND CHAR_LENGTH(child.RightCode)    MOD 5 = 0
AND CHAR_LENGTH(ancestor.RightCode) MOD 5 = 0
```

---

## 解题思路

整体逻辑分三步：

**第一步：展开所有祖先**

对角色已拥有的每一个权限，通过前缀匹配 JOIN，一次性展开它的所有祖先节点，不限层级。

**第二步：找出缺口**

用 `NOT EXISTS` 做差集：从「该角色应有的祖先权限」中，排除「该角色已有的权限」，剩下的就是缺失的。

**第三步：去重后插入**

同一角色可能有多个子权限都指向同一个缺失的祖先，用 `GROUP BY` 去重，只插入一条。

---

## 完整 SQL

### STEP 1：预览将要补全的数据

```sql
SELECT
    r.RoleId,
    r.RoleName,
    ancestor.RightId        AS MissingAncestorRightId,
    ancestor.RightCode      AS MissingAncestorRightCode,
    ancestor.RightName      AS MissingAncestorRightName,
    child.RightCode         AS TriggerChildRightCode,
    child.RightName         AS TriggerChildRightName
FROM rolerightrelation rrr
JOIN rightinfo child    ON child.RightId   = rrr.RightId  AND child.IsDelete  = b'0'
JOIN role r             ON r.RoleId        = rrr.RoleId   AND r.IsDelete      = b'0'
JOIN rightinfo ancestor ON ancestor.IsDelete = b'0'
    AND ancestor.RightCode IS NOT NULL
    AND ancestor.RightCode != ''
    AND CHAR_LENGTH(ancestor.RightCode) MOD 5 = 0
    AND CHAR_LENGTH(child.RightCode)    MOD 5 = 0
    AND CHAR_LENGTH(ancestor.RightCode) < CHAR_LENGTH(child.RightCode)
    AND LEFT(child.RightCode, CHAR_LENGTH(ancestor.RightCode)) = ancestor.RightCode
WHERE NOT EXISTS (
    SELECT 1 FROM rolerightrelation e
    WHERE e.RoleId  = rrr.RoleId
      AND e.RightId = ancestor.RightId
)
GROUP BY r.RoleId, r.RoleName, ancestor.RightId, ancestor.RightCode,
         ancestor.RightName, child.RightCode, child.RightName
ORDER BY r.RoleId, CHAR_LENGTH(ancestor.RightCode), ancestor.RightCode;
```

### STEP 2：确认无误后执行插入

```sql
INSERT INTO rolerightrelation (RoleId, RightId, CreateTime)
SELECT
    r.RoleId,
    ancestor.RightId,
    UNIX_TIMESTAMP() AS CreateTime
FROM rolerightrelation rrr
JOIN rightinfo child    ON child.RightId   = rrr.RightId  AND child.IsDelete  = b'0'
JOIN role r             ON r.RoleId        = rrr.RoleId   AND r.IsDelete      = b'0'
JOIN rightinfo ancestor ON ancestor.IsDelete = b'0'
    AND ancestor.RightCode IS NOT NULL
    AND ancestor.RightCode != ''
    AND CHAR_LENGTH(ancestor.RightCode) MOD 5 = 0
    AND CHAR_LENGTH(child.RightCode)    MOD 5 = 0
    AND CHAR_LENGTH(ancestor.RightCode) < CHAR_LENGTH(child.RightCode)
    AND LEFT(child.RightCode, CHAR_LENGTH(ancestor.RightCode)) = ancestor.RightCode
WHERE NOT EXISTS (
    SELECT 1 FROM rolerightrelation e
    WHERE e.RoleId  = rrr.RoleId
      AND e.RightId = ancestor.RightId
)
GROUP BY r.RoleId, ancestor.RightId
ORDER BY r.RoleId, CHAR_LENGTH(ancestor.RightCode);
```

---

## 用一个具体例子走一遍

假设角色 `RoleId=100`，已分配权限 `RightCode = 000030000400001`（第3级）：

```
展开祖先（前缀匹配）：
  ancestor1 → RightCode = 00003        （第1级）
  ancestor2 → RightCode = 0000300004  （第2级）

NOT EXISTS 过滤：
  00003        → 角色已有 ✓ 跳过
  0000300004   → 角色缺失 ✗ 保留

GROUP BY 去重：
  同角色下其他子权限可能也触发了 0000300004，合并为一条

最终插入：
  (RoleId=100, RightId=ancestor2的Id)
```

---

## 几个设计细节

**为什么不用 `ParentRightId` 递归？**

用 `ParentRightId` 向上找祖先需要递归 CTE（`WITH RECURSIVE`），写法复杂，性能也随层级增加而下降。而 `RightCode` 前缀匹配本质上是把**树的层级关系编码进了字符串**，一个普通 `JOIN` 就能替代递归，任意层级都适用。

**`MOD 5 = 0` 的作用**

过滤掉历史脏数据中 `RightCode` 长度不合规的记录，防止错误的前缀匹配。

**`NOT EXISTS` vs `LEFT JOIN ... WHERE IS NULL`**

两者语义等价，`NOT EXISTS` 在有索引的情况下通常更优，且语义更直观。

**`GROUP BY` 的必要性**

一个角色可能有 N 个子权限都缺同一个父权限，展开后会产生 N 行重复组合。`GROUP BY (RoleId, ancestor.RightId)` 确保最终只插入一条，保证幂等。

**`NOT EXISTS` 保证幂等**

脚本可以安全地重复执行，已存在的关联不会被重复插入。

---

## 总结

这道题的核心技巧是：**把树的结构问题转换成字符串前缀匹配问题**。

当权限编码本身已经隐含了层级信息时，不需要递归，一个 `JOIN` + `LEFT()` 就能完成祖先关系的全量展开。结合 `NOT EXISTS` 做差集，`GROUP BY` 去重，整个逻辑清晰且高效。

这个思路同样适用于其他使用编码前缀表达树形结构的场景，比如组织架构编码、商品分类编码等。
