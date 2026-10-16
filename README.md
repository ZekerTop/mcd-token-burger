# 🍔 mcd-token-burger

**中文** | [English](README.en.md)

**你让 AI 烧掉的 token，够吃几个巨无霸？**

一行命令统计你在 Claude Code、Codex 里消耗的 token，按 API 公开价折算成人民币。然后用[麦当劳 MCP](https://open.mcd.cn/mcp) 查你附近门店的**实时价格**，算出这些钱能买多少个汉堡。看饿了，还能顺手生成一份待支付的订单。

![最近 7 天的 token 换算成巨无霸](docs/images/burger.png)

> 截图是作者本机 2026-10-15 的真实运行结果，巨无霸单价来自麦当劳 MCP 实时核价。本页所有终端截图都是 `npx` 从本仓库拉取后实际运行的输出。
>
> 本项目是麦当劳程序员节创意开发大赛的参赛作品，由个人独立开发，不是麦当劳官方产品。

## 目录

- [适合谁](#适合谁)
- [能做什么](#能做什么)
- [三步用起来](#三步用起来)
- [更多玩法](#更多玩法)
- [在 AI Agent 里用（WorkBuddy / Claude Code 等）](#在-ai-agent-里用workbuddy--claude-code-等)
- [怎么算的](#怎么算的)
- [用到的麦当劳 MCP 工具](#用到的麦当劳-mcp-工具)
- [隐私与安全](#隐私与安全)
- [常见问题](#常见问题)
- [已知限制](#已知限制)
- [开发](#开发)

## 适合谁

- **天天用 Claude Code、Codex 写代码的程序员**：想知道自己这周让 AI「吃」掉了多少。
- **订阅了 Claude Max、ChatGPT Pro 等套餐的人**：想看看按 API 价算，订阅帮自己省了多少。
- **想给团队周报、朋友圈加点料的人**：「AI 这周吃了我 180 个巨无霸」，比「消耗 21 亿 token」好懂得多。
- **想顺手点个麦当劳的人**：看完卡片直接生成订单，付款还是你自己来。

## 能做什么

| 功能 | 说明 | 需要麦当劳 Token |
|---|---|:---:|
| 统计 token | 读取本机 Claude Code、Codex 日志，按型号汇总 | 否 |
| 折算成人民币 | 按各型号 API 公开价分别计算输入、输出和缓存，再换算成人民币 | 否 |
| 换算成汉堡 | 找你附近的门店，用官方实时核价算出能买几个 | 是 |
| 自选餐品 | 不想用巨无霸当单位？换成任意餐品 | 是 |
| 早餐时段也能算 | 早餐时段没有巨无霸，自动按门店当天午餐时段的价格算 | 是 |
| 一键下单 | 确认后创建 1 份待支付订单，返回支付链接，不会自动扣款 | 是 |
| Agent Skill | 在 WorkBuddy、Claude Code 等 Agent 里用对话完成上面所有事 | 是 |

## 三步用起来

只需要 [Node.js](https://nodejs.org/) 18 或更高版本。不用 clone，也不用安装依赖。

### 第 1 步：看看 AI 烧了多少钱

```bash
npx -y github:ZekerTop/mcd-token-burger
```

这一步不需要任何 Token。程序会读取本机的 Claude Code 和 Codex 日志，算出最近 7 天的 token 数，以及按 API 价折合的人民币金额。

![不设置 Token 时的输出](docs/images/no-token.png)

这时汉堡数显示为「?」，因为还没连上麦当劳。接着做第 2 步。

### 第 2 步：申请麦当劳 MCP Token，换算成汉堡

**1）申请 Token**（免费，大约 1 分钟）

打开 [open.mcd.cn/mcp](https://open.mcd.cn/mcp)，点右上角「登录」，用手机号验证登录。登录后右上角会变成「控制台」：

<img src="https://raw.githubusercontent.com/M-China/mcd-developer-innovation-challenge/main/images/image3.jpg" alt="登录后右上角变为控制台" width="720" />

点「控制台」，再点「激活」，阅读并同意服务协议：

<img src="https://raw.githubusercontent.com/M-China/mcd-developer-innovation-challenge/main/images/image4.png" alt="在控制台点激活" width="720" />

申请成功后，点一下就能复制 Token：

<img src="https://raw.githubusercontent.com/M-China/mcd-developer-innovation-challenge/main/images/image6.png" alt="复制 MCP Token" width="720" />

> 以上三张图来自[麦当劳官方活动说明](https://github.com/M-China/mcd-developer-innovation-challenge)。
> Token 相当于你麦当劳账户的钥匙，不要发给别人，也不要提交到代码仓库里。

**2）运行**

把 Token 设成环境变量，再告诉程序你在哪个城市、哪个地点附近：

```bash
export MCD_MCP_TOKEN=你的Token
npx -y github:ZekerTop/mcd-token-burger --city 深圳 --keyword 科技园
```

程序会依次：找到离这个地点最近的门店 → 在门店菜单里找到巨无霸 → 用官方核价拿到实时价格 → 算出能买几个。效果就是本页最上面那张截图。

Windows PowerShell 用 `$env:MCD_MCP_TOKEN="你的Token"` 设置环境变量。

### 第 3 步（可选）：看饿了，点一个

```bash
npx -y github:ZekerTop/mcd-token-burger --city 深圳 --keyword 科技园 --order
```

下单前会列出门店、餐品和取餐方式，等你输入 `y` 确认。确认后会创建 **1 份待支付订单**并给出支付链接，**不会自动扣款**。不想要的话，不付款就行，也可以在麦当劳 App 里取消。

![下单前的确认](docs/images/order.png)

> 截图里回答了 `n`，所以没有创建订单。

## 更多玩法

### 换一种餐品，或者早上查

用 `--item` 指定换算单位。菜单上的名字和平时的叫法有时差一两个字，比如「麦辣鸡腿堡」在菜单上叫「麦辣鸡腿汉堡」，程序能自动对上，并且优先选单点，不选套餐。

早餐时段（大约 10:30 以前）菜单上没有巨无霸这类正餐汉堡，门店打烊后也查不到菜单。这两种情况下，程序会改用门店当天（或第二天）最近一个非早餐时段的价格，并在卡片上注明「现在没在卖，按今天午餐时段」：

```bash
npx -y github:ZekerTop/mcd-token-burger --today --item 麦辣鸡腿堡 --city 深圳 --keyword 科技园
```

![早上 9 点查麦辣鸡腿汉堡，按午餐时段核价](docs/images/item.png)

### 全部参数

```bash
npx -y github:ZekerTop/mcd-token-burger --help
```

![帮助信息](docs/images/help.png)

| 想要 | 加上 |
|---|---|
| 只看今天 | `--today` |
| 最近 30 天 | `--days 30` |
| 从某一天开始算 | `--since 2026-10-01` |
| 换一种餐品来换算 | `--item 麦辣鸡腿堡` |
| 生成下单链接 | `--order`（会先确认；加 `--yes` 跳过确认） |
| 调整美元汇率 | `--fx 7.2`（默认 7.1） |
| 输出 JSON，给脚本或 Agent 用 | `--json` |

### 不想每次都输城市

把城市、地点和 Token 写进 shell 配置（比如 `~/.zshrc`），以后直接运行 `npx -y github:ZekerTop/mcd-token-burger` 就能出汉堡数：

```bash
export MCD_MCP_TOKEN=你的Token
export MCD_CITY=深圳
export MCD_KEYWORD=科技园
```

## 在 AI Agent 里用（WorkBuddy / Claude Code 等）

不想敲命令的话，可以把本项目装成 Skill，在 Agent 里用对话完成：

> 我这周的 token 能换几个巨无霸？我在深圳科技园。
>
> 帮我点一个。

需要做两件事：**接入麦当劳 MCP**，然后**安装 Skill**。

### 1. 接入麦当劳 MCP

所有支持 Streamable HTTP 的 MCP 客户端都能用，配置都是这一段，把 `YOUR_MCP_TOKEN` 换成第 2 步拿到的 Token：

```json
{
  "mcpServers": {
    "mcd-mcp": {
      "type": "streamablehttp",
      "url": "https://mcp.mcd.cn",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_TOKEN"
      }
    }
  }
}
```

**在 WorkBuddy 里**（步骤来自[麦当劳官方活动说明](https://github.com/M-China/mcd-developer-innovation-challenge#workbuddy-开发指南)）：

1. 打开 WorkBuddy，在左侧边栏「专家·技能·连接器」里选「连接器」页签。
2. 点右上角「自定义连接器」→「配置MCP」。
3. 粘贴上面的 JSON，替换 Token 后点「保存」。
4. 回到「自定义连接器」，把 mcd-mcp「启用」。

Cursor、TRAE、Cherry Studio 等客户端的配置方法见[麦当劳 MCP 官方使用指南](https://github.com/M-China/mcd-mcp-server)。

### 2. 安装 Skill

Skill 就是仓库里的 [`skills/mcd-token-burger`](skills/mcd-token-burger) 文件夹，里面只有一个 `SKILL.md`。把它放进你的 Agent 的 Skill 目录即可。以 Claude Code 为例：

```bash
git clone https://github.com/ZekerTop/mcd-token-burger.git
mkdir -p ~/.claude/skills && cp -r mcd-token-burger/skills/mcd-token-burger ~/.claude/skills/
```

WorkBuddy 在同一个侧边栏的「技能」页签添加 Skill，具体导入方式以 [WorkBuddy 文档](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Connector)为准。

### 3. Agent 会怎么做

1. 在本机运行 `npx -y github:ZekerTop/mcd-token-burger --json`，拿到 token 数和人民币金额。这一步需要 Agent 能执行本地命令。
2. 通过麦当劳 MCP 依次调用 `query-nearby-stores` → `query-meals` → `calculate-price`，拿到实时价格，算出汉堡数。
3. 你说「帮我点一个」时，调用 `create-order` 创建待支付订单，把支付链接交给你。只有你明确要求时才会下单。

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
- **汉堡价**：用麦当劳 MCP 的 `calculate-price` 官方核价，单位是分，已经包含门店的自动优惠，不是菜单上的标价。

订阅 Claude Max、ChatGPT Pro 这类套餐的用户，实际付的是订阅费。卡片上的金额表示「按 API 价算相当于多少钱」，不是你真实的账单。

## 用到的麦当劳 MCP 工具

| 工具 | 什么时候调用 | 用来做什么 |
|---|---|---|
| `query-nearby-stores` | 每次换算 | 按城市和地点找最近的门店，同时拿到门店可预约的时段 |
| `query-meals` | 每次换算 | 在门店菜单里找到要换算的餐品；早餐时段或打烊时带上预约时段再查一次 |
| `calculate-price` | 每次换算 | 官方核价，拿到实时到手价和可选的取餐方式 |
| `query-store-coupons` | 每次换算 | 统计你在这家店能用的券，有券时在卡片上提示 |
| `create-order` | 只在 `--order` 并确认后 | 创建 1 份待支付订单，返回支付链接 |

调用流程和业务价值的完整说明见 [MCP_INTEGRATION.md](MCP_INTEGRATION.md)。

## 隐私与安全

- token 统计全部在本机完成，日志内容不会上传。
- 发给麦当劳 MCP 的只有：城市、地点关键词、门店编号、餐品编号和预约时段。下单请求只在你确认后才会发出。
- 门店券只统计张数，有券时在卡片上提示一句，不展示券的内容。
- 麦当劳 MCP Token 只从环境变量读取，不会写入任何文件。
- 下单只会创建待支付订单，不会自动付款，每次只点 1 份。

## 常见问题

**卡片上的汉堡数是「?」？**
没有设置 `MCD_MCP_TOKEN`，或者没有加 `--city`、`--keyword`。卡片最后一行的黄色提示会告诉你缺什么。

**卡片提示「麦当劳 MCP 暂时查不到价格」？**
麦当劳 MCP 返回了错误，比如 Token 过期，或者门店不在营业时间、又没有可预约的时段。提示里会带上麦当劳返回的原因。这时 token 数和金额照常显示。

**我只用 Codex（或只用 Claude Code），能用吗？**
能。没有日志的那一个会自动跳过。

**数字和我的账单对不上？**
卡片按 API 公开价计算。如果你用的是订阅套餐，实际花费是订阅费；如果用的是 API，有些平台会有折扣或额外费用。

**统计会不会很慢？**
最近 7 天一般十几秒。统计几个月时 Codex 日志可能有几十 GB，会慢一些。

## 已知限制

- 目前只统计 Claude Code 和 Codex，其他工具暂不支持。
- GPT 系列价格来自第三方数据。汇率固定为 7.1，可以用 `--fx` 修改。
- 门店取搜索结果里离你最近的第一家。只支持到店取餐，取餐方式默认用核价结果里的第一项（目前是「堂食」）。
- 作者只在 macOS 上测试过，Windows、Linux 理论上可用，未实测。

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
src/mcd.js                 麦当劳 MCP 客户端（Streamable HTTP + JSON-RPC），零依赖
src/card.js                终端卡片
skills/mcd-token-burger/   Agent Skill
test/                      单元测试，用模拟的 MCP 服务跑通找店、菜单、核价、下单整条链路
```

## 参赛材料

- [MCP_INTEGRATION.md](MCP_INTEGRATION.md)：用到了哪些麦当劳 MCP 工具、调用流程和业务价值
- [CONTEST_DECLARATION.md](CONTEST_DECLARATION.md)：参赛声明
- [mcp-config.example.json](mcp-config.example.json)：脱敏的 MCP 配置示例

## License

[MIT](LICENSE) © 月时
