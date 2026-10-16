import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCard } from '../src/card.js';

test('卡片拆出缓存重读占比，并写明汇率怎么来的', () => {
  const card = renderCard({
    periodLabel: '最近 7 天',
    fx: 7.1,
    cny: 200,
    usage: { tokens: 2e8, cacheRead: 1.9e8, usd: 200 / 7.1, estimated: false, sources: {} },
    burger: { count: 8, item: '巨无霸', priceFen: 2500, tokensPerBurger: 2.5e7, priceLabel: '' },
  });
  assert.match(card, /其中 95% 是缓存重读/);
  assert.match(card, /实际新处理 1,000 万 token/);
  assert.match(card, /1 个巨无霸 ≈ 2,500 万 token/);
  assert.match(card, /= ¥25\.00 ÷ 平均每百万 token ¥1\.00/);
});
