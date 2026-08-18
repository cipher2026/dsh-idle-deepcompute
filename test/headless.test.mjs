import fs from 'node:fs';
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };

const code = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');
const captured = {};
const fakeWindow = { __DC_TEST__: true, __ModuleLoader__: { load: ({ id, factory }) => { const mod = { exports: {} }; const ex = factory((n) => { throw new Error('unexpected require: ' + n); }); captured.id = id; captured.exports = ex; } } };
new Function('window', code)(fakeWindow);
const t = captured.exports.__test;
const results = [];
function check(n, c) { results.push({ name: n, pass: !!c }); if (!c) console.error('FAIL:', n); }

// 新档
const s = t.newGame();
check('era0 start', s.era === 0);
check('money=200', Math.abs(s.money - 200) < 1e-9);
check('gtx/gen/intern=1', s.hardware.gtx === 1 && s.hardware.gen === 1 && s.hardware.intern === 1);
check('poem deployed', s.trained.poem === 1);
let P = t.production(s);
check('net money 0.9/s', Math.abs(P.money - 0.9) < 1e-9);
check('net flops 0.95/s', Math.abs(P.flops - 0.95) < 1e-9);
check('wages 0.1/s', Math.abs(P.wages - 0.1) < 1e-9);

const mb = s.money; for (let i = 0; i < 10; i++) t.tick(s, 1);
check('tick money +9', Math.abs(s.money - (mb + 9)) < 1e-6);

// 出售算力 / burn / rush
s.flops = 1000;
const moneyB = s.money;
check('sell flops->money', t.sellFlops(s, 500, 'money').ok && Math.abs(s.flops - 500) < 1e-9 && Math.abs(s.money - moneyB - 50) < 1e-6);
const rpB = s.rp;
check('sell flops->rp', t.sellFlops(s, 500, 'rp').ok && Math.abs(s.flops) < 1e-9 && Math.abs(s.rp - rpB - 1) < 1e-6);
check('burn set', t.setBurn(s, 5).ok && s.burnMul === 5 && !t.setBurn(s, 99).ok); s.burnMul = 2;
s.rp = 100;
check('rush', t.rush(s).ok && Math.abs(s.rp - 50) < 1e-9); s.modifiers = {};

// 工资/罢工/解雇
const s2 = t.newGame();
s2.money = 0; s2.hardware.genius = 10;
const P2 = t.production(s2);
check('strike', P2.striking === true && P2.rp === 0 && P2.money < 0);
check('wages computed', P2.wages > 0);
check('fire ends strike', t.fireStaff(s2, 'genius', 10).ok && t.production(s2).striking === false);
t.G = s;

// 硬件开发/升级
const s3 = t.newGame();
check('dc locked', !t.buy(s3, 'dc', 1).ok);
s3.rp = 5000;
check('develop dc', t.develop(s3, 'dc').ok && s3.hwUnlocked.dc === true);
s3.money = 200000;
check('buy dc after develop', t.buy(s3, 'dc', 1).ok);
const flopsB = t.production(s3).flops;
check('upgrade gtx lv2', t.upgradeHw(s3, 'gtx').ok && s3.hwLevel.gtx === 2);
check('lv2 flops higher', t.production(s3).flops > flopsB);
check('grid locked', !t.buy(s3, 'grid', 1).ok);
check('develop grid', t.develop(s3, 'grid').ok && s3.hwUnlocked.grid === true);
const capB = t.production(s3).powerCap;
check('upgrade gen lv2', t.upgradeHw(s3, 'gen').ok && s3.hwLevel.gen === 2);
check('lv2 powerCap higher', t.production(s3).powerCap > capB);
t.G = s;

// 供电不足 + 推理消耗
const s4 = t.newGame(); s4.hardware.gtx = 10;
const P4 = t.production(s4);
check('power shortage throttles', P4.powerFactor < 1 && Math.abs(P4.flops - 4.95) < 1e-9);
check('inference demand', Math.abs(P4.inferDemand - 0.05) < 1e-9);
const s5 = t.newGame(); s5.trained.transformer = 1;
const P5 = t.production(s5);
check('inference throttles income', P5.inferFactor < 1 && P5.flops === 0);
t.G = s;

