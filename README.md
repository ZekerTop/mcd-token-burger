# 🍔 mcd-token-burger

**你让 AI 烧掉的 token，够吃几个巨无霸？**

一行命令统计你在 Claude Code、Codex 里消耗的 token，按 API 公开价折算成人民币。然后用[麦当劳 MCP](https://open.mcd.cn/mcp) 查你附近门店的**实时价格**，算出这些钱能买多少个汉堡。想吃的话，还能直接生成一份待支付的订单。

![最近 7 天的 token 换算成巨无霸](docs/images/burger.png)

> 截图是作者本机 2026-10-15 的真实运行结果，巨无霸单价来自麦当劳 MCP 实时核价。
> 本项目是麦当劳程序员节创意开发大赛的参赛作品，由个人独立开发，不是麦当劳官方产品。

## 三步用起来

只需要 Node.js 18 或更高版本。不用 clone，也不用安装依赖。

### 第 1 步：看看 AI 烧了多少钱

```bash
npx -y github:ZekerTop/mcd-token-burger
```

这一步不需要任何 Token。程序会读取本机的 Claude Code 和 Codex 日志，算出最近 7 天的 token 数，以及按 API 价折合的人民币金额。

![不设置 Token 时的输出](docs/images/no-token.png)

### 第 2 步：换算成附近门店的汉堡

1. 打开 [open.mcd.cn/mcp](https://open.mcd.cn/mcp)，用手机号登录。
2. 进入控制台，点「激活」并同意服务协议，复制你的 Token。
3. 在终端里运行下面两行，城市和地点换成你自己的：

```bash
export MCD_MCP_TOKEN=你的Token
npx -y github:ZekerTop/mcd-token-burger --city 深圳 --keyword 科技园
```

程序会找到离这个地点最近的门店，查到巨无霸的实时价格，再算出能买几个。效果见本页最上面的截图。

### 第 3 步（可选）：看饿了，点一个

```bash
npx -y github:ZekerTop/mcd-token-burger --city 深圳 --keyword 科技园 --order
```

下单前会先显示门店、餐品和取餐方式，等你确认。确认后会创建 **1 份待支付订单**并给出支付链接，**不会自动扣款**。不想要的话，不付款就行，也可以在麦当劳 App 里取消。

![下单前的确认](docs/images/order.png)

> 截图里回答了 `n`，所以没有创建订单。

## 在 AI Agent 里用

如果你平时用 Claude Code、Codex、WorkBuddy、Cursor 这类 Agent，可以把它装成 Skill，直接用对话来查。

**1. 安装 Skill**

把仓库里的 [`skills/mcd-token-burger`](skills/mcd-token-burger) 文件夹放进你的 Agent 的 Skill 目录。以 Claude Code 为例：

```bash
git clone https://github.com/ZekerTop/mcd-token-burger.git
mkdir -p ~/.claude/skills && cp -r mcd-token-burger/skills/mcd-token-burger ~/.claude/skills/
```

**2. 接入麦当劳 MCP**

在 Agent 的 MCP 设置里添加下面这段配置，把 `${MCD_MCP_TOKEN}` 换成你的 Token。不同 Agent 的设置入口不一样，请参考它们各自的文档。

```json
{
  "mcpServers": {
    "mcd-mcp": {
      "type": "streamablehttp",
      "url": "https://mcp.mcd.cn",
      "headers": { "Authorization": "Bearer ${MCD_MCP_TOKEN}" }
    }
  }
}
```

**3. 直接问**

> 我这周的 token 能换几个巨无霸？我在深圳科技园。

Agent 会先在本机统计 token，然后通过麦当劳 MCP 找门店、查价格、算出结果。你说「帮我点一个」时，它会创建一份待支付订单，把支付链接交给你。

## 常用参数

| 想要 | 加上 |
|---|---|
| 只看今天 | `--today` |
| 最近 30 天 | `--days 30` |
| 从某一天开始算 | `--since 2026-10-01` |
| 换一种餐品来换算 | `--item 麦辣鸡腿堡` |
| 生成下单链接 | `--order`（会先确认；加 `--yes` 跳过确认） |
| 调整美元汇率 | `--fx 7.2`（默认 7.1） |
| 输出 JSON | `--json` |

城市和地点也可以写进环境变量 `MCD_CITY`、`MCD_KEYWORD`。设好之后，直接运行 `npx -y github:ZekerTop/mcd-token-burger` 就能出汉堡数。

## 怎么算的

```text
本地日志 ──读取──▶ 按型号汇总 token ──× API 公开价──▶ 美元 ──× 汇率──▶ 人民币
                                                                     │
麦当劳 MCP：query-nearby-stores → query-meals → calculate-price ──▶ 单价（分）
                                                                     ▼
                                                     人民币 ÷ 单价 = 汉堡数
```

- **Claude Code**：读取 `~/.claude/projects/**/*.jsonl` 里每条回复的 `usage`。同一条回复在日志里会被拆成多行，所以按 `message.id + requestId` 去重。
- **Codex**：读取 `~/.codex/sessions` 和 `archived_sessions` 里的 `token_count` 事件，用会话累计值的差值算出每次消耗。续接或分叉出来的会话文件会带着之前的累计值，这部分只取 `last_token_usage`，避免重复计算。
- **价格**：输入、输出、写缓存、读缓存分别计价。Claude 按 Anthropic 官方价目表；GPT 系列用的是第三方价格追踪站的数据，**没有经过 OpenAI 官网核对**。遇到价目表里没有的型号，按同家族最新型号估算，卡片上会标「含估算」。价目表在 [`src/pricing.js`](src/pricing.js)。
- **汉堡价**：用麦当劳 MCP 的 `calculate-price` 官方核价，已经包含门店的自动优惠，不是菜单上的标价。

订阅 Claude Max、ChatGPT Pro 这类套餐的用户，实际付的是订阅费。卡片上的金额表示「按 API 价算相当于多少钱」，不是你真实的账单。

## 隐私

- token 统计全部在本机完成，日志内容不会上传。
- 发给麦当劳 MCP 的只有：城市、地点关键词、门店编号、餐品编号。下单请求只在你确认后才会发出。
- 程序会查你在这家门店能用的券，但只统计张数，有券时在卡片上提示一句，不展示券的内容。
- 麦当劳 MCP Token 只从环境变量读取，不会写入任何文件。

## 已知限制

- 目前只统计 Claude Code 和 Codex，其他工具暂不支持。
- GPT 系列价格来自第三方数据。汇率固定为 7.1，可以用 `--fx` 修改。
- 门店取搜索结果里离你最近的第一家。只支持到店取餐，取餐方式默认用核价结果里的第一项（目前是「堂食」）。
- 统计时间范围很大时（比如几个月），Codex 日志可能有几十 GB，扫描会比较慢。

## 开发

```bash
git clone https://github.com/ZekerTop/mcd-token-burger.git
cd mcd-token-burger
npm test                  # node:test，不需要安装依赖
node bin/mcd-token-burger.js --today
```

```text
bin/mcd-token-burger.js    命令行入口
src/usage.js               读取 Claude Code / Codex 本地日志并汇总 token
src/pricing.js             各型号 API 价目表与折算
src/mcd.js                 麦当劳 MCP 客户端（Streamable HTTP + JSON-RPC）
src/card.js                终端卡片
skills/mcd-token-burger/   Agent Skill
```

## 参赛材料

- [MCP_INTEGRATION.md](MCP_INTEGRATION.md)：用到了哪些麦当劳 MCP 工具、调用流程和业务价值
- [CONTEST_DECLARATION.md](CONTEST_DECLARATION.md)：参赛声明
- [mcp-config.example.json](mcp-config.example.json)：脱敏的 MCP 配置示例

## License

[MIT](LICENSE) © 月时
