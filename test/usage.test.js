import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanClaude, scanCodex, scanUsage } from '../src/usage.js';
import { costUSD, priceFor } from '../src/pricing.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'mcd-token-burger-'));
const jsonl = (file, rows) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
};

const since = new Date('2026-10-10T00:00:00Z');

const claudeMsg = (id, ts, usage, model = 'claude-opus-5-5') => ({
  type: 'assistant',
  timestamp: ts,
  requestId: `req_${id}`,
  message: { id: `msg_${id}`, model, usage },
});

test('Claude Code：同一回复多行只算一次，跳过 synthetic 和区间外记录', async () => {
  const dir = tmp();
  const usage = {
    input_tokens: 10,
    output_tokens: 100,
    cache_creation_input_tokens: 300,
    cache_read_input_tokens: 1000,
    cache_creation: { ephemeral_1h_input_tokens: 200, ephemeral_5m_input_tokens: 100 },
  };
  jsonl(path.join(dir, 'proj', 'a.jsonl'), [
    { type: 'user', timestamp: '2026-10-11T00:00:00Z', message: { content: 'hi' } },
    claudeMsg('1', '2026-10-11T00:00:01Z', usage),
    claudeMsg('1', '2026-10-11T00:00:01Z', usage),
    claudeMsg('2', '2026-10-01T00:00:00Z', usage),
    claudeMsg('3', '2026-10-11T00:00:02Z', { input_tokens: 0, output_tokens: 0 }, '<synthetic>'),
  ]);
  const byModel = await scanClaude([dir, path.join(dir, 'missing')], since);
  assert.deepEqual(byModel, {
    'claude-opus-5-5': { input: 10, output: 100, cacheWrite5m: 100, cacheWrite1h: 200, cacheRead: 1000 },
  });
});

const usageOf = ([input, cached, output]) => ({
  input_tokens: input,
  cached_input_tokens: cached,
  output_tokens: output,
  total_tokens: input + output,
});
const tokenCount = (ts, input, cached, output, last = [input, cached, output]) => ({
  timestamp: ts,
  type: 'event_msg',
  payload: {
    type: 'token_count',
    info: { total_token_usage: usageOf([input, cached, output]), last_token_usage: usageOf(last) },
  },
});
const turn = (model) => ({ timestamp: '2026-10-11T00:00:00Z', type: 'turn_context', payload: { model } });

test('Codex：按累计值差分，重复事件不重复算，分叉会话的继承值只作基线', async () => {
  const dir = tmp();
  jsonl(path.join(dir, '2026', '10', '11', 'rollout-a.jsonl'), [
    turn('gpt-6.1-sol'),
    { timestamp: '2026-10-11T00:00:01Z', type: 'event_msg', payload: { type: 'token_count', info: null } },
    tokenCount('2026-10-11T00:00:02Z', 1000, 400, 50),
    tokenCount('2026-10-11T00:00:03Z', 1000, 400, 50),
    tokenCount('2026-10-11T00:00:04Z', 3000, 2000, 80),
  ]);
  jsonl(path.join(dir, '2026', '10', '11', 'rollout-fork.jsonl'), [
    tokenCount('2026-10-11T01:00:00Z', 3000, 2000, 80),
    turn('gpt-6.1-sol'),
    tokenCount('2026-10-11T01:00:01Z', 3500, 2400, 90),
  ]);
  const byModel = await scanCodex([dir], since);
  assert.deepEqual(byModel, {
    // a: 600 + 400 非缓存输入、2000 缓存、80 输出；fork: 100 非缓存、400 缓存、10 输出
    'gpt-6.1-sol': { input: 1100, output: 90, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 2400 },
  });
});

test('Codex：续接会话第一条只算 last_token_usage，不重复计入历史累计', async () => {
  const dir = tmp();
  jsonl(path.join(dir, 'rollout-resume.jsonl'), [
    turn('gpt-6.1-sol'),
    tokenCount('2026-10-11T02:00:00Z', 900000, 0, 1000, [3000, 2000, 100]),
    tokenCount('2026-10-11T02:00:01Z', 903000, 2000, 1200),
  ]);
  const byModel = await scanCodex([dir], since);
  assert.deepEqual(byModel['gpt-6.1-sol'], { input: 2000, output: 300, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 4000 });
});

test('Codex：统计起点之前的消耗不计入', async () => {
  const dir = tmp();
  jsonl(path.join(dir, 'rollout.jsonl'), [
    turn('gpt-6.1-sol'),
    tokenCount('2026-10-09T23:59:59Z', 1000, 0, 100),
    tokenCount('2026-10-10T00:00:01Z', 1500, 0, 120),
  ]);
  const byModel = await scanCodex([dir], since);
  assert.deepEqual(byModel['gpt-6.1-sol'], { input: 500, output: 20, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0 });
});

test('价格：已知型号按价目表，未知型号按家族估算', () => {
  assert.equal(priceFor('claude-opus-5-5').estimated, false);
  assert.equal(priceFor('claude-haiku-4-5-20251001').id, 'claude-haiku-4-5');
  assert.deepEqual(
    [priceFor('claude-opus-9').id, priceFor('claude-opus-9').estimated],
    ['claude-opus-5-5', true],
  );
  assert.equal(priceFor('gpt-5.6-terra').id, 'gpt-6.1-sol');
  const { usd } = costUSD('claude-opus-5-5', { input: 1e6, output: 1e6, cacheWrite5m: 1e6, cacheWrite1h: 1e6, cacheRead: 1e6 });
  // 4 + 20 + 5 + 8 + 0.2
  assert.equal(Number(usd.toFixed(4)), 37.2);
});

test('scanUsage 汇总两个来源', async () => {
  const claudeDir = tmp();
  const codexDir = tmp();
  jsonl(path.join(claudeDir, 'p', 's.jsonl'), [
    claudeMsg('1', '2026-10-11T00:00:00Z', { input_tokens: 1e6, output_tokens: 0 }),
  ]);
  jsonl(path.join(codexDir, 'r.jsonl'), [turn('gpt-6.1-sol'), tokenCount('2026-10-11T00:00:00Z', 1e6, 0, 0)]);
  const r = await scanUsage({ since, dirs: { claude: [claudeDir], codex: [codexDir] } });
  assert.equal(r.tokens, 2e6);
  assert.equal(r.usd, 6);
  assert.equal(r.estimated, false);
});
