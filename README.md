# 🍔 mcd-token-burger

**你让 AI 烧掉的 token，够吃几个巨无霸？**

一行命令统计你在 Claude Code、Codex 里消耗的 token，按 API 公开价折算成人民币。连接[麦当劳 MCP](https://open.mcd.cn/mcp) 后，再用你附近门店的**实时核价**换算成汉堡数量。看完要是饿了，可以顺手生成一份待支付的到店自取订单。

> 麦当劳程序员节创意开发大赛参赛作品，由个人独立开发，不是麦当劳官方产品。

```text
  🍔 MCD TOKEN BURGER  ·  最近 7 天
  ────────────────────────────────────────────
  AI 烧掉   20.86 亿 token
  API 价    $628.13  ≈  ¥4,459.74  (含估算)
    Claude Code     6.67 亿     $303.73
    Codex          14.19 亿     $324.40
  ────────────────────────────────────────────
  ≈ 174.9 个巨无霸
  🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔 … ×174
  这个量，够请全组吃一顿了。
  ────────────────────────────────────────────
  麦当劳深圳同方信息港餐厅 · 巨无霸 ¥25.50（麦当劳 MCP 实时核价 10:39）
  汇率 1 USD = 7.1 CNY · token 按 API 公开价折算，订阅用户的实际花费不同
  AI 吃了 174 个，你也吃一个？加上 --order 生成下单链接
```

上面是作者本机 2026-10-15 的真实输出：`--city 深圳 --keyword 科技园`，巨无霸单价来自麦当劳 MCP 实时核价。不设置麦当劳 MCP Token 时，汉堡数会显示为「?」，token 数和金额照常显示。

## 适合谁

- 每天用 Claude Code、Codex 写代码，想知道自己让 AI「吃」了多少的程序员
- 订阅了 Max、Pro 套餐，想看看按 API 价算自己薅了多少的人
- 想给团队周报加一个梗的人

## 快速开始

需要 Node.js 18 或更高版本，不用安装依赖。

```bash
# 只看 token 和人民币（不需要任何 Token）
npx -y github:ZekerTop/mcd-token-burger

# 换算成附近门店的实时价
export MCD_MCP_TOKEN=你的麦当劳MCP Token
npx -y github:ZekerTop/mcd-token-burger --city 深圳 --keyword 科技园
```

麦当劳 MCP Token 的申请方法：在 [open.mcd.cn/mcp](https://open.mcd.cn/mcp) 用手机号登录，打开控制台，点「激活」并同意服务协议，即可复制 Token。完整步骤见[官方说明](https://github.com/M-China/mcd-mcp-server)。

## 用法

```bash
npx -y github:ZekerTop/mcd-token-burger --today                  # 今天
npx -y github:ZekerTop/mcd-token-burger --days 30                # 最近 30 天
npx -y github:ZekerTop/mcd-token-burger --since 2026-10-01       # 从某天起
npx -y github:ZekerTop/mcd-token-burger --item 麦辣鸡腿堡 --city 深圳 --keyword 科技园
npx -y github:ZekerTop/mcd-token-burger --city 深圳 --keyword 科技园 --order   # 生成下单链接
npx -y github:ZekerTop/mcd-token-burger --json                   # 输出 JSON
```

| 参数 | 说明 | 默认 |
|---|---|---|
| `--days <n>` / `--today` / `--since <日期>` | 统计范围 | 最近 7 天 |
| `--city`、`--keyword` | 用于查找附近门店，也可以设环境变量 `MCD_CITY`、`MCD_KEYWORD` | — |
| `--item <餐品>` | 用来换算的餐品关键词 | 巨无霸 |
| `--order` | 在找到的门店创建 1 份到店自取订单，返回支付链接；创建前会先确认 | 关 |
| `--yes` | 配合 `--order` 跳过确认 | 关 |
| `--fx <汇率>` | 1 美元兑人民币 | 7.1 |
| `--json` | 输出 JSON，供 Skill 或脚本使用 | 关 |

## 作为 Skill 使用

仓库里的 [`skills/mcd-token-burger/SKILL.md`](skills/mcd-token-burger/SKILL.md) 是一个 Agent Skill，可以放进 Claude Code、Codex、WorkBuddy 等支持 Skill 的工具里。

```bash
# 以 Claude Code 为例
mkdir -p ~/.claude/skills && cp -r skills/mcd-token-burger ~/.claude/skills/
```

然后直接问：「我这周的 token 能换几个巨无霸？」

如果工具里已经接好麦当劳 MCP（配置见 [`mcp-config.example.json`](mcp-config.example.json)），Agent 会直接调用 MCP 查价，不需要再设置环境变量。

## 怎么算的

```text
本地日志 ──读取──▶ 按型号汇总 token ──× API 公开价──▶ 美元 ──× 汇率──▶ 人民币
                                                                     │
麦当劳 MCP：query-nearby-stores → query-meals → calculate-price ──▶ 单价（分）
                                                                     ▼
                                                     人民币 ÷ 单价 = 汉堡数
```

- **Claude Code**：读取 `~/.claude/projects/**/*.jsonl` 中每条回复的 `usage`，按 `message.id + requestId` 去重。同一条回复在日志里会被拆成多行。
- **Codex**：读取 `~/.codex/sessions` 和 `archived_sessions` 里的 `token_count` 事件，用会话累计值的差值算出每次消耗。续接或分叉的会话文件会带着之前的累计值，这部分只取 `last_token_usage`，不重复计算。
- **价格**：输入、输出、写缓存、读缓存分别计价。Claude 按 Anthropic 官方价目表；GPT 系列按第三方价格追踪站的数据，**没有经过 OpenAI 官网核对**。遇到价目表里没有的型号，按同家族最新型号估算，卡片上会标注「含估算」。价目表在 [`src/pricing.js`](src/pricing.js)。
- **汉堡价**：用麦当劳 MCP 的 `calculate-price` 官方核价，结果已经包含门店自动优惠，不是菜单标价。

订阅用户实际付的是订阅费，所以卡片上的金额表示「按 API 价相当于多少钱」，不是你真实的账单。

## 隐私

- token 统计全部在本机完成，日志内容不会上传。
- 只有门店查询、菜单、核价、门店券和（你确认后的）下单请求会发给麦当劳 MCP，请求里带的是城市、地点关键词和餐品编码。
- 门店券只统计「你在这家店能用的券」的张数，有券时在卡片上提示一句，不展示券的内容。
- 麦当劳 MCP Token 只从环境变量读取，不写入任何文件。

## 开发

```bash
git clone https://github.com/ZekerTop/mcd-token-burger.git
cd mcd-token-burger
npm test        # node:test，不需要安装依赖
npm start -- --today
```

```text
bin/mcd-token-burger.js    命令行入口
src/usage.js               读取 Claude Code / Codex 本地日志并汇总 token
src/pricing.js             各型号 API 价目表与折算
src/mcd.js                 麦当劳 MCP 客户端（Streamable HTTP + JSON-RPC）
src/card.js                终端卡片
skills/mcd-token-burger/   Agent Skill
```

## 已知限制

- 只支持 Claude Code 和 Codex 的本地日志，其他工具暂不统计。
- GPT 系列价格来自第三方数据；汇率固定为 7.1，可以用 `--fx` 修改。
- 门店取 `query-nearby-stores` 返回的第一家，只支持到店自取场景。
- 统计范围很大时（比如几个月），Codex 日志可能有几十 GB，扫描会比较慢。

## 参赛材料

- [MCP_INTEGRATION.md](MCP_INTEGRATION.md)：用到的 MCP 工具、调用流程和业务价值
- [CONTEST_DECLARATION.md](CONTEST_DECLARATION.md)：参赛声明
- [mcp-config.example.json](mcp-config.example.json)：脱敏的 MCP 配置示例

## License

[MIT](LICENSE) © 月时
