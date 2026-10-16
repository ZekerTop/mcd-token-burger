# 🍔 mcd-token-burger

**中文** | [English](README.en.md)

**你让 AI 烧掉的 token，够吃几个巨无霸？AI 都吃了这么多，你也犒劳一下自己。**

问你的 AI 一句「我这周的 token 能换几个巨无霸？」，它会统计你在 Claude Code、Codex 里用掉的 token，按 API 公开价折算成人民币，再通过[麦当劳 MCP](https://open.mcd.cn/mcp) 查你附近门店的**实时价格**，告诉你这些钱能买几个汉堡。AI 替你干了一天活，你也辛苦了，再说一句「犒劳一下自己，帮我点一个」，它会生成一份待支付的到店订单，堂食、外带都行，付款由你自己完成。

**全程用对话完成，不用敲命令。**

![在 Claude Code 里直接问](docs/images/ai-chat.png)

> 截图是 2026-10-16 在一个全新的 Claude Code 会话里的真实问答，排版为重绘，只去掉了作者个人设置里对作者的称呼。用户只说了一句话，加载 Skill、统计 token、找门店和核价都是 AI 自己完成的。
>
> 本项目是麦当劳程序员节创意开发大赛的参赛作品，由个人独立开发，不是麦当劳官方产品。

## 目录

- [适合谁](#适合谁)
- [能做什么](#能做什么)
- [三步用起来](#三步用起来)
- [给 AI 的安装说明](#给-ai-的安装说明)
- [喜欢命令行？](#喜欢命令行)
- [怎么算的](#怎么算的)
- [用到的麦当劳 MCP 工具](#用到的麦当劳-mcp-工具)
- [隐私与安全](#隐私与安全)
- [常见问题](#常见问题)
- [已知限制](#已知限制)
- [开发](#开发)

## 适合谁

- **写了一天代码、想犒劳一下自己的程序员**：看看 AI 这周「吃」掉了多少，然后让它顺手给你也点一个。
- **订阅了 Claude Max、ChatGPT Pro 等套餐的人**：想看看按 API 价算，订阅帮自己省了多少。
- **想给团队周报、朋友圈加点料的人**：「AI 这周吃了我 180 个巨无霸」，比「消耗 21 亿 token」好懂得多。

## 能做什么

| 你对 AI 说 | AI 会做什么 |
|---|---|
| 「我这周的 token 能换几个巨无霸？我在深圳科技园。」 | 统计本机 Claude Code、Codex 最近 7 天的 token，按 API 价折成人民币，找到科技园最近的门店，按巨无霸实时价算出个数 |
| 「今天的呢？」「这个月呢？」 | 换统计范围重新算 |
| 「换成麦辣鸡腿堡算」 | 用你指定的餐品当单位。菜单上的名字和平时叫法差一两个字也能对上，优先选单点，不选套餐 |
| 早上 8 点问 | 早餐时段没有巨无霸，AI 会按门店今天午餐时段的价格算，并告诉你 |
| 「犒劳一下自己，帮我点一个，外带」 | 先告诉你门店、餐品、价格，问清堂食还是外带，等你同意后创建 1 份待支付订单，把支付链接给你，并提醒你 15 分钟内付款。不会自动扣款 |

## 三步用起来

### 第 1 步：申请麦当劳 MCP Token（免费，约 1 分钟）

打开 [open.mcd.cn/mcp](https://open.mcd.cn/mcp)，点右上角「登录」，用手机号验证登录。登录后右上角会变成「控制台」：

<img src="https://raw.githubusercontent.com/M-China/mcd-developer-innovation-challenge/main/images/image3.jpg" alt="登录后右上角变为控制台" width="720" />

点「控制台」，再点「激活」，阅读并同意服务协议：

<img src="https://raw.githubusercontent.com/M-China/mcd-developer-innovation-challenge/main/images/image4.png" alt="在控制台点激活" width="720" />

申请成功后，点一下就能复制 Token：

<img src="https://raw.githubusercontent.com/M-China/mcd-developer-innovation-challenge/main/images/image6.png" alt="复制 MCP Token" width="720" />

> 以上三张图来自[麦当劳官方活动说明](https://github.com/M-China/mcd-developer-innovation-challenge)。Token 相当于你麦当劳账户的钥匙，不要发给别人，也不要提交到代码仓库里。

### 第 2 步：让 AI 帮你装好

**用 Claude Code、Codex 等能执行命令的 AI**：把下面这段话原样发给它，把最后的 Token 换成你自己的：

```text
请帮我安装 mcd-token-burger：https://github.com/ZekerTop/mcd-token-burger
按它 README 里「给 AI 的安装说明」一节操作，装好后跑一次验证。
我的麦当劳 MCP Token 是：这里粘贴你的 Token
```

AI 会自己完成三件事：安装 Skill、保存 Token、跑一次验证。具体步骤见下面的[给 AI 的安装说明](#给-ai-的安装说明)。装好后**新开一个对话**，Skill 才会生效。

**用 WorkBuddy**：在界面里点几下就行，同样不用敲命令（步骤来自[麦当劳官方活动说明](https://github.com/M-China/mcd-developer-innovation-challenge#workbuddy-开发指南)）。

1. 在左侧边栏「专家·技能·连接器」里选「连接器」页签，点右上角「自定义连接器」→「配置MCP」。
2. 粘贴下面这段配置，把 `YOUR_MCP_TOKEN` 换成你的 Token，点「保存」。回到「自定义连接器」，把 mcd-mcp「启用」。
3. 在同一个侧边栏的「技能」页签里添加本仓库的 [`skills/mcd-token-burger`](skills/mcd-token-burger) 文件夹。具体导入方式以 [WorkBuddy 文档](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Connector)为准。

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

Cursor、TRAE、Cherry Studio 等客户端，用同一段配置接入麦当劳 MCP，入口见[麦当劳 MCP 官方使用指南](https://github.com/M-China/mcd-mcp-server)。

### 第 3 步：直接问

在 AI 里说：

> 我这周的 token 能换几个巨无霸？我在深圳科技园。

城市和地点换成你自己的。AI 会自己统计、找门店、查价格，效果就是本页最上面那张截图。

AI 替你干了这么多活，你也犒劳一下自己：

> 犒劳一下自己，帮我点一个，外带。

AI 会先把门店、餐品、价格和取餐方式（堂食或外带）告诉你，**等你同意后**才创建订单，然后把支付链接给你。订单是待支付状态，**要在 15 分钟内付款**，过期就失效；不付款就不会扣钱。

## 给 AI 的安装说明

> 这一节是写给 AI Agent 看的。用户让你安装 mcd-token-burger 时，按下面的步骤操作。

1. **安装 Skill**：把仓库里的 `skills/mcd-token-burger` 文件夹复制到你自己的 Skill 目录。Claude Code 的 Skill 目录是 `~/.claude/skills/`：

   ```bash
   git clone --depth 1 https://github.com/ZekerTop/mcd-token-burger.git /tmp/mcd-token-burger
   mkdir -p ~/.claude/skills && cp -r /tmp/mcd-token-burger/skills/mcd-token-burger ~/.claude/skills/
   ```

   其他 Agent 放到它们各自的 Skill 目录。如果已经装过，用新版覆盖。

2. **保存麦当劳 MCP Token**：把用户给的 Token 写进 `~/.mcd_mcp_token`，权限设为 600，再让 shell 启动时读取它。**不要在输出里回显 Token，也不要把它写进任何代码仓库。**

   ```bash
   printf '%s' '<用户的 Token>' > ~/.mcd_mcp_token && chmod 600 ~/.mcd_mcp_token
   grep -q mcd_mcp_token ~/.zshrc 2>/dev/null || printf '%s\n' '[ -f ~/.mcd_mcp_token ] && export MCD_MCP_TOKEN="$(tr -d '"'"'\r\n'"'"' < ~/.mcd_mcp_token)"' >> ~/.zshrc
   ```

   用户用的是 bash 的话，把 `~/.zshrc` 换成 `~/.bashrc`。用户没给 Token 的话，跳过这一步，只装 Skill，并告诉用户：不设 Token 只能看到 token 数和金额。

   如果你所在的客户端支持配置 MCP Server，也可以按上面第 2 步的 JSON 接入 mcd-mcp。

3. **验证**：在一个新 shell 里运行下面这条命令，确认输出的 JSON 里 `usage.tokens` 有数字：

   ```bash
   npx -y github:ZekerTop/mcd-token-burger --today --json
   ```

   设了 Token 的话，再加上 `--city <城市> --keyword <地点>` 跑一次，确认 `burger.count` 有值。如果 `burgerError` 或 `hint` 里提示 401，说明 Token 无效，请用户重新复制。

4. **告诉用户**：装好了，**新开一个对话**后直接问「我这周的 token 能换几个巨无霸？我在 XX」就行。

## 喜欢命令行？

AI 在背后调用的，就是本仓库里的一个零依赖命令行工具。你也可以自己直接运行。需要 [Node.js](https://nodejs.org/) 18 或更高版本，不用 clone，也不用装依赖。

<details>
<summary><b>点开查看命令行用法和截图</b></summary>

### 只看 token 和金额（不需要麦当劳 Token）

```bash
npx -y github:ZekerTop/mcd-token-burger
```

![不设置 Token 时的输出](docs/images/no-token.png)

### 换算成附近门店的汉堡

```bash
export MCD_MCP_TOKEN=你的Token
npx -y github:ZekerTop/mcd-token-burger --city 深圳 --keyword 科技园
```

![最近 7 天的 token 换算成巨无霸](docs/images/burger.png)

### 换一种餐品；早餐时段按午餐时段核价

```bash
npx -y github:ZekerTop/mcd-token-burger --today --item 麦辣鸡腿堡 --city 深圳 --keyword 科技园
```

![早上 9 点查麦辣鸡腿汉堡，按午餐时段核价](docs/images/item.png)

### 下单

加 `--order`，会先显示门店、餐品和取餐方式，等你输入 `y` 确认。确认后创建 1 份待支付订单，返回支付链接和付款截止时间（实测为下单后 15 分钟），不会自动扣款。截图里回答了 `n`，所以没有创建订单。

取餐方式默认用门店返回的第一种（目前是堂食），要外带就加 `--pickup 外带`：

```bash
npx -y github:ZekerTop/mcd-token-burger --city 深圳 --keyword 科技园 --order
npx -y github:ZekerTop/mcd-token-burger --city 深圳 --keyword 科技园 --order --pickup 外带
```

![外带下单前的确认](docs/images/order.png)

### 全部参数

![帮助信息](docs/images/help.png)

| 想要 | 加上 |
|---|---|
| 只看今天 | `--today` |
| 最近 30 天 | `--days 30` |
| 从某一天开始算 | `--since 2026-10-01` |
| 换一种餐品来换算 | `--item 麦辣鸡腿堡` |
| 犒劳自己，生成下单链接 | `--order`（会先确认；加 `--yes` 跳过确认） |
| 外带 | `--pickup 外带`（默认堂食） |
| 调整美元汇率 | `--fx 7.2`（默认 7.1） |
| 输出 JSON | `--json` |

城市和地点也可以用环境变量 `MCD_CITY`、`MCD_KEYWORD` 设置。Windows PowerShell 用 `$env:MCD_MCP_TOKEN="你的Token"` 设置环境变量。本页所有终端截图都是 `npx` 从本仓库拉取后实际运行的输出。

</details>

## 怎么算的

```text
本地日志 ──读取──▶ 按型号汇总 token ──× API 公开价──▶ 美元 ──× 汇率──▶ 人民币
                                                                     │
麦当劳 MCP：query-nearby-stores → query-meals → calculate-price ──▶ 单价（分）
                                                                     ▼
                                                     人民币 ÷ 单价 = 汉堡数
```

**汇率：1 个巨无霸折合多少 token？** 卡片上会写一行「1 个巨无霸 ≈ N 万 token」，这就是项目名里的「Token 汉堡汇率」。它是算出来的，不是定死的：

```text
汇率 = 巨无霸到手价 ÷ 平均每 token 的 API 价
```

作者本机最近 7 天的数据：24.61 亿 token 按 API 价约 ¥4,725.00，平均每百万 token ¥1.92；巨无霸 ¥25.50，所以 1 个巨无霸 ≈ 1,328 万 token。

为什么动不动就几亿 token？因为 Agent 每走一步，都要把整段对话和读过的文件重新发给模型一次，同一段上下文会被重复计数几十次，这部分叫「缓存重读」。作者本机 96% 的 token 都是缓存重读，实际新处理的只有 9,911 万。缓存重读的单价只有正常输入的一折或更低，所以几亿 token 换不出几亿份的钱。卡片会把这个占比单独列出来。

汇率会随两件事变化：门店价格，以及你的用法。缓存占比越高、用的模型越便宜，每个 token 就越便宜，1 个巨无霸折合的 token 也就越多。

- **Claude Code**：读取 `~/.claude/projects/**/*.jsonl` 里每条回复的 `usage`。同一条回复在日志里会被拆成多行，所以按 `message.id + requestId` 去重。
- **Codex**：读取 `~/.codex/sessions` 和 `archived_sessions` 里的 `token_count` 事件，用会话累计值的差值算出每次消耗。续接或分叉出来的会话文件会带着之前的累计值，这部分只取 `last_token_usage`，避免重复计算。
- **价格**：输入、输出、写缓存、读缓存分别计价。Claude 按 Anthropic 官方价目表；GPT 系列用的是第三方价格追踪站的数据，**没有经过 OpenAI 官网核对**。遇到价目表里没有的型号，按同家族最新型号估算，并标注「含估算」。价目表在 [`src/pricing.js`](src/pricing.js)。
- **汉堡价**：用麦当劳 MCP 的 `calculate-price` 官方核价，单位是分，已经包含门店的自动优惠，不是菜单上的标价。

订阅 Claude Max、ChatGPT Pro 这类套餐的用户，实际付的是订阅费。这里的金额表示「按 API 价算相当于多少钱」，不是你真实的账单。

## 用到的麦当劳 MCP 工具

| 工具 | 什么时候调用 | 用来做什么 |
|---|---|---|
| `query-nearby-stores` | 每次换算 | 按城市和地点找最近的门店，同时拿到门店可预约的时段 |
| `query-meals` | 每次换算 | 在门店菜单里找到要换算的餐品；早餐时段或打烊时带上预约时段再查一次 |
| `calculate-price` | 每次换算 | 官方核价，拿到实时到手价和可选的取餐方式 |
| `query-store-coupons` | 每次换算 | 统计你在这家店能用的券，有券时提示 |
| `create-order` | 只在你明确要求并确认后 | 创建 1 份待支付订单，返回支付链接 |

调用流程和业务价值的完整说明见 [MCP_INTEGRATION.md](MCP_INTEGRATION.md)。

## 隐私与安全

- token 统计全部在本机完成，日志内容不会上传。
- 发给麦当劳 MCP 的只有：城市、地点关键词、门店编号、餐品编号和预约时段。下单请求只在你同意后才会发出。
- 门店券只统计张数，不展示券的内容。
- 麦当劳 MCP Token 只保存在你本机（`~/.mcd_mcp_token` 或 Agent 的 MCP 配置里），不会写进代码仓库。第 2 步把 Token 发给 AI 时，它会留在你和 AI 的对话记录里；介意的话，可以装好后到麦当劳控制台重新生成一个，再让 AI 更新。
- 下单只会创建待支付订单，不会自动付款，每次只点 1 份。

## 常见问题

**问了之后 AI 没用这个 Skill？**
装好 Skill 后要新开一个对话。还不行的话，在问题里点名：「用 mcd-token-burger 算一下我这周的 token 能换几个巨无霸」。

**AI 说只能算出金额，算不出汉堡数？**
没有设置麦当劳 MCP Token，或者 AI 不知道你在哪。把 Token 给它（见第 2 步），并在问题里说清城市和地点。

**AI 说「麦当劳 MCP 暂时查不到价格」？**
麦当劳 MCP 返回了错误，比如 Token 过期，或者门店不在营业时间、又没有可预约的时段。AI 会把麦当劳返回的原因告诉你，token 数和金额照常给出。

**我只用 Codex（或只用 Claude Code），能用吗？**
能。没有日志的那一个会自动跳过。

**下单后多久要付款？**
实测待支付订单要在下单后 15 分钟内付款，过期就失效，不会扣钱。AI 和命令行都会告诉你截止时间。

**数字和我的账单对不上？**
这里按 API 公开价计算。如果你用的是订阅套餐，实际花费是订阅费；如果用的是 API，有些平台会有折扣或额外费用。

## 已知限制

- 目前只统计 Claude Code 和 Codex，其他工具暂不支持。
- GPT 系列价格来自第三方数据。汇率固定为 7.1，可以让 AI 换一个汇率重算。
- 门店取搜索结果里离你最近的第一家。只支持到店取餐：堂食或外带（店外取餐柜），默认用核价结果里的第一项（目前是「堂食」），可以对 AI 说「外带」，或在命令行加 `--pickup 外带`。
- 作者在 macOS 上的 Claude Code 里实测过；WorkBuddy、Windows、Linux 按同样的方式应该可用，但还没有实测。

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
