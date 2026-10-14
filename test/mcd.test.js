import test from 'node:test';
import assert from 'node:assert/strict';
import { McdClient, extractJson, normalizeMeals, parseSse, pickItem } from '../src/mcd.js';

// 模拟麦当劳 MCP：工具返回「说明文字 + 业务 JSON」，用 SSE 回包
function fakeServer(tools) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ body, headers: init.headers });
    const headers = new Map([['content-type', 'text/event-stream'], ['mcp-session-id', 'sess-1']]);
    const res = (payload, status = 200) => ({
      status,
      ok: status < 400,
      headers: { get: (k) => headers.get(k.toLowerCase()) ?? null },
      text: async () => `event: message\ndata: ${JSON.stringify(payload)}\n\n`,
    });
    if (body.method === 'initialize') return res({ jsonrpc: '2.0', id: body.id, result: { capabilities: {} } });
    if (body.method === 'notifications/initialized') return res({}, 202);
    const handler = tools[body.params.name];
    const data = handler(body.params.arguments);
    const text = `## 结果说明\n字段 {productCode} 为餐品编码\n${JSON.stringify(data)}`;
    return res({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text }] } });
  };
  return { fetchImpl, calls };
}

const tools = {
  'query-nearby-stores': () => ({
    success: true,
    data: [{ storeCode: '1450001', storeName: '麦当劳科技园餐厅', address: '深圳市南山区', distance: 120 }],
  }),
  'query-meals': () => ({
    success: true,
    data: {
      meals: {
        900001: { name: '巨无霸套餐', currentPrice: '35' },
        100001: { name: '巨无霸', currentPrice: '25' },
        100002: { name: '双层巨无霸', currentPrice: '30' },
      },
    },
  }),
  'calculate-price': (args) => ({
    success: true,
    data: { price: 2290, originalPrice: 2500, productList: [{ productCode: args.items[0].productCode, subtotal: 2290 }], takeWayList: [{ code: 'eat-in' }] },
  }),
  'query-store-coupons': () => ({ success: true, data: { coupons: [{ couponId: 'a' }, { couponId: 'b' }] } }),
  'create-order': () => ({ success: true, data: { orderId: 'O123', payInfo: { payH5Url: 'https://pay.example/x' } } }),
};

test('完整链路：找门店 → 取菜单 → 官方核价 → 门店券 → 待支付订单', async () => {
  const { fetchImpl, calls } = fakeServer(tools);
  const c = new McdClient({ token: 't', fetchImpl });
  const store = await c.findStore({ city: '深圳', keyword: '科技园' });
  assert.equal(store.storeCode, '1450001');
  const item = await c.findItem(store, '巨无霸');
  assert.deepEqual(item, { code: '100001', name: '巨无霸' });
  const price = await c.priceItem(store, item);
  assert.equal(price.fen, 2290);
  assert.equal(await c.countCoupons(store), 2);
  const order = await c.createOrder(store, item, price.takeWays[0].code);
  assert.deepEqual([order.orderId, order.payUrl], ['O123', 'https://pay.example/x']);

  const toolCalls = calls.filter((x) => x.body.method === 'tools/call').map((x) => x.body.params);
  assert.deepEqual(toolCalls[0].arguments, { searchType: 2, beType: 1, city: '深圳', keyword: '科技园' });
  assert.deepEqual(toolCalls[2].arguments, {
    storeCode: '1450001', orderType: 1, beType: 1, items: [{ productCode: '100001', quantity: 1 }],
  });
  assert.equal(toolCalls[4].arguments.takeWayCode, 'eat-in');
  // 初始化后每次请求都带会话 ID 和 Token
  assert.ok(calls.slice(1).every((x) => x.headers['Mcp-Session-Id'] === 'sess-1'));
  assert.ok(calls.every((x) => x.headers.Authorization === 'Bearer t'));
  assert.equal(calls.filter((x) => x.body.method === 'initialize').length, 1);
});

test('业务失败与 401 会抛出可读错误', async () => {
  const failing = fakeServer({ 'query-nearby-stores': () => ({ success: false, message: '城市不支持' }) });
  await assert.rejects(new McdClient({ token: 't', fetchImpl: failing.fetchImpl }).findStore({ city: 'x', keyword: 'y' }), /城市不支持/);

  const unauthorized = async () => ({ status: 401, ok: false, headers: { get: () => null }, text: async () => '' });
  await assert.rejects(new McdClient({ token: 'bad', fetchImpl: unauthorized }).listTools(), /401/);
  assert.throws(() => new McdClient({}), /MCD_MCP_TOKEN/);
});

test('extractJson 跳过正文里的占位花括号', () => {
  const text = '说明 {storeCode} 是门店编码 {"success":true,"data":{"a":"}"}} 结尾';
  assert.deepEqual(extractJson(text), { success: true, data: { a: '}' } });
  assert.equal(extractJson('没有 JSON'), null);
});

test('parseSse 解析多事件并忽略心跳', () => {
  const msgs = parseSse('event: ping\ndata: hi\n\nevent: message\ndata: {"id":2}\n\n');
  assert.deepEqual(msgs, [{ id: 2 }]);
});

test('pickItem 默认选单品，关键词含套餐时选套餐', () => {
  const items = normalizeMeals({ meals: [{ productCode: '1', name: '巨无霸套餐' }, { productCode: '2', name: '巨无霸' }] });
  assert.equal(pickItem(items, '巨无霸').code, '2');
  assert.equal(pickItem(items, '巨无霸套餐').code, '1');
  assert.equal(pickItem(items, '麦旋风'), null);
});
