---
layout: page
title:  表达式与委托的区别
category: 技术
tags: C#
---
{% include JB/setup %}

`Expression<Func<TObject, TValue>>` 和 `Func<TObject, TValue>` 都是委托类型，但在用法和功能上有一些重要的区别。

### Expression<Func<TObject, TValue>>

`Expression<Func<TObject, TValue>>` 表示一个表达式树，它可以被编译成委托并在运行时执行。它的主要特点是：

- **表达式树**：这是一个表示代码结构的树形数据结构，可以在运行时被分析、转换或者执行。
- **延迟执行**：表达式树本身并不立即执行，而是可以在需要时被编译成委托，然后执行。这使得我们可以在运行时分析和操作代码结构。
- **用途**：通常用于 LINQ 查询、动态构建查询条件、以及需要对代码进行分析或转换的场景。

示例用法：
```csharp
Expression<Func<int, bool>> expr = x => x > 5;
// 这里的 expr 是一个表示 x > 5 的表达式树

// 编译表达式树成委托，并执行
Func<int, bool> compiledFunc = expr.Compile();
bool result = compiledFunc(8); // 执行委托，返回 true
```

### Func<TObject, TValue>

`Func<TObject, TValue>` 是一个普通的委托类型，表示一个接受 `TObject` 类型参数并返回 `TValue` 类型结果的委托。它的特点是：

- **普通委托**：直接表示一个方法的委托，可以直接执行。
- **立即执行**：委托表示的方法会立即在调用时执行，没有额外的表达式树分析和编译过程。
- **用途**：常用于传递方法作为参数、事件处理、回调函数等常规编程场景。

示例用法：
```csharp
Func<int, bool> func = x => x > 5;
// 这里的 func 是一个委托，表示一个判断 x 是否大于 5 的方法

bool result = func(8); // 直接调用委托，返回 true
```

### 区别总结

- **表达式树 vs 委托**：`Expression<Func<TObject, TValue>>` 是一个表达式树，用于动态构建和分析代码结构；`Func<TObject, TValue>` 是一个普通的委托，用于直接执行方法。
- **延迟执行 vs 立即执行**：表达式树需要编译成委托后才能执行，支持延迟执行和运行时分析；普通委托在调用时立即执行。
- **应用场景**：表达式树常用于 LINQ 查询、动态查询条件、编译时代码分析等高级场景；普通委托常用于常规的方法调用、事件处理、委托链等基本编程场景。
