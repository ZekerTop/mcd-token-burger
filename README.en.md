# 🍔 mcd-token-burger

[中文](README.md) | **English**

**How many Big Macs are your AI tokens worth?**

One command adds up the tokens you have used in Claude Code and Codex and converts them to RMB at public API prices. It then asks the [McDonald's China MCP](https://open.mcd.cn/mcp) for the **live price** at a store near you and tells you how many burgers that money would buy. If you get hungry, it can also create an order for you to pay.

![Last 7 days of tokens converted into Big Macs](docs/images/burger.png)

> The screenshot is a real run on the author's machine on 2026-10-15. The Big Mac price comes from a live McDonald's MCP price check. Every terminal screenshot on this page is real output from running this repository with `npx`. The tool's output is in Chinese.
>
> This is an entry in the McDonald's China Programmer's Day Creative Development Challenge. It is an independent personal project, not an official McDonald's product.

## Contents

- [Who it's for](#who-its-for)
- [What it does](#what-it-does)
- [Get started in 3 steps](#get-started-in-3-steps)
- [More ways to use it](#more-ways-to-use-it)
- [Use it in an AI agent (WorkBuddy, Claude Code, …)](#use-it-in-an-ai-agent-workbuddy-claude-code-)
- [How it calculates](#how-it-calculates)
- [McDonald's MCP tools used](#mcdonalds-mcp-tools-used)
- [Privacy and safety](#privacy-and-safety)
- [FAQ](#faq)
- [Known limitations](#known-limitations)
- [Development](#development)

## Who it's for

- **Developers who code with Claude Code or Codex every day** and want to see how much their AI "ate" this week.
- **Claude Max or ChatGPT Pro subscribers** curious about how much their plan saves them compared with API prices.
- **Anyone who wants a fun line for a team update or social post.** "My AI ate 180 Big Macs this week" lands better than "I used 2.1 billion tokens".
- **People who'd like a McDonald's order out of it.** You go from the card straight to an order, and you still pay for it yourself.

## What it does

| Feature | Details | Needs McDonald's token |
|---|---|:---:|
| Count tokens | Reads local Claude Code and Codex logs and totals usage per model | No |
| Convert to RMB | Prices input, output and cache tokens separately at each model's public API rate | No |
| Convert to burgers | Finds a store near you and uses the official live price | Yes |
| Choose the menu item | Use any menu item as the unit, not just the Big Mac | Yes |
| Works at breakfast too | Big Macs aren't sold at breakfast, so it uses the store's lunch price for today | Yes |
| One-step ordering | After you confirm, creates one unpaid order and returns a payment link; nothing is charged automatically | Yes |
| Agent Skill | Do all of the above by chatting in WorkBuddy, Claude Code and other agents | Yes |

## Get started in 3 steps

You need [Node.js](https://nodejs.org/) 18 or later. You don't need to clone anything or install dependencies.

### Step 1: See how much your AI spent

```bash
npx -y github:ZekerTop/mcd-token-burger
```

This step needs no token. It reads your local Claude Code and Codex logs and shows the last 7 days of tokens and their RMB cost at API prices.

![Output without a McDonald's token](docs/images/no-token.png)

The burger count shows "?" because McDonald's isn't connected yet. Step 2 fixes that.

### Step 2: Get a McDonald's MCP token and convert to burgers

**1) Get a token** (free, takes about a minute)

Open [open.mcd.cn/mcp](https://open.mcd.cn/mcp), click 登录 (Log in) in the top-right corner and verify with your phone number. Once you're logged in, the button changes to 控制台 (Console):

<img src="https://raw.githubusercontent.com/M-China/mcd-developer-innovation-challenge/main/images/image3.jpg" alt="The top-right button becomes Console after login" width="720" />

Click 控制台 (Console), then 激活 (Activate), and accept the service agreement:

<img src="https://raw.githubusercontent.com/M-China/mcd-developer-innovation-challenge/main/images/image4.png" alt="Click Activate in the console" width="720" />

Once it's activated, copy the token with one click:

<img src="https://raw.githubusercontent.com/M-China/mcd-developer-innovation-challenge/main/images/image6.png" alt="Copy the MCP token" width="720" />

> These three images come from the [official McDonald's challenge guide](https://github.com/M-China/mcd-developer-innovation-challenge).
> The token is a key to your McDonald's account. Don't share it, and don't commit it to a repository.

**2) Run it**

Set the token as an environment variable, then tell the tool which city and area you're in:

```bash
export MCD_MCP_TOKEN=your_token
npx -y github:ZekerTop/mcd-token-burger --city 深圳 --keyword 科技园
```

The tool finds the store nearest that area, looks up the Big Mac on that store's menu, gets its live price from the official price check, and works out how many you could buy. The result looks like the screenshot at the top of this page.

City and area names are in Chinese, for example `--city 北京 --keyword 中关村`. On Windows PowerShell, set the variable with `$env:MCD_MCP_TOKEN="your_token"`.

### Step 3 (optional): Order one

```bash
npx -y github:ZekerTop/mcd-token-burger --city 深圳 --keyword 科技园 --order
```

Before anything happens, the tool shows the store, the item and the pickup method, then waits for you to type `y`. Once you confirm, it creates **one unpaid order** and gives you a payment link. **Nothing is charged automatically.** If you change your mind, just don't pay, or cancel the order in the McDonald's app.

![Order confirmation](docs/images/order.png)

> In this screenshot the answer was `n`, so no order was created.

## More ways to use it

### Use a different item, or check in the morning

Use `--item` to pick the unit. Menu names sometimes differ slightly from what people call them. For example, the 麦辣鸡腿堡 is listed on the menu as 麦辣鸡腿汉堡. The tool matches them anyway, and it prefers the single item over a meal.

Before about 10:30 the breakfast menu has no Big Macs or other lunch burgers, and the menu is unavailable once a store closes. In either case the tool uses the store's next non-breakfast time slot, today or tomorrow, and the card says which slot it priced (for example, 按今天午餐时段, "using today's lunch slot"):

```bash
npx -y github:ZekerTop/mcd-token-burger --today --item 麦辣鸡腿堡 --city 深圳 --keyword 科技园
```

![Checking the McSpicy at 9 a.m., priced at the lunch slot](docs/images/item.png)

### All options

```bash
npx -y github:ZekerTop/mcd-token-burger --help
```

![Help output](docs/images/help.png)

| To | Add |
|---|---|
| See only today | `--today` |
| See the last 30 days | `--days 30` |
| Count from a given date | `--since 2026-10-01` |
| Use a different item as the unit | `--item 麦辣鸡腿堡` |
| Get an order link | `--order` (asks first; add `--yes` to skip the prompt) |
| Change the USD exchange rate | `--fx 7.2` (default 7.1) |
| Get JSON for scripts or agents | `--json` |

### Skip typing the city every time

Put the token, city and area in your shell config (for example `~/.zshrc`). After that, `npx -y github:ZekerTop/mcd-token-burger` on its own gives you the burger count:

```bash
export MCD_MCP_TOKEN=your_token
export MCD_CITY=深圳
export MCD_KEYWORD=科技园
```

## Use it in an AI agent (WorkBuddy, Claude Code, …)

If you'd rather not type commands, install this project as a Skill and ask your agent in plain language:

> How many Big Macs are my tokens worth this week? I'm near Shenzhen Science Park.
>
> Order one for me.

That takes two things: **connect the McDonald's MCP**, then **install the Skill**.

### 1. Connect the McDonald's MCP

It works with any MCP client that supports Streamable HTTP, and the configuration is the same everywhere. Replace `YOUR_MCP_TOKEN` with the token from Step 2:

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

**In WorkBuddy** (steps from the [official McDonald's challenge guide](https://github.com/M-China/mcd-developer-innovation-challenge#workbuddy-开发指南)):

1. Open WorkBuddy. In the left sidebar, open 专家·技能·连接器 (Experts · Skills · Connectors) and choose the 连接器 (Connectors) tab.
2. Click 自定义连接器 (Custom connector) → 配置MCP (Configure MCP) in the top-right corner.
3. Paste the JSON above, fill in your token and click 保存 (Save).
4. Go back to 自定义连接器 (Custom connector) and enable mcd-mcp.

For Cursor, TRAE, Cherry Studio and other clients, see the [official McDonald's MCP guide](https://github.com/M-China/mcd-mcp-server).

### 2. Install the Skill

The Skill is the [`skills/mcd-token-burger`](skills/mcd-token-burger) folder in this repository, which contains a single `SKILL.md`. Put it in your agent's skills directory. For Claude Code:

```bash
git clone https://github.com/ZekerTop/mcd-token-burger.git
mkdir -p ~/.claude/skills && cp -r mcd-token-burger/skills/mcd-token-burger ~/.claude/skills/
```

In WorkBuddy, add Skills from the 技能 (Skills) tab in the same sidebar. See the [WorkBuddy docs](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Connector) for how to import one.

### 3. What the agent does

1. Runs `npx -y github:ZekerTop/mcd-token-burger --json` on your machine to get the token count and RMB amount. The agent needs permission to run local commands for this.
2. Calls `query-nearby-stores` → `query-meals` → `calculate-price` through the McDonald's MCP to get the live price, then works out the burger count.
3. When you say "order one for me", calls `create-order` to create an unpaid order and gives you the payment link. It orders only when you explicitly ask.

## How it calculates

```text
Local logs ──read──▶ tokens per model ──× public API price──▶ USD ──× FX rate──▶ RMB
                                                                                 │
McDonald's MCP: query-nearby-stores → query-meals → calculate-price ──▶ unit price (fen)
                                                                                 ▼
                                                              RMB ÷ unit price = burgers
```

- **Claude Code**: reads `usage` from each response in `~/.claude/projects/**/*.jsonl`. One response can appear on several log lines, so entries are deduplicated by `message.id + requestId`.
- **Codex**: reads `token_count` events from `~/.codex/sessions` and `archived_sessions`, and works out each turn's usage from the difference between running session totals. Resumed or forked session files start with the earlier totals, so those entries use only `last_token_usage` to avoid double counting.
- **Prices**: input, output, cache writes and cache reads are priced separately. Claude prices come from Anthropic's official price list. GPT prices come from a third-party price tracker and **haven't been checked against OpenAI's official pricing**. Models missing from the table are estimated at the latest model in the same family, and the card then says 含估算 (includes estimates). The price table is in [`src/pricing.js`](src/pricing.js).
- **Burger price**: comes from the official `calculate-price` check in the McDonald's MCP. It's in fen (0.01 RMB) and already includes the store's automatic discounts, so it isn't the printed menu price.

If you're on a Claude Max or ChatGPT Pro plan, what you actually pay is the subscription fee. The card shows what your usage would cost at API prices, not your real bill.

## McDonald's MCP tools used

| Tool | When it's called | What it's for |
|---|---|---|
| `query-nearby-stores` | Every conversion | Finds the nearest store by city and area, along with the store's bookable time slots |
| `query-meals` | Every conversion | Finds the item on the store's menu; at breakfast or after closing, queries again for a bookable time slot |
| `calculate-price` | Every conversion | Official price check that returns the live price and the available pickup methods |
| `query-store-coupons` | Every conversion | Counts the coupons you can use at that store; the card mentions them if you have any |
| `create-order` | Only with `--order`, after you confirm | Creates one unpaid order and returns a payment link |

For the full call flow and the business value, see [MCP_INTEGRATION.md](MCP_INTEGRATION.md) (in Chinese).

## Privacy and safety

- Token counting happens entirely on your machine. Log contents are never uploaded.
- The only things sent to the McDonald's MCP are the city, area keyword, store code, item code and time slot. An order request is sent only after you confirm.
- Coupons are only counted. If you have any, the card mentions how many, but it never shows what they are.
- The McDonald's MCP token is read only from an environment variable and is never written to a file.
- Ordering only creates an unpaid order. Nothing is paid automatically, and it orders one item at a time.

## FAQ

**Why does the card show "?" burgers?**
Either `MCD_MCP_TOKEN` isn't set, or `--city` and `--keyword` are missing. The yellow line at the bottom of the card tells you which.

**The card says 麦当劳 MCP 暂时查不到价格 (McDonald's MCP couldn't get a price).**
The McDonald's MCP returned an error. For example, the token may have expired, or the store may be closed with no bookable time slot. The message includes the reason McDonald's gave, and the token count and amount are still shown.

**I only use Codex (or only Claude Code). Will it work?**
Yes. Whichever tool has no logs is skipped.

**The numbers don't match my bill.**
The card uses public API prices. On a subscription, you pay the subscription fee instead. On the API, some platforms add discounts or extra fees.

**Is it slow?**
The last 7 days usually takes ten to twenty seconds. Over several months, Codex logs can reach tens of GB and take longer to scan.

## Known limitations

- Only Claude Code and Codex are supported so far.
- GPT prices come from third-party data. The exchange rate is fixed at 7.1; change it with `--fx`.
- The tool uses the first store in the search results, which is the nearest one. It supports in-store pickup only, and uses the first pickup method returned by the price check (currently 堂食, dine-in).
- Only tested on macOS. Windows and Linux should work but haven't been tested.

## Development

```bash
git clone https://github.com/ZekerTop/mcd-token-burger.git
cd mcd-token-burger
npm test                  # node:test, no dependencies needed
node bin/mcd-token-burger.js --today
```

```text
bin/mcd-token-burger.js    CLI entry point
src/usage.js               Reads Claude Code / Codex local logs and totals tokens
src/pricing.js             Per-model API price table and conversion
src/mcd.js                 McDonald's MCP client (Streamable HTTP + JSON-RPC), no dependencies
src/card.js                Terminal card
skills/mcd-token-burger/   Agent Skill
test/                      Unit tests; a mock MCP server covers store, menu, price and order
```

## Challenge materials

- [MCP_INTEGRATION.md](MCP_INTEGRATION.md): McDonald's MCP tools used, call flow and business value (in Chinese)
- [CONTEST_DECLARATION.md](CONTEST_DECLARATION.md): entry declaration (official text, in Chinese)
- [mcp-config.example.json](mcp-config.example.json): redacted MCP config example

## License

[MIT](LICENSE) © 月时
