// 公开 API 价格，单位：美元 / 百万 token。
// input: 未命中缓存的输入；cacheWrite5m / cacheWrite1h: 写缓存；cacheRead: 读缓存；output: 输出（含思考）。
// Claude 价格来源：Anthropic 官方模型价格表（2026-10）；写缓存按官方 1.25x / 2x 输入价规则。
// GPT 价格来源：第三方价格追踪站（OpenRouter / BenchLM，2026-10），未经 OpenAI 官网核对。

const claude = (input, output, cacheRead = input * 0.1) => ({
  input,
  output,
  cacheWrite5m: input * 1.25,
  cacheWrite1h: input * 2,
  cacheRead,
});

const gpt = (input, output, cacheRead) => ({ input, output, cacheWrite5m: input, cacheWrite1h: input, cacheRead });

export const PRICES = {
  'claude-fable-5-1': claude(10, 50, 0.25),
  'claude-fable-5': claude(10, 50),
  'claude-opus-5-5': claude(4, 20, 0.2),
  'claude-opus-5': claude(5, 25),
  'claude-opus-4-8': claude(5, 25),
  'claude-opus-4-7': claude(5, 25),
  'claude-opus-4-6': claude(5, 25),
  'claude-sonnet-5-5': claude(2, 10, 0.2),
  'claude-sonnet-5': claude(2, 10),
  'claude-sonnet-4-6': claude(3, 15),
  'claude-haiku-5-5': claude(0.1, 0.5),
  'claude-haiku-4-5': claude(1, 5),
  'gpt-6.1-sol': gpt(2, 10, 0.1),
  'gpt-6-sol': gpt(2, 10, 0.2),
};

// 未知型号按同家族最新款估算，并在结果里标记 estimated。
const FAMILY_FALLBACK = [
  [/fable|mythos/, 'claude-fable-5-1'],
  [/opus/, 'claude-opus-5-5'],
  [/sonnet/, 'claude-sonnet-5-5'],
  [/haiku/, 'claude-haiku-5-5'],
  [/^gpt|^o\d|codex/, 'gpt-6.1-sol'],
];

export function priceFor(model) {
  const id = String(model || '').toLowerCase().replace(/-\d{8}$/, '');
  if (PRICES[id]) return { id, price: PRICES[id], estimated: false };
  for (const [re, fallback] of FAMILY_FALLBACK) {
    if (re.test(id)) return { id: fallback, price: PRICES[fallback], estimated: true };
  }
  return { id: 'claude-opus-5-5', price: PRICES['claude-opus-5-5'], estimated: true };
}

export function costUSD(model, t) {
  const { price, estimated } = priceFor(model);
  const usd =
    (t.input * price.input +
      t.output * price.output +
      t.cacheWrite5m * price.cacheWrite5m +
      t.cacheWrite1h * price.cacheWrite1h +
      t.cacheRead * price.cacheRead) /
    1e6;
  return { usd, estimated };
}
