# 麦当劳 MCP 接入说明

## 使用的 MCP Server

| 项目 | 内容 |
|---|---|
| Server | 麦当劳中国官方 MCP Server `https://mcp.mcd.cn` |
| 传输协议 | Streamable HTTP，JSON-RPC 2.0 |
| 鉴权 | 请求头 `Authorization: Bearer ${MCD_MCP_TOKEN}`，Token 只从环境变量读取 |
| 客户端实现 | [`src/mcd.js`](src/mcd.js)，零依赖：`initialize` → `notifications/initialized` → `tools/call`，同时支持 JSON 和 SSE 两种回包 |
| 配置示例 | [`mcp-config.example.json`](mcp-config.example.json) |

## 实际调用的 Tool

| Tool | 用途 | 关键参数 | 用到的返回字段 |
|---|---|---|---|
| `query-nearby-stores` | 按城市和地点关键词找到店自取门店 | `searchType: 2`, `beType: 1`, `city`, `keyword` | `storeCode`、门店名、地址 |
| `query-meals` | 获取门店当前在售菜单 | `storeCode`, `orderType: 1`, `beType: 1`；当前时段没有该餐品时加 `reservationDate` | `meals` 中的餐品编码和名称 |
| `calculate-price` | 对选中的餐品做官方核价 | 同上，加 `items: [{ productCode, quantity: 1 }]` | `price`（分，含门店自动优惠）、`originalPrice`、`takeWayList` |
| `query-store-coupons` | 统计用户在该门店可用的券（有券时提示） | `storeCode`, `orderType: 1`, `beType: 1` | 券列表长度 |
| `create-order` | 仅在用户加 `--order` 并确认后，创建 1 份到店订单（确认时会显示取餐方式） | 同核价参数，加 `takeWayCode`（取自 `takeWayList`，`--pickup 外带` 时选外带） | 订单号、支付链接、付款截止时间 `expirePayTime` |

Skill 模式下，如果 Agent 已接好麦当劳 MCP，会由 Agent 直接按同样的顺序调用这些 Tool，见 [`skills/mcd-token-burger/SKILL.md`](skills/mcd-token-burger/SKILL.md)。

## 调用流程

```text
1. 本地读取 Claude Code / Codex 日志 → token 数 → 按 API 公开价折算成人民币（不调用 MCP）
2. query-nearby-stores(city, keyword)       → 门店 storeCode
3. query-meals(storeCode)                   → 找到「巨无霸」（或 --item 指定的餐品）的 productCode
                                              早餐时段没有巨无霸、或门店已打烊时，用门店返回的 reservationTimeOptions
                                              取最近一个非早餐时段作为 reservationDate 再查一次，后续核价、下单都带上
4. calculate-price(storeCode, productCode)  → 实时到手价（分）
5. query-store-coupons(storeCode)           → 用户在该门店可用的券数量（失败不影响主流程）
6. 人民币 ÷ 到手价 = 汉堡数，在终端渲染卡片
7. 可选：用户确认后 create-order → 返回支付链接，由用户自己支付
```

所有工具的返回都是「说明文字 + `{"success": …, "data": …}`」的格式。客户端会从正文中提取带 `success` 字段的 JSON 对象，`success: false` 时把错误信息原样提示给用户，不会编造价格。

## 业务价值

- **用真实价格做换算单位**：汉堡数来自 `calculate-price` 的官方核价，包含门店自动优惠，不是写死的菜单价。同一笔 token，在不同城市、不同门店换算出来的结果也不一样。
- **从好玩到犒劳自己只差一步**：AI 替你干了这么多活，看完卡片想犒劳一下自己，加 `--order` 就能拿到支付链接，用到了点餐的完整链路：门店、菜单、核价、取餐方式（堂食或外带）、下单。2026-10-16 实测下过一单外带巨无霸，待支付订单的付款时限是 15 分钟。
- **适合传播**：程序员在 1024 前后晒「AI 这周吃了我 N 个巨无霸」，卡片上带着门店和实时价。

## 安全与合规

- 不自动付款。`create-order` 只在用户显式加 `--order` 并确认后调用，每次只点 1 份。
- 不读取、不保存用户的订单历史、积分、地址等账户信息；门店券只取张数，不展示券的内容。
- 仓库中没有真实 Token；配置文件只用 `${MCD_MCP_TOKEN}` 占位。
- 每次运行最多调用 6 次 MCP，远低于官方每分钟 600 次的限制。
