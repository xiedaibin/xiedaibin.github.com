---
layout: page
title:   如何在Google Chrome控制台中使用JavaScript批量执行Fetch请求
category: 技术
tags: 前端
---
{% include JB/setup %}
###

在前端开发中，通常会遇到需要对多个数据项批量执行API请求的情况。最近，我在项目中需要对一组`planDetailId`进行批量处理，并向服务器发送一系列POST请求。在本文中，我将分享如何在Google Chrome控制台中使用JavaScript循环遍历这些ID，并发送相应的Fetch请求。
该方法可以在测试时候快速提升录入数据。

## 背景介绍

在我们的项目中，每个运输计划都有一个唯一的`planDetailId`，我们需要为每个计划发送一个POST请求，以更新其测量数据。为了实现这一目标，我们可以在浏览器的控制台中使用JavaScript代码进行批量请求操作。

以下是我们需要处理的一组`planDetailId`：
```
7200796091431211415
7200796091615760793
7200796091640926619
7200796091657703837
7200796091678675359
7200796091695452577
7200796091724812707
7200796091741589925
7200796091762561447
7200796091808698793
7200796091829670315
7200796091846447533
7200796091867419055
7200796091884196273
7200796091913556403
7200796091934527925
7200796091951305143
7200796091972276665
7200796091993248187
7200796092014219709
7200796092035191231
7200796092056162753
7200796092077134275
7200796092098105797
7200796092114883015
7200796092140048841
7200796092161020363
7200796092181991885
7200796092198769103
7200796092219740625
```

每个POST请求需要发送的数据包括操作类型、箱子信息和图片URL。为了实现批量处理，我们将使用JavaScript代码循环遍历这些ID，并通过Fetch API发送请求。

## 实现步骤

### 1. 定义`planDetailId`数组

首先，我们需要将所有的`planDetailId`存储在一个数组中：

```javascript
const planDetailIds = [
  "7200796091431211415",
  "7200796091615760793",
  "7200796091640926619",
  "7200796091657703837",
  "7200796091678675359",
  "7200796091695452577",
  "7200796091724812707",
  "7200796091741589925",
  "7200796091762561447",
  "7200796091808698793",
  "7200796091829670315",
  "7200796091846447533",
  "7200796091867419055",
  "7200796091884196273",
  "7200796091913556403",
  "7200796091934527925",
  "7200796091951305143",
  "7200796091972276665",
  "7200796091993248187",
  "7200796092014219709",
  "7200796092035191231",
  "7200796092056162753",
  "7200796092077134275",
  "7200796092098105797",
  "7200796092114883015",
  "7200796092140048841",
  "7200796092161020363",
  "7200796092181991885",
  "7200796092198769103",
  "7200796092219740625"
];
```

### 2. 定义Fetch请求函数

接下来，我们定义一个函数`sendFetchRequest`，该函数接受一个`planDetailId`作为参数，并发送POST请求：

