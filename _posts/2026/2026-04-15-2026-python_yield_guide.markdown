---
layout: page
title: "Python yield 完全指南：七大核心使用场景"
category: 技术
tags: page, Python, yield, Lazy, python, import, sys, def
---

---
layout: page
title: "Python yield 完全指南：七大核心使用场景"
category: 技术
tags: Python, 生成器, yield, 协程, 上下文管理器, 数据处理
---

> 本文系统梳理了 Python 中 `yield` 的七大使用场景，每个场景均附有可直接运行的示例代码，适合有一定 Python 基础的开发者阅读。

---

## 前言

`yield` 是 Python 中一个极具表现力的关键字。包含 `yield` 的函数会变成一个**生成器函数**，调用后返回生成器对象，实现**惰性求值**（Lazy Evaluation）——只在需要时才计算下一个值，而不是一次性将所有结果存入内存。

理解 `yield` 的核心在于把握两点：

- **暂停与恢复**：`yield` 会暂停函数执行，保存当前状态，下次迭代时从断点继续
- **惰性计算**：数据按需生成，不提前占用内存

---

## 场景一：基本生成器 —— 惰性序列

最常见的用法：用生成器替代返回大列表的函数，显著降低内存占用。

```python
import sys

# 普通函数：一次性生成所有数据，存入内存
def big_list(n):
    return [i * i for i in range(n)]

# 生成器函数：惰性求值，按需生成
def big_generator(n):
    for i in range(n):
        yield i * i

n = 100_000
lst = big_list(n)
gen = big_generator(n)

print(f"列表占用内存    : {sys.getsizeof(lst):>10,} bytes")   # ~800,984 bytes
print(f"生成器占用内存  : {sys.getsizeof(gen):>10,} bytes")   # ~200 bytes

# 从 100 万元素中只取前 5 个，几乎不消耗资源
gen2 = big_generator(1_000_000)
first_five = [next(gen2) for _ in range(5)]
print(f"前5个平方数: {first_five}")  # [0, 1, 4, 9, 16]
```

**适用场景**：读取大文件、处理海量数据、无需一次性加载全部结果的迭代任务。

---

## 场景二：yield from —— 委托子生成器

`yield from` 是 Python 3.3 引入的语法糖，用于将迭代委托给另一个可迭代对象，让递归生成器写起来更自然。

```python
# 扁平化任意深度的嵌套列表
def flatten(data):
    if isinstance(data, list):
        for item in data:
            yield from flatten(item)  # 递归委托
    else:
        yield data

nested = [1, [2, 3], [4, [5, [6, 7]]], 8]
print(list(flatten(nested)))  # [1, 2, 3, 4, 5, 6, 7, 8]

# 链式合并多个迭代器
def chain_iters(*iterables):
    for it in iterables:
        yield from it

print(list(chain_iters("ABC", [1, 2, 3], (True, False))))
# ['A', 'B', 'C', 1, 2, 3, True, False]

# 二叉树中序遍历
class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def inorder(node):
    if node:
        yield from inorder(node.left)
        yield node.val
        yield from inorder(node.right)

#       4
#      / \
#     2   6
#    / \ / \
#   1  3 5  7
tree = Node(4, Node(2, Node(1), Node(3)), Node(6, Node(5), Node(7)))
print(list(inorder(tree)))  # [1, 2, 3, 4, 5, 6, 7]
```

**适用场景**：递归数据结构遍历（树、图）、组合多个可迭代对象、子生成器委托。

---

## 场景三：数据管道 —— 流式处理

将多个生成器串联成管道，每个阶段只负责单一职责，全程惰性，内存中同时只存在一行数据。

```python
import tempfile, os

# 准备测试 CSV 文件
csv_content = """name,age,score
Alice,30,92
,25,88
Bob,22,75
Charlie,,60
Dave,28,95
Eve,19,88
"""
with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
    f.write(csv_content)
    tmp_path = f.name

# ── 管道各阶段：每个函数只处理当前行 ──────────────────────────

def read_csv(path):
    """阶段1：逐行读取"""
    with open(path) as f:
        yield from f

def skip_header(lines):
    """阶段2：跳过表头"""
    next(lines)
    yield from lines

def parse_row(lines):
    """阶段3：解析字段"""
    for line in lines:
        parts = line.strip().split(',')
        if len(parts) == 3:
            yield {'name': parts[0], 'age': parts[1], 'score': parts[2]}

def filter_valid(rows):
    """阶段4：过滤不完整行"""
    for row in rows:
        if row['name'] and row['age'] and row['score']:
            yield row

def convert_types(rows):
    """阶段5：类型转换"""
    for row in rows:
        yield {'name': row['name'], 'age': int(row['age']), 'score': int(row['score'])}

# ── 组装管道（全程惰性）──────────────────────────────────────
pipeline = convert_types(filter_valid(parse_row(skip_header(read_csv(tmp_path)))))

for row in pipeline:
    print(f"{row['name']:10} 年龄:{row['age']:3}  分数:{row['score']}")

os.unlink(tmp_path)

# 输出：
# Alice      年龄: 30  分数:92
# Bob        年龄: 22  分数:75
# Dave       年龄: 28  分数:95
# Eve        年龄: 19  分数:88
```

