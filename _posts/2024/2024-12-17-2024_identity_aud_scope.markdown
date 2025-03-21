---
layout: page
title: aud和scope的区别：OAuth 2.0 和 OpenID Connect 中的重要概念
category: 技术
tags: git
---

在 OAuth 2.0 和 OpenID Connect 中，**`aud`**（Audience）和 **`scope`**（权限范围）是两个至关重要的概念。它们虽然都涉及到授权和访问控制，但在使用场景和功能上有着显著的不同。了解这两个概念的区别，有助于在构建安全的身份验证和授权系统时做出更合适的设计和选择。

#### **什么是 `aud`（Audience）？**

`aud` 字段表示令牌的目标受众，即令牌的颁发对象。它用来指示该令牌是为哪个应用或 API 服务颁发的。`aud` 的作用是确保令牌仅能被指定的服务或客户端应用使用，从而防止令牌被错误地滥用。

##### **用途：**
- **保护 API**：`aud` 确保了令牌只能被特定的 API 或应用接收和使用。接收令牌的服务会验证 `aud` 字段，确保令牌是为该服务颁发的。
- **防止滥用令牌**：只有目标 API 或应用能够验证并接受带有正确 `aud` 字段的令牌。

##### **示例：**
假设你有两个 API 服务：`api1` 和 `api2`。当客户端请求访问 `api1` 的令牌时，JWT 中的 `aud` 字段会被设置为 `api1`。如果客户端试图使用该令牌访问 `api2`，由于 `aud` 字段不匹配，API 会拒绝该请求。

```json
{
  "iss": "https://example.com",     // 令牌的发行者
  "sub": "1234567890",              // 令牌的用户标识符
  "aud": "api1",                    // 目标受众（API）
  "exp": 1712345678,                // 过期时间
  "iat": 1612345678                 // 签发时间
}
```

#### **什么是 `scope`（权限范围）？**

`scope` 字段则用于表示访问令牌的权限范围，定义了客户端可以执行哪些操作或访问哪些资源。`scope` 是授权请求的一部分，用于请求特定的权限。它为客户端提供了对 API 资源的细粒度访问控制。

##### **用途：**
- **权限控制**：`scope` 定义了客户端的访问权限。客户端通过在请求中指定 `scope` 来请求对特定资源的访问。
- **多样化权限**：同一个 API 可以通过不同的 `scope` 实现不同级别的权限控制。例如，客户端可能只请求 `read_profile` 权限，或者同时请求 `read_profile` 和 `write_profile` 权限。

##### **示例：**
假设你有一个 API 服务，允许客户端读取和写入用户资料。客户端请求令牌时，可以通过 `scope` 来指定需要的权限。例如：

- `read_profile`：表示读取用户资料的权限。
- `write_profile`：表示修改用户资料的权限。

客户端在请求令牌时，会向授权服务器请求特定的 `scope`：

```csharp
new Client
{
    ClientId = "client1",
    AllowedScopes = { "read_profile", "write_profile" }
}
```

#### **`aud` 和 `scope` 的主要区别**

| 特性       | `aud`（Audience）                           | `scope`（权限范围）                      |
|------------|--------------------------------------------|-----------------------------------------|
| **定义**   | 表示令牌的目标受众，通常是 API 或应用      | 定义客户端可以执行的操作或访问的资源   |
| **用途**   | 确保令牌只能用于指定的受众（API 或应用）  | 确定客户端可以执行哪些操作或访问哪些资源 |
| **验证**   | 验证目标受众是否与令牌的 `aud` 字段匹配    | 验证客户端是否拥有足够的权限来执行操作 |
| **作用**   | 防止令牌被滥用，确保它只适用于特定的 API | 控制客户端的权限，限制其访问范围       |
| **示例**   | `aud` = "api1"（令牌仅适用于 API 1）      | `scope` = "read_profile write_profile"（请求读取和写入权限） |

#### **总结**

- **`aud`**（Audience）是用来指示令牌的目标受众，确保令牌只会被指定的 API 或应用使用。它防止令牌被滥用，只允许特定的受众验证和使用该令牌。

- **`scope`**（权限范围）则用于定义客户端请求的权限范围，限制客户端可以访问的资源和执行的操作。通过 `scope`，可以实现精细化的权限控制，确保客户端仅能执行授权的操作。

这两个概念在 OAuth 2.0 和 OpenID Connect 中是密切相关的，但它们的作用有所不同。`aud` 侧重于令牌的目标受众验证，而 `scope` 则侧重于权限控制和资源访问管理。理解它们的区别，有助于在设计安全的身份验证和授权系统时做出正确的决策。
