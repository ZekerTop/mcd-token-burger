#!/usr/bin/env node
import { parseArgs } from 'node:util';
import readline from 'node:readline/promises';
import { scanUsage } from '../src/usage.js';
import { McdClient } from '../src/mcd.js';
import { renderCard, fmtMoney } from '../src/card.js';

const HELP = `
mcd-token-burger —— 把你让 AI 烧掉的 token，换算成附近麦当劳的汉堡

用法：
  npx github:ZekerTop/mcd-token-burger [选项]

统计范围（默认最近 7 天）：
  --days <n>         最近 n 天
  --today            今天（本地时区 0 点起）
  --since <日期>     从 YYYY-MM-DD 起

麦当劳（需要环境变量 MCD_MCP_TOKEN）：
  --city <城市>      例如 深圳（也可用环境变量 MCD_CITY）
  --keyword <地点>   例如 科技园（也可用环境变量 MCD_KEYWORD）
  --item <餐品>      换算用的餐品关键词，默认 巨无霸
  --order            为这份餐品生成一笔到店的待支付订单，返回支付链接（会先确认）
  --yes              配合 --order 跳过确认

其他：
  --fx <汇率>        1 美元兑人民币，默认 7.1
  --json             输出 JSON（给 Skill / 脚本用）
  -h, --help         显示帮助
`;

function parse() {
  const { values } = parseArgs({
    options: {
      days: { type: 'string', default: '7' },
      today: { type: 'boolean' },
      since: { type: 'string' },
      city: { type: 'string', default: process.env.MCD_CITY },
      keyword: { type: 'string', default: process.env.MCD_KEYWORD },
      item: { type: 'string', default: '巨无霸' },
      order: { type: 'boolean' },
      yes: { type: 'boolean' },
      fx: { type: 'string', default: '7.1' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  return values;
}

function period(opts) {
  if (opts.today) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return { since: d, label: '今天' };
  }
  if (opts.since) {
    const d = new Date(`${opts.since}T00:00:00`);
    if (Number.isNaN(d.getTime())) throw new Error(`--since 日期格式应为 YYYY-MM-DD：${opts.since}`);
    return { since: d, label: `${opts.since} 至今` };
  }
  const days = Number(opts.days);
  if (!Number.isFinite(days) || days <= 0) throw new Error(`--days 需要正数：${opts.days}`);
  return { since: new Date(Date.now() - days * 864e5), label: `最近 ${days} 天` };
}

const hhmm = (d) => d.toTimeString().slice(0, 5);

async function burgerPrice(opts) {
  const client = new McdClient({ token: process.env.MCD_MCP_TOKEN });
  const store = await client.findStore({ city: opts.city, keyword: opts.keyword });
  const item = await client.findItem(store, opts.item);
  const price = await client.priceItem(store, item);
  const coupons = await client.countCoupons(store).catch(() => null);
  return { client, store, item, price, coupons, at: new Date() };
}

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

async function main() {
  const opts = parse();
  if (opts.help) return console.log(HELP);
  const fx = Number(opts.fx);
  if (!Number.isFinite(fx) || fx <= 0) throw new Error(`--fx 需要正数：${opts.fx}`);
  const { since, label } = period(opts);

  const usage = await scanUsage({ since });
  const cny = usage.usd * fx;
  const result = { periodLabel: label, usage, fx, cny, burger: null, hint: null };

  const hasToken = Boolean(process.env.MCD_MCP_TOKEN);
  let mcd = null;
  let mcdError = null;
  if (hasToken && opts.city && opts.keyword) {
    // 麦当劳 MCP 出错（比如门店打烊）时，仍然展示 token 和金额
    mcd = await burgerPrice(opts).catch((err) => {
      mcdError = err;
      return null;
    });
  }
  if (mcd) {
    const yuan = mcd.price.fen / 100;
    result.burger = {
      count: cny / yuan,
      item: mcd.item.name,
      store: mcd.store,
      priceFen: mcd.price.fen,
      coupons: mcd.coupons,
      priceLabel:
        `${mcd.store.name} · ${mcd.item.name} ${fmtMoney(yuan, '¥')}（麦当劳 MCP 实时核价 ${hhmm(mcd.at)}）` +
        (mcd.coupons ? ` · 你有 ${mcd.coupons} 张券可在这家店用` : ''),
    };
    if (!opts.order) result.hint = `AI 吃了 ${Math.floor(result.burger.count)} 个，你也吃一个？加上 --order 生成下单链接`;
  } else if (mcdError) {
    result.burgerError = mcdError.message;
    result.hint = `麦当劳 MCP 暂时查不到价格：${mcdError.message}`;
  } else if (hasToken) {
    result.hint = '加上 --city 和 --keyword（例如 --city 深圳 --keyword 科技园）按附近门店实时价换算';
  } else {
    result.hint = '去 https://open.mcd.cn/mcp 申请 Token，设为环境变量 MCD_MCP_TOKEN 后解锁实时换算';
  }

  if (opts.json) {
    console.log(JSON.stringify({ ...result, usage: { ...usage, since: since.toISOString() } }, null, 2));
  } else {
    console.log(renderCard(result));
  }

  if (!opts.order) return;
  if (mcdError) throw new Error('没有拿到门店价格，无法下单');
  if (!mcd) throw new Error('--order 需要 MCD_MCP_TOKEN、--city 和 --keyword');
  const takeWay = mcd.price.takeWays[0];
  if (!takeWay?.code) throw new Error('核价结果没有返回取餐方式（takeWayList），无法下单');
  const ok =
    opts.yes ||
    (await confirm(`将在「${mcd.store.name}」创建 1 份「${mcd.item.name}」到店订单，取餐方式「${takeWay.title || takeWay.code}」（待支付，不会自动扣款）。继续？[y/N] `));
  if (!ok) return console.log('已取消，没有创建订单。');
  const order = await mcd.client.createOrder(mcd.store, mcd.item, takeWay.code);
  console.log(`\n  订单已创建${order.orderId ? `：${order.orderId}` : ''}，状态为待支付。`);
  console.log(order.payUrl ? `  支付链接：${order.payUrl}` : '  没有在返回结果中找到支付链接，请到麦当劳 App 查看订单。');
  console.log('  支付前不会扣款；不需要的话请在麦当劳 App 里取消这笔订单。\n');
}

main().catch((err) => {
  console.error(`\n  出错了：${err.message}\n`);
  process.exitCode = 1;
});
