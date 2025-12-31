---
layout: page
title: ABP 中如何让前端取消 API 请求，但后端任务继续执行
category: 技术
tags: abp
---

在 ABP / ASP.NET Core 中，默认情况下：

* 当前端取消请求（浏览器关闭、刷新、axios cancel 等）
* `HttpContext.RequestAborted` 会被触发
* ABP 会将该 CancellationToken 传递到 Repository、EF Core、UnitOfWork
* 最终导致后端正在执行的异步任务被 **强制取消**

这在高并发场景下是**合理且推荐的默认行为**，但在某些场景（如**长时间迁移任务、重计算任务**）中，我们反而希望：

> **前端请求可以取消，但后端任务不中断，继续执行完成**

---

## 一、ABP 中 CancellationToken 的默认来源

ABP 提供了一个统一的接口：

```csharp
ICancellationTokenProvider
```

其默认实现是：

```csharp
HttpContextCancellationTokenProvider
```

也就是说：

```csharp
ICancellationTokenProvider.Token == HttpContext.RequestAborted
```

因此，只要你在 Repository / EF / 异步方法中使用的是
`CancellationTokenProvider.Token`，就会自动绑定到前端请求生命周期。

---

## 二、关键能力：ICancellationTokenProvider.Use

ABP 提供了一个**非常关键但容易被忽略的能力**：

```csharp
IDisposable Use(CancellationToken cancellationToken)
```

它可以：

* **在一个局部作用域内**
* **临时替换当前的 CancellationToken**
* 作用域结束后，自动恢复原来的 token

这意味着：
👉 我们可以在**某一个方法、某一段代码中**，让 CancellationToken **不再来自 HttpContext.RequestAborted**

---

## 三、实战：让某一个方法“取消不过期”

### 核心做法

在需要“不受前端取消影响”的代码外层，使用：

```csharp
using (_cancellationTokenProvider.Use(CancellationToken.None))
{
    // 你的耗时逻辑
}
```

`CancellationToken.None` 是一个**永不取消的 token**。

---

### 实际测试代码（精简版）

```csharp
public async Task TestLongRunningOperationAsync()
{
    using (_cancellationTokenProvider.Use(CancellationToken.None))
    {
        // 即便前端取消请求，这里仍然会继续执行
        await Task.Delay(TimeSpan.FromSeconds(30), _cancellationTokenProvider.Token);

        var endMin = 10;
        var startMin = 1;

        while (true)
        {
            // 主动检查 HttpContext 是否已取消（仅用于日志或感知）
            if (HttpContext.RequestAborted.IsCancellationRequested)
            {
                Logger.LogWarning("HttpContext.RequestAborted 已被触发");
                
                // 这里抛的是 _cancellationTokenProvider.Token
                // 由于当前是 CancellationToken.None，不会中断执行
                _cancellationTokenProvider.Token.ThrowIfCancellationRequested();

                Logger.LogWarning("RequestAborted 未影响当前任务执行");
            }

            var warehouse = await WarehouseService.GetByIdAsync(6863788428656656385);
            Logger.LogWarning("仓库信息：" + warehouse?.WarehouseName);

            await Task.Delay(TimeSpan.FromMinutes(1), _cancellationTokenProvider.Token);
            Logger.LogWarning("已执行分钟数：" + startMin);

            if (startMin == endMin)
            {
                return;
            }

            startMin++;
        }
    }
}
```

---

## 四、验证结论

通过以上测试可以明确得到以下结论：

1. ✅ 前端取消 API 请求后
   `HttpContext.RequestAborted.IsCancellationRequested == true`

2. ✅ 在 `Use(CancellationToken.None)` 作用域内
   `_cancellationTokenProvider.Token` **不会被取消**

3. ✅ Repository / EF / Task.Delay 等使用
   `_cancellationTokenProvider.Token` 的异步操作
   **可以继续正常执行**

4. ✅ 该方式只影响当前方法 / 当前作用域
   **不会破坏 ABP 的全局取消机制**

---

## 五、适用场景与注意事项

### 适用场景

* 数据迁移
* 批量重算
* 长时间循环处理
* 与前端强一致性无关的后台逻辑
* 希望保留 API 调用形式，不引入 Background Job

### 注意事项

* 这是**局部逃离 HttpContext 生命周期**，不是全局修改
* 不适合无限时长任务（这类仍建议 Background Job）
* 如果任务非常重要，仍建议配合任务状态表或日志

---

## 六、总结一句话

> **ABP 默认通过 `ICancellationTokenProvider` 将 `HttpContext.RequestAborted` 注入到所有异步操作中，但我们可以通过 `Use(CancellationToken.None)`，在某一个方法内安全地让后端任务脱离前端请求的取消影响。**

这是一个**非常干净、低侵入、官方支持**的解决方案，非常适合“前端可取消、后端需继续执行”的业务场景。
