// 麦当劳 MCP（Streamable HTTP + JSON-RPC 2.0）最小客户端，只用到本项目需要的工具。
// 官方文档：https://github.com/M-China/mcd-mcp-server

export const MCD_MCP_URL = 'https://mcp.mcd.cn';
const PROTOCOL_VERSION = '2025-06-18';

// 到店自取：orderType 1 / beType 1（beType 1 门店不返回 beCode）
const PICKUP = { orderType: 1, beType: 1 };

export class McdClient {
  constructor({ token, url = MCD_MCP_URL, fetchImpl = globalThis.fetch } = {}) {
    if (!token) throw new Error('缺少 MCD_MCP_TOKEN');
    this.token = token;
    this.url = url;
    this.fetch = fetchImpl;
    this.sessionId = null;
    this.nextId = 1;
    this.ready = null;
  }

  async rpc(method, params, { notify = false } = {}) {
    const body = { jsonrpc: '2.0', method, ...(params && { params }) };
    if (!notify) body.id = this.nextId++;
    const headers = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': PROTOCOL_VERSION,
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;
    const res = await this.fetch(this.url, { method: 'POST', headers, body: JSON.stringify(body) });
    const sid = res.headers.get('mcp-session-id');
    if (sid) this.sessionId = sid;
    if (res.status === 401) throw new Error('麦当劳 MCP 返回 401：Token 缺失、无效或已过期');
    if (res.status === 429) throw new Error('麦当劳 MCP 返回 429：请求过于频繁，请稍后再试');
    if (!res.ok) throw new Error(`麦当劳 MCP 请求失败：HTTP ${res.status}`);
    if (notify) return null;
    const text = await res.text();
    const msg = (res.headers.get('content-type') || '').includes('text/event-stream')
      ? parseSse(text).find((m) => m.id === body.id)
      : JSON.parse(text);
    if (!msg) throw new Error(`麦当劳 MCP 没有返回 ${method} 的结果`);
    if (msg.error) throw new Error(`麦当劳 MCP 错误：${msg.error.message}`);
    return msg.result;
  }

  init() {
    this.ready ??= (async () => {
      await this.rpc('initialize', {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'mcd-token-burger', version: '0.1.0' },
      });
      await this.rpc('notifications/initialized', undefined, { notify: true });
    })();
    return this.ready;
  }

  async listTools() {
    await this.init();
    return (await this.rpc('tools/list', {})).tools;
  }

  // 返回业务 JSON 里的 data；success 为 false 或调用出错时抛错
  async call(name, args = {}) {
    await this.init();
    const result = await this.rpc('tools/call', { name, arguments: args });
    const text = (result.content || []).map((c) => c.text || '').join('');
    if (result.isError) throw new Error(`${name} 调用失败：${text.slice(0, 200)}`);
    const payload = result.structuredContent ?? extractJson(text);
    if (!payload) throw new Error(`${name} 返回内容无法解析：${text.slice(0, 200)}`);
    if (payload.success === false) {
      throw new Error(`${name} 调用失败：${payload.message || payload.msg || JSON.stringify(payload).slice(0, 200)}`);
    }
    return 'data' in payload ? payload.data : payload;
  }

  async findStore({ city, keyword }) {
    const data = await this.call('query-nearby-stores', { searchType: 2, beType: 1, city, keyword });
    const stores = asList(data, ['stores', 'storeList', 'list']);
    if (!stores.length) throw new Error(`在「${city} ${keyword}」附近没有找到可到店自取的麦当劳`);
    const s = stores[0];
    return {
      storeCode: s.storeCode,
      name: s.storeName || s.name,
      address: s.address,
      distance: s.distance,
      slots: s.reservation ? parseSlots(s.reservationTimeOptions) : [],
    };
  }

  // 早餐时段菜单里没有巨无霸，打烊后 query-meals 直接报错，这两种情况都改查最近一个非早餐的预约时段
  async findItem(store, keyword) {
    let closed = null;
    const data = await this.call('query-meals', { storeCode: store.storeCode, ...PICKUP }).catch((err) => {
      closed = err;
      return null;
    });
    const item = data && pickItem(normalizeMeals(data), keyword);
    if (item) return item;
    const slot = (store.slots || []).find((x) => x.period !== '早餐');
    if (slot) {
      const later = await this.call('query-meals', { storeCode: store.storeCode, ...PICKUP, reservationDate: slot.time });
      const found = pickItem(normalizeMeals(later), keyword);
      if (found) return { ...found, reservation: slot };
    }
    throw closed || new Error(`「${store.name}」当前菜单里没有包含「${keyword}」的餐品`);
  }

  // calculate-price 是官方核价，金额单位为分，已含门店自动优惠
  async priceItem(store, item) {
    const data = await this.call('calculate-price', {
      storeCode: store.storeCode,
      ...PICKUP,
      ...(item.reservation && { reservationDate: item.reservation.time }),
      items: [{ productCode: item.code, quantity: 1 }],
    });
    const fen = Number(data.price);
    if (!Number.isFinite(fen) || fen <= 0) throw new Error(`「${item.name}」核价结果异常：${JSON.stringify(data).slice(0, 200)}`);
    return { fen, originalFen: Number(data.originalPrice) || null, takeWays: data.takeWayList || [] };
  }

  async countCoupons(store) {
    const data = await this.call('query-store-coupons', { storeCode: store.storeCode, ...PICKUP });
    return asList(data, ['coupons', 'couponList', 'list']).length;
  }

  // 只创建待支付订单并返回支付链接，不会自动付款
  async createOrder(store, item, takeWayCode) {
    const data = await this.call('create-order', {
      storeCode: store.storeCode,
      ...PICKUP,
      ...(item.reservation && { reservationDate: item.reservation.time }),
      takeWayCode,
      items: [{ productCode: item.code, quantity: 1 }],
    });
    return { orderId: data.orderId || data.orderNo || null, payUrl: findUrl(data), raw: data };
  }
}

