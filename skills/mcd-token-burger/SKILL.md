---
name: mcd-token-burger
description: 把用户在 Claude Code / Codex 里消耗的 AI token 按 API 公开价折算成人民币，再用麦当劳 MCP 查附近门店的实时核价，换算成「AI 吃掉了几个巨无霸」，可选生成一份待支付的到店自取订单。用户说「我的 token 能换几个汉堡」「AI 这周吃了多少个巨无霸」「token 汉堡汇率」时使用。
---

# Token 汉堡汇率

把用户本机 AI 编程工具的 token 消耗，换算成附近麦当劳的汉堡数量。

## 第 1 步：统计 token（本地只读）

运行：

```bash
npx -y github:ZekerTop/mcd-token-burger --json --days 7
```

- 统计范围可改成 `--today` 或 `--since YYYY-MM-DD`。
- 只读取本机 `~/.claude/projects` 和 `~/.codex/sessions` 里的日志，不上传任何内容。
- 从输出 JSON 里取 `usage.tokens`、`usage.usd`、`cny`、`usage.estimated`。

如果环境变量里已有 `MCD_MCP_TOKEN`，并且知道用户所在城市和地点，直接加上 `--city <城市> --keyword <地点>`。这样 `burger` 字段会包含实时核价和换算结果，第 2 步可以跳过。

## 第 2 步：用麦当劳 MCP 拿实时价格（已连接 mcd-mcp 时）

如果当前环境已连接麦当劳 MCP（工具名形如 `query-nearby-stores`），按下面的顺序调用：

1. `query-nearby-stores`：`searchType: 2, beType: 1, city, keyword`。城市和地点问用户，不要猜。
2. `query-meals`：`storeCode, orderType: 1, beType: 1`。在菜单里找名字含「巨无霸」的单品；用户指定了其他餐品就找那一个。
3. `calculate-price`：`storeCode, orderType: 1, beType: 1, items: [{ productCode, quantity: 1 }]`。返回的 `price` 单位是**分**，已经包含门店自动优惠。

早餐时段菜单里没有巨无霸，打烊后 `query-meals` 会报「门店可能已关闭」。遇到这两种情况，从门店返回的 `reservationTimeOptions` 里取最近一个非早餐时段（如「午餐(10:44至14:15)」取 `yyyy-MM-dd 10:44`），作为 `reservationDate` 加进第 2、3 步的参数，并告诉用户这是按哪个时段核的价。

换算方法：`汉堡数 = cny ÷ (price / 100)`。

## 第 3 步：展示

先给结论，例如：

> 最近 7 天你让 AI 烧掉了 20.29 亿 token，按 API 公开价约 ¥4,349.77，相当于 XX 个巨无霸（XX 门店实时价 ¥XX）。

然后说明三点口径：

- 价格按 API 公开价折算，订阅用户的实际花费不同。
- 汇率默认 1 USD = 7.1 CNY。
- `usage.estimated` 为 true 时，说明部分型号按同家族价格估算。

## 第 4 步（可选）：帮用户点一个

只有用户**明确要求**时才下单：

1. 用第 2 步 `calculate-price` 返回的 `takeWayList[0].code` 作为 `takeWayCode`。
2. 调用 `create-order`：`storeCode, orderType: 1, beType: 1, takeWayCode, items: [{ productCode, quantity: 1 }]`。如果第 2 步用了 `reservationDate`，这里也带上，并提前告诉用户这是预约单。
3. 把返回的支付链接交给用户自己支付。

没有连接麦当劳 MCP、但环境变量里有 `MCD_MCP_TOKEN` 时，改用命令行下单：

1. 先在对话里告诉用户门店、餐品、价格和取餐方式，问清楚要不要下单。
2. 用户明确同意后，运行 `npx -y github:ZekerTop/mcd-token-burger --today --city <城市> --keyword <地点> --order --yes`。必须加 `--yes`，否则命令行会停在 `[y/N]` 确认提示上，Agent 没法回答。
3. 从输出里找到订单号和支付链接，交给用户。

本 Skill 不会自动付款。

## 边界

- 不编造价格。麦当劳 MCP 调用失败时，如实告诉用户，只展示 token 和人民币金额。
- 不鼓励多吃。汉堡只是换算单位，下单默认只点 1 份。