**适用场景**：日志处理、ETL 数据清洗、大文件逐行读取、流式数据处理。

---

## 场景四：协程 —— 双向通信

`yield` 不只能输出数据，还能通过 `send()` 接收外部传入的值，实现双向通信，构建状态机或流式聚合器。

```python
# ── 示例1：流式统计（均值 + 最大值）──────────────────────────

def running_stats():
    """每次 send 一个值，实时返回最新统计"""
    count, total, maximum = 0, 0, float('-inf')
    while True:
        value = yield {'count': count, 'mean': total / count if count else 0, 'max': maximum}
        if value is None:
            return
        count += 1
        total += value
        maximum = max(maximum, value)

gen = running_stats()
next(gen)  # 必须先启动协程

for val in [42, 17, 95, 33, 68]:
    stats = gen.send(val)
    print(f"送入 {val:3d}  →  count={stats['count']}  "
          f"mean={stats['mean']:.1f}  max={stats['max']}")

# 输出：
# 送入  42  →  count=1  mean=42.0  max=42
# 送入  17  →  count=2  mean=29.5  max=42
# 送入  95  →  count=3  mean=51.3  max=95
# 送入  33  →  count=4  mean=46.8  max=95
# 送入  68  →  count=5  mean=51.0  max=95


# ── 示例2：交通灯状态机 ───────────────────────────────────────

def traffic_light():
    states = ['🔴 红灯', '🟢 绿灯', '🟡 黄灯']
    i = 0
    while True:
        cmd = yield states[i % 3]
        if cmd == 'next':
            i += 1
        elif cmd == 'reset':
            i = 0

light = traffic_light()
print(next(light))           # 🔴 红灯
print(light.send('next'))    # 🟢 绿灯
print(light.send('next'))    # 🟡 黄灯
print(light.send('next'))    # 🔴 红灯
print(light.send('reset'))   # 🔴 红灯
```

**适用场景**：流式数据聚合、状态机、事件驱动逻辑、早期异步模型（asyncio 的前身）。

---

## 场景五：@contextmanager —— 简化上下文管理器

`contextlib.contextmanager` 装饰器让你用 `yield` 轻松实现 `with` 语句，`yield` 前执行 setup，`yield` 后执行 teardown，无需手写 `__enter__` / `__exit__`。

```python
import time, os, shutil, tempfile
from contextlib import contextmanager

# ── 示例1：计时器 ─────────────────────────────────────────────

@contextmanager
def timer(label=""):
    start = time.perf_counter()
    try:
        yield                        # with 块在这里执行
    finally:
        elapsed = time.perf_counter() - start
        print(f"⏱  {label} 耗时: {elapsed * 1000:.2f} ms")

with timer("列表推导式 100万元素"):
    _ = [x ** 2 for x in range(1_000_000)]

with timer("生成器表达式 100万元素"):
    _ = sum(x ** 2 for x in range(1_000_000))


# ── 示例2：临时工作目录（自动清理）───────────────────────────

@contextmanager
def temp_workspace():
    tmpdir = tempfile.mkdtemp()
    print(f"📁 创建临时目录: {tmpdir}")
    try:
        yield tmpdir                 # 将目录路径传给 with 块
    finally:
        shutil.rmtree(tmpdir)
        print(f"🗑  已清理临时目录")

with temp_workspace() as workspace:
    test_file = os.path.join(workspace, 'result.txt')
    with open(test_file, 'w') as f:
        f.write('hello yield')
    print(f"✅ 文件已写入: {os.path.basename(test_file)}")
# with 块结束后目录自动删除，无需手动清理
```

**适用场景**：数据库连接管理、文件锁、临时目录、事务控制、测试环境搭建。

---

## 场景六：无限序列