```javascript
function sendFetchRequest(planDetailId) {
  fetch("http://192.168.1.125:5001/api/WarehouseService/TransportPlanManager/EditMeasureData", {
    "headers": {
      "accept": "application/json, text/plain, */*",
      "accept-language": "zh-CN,zh;q=0.9",
      "authorization": "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjZGRTE4QTE5RjExMzhDMTRBMjY0N0M1RTVGRTEyM0E4REYxQTUxQkMiLCJ0eXAiOiJhdCtqd3QiLCJ4NXQiOiJiLUdLR2ZFVGpCU2laSHhlWC1FanFOOGFVYncifQ.eyJuYmYiOjE3MTY3NzU4MjQsImV4cCI6MTcxNjgxOTAyNCwiaXNzIjoiaHR0cDovLzE5Mi4xNjguMS4xMjU6NTAwMCIsImF1ZCI6WyJCYXNpY0RhdGFTZXJ2aWNlQXBpIiwiQ2xQdXNoU2VydmljZUFwaSIsIkVycFNlcnZpY2VBcGkiLCJMb2dpc3RpY3NTZXJ2aWNlQXBpIiwiTWVzc2FnZVNlcnZpY2VBcGkiLCJPcGVuUGxhdGZvcm1TZXJ2aWNlQXBpIiwiUHJvZHVjdFNlcnZpY2VBcGkiLCJTdXBwbGllclNlcnZpY2VBcGkiLCJVUkNTZWN1cml0eVNlcnZpY2VBcGkiLCJVUkNTZXJ2aWNlQXBpIiwiV2FyZWhvdXNlU2VydmljZUFwaSJdLCJjbGllbnRfaWQiOiJjd3N3ZWJjbGllbnQiLCJzdWIiOiIxNTE4ODI5NDk5Nzc1NTg2MzA0IiwiYXV0aF90aW1lIjoxNzE2Nzc1ODI0LCJpZHAiOiJsb2NhbCIsIm5hbWUiOiJFUDA2NzM4NzcxIiwidmVyaWZ5U2VjcmV0IjoiM2M3M2EyZTJlOWRlNGY5Mjk2ZjAwMWM3ZGVlYzNiMTAiLCJuaWNrTmFtZSI6IiAgIiwidXNlcklkIjoiMTUxODgyOTQ5OTc3NTU4NjMwNCIsInVzZXJObyI6IlVSMDAwMDAwODQiLCJ1c2VyVHlwZSI6IjIiLCJpc01hbmFnZXIiOiJGYWxzZSIsInNjb3BlIjpbIm9wZW5pZCIsInByb2ZpbGUiLCJCYXNpY0RhdGFTZXJ2aWNlQXBpIiwiQ2xQdXNoU2VydmljZUFwaSIsIkVycFNlcnZpY2VBcGkiLCJMb2dpc3RpY3NTZXJ2aWNlQXBpIiwiTWVzc2FnZVNlcnZpY2VBcGkiLCJPcGVuUGxhdGZvcm1TZXJ2aWNlQXBpIiwiUHJvZHVjdFNlcnZpY2VBcGkiLCJTdXBwbGllclNlcnZpY2VBcGkiLCJVUkNTZWN1cml0eVNlcnZpY2VBcGkiLCJVUkNTZXJ2aWNlQXBpIiwiV2FyZWhvdXNlU2VydmljZUFwaSJdLCJvZmZsaW5lX2FjY2VzcyJdLCJhbXIiOlsicHdkIl19.XhQI6pLS_cJQM8zvLdnzUKmrfDGZozTXxMin8JY7fzwvjnxyHezjClcGlMki_BT1Ixv7b-M8gk80psH2Ig8oQhzXKAZbf_NLHzcum6WAS1Z_Mg_U46idl6i34PuylYpebsDiRWVmLLlWx-WzmzL3zT9uZv5zp9Puy_eOXJ58t_WpmAouHlj6vn54KrG_CNLhsHk_u1Z9XK3ZEeuqv_v89oQ9FeoMbyyN4hfrfplGwnBdLn3HsryIr8bBVlru5AuDaDR5A7rruW59bmNdKsq4NpRBHu8lcKzVVpdMgMgw2J2ySKY428WigKIb6BjfQIkz1cD6U6k1c_0bxzvUnyx6CQ",
      "content-type": "application/json; charset=UTF-8",
      "custom-culture": "zh-C

N"
    },
    "referrer": "http://192.168.1.125:8005/",
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": JSON.stringify({
      "planDetailId": planDetailId,
      "operateType": 2,
      "boxInfo": {
        "boxLength": 20,
        "boxWidth": 20,
        "boxHeight": 20,
        "boxWeight": 400
      },
      "checkImgUrls": [
        "https://cl-bucket-test.oss-cn-beijing.aliyuncs.com/in_warehouse_operate/e4445eae3a3b639c73524240e039c972.jpg"
      ],
      "imgUrls": [
        "https://cl-bucket-test.oss-cn-beijing.aliyuncs.com/in_warehouse_operate/60e81eaf4cc293f35167eb52619800a8.jpg"
      ]
    }),
    "method": "POST"
  }).then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok ' + response.statusText);
    }
    return response.json();
  }).then(data => {
    console.log('Success:', data);
  }).catch(error => {
    console.error('Error:', error);
  });
}
```

### 3. 循环调用Fetch请求

最后，我们使用`forEach`方法循环遍历`planDetailId`数组，并调用`sendFetchRequest`函数：

```javascript
planDetailIds.forEach(sendFetchRequest);
```

将以上代码粘贴到Google Chrome控制台中并执行，即可依次对每个`planDetailId`发送POST请求。

## 总结

通过上述步骤，我们可以在Google Chrome控制台中使用JavaScript批量执行Fetch请求，轻松地对一组数据项进行批量处理。这种方法不仅简化了工作流程，还提高了效率。希望本文能对您在前端开发中处理类似任务时有所帮助。

如果您有任何问题或建议，欢迎在评论区留言交流。感谢您的阅读！