// 模型顺序解锁
check('frontier is classifier', t.frontierModel(s).id === 'classifier');
check('train classifier ok', t.train(s, 'classifier').ok);
check('chatbot locked', !t.train(s, 'chatbot').ok);
s.flops = 1e9; s.rp = 100;
for (let i = 0; i < 120 && !s.trained.classifier; i++) { s.flops = 1e9; t.tick(s, 1); }
check('classifier v1', s.trained.classifier === 1);
check('milestone 0.25', Math.abs(s.milestone - 0.25) < 1e-9);
check('frontier is chatbot', t.frontierModel(s).id === 'chatbot');

// 补足硬件，快速推进后续训练
s.hardware.dc = 1000; s.hardware.plant = 1000; s.rp = 1e9;

// 升级 v2
const upg = t.train(s, 'classifier');
check('upgrade start', upg.ok);
for (let i = 0; i < 200 && (s.trained.classifier || 0) < 2; i++) { s.flops = 1e9; t.tick(s, 1); }
check('classifier v2', s.trained.classifier === 2);
check('upgrade no milestone', Math.abs(s.milestone - 0.25) < 1e-9);

// 快速练到 transformer（里程碑 100%）
s.hardware.dc = 10000; s.hardware.plant = 10000; s.rp = 1e9;
for (const mid of ['chatbot', 'assistant', 'transformer']) {
  check('frontier ' + mid, t.frontierModel(s).id === mid);
  const tr = t.train(s, mid);
  check('train ' + mid + ' ok', tr.ok);
  for (let i = 0; i < 200 && !s.trained[mid]; i++) { s.flops = 1e9; t.tick(s, 1); }
  check(mid + ' trained', s.trained[mid] === 1);
}
check('milestone=1', Math.abs(s.milestone - 1) < 1e-9);
check('era still 0', t.eraIndex(s) === 0);

// 科技
s.rp = 1e9; s.influence = 1e9; s.cosmic = 1e9;
check('research backprop', t.research(s, 'backprop').ok && s.tech.backprop === true);

// 转生：回到起点
const pg = t.doPrestige(s);
check('prestige ok', pg.ok);
check('era reset 0', s.era === 0);
check('pp>0', s.pp > 0);
check('poem redeployed', s.trained.poem === 1 && !s.trained.transformer);
check('gtx back to 1', s.hardware.gtx === 1);
check('hwUnlocked reset', !s.hwUnlocked.dc);
check('tech kept', s.tech.backprop === true);

// 深推：练到 multimodal（时代1 + 影响力）
s.hardware.dc = 1000000; s.hardware.plant = 1000000; s.rp = 1e12;
for (const mid of ['classifier', 'chatbot', 'assistant', 'transformer', 'multimodal']) {
  const tr = t.train(s, mid);
  check('push ' + mid, tr.ok);
  for (let i = 0; i < 300 && !s.trained[mid]; i++) { s.flops = 1e20; t.tick(s, 1); }
  check(mid + ' trained (push)', s.trained[mid] === 1);
}
check('era index 1', t.eraIndex(s) === 1);
check('influence produced', t.production(s).influence > 0);

// 事件
let crash = null; for (let i = 0; i < 500; i++) { try { t.triggerEvent(s); } catch (e) { crash = e; break; } }
check('500 events no crash', crash === null);

// 离线
const mB = s.money; s.lastSeen = Date.now() - 3600 * 1000; t.offlineCatchup(s);
check('offline money grew', s.money > mB);

// 存取档（v2）
t.save(s);
const loaded = t.load();
check('save/load roundtrip', loaded && loaded.v === 2 && loaded.era === s.era && loaded.pp === s.pp);

// 范式商店
s.pp = 100;
check('shop autotrain', t.buyShop(s, 'autotrain').ok && s.shop.autotrain === 1);

console.log(JSON.stringify({ passed: results.filter((r) => r.pass).length, total: results.length, fails: results.filter((r) => !r.pass) }, null, 2));
process.exit(results.some((r) => !r.pass) ? 1 : 0);
