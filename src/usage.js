import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { costUSD } from './pricing.js';

const emptyTokens = () => ({ input: 0, output: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0 });

function addTokens(a, b) {
  for (const k of Object.keys(a)) a[k] += b[k] || 0;
  return a;
}

export const totalTokens = (t) => t.input + t.output + t.cacheWrite5m + t.cacheWrite1h + t.cacheRead;

export function defaultDirs(env = process.env, home = os.homedir()) {
  const claude = env.CLAUDE_CONFIG_DIR
    ? env.CLAUDE_CONFIG_DIR.split(',').map((d) => path.join(d.trim(), 'projects'))
    : [path.join(home, '.claude', 'projects'), path.join(home, '.config', 'claude', 'projects')];
  const codexHome = env.CODEX_HOME || path.join(home, '.codex');
  return {
    claude,
    codex: [path.join(codexHome, 'sessions'), path.join(codexHome, 'archived_sessions')],
  };
}

async function* walkJsonl(dir, since) {
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkJsonl(p, since);
    } else if (e.name.endsWith('.jsonl')) {
      // 最后修改早于统计起点的文件不可能包含区间内的记录
      const { mtimeMs } = await fs.promises.stat(p);
      if (mtimeMs >= since.getTime()) yield p;
    }
  }
}

async function eachLine(file, onLine) {
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) onLine(line);
}

function bucket(map, model) {
  if (!map[model]) map[model] = emptyTokens();
  return map[model];
}

export async function scanClaude(dirs, since) {
  const byModel = {};
  const seen = new Set();
  for (const dir of dirs) {
    for await (const file of walkJsonl(dir, since)) {
      await eachLine(file, (line) => {
        if (!line.includes('"usage"')) return;
        let d;
        try {
          d = JSON.parse(line);
        } catch {
          return;
        }
        const msg = d.message;
        const u = msg?.usage;
        if (d.type !== 'assistant' || !u || !msg.model || msg.model === '<synthetic>') return;
        if (new Date(d.timestamp) < since) return;
        // 同一条回复会按内容块拆成多行，用 message.id + requestId 去重
        const key = `${msg.id}:${d.requestId}`;
        if (seen.has(key)) return;
        seen.add(key);
        const cc = u.cache_creation;
        const write = u.cache_creation_input_tokens || 0;
        const write1h = cc ? cc.ephemeral_1h_input_tokens || 0 : 0;
        addTokens(bucket(byModel, msg.model), {
          input: u.input_tokens || 0,
          output: u.output_tokens || 0,
          cacheWrite1h: write1h,
          cacheWrite5m: write - write1h,
          cacheRead: u.cache_read_input_tokens || 0,
        });
      });
    }
  }
  return byModel;
}

export async function scanCodex(dirs, since) {
  const byModel = {};
  for (const dir of dirs) {
    for await (const file of walkJsonl(dir, since)) {
      let model = null;
      let prev = null;
      await eachLine(file, (line) => {
        const isCtx = line.includes('"turn_context"');
        if (!isCtx && !line.includes('"token_count"')) return;
        let d;
        try {
          d = JSON.parse(line);
        } catch {
          return;
        }
        if (d.type === 'turn_context') {
          if (d.payload?.model) model = d.payload.model;
          return;
        }
        const cur = d.payload?.info?.total_token_usage;
        if (d.payload?.type !== 'token_count' || !cur) return;
        // total_token_usage 是会话累计值，取相邻两次的差作为本次消耗，重复事件差值为 0。
        // 续接/分叉的会话文件里第一条累计值包含之前的历史，只能取它的 last_token_usage。
        const last = d.payload.info.last_token_usage || cur;
        const first = !prev || cur.total_tokens < prev.total_tokens;
        const delta = (k) => (first ? last[k] || 0 : (cur[k] || 0) - (prev[k] || 0));
        const cached = delta('cached_input_tokens');
        const written = delta('cache_write_input_tokens');
        const used = {
          input: Math.max(0, delta('input_tokens') - cached - written),
          output: delta('output_tokens'),
          cacheWrite5m: written,
          cacheRead: cached,
        };
        prev = cur;
        // 分叉会话开头会带上父会话的累计值，第一个 turn_context 之前的只作为基线
        if (!model || new Date(d.timestamp) < since) return;
        addTokens(bucket(byModel, model), used);
      });
    }
  }
  return byModel;
}

function summarize(byModel) {
  const models = Object.entries(byModel)
    .map(([model, tokens]) => ({ model, tokens, total: totalTokens(tokens), ...costUSD(model, tokens) }))
    .filter((m) => m.total > 0)
    .sort((a, b) => b.usd - a.usd);
  return {
    models,
    tokens: models.reduce((s, m) => s + m.total, 0),
    usd: models.reduce((s, m) => s + m.usd, 0),
    estimated: models.some((m) => m.estimated),
  };
}

export async function scanUsage({ since, dirs = defaultDirs() }) {
  const [claude, codex] = await Promise.all([scanClaude(dirs.claude, since), scanCodex(dirs.codex, since)]);
  const sources = { claude: summarize(claude), codex: summarize(codex) };
  return {
    since,
    sources,
    tokens: sources.claude.tokens + sources.codex.tokens,
    usd: sources.claude.usd + sources.codex.usd,
    estimated: sources.claude.estimated || sources.codex.estimated,
  };
}