export function parseSse(text) {
  const out = [];
  for (const block of text.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trimStart())
      .join('\n');
    if (!data) continue;
    try {
      out.push(JSON.parse(data));
    } catch {
      // 忽略非 JSON 的心跳等事件
    }
  }
  return out;
}

// 工具返回是「说明文字 + 业务 JSON」，正文里可能有 {字段名} 之类的占位花括号，
// 所以从每个 { 尝试解析，取第一个带 success 字段的对象。
export function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    // 继续逐个位置尝试
  }
  for (let i = text.indexOf('{'); i >= 0; i = text.indexOf('{', i + 1)) {
    const obj = parseObjectAt(text, i);
    if (obj && typeof obj === 'object' && 'success' in obj) return obj;
  }
  return null;
}

function parseObjectAt(text, start) {
  let depth = 0;
  let inStr = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === '\\') i++;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

// 「午餐(10:44至14:15)，下午茶(14:44至16:45)」→ [{ date, period, time: 'yyyy-MM-dd HH:mm' }]，按时间先后
export function parseSlots(options = []) {
  const slots = [];
  for (const o of options || []) {
    for (const m of String(o.reservationOptionText || '').matchAll(/([^，,(（\s]+)[(（](\d{2}:\d{2})至(\d{2}:\d{2})[)）]/g)) {
      slots.push({ date: o.date, period: m[1], time: `${o.date} ${m[2]}` });
    }
  }
  return slots.sort((a, b) => a.time.localeCompare(b.time));
}

function asList(data, keys) {
  if (Array.isArray(data)) return data;
  for (const k of keys) if (Array.isArray(data?.[k])) return data[k];
  return [];
}

// query-meals 的 data.meals 是以 productCode 为键的对象，也兼容数组形式
export function normalizeMeals(data) {
  const meals = data?.meals ?? data;
  const entries = Array.isArray(meals)
    ? meals.map((m) => [m.productCode || m.code, m])
    : Object.entries(meals || {});
  return entries
    .filter(([, m]) => m && typeof m === 'object')
    .map(([code, m]) => ({ code: String(m.productCode || m.code || code), name: String(m.name || m.productName || '') }))
    .filter((m) => m.code && m.name);
}

// 菜单名和习惯叫法常差一两个字（「麦辣鸡腿堡」在菜单上叫「麦辣鸡腿汉堡」），所以按字的先后顺序匹配。
// 排序：优先单品（不含套餐/件套），其次名字直接包含关键词，最后取名字最短的
export function pickItem(items, keyword) {
  const wantsCombo = /套餐|件套/.test(keyword);
  const inOrder = (name) => {
    let i = 0;
    for (const ch of name) if (ch === keyword[i]) i++;
    return i === keyword.length;
  };
  const hits = items.filter((m) => m.name.includes(keyword) || inOrder(m.name));
  const score = (m) =>
    (!wantsCombo && /套餐|件套/.test(m.name) ? 1000 : 0) + (m.name.includes(keyword) ? 0 : 100) + m.name.length;
  return hits.sort((a, b) => score(a) - score(b))[0] || null;
}

function findUrl(obj) {
  if (typeof obj === 'string') return /^https?:\/\//.test(obj) ? obj : null;
  if (obj && typeof obj === 'object') {
    for (const v of Object.values(obj)) {
      const url = findUrl(v);
      if (url) return url;
    }
  }
  return null;
}