`while True` + `yield` 构造安全的无限序列，配合 `itertools.islice` 按需截取，不会撑爆内存。

```python
from itertools import islice

# ── 斐波那契数列 ─────────────────────────────────────────────

def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

print(list(islice(fibonacci(), 10)))
# [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

# 第一个超过 1000 的斐波那契数
print(next(x for x in fibonacci() if x > 1000))  # 1597


# ── 惰性素数筛 ───────────────────────────────────────────────

def primes():
    def sieve(numbers, p):
        for n in numbers:
            if n % p != 0:
                yield n

    numbers = (n for n in range(2, 10 ** 9))
    while True:
        p = next(numbers)
        yield p
        numbers = sieve(numbers, p)

print(list(islice(primes(), 15)))
# [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]


# ── 无限循环迭代器 ───────────────────────────────────────────

def cycle(iterable):
    saved = list(iterable)
    while True:
        yield from saved

days = list(islice(cycle(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']), 10))
print(days)
# ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed']
```

**适用场景**：数学序列生成、轮询调度、无限数据流模拟、游戏循环。

---

## 场景七：Fixture 模式 —— 资源生命周期管理

这是 pytest fixture 的底层原理。`yield` 前负责资源初始化，`yield` 后负责清理，无论测试成功还是失败都能保证资源被释放。

```python
from contextlib import contextmanager

# ── 模拟数据库连接 ────────────────────────────────────────────

class FakeDB:
    def __init__(self, name="TestDB"):
        self.name, self.is_open, self.data = name, False, {}

    def connect(self):
        self.is_open = True
        print(f"🔌 [{self.name}] 连接已建立")

    def close(self):
        self.is_open = False
        print(f"🔌 [{self.name}] 连接已关闭")

    def insert(self, key, value):
        assert self.is_open
        self.data[key] = value

    def query(self, key):
        assert self.is_open
        return self.data.get(key)


# ── Fixture：yield 前 setup，yield 后 teardown ──────────────

@contextmanager
def db_fixture():
    db = FakeDB()
    db.connect()
    try:
        yield db          # 提供给测试使用
    finally:
        db.close()        # 无论成功失败都执行清理


# ── 模拟三个独立测试，每次获得全新连接 ──────────────────────

def test_insert_and_query():
    with db_fixture() as db:
        db.insert('user:1', {'name': 'Alice', 'age': 30})
        assert db.query('user:1')['name'] == 'Alice'
        print("✅ test_insert_and_query 通过")

def test_missing_key():
    with db_fixture() as db:
        assert db.query('nonexistent') is None
        print("✅ test_missing_key 通过")

def test_multiple_inserts():
    with db_fixture() as db:
        for i in range(3):
            db.insert(f'item:{i}', i * 10)
        assert db.query('item:2') == 20
        print("✅ test_multiple_inserts 通过")

test_insert_and_query()
test_missing_key()
test_multiple_inserts()

# 若使用 pytest，fixture 写法如下（供参考）：
#
# import pytest
#
# @pytest.fixture
# def db():
#     conn = FakeDB()
#     conn.connect()
#     yield conn        # 提供给测试函数
#     conn.close()      # 测试结束后自动清理
#
# def test_example(db):
#     db.insert('k', 'v')
#     assert db.query('k') == 'v'
```

**适用场景**：pytest fixture、集成测试资源管理、数据库/网络连接的测试隔离。

---

## 总结

| 场景 | 关键语法 | 核心收益 |
|------|---------|---------|
| 惰性序列 | `yield value` | 节省内存，按需计算 |
| 委托子生成器 | `yield from iterable` | 递归结构简洁表达 |
| 数据管道 | 多生成器串联 | 流式处理，职责分离 |
| 协程通信 | `value = yield` + `.send()` | 双向数据流，状态机 |
| 上下文管理 | `@contextmanager` + `yield` | 简化 setup/teardown |
| 无限序列 | `while True` + `yield` | 安全的无限数据流 |
| Fixture 模式 | `yield` + `finally` | 资源生命周期保障 |

### 使用建议

- 能用生成器就不返回完整列表，尤其是数据量不确定时
- 生成器函数可加 `iter_` 前缀（如 `iter_records()`）以明示意图
- `yield from` 比手动 `for x in sub: yield x` 更高效，也更清晰
- 协程中的 `yield` 记得先调用 `next()` 启动，或用 `@coroutine` 装饰器封装
- 上下文管理中务必将 `yield` 放在 `try/finally` 中，确保异常时也能清理资源

---

*如有问题欢迎在评论区留言交流。*