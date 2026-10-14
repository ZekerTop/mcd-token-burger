const color = (code) => (s) => (process.stdout.isTTY && !process.env.NO_COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = color('1');
const dim = color('2');
const yellow = color('33');
const red = color('31');

export function fmtTokens(n) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)} 亿`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(1)} 万`;
  return String(n);
}

export const fmtMoney = (v, sign) => `${sign}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function verdict(burgers) {
  if (burgers < 1) return '还不够一个汉堡，你的 AI 很会过日子。';
  if (burgers < 10) return '够请自己吃一周早餐了。';
  if (burgers < 50) return '你的 AI 比你吃得还多。';
  if (burgers < 200) return '这个量，够请全组吃一顿了。';
  return '你的 AI 已经是麦门 VIP 了。';
}

function burgerRow(burgers) {
  const n = Math.floor(burgers);
  if (n === 0) return '🍔'.padEnd(2) + dim(' (还差一点)');
  return n <= 20 ? '🍔'.repeat(n) : `${'🍔'.repeat(20)} ${dim(`… ×${n}`)}`;
}

const SOURCE_NAMES = { claude: 'Claude Code', codex: 'Codex' };

export function renderCard(r) {
  const line = dim('─'.repeat(44));
  const out = [''];
  out.push(`  ${bold(yellow('🍔 MCD TOKEN BURGER'))}  ${dim('·')}  ${r.periodLabel}`);
  out.push(`  ${line}`);
  out.push(`  AI 烧掉   ${bold(fmtTokens(r.usage.tokens))} token`);
  out.push(`  API 价    ${fmtMoney(r.usage.usd, '$')}  ≈  ${bold(fmtMoney(r.cny, '¥'))}${r.usage.estimated ? dim('  (含估算)') : ''}`);
  for (const [key, s] of Object.entries(r.usage.sources)) {
    if (!s.tokens) continue;
    out.push(dim(`    ${SOURCE_NAMES[key].padEnd(12)}${fmtTokens(s.tokens).padStart(10)}  ${fmtMoney(s.usd, '$').padStart(10)}`));
  }
  out.push(`  ${line}`);
  if (r.burger) {
    out.push(`  ≈ ${bold(red(r.burger.count.toFixed(1)))} 个${bold(r.burger.item)}`);
    out.push(`  ${burgerRow(r.burger.count)}`);
    out.push(`  ${verdict(r.burger.count)}`);
    out.push(`  ${line}`);
    out.push(dim(`  ${r.burger.priceLabel}`));
  } else {
    out.push(`  ≈ ${bold('?')} 个巨无霸`);
    out.push(dim('  设置 MCD_MCP_TOKEN 和 --city/--keyword，按你附近门店的实时价换算'));
  }
  out.push(dim(`  汇率 1 USD = ${r.fx} CNY · token 按 API 公开价折算，订阅用户的实际花费不同`));
  if (r.hint) out.push(`  ${yellow(r.hint)}`);
  out.push('');
  return out.join('\n');
}
