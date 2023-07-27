---
layout: page
title: C# 中Task.WhenAll(storesTask,storeHouseTask) 同时我想获得到返回结果
category: 技术
tags: ChatGPT问答
---
{% include JB/setup %}

在C#中，您可以使用`await Task.WhenAll(storesTask, storeHouseTask)`来等待并同时执行多个任务。要获取它们的返回结果，可以使用`Task.WhenAll`方法返回的`Task`对象的`Result`属性。但请注意，`Result`属性只能在任务已完成并返回结果时使用，否则它将阻塞当前线程。

以下是一种获取并处理多个任务返回结果的示例：

csharp

```csharp
async Task Main()
{
    Task<int> storesTask = GetStoresDataAsync();
    Task<string> storeHouseTask = GetStoreHouseDataAsync();

    await Task.WhenAll(storesTask, storeHouseTask);

    int storesResult = storesTask.Result;
    string storeHouseResult = storeHouseTask.Result;

    // 处理返回结果
    Console.WriteLine("Stores Result: " + storesResult);
    Console.WriteLine("Store House Result: " + storeHouseResult);
}

async Task<int> GetStoresDataAsync()
{
    // 模拟异步操作
    await Task.Delay(1000);
    return 42; // 这里是您实际的逻辑
}

async Task<string> GetStoreHouseDataAsync()
{
    // 模拟异步操作
    await Task.Delay(2000);
    return "Store House Data"; // 这里是您实际的逻辑
}
```

在上述示例中，`GetStoresDataAsync`和`GetStoreHouseDataAsync`是异步方法，分别返回`Task<int>`和`Task<string>`类型的任务。通过使用`await Task.WhenAll(storesTask, storeHouseTask)`，我们等待并同时执行这两个任务。然后，我们通过`storesTask.Result`和`storeHouseTask.Result`获取它们的返回结果。

请注意，使用`Result`属性时要确保任务已完成。如果任务尚未完成，访问`Result`属性将导致当前线程阻塞，直到任务完成为止。另外，如果任务发生异常，访问`Result`属性也会引发异常。因此，在实际应用中，最好使用`await`关键字来获取任务的结果，以便以异步非阻塞的方式处理返回值。
