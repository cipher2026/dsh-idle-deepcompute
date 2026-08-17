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

const s = t.newGame();
check('era0', s.era === 0);
check('money=200', Math.abs(s.money - 200) < 1e-9);
check('gtx=1 gen=1 intern=1', s.hardware.gtx === 1 && s.hardware.gen === 1 && s.hardware.intern === 1);
check('poem trained lvl1', s.trained.poem === 1);
let P = t.production(s);
check('net money = 1 - 0.1 wage = 0.9/s', Math.abs(P.money - 0.9) < 1e-9);
check('wages 0.1/s', Math.abs(P.wages - 0.1) < 1e-9);
check('prod flops=1/s', Math.abs(P.flops - 1) < 1e-9);

const mb = s.money; for (let i = 0; i < 10; i++) t.tick(s, 1);
check('tick money +9', Math.abs(s.money - (mb + 9)) < 1e-6);

// 出售算力
s.flops = 1000;
const moneyB = s.money;
check('sell flops->money', t.sellFlops(s, 500, 'money').ok && Math.abs(s.flops - 500) < 1e-9 && Math.abs(s.money - moneyB - 50) < 1e-6);
const rpB = s.rp;
check('sell flops->rp', t.sellFlops(s, 500, 'rp').ok && Math.abs(s.flops) < 1e-9 && Math.abs(s.rp - rpB - 1) < 1e-6);
check('set burn 5', t.setBurn(s, 5).ok && s.burnMul === 5);
check('burn invalid rejected', !t.setBurn(s, 99).ok);
s.burnMul = 2;

// 研究冲刺
s.rp = 100;
check('rush ok', t.rush(s).ok && Math.abs(s.rp - 50) < 1e-9);
check('rush boosts production', Math.abs(t.production(s).money - 1.4) < 1e-6);
s.modifiers = {};

// 工资 / 罢工 / 解雇
const s2 = t.newGame();
s2.money = 0;
s2.hardware.genius = 10; // 工资 10×65×0.5=325/s，远大于收入
const P2 = t.production(s2);
check('strike when broke', P2.striking === true && P2.rp === 0 && P2.money < 0);
check('wages computed', P2.wages > 325);
check('fire reduces wage & ends strike', t.fireStaff(s2, 'genius', 10).ok && (t.production(s2).wages < 0.2) && t.production(s2).striking === false);
t.G = s; // 恢复主存档内部引用（s2 是临时存档）

// 硬件开发与升级（独立存档，避免影响主流程数值）
const s3 = t.newGame();
check('dc locked initially', !t.buy(s3, 'dc', 1).ok);
s3.rp = 5000;
check('develop dc', t.develop(s3, 'dc').ok && s3.hwUnlocked.dc === true);
s3.money = 200000;
check('buy dc after develop', t.buy(s3, 'dc', 1).ok);
const flopsB = t.production(s3).flops;
check('upgrade gtx lv2', t.upgradeHw(s3, 'gtx').ok && s3.hwLevel.gtx === 2);
check('lv2 flops higher', t.production(s3).flops > flopsB);
check('upgrade gtx lv3', t.upgradeHw(s3, 'gtx').ok && s3.hwLevel.gtx === 3);

// 电力设备同样支持开发/升级
check('grid locked', !t.buy(s3, 'grid', 1).ok);
check('develop grid', t.develop(s3, 'grid').ok && s3.hwUnlocked.grid === true);
check('buy grid after develop', t.buy(s3, 'grid', 1).ok);
const capB = t.production(s3).powerCap;
check('upgrade gen lv2', t.upgradeHw(s3, 'gen').ok && s3.hwLevel.gen === 2);
check('lv2 powerCap higher', t.production(s3).powerCap > capB);

// 供电不足时算力打折（10 GTX 需求 1.0MW，供电仅 0.5MW → 算力减半）
const s4 = t.newGame();
s4.hardware.gtx = 10;
const P4 = t.production(s4);
check('power shortage throttles flops', P4.powerFactor < 1 && Math.abs(P4.flops - 5) < 1e-9);
t.G = s; // 恢复主存档

// 购买
t.buy(s, 'gtx', 3);
check('gtx=4', s.hardware.gtx === 4);
P = t.production(s);
check('prod flops=4/s', Math.abs(P.flops - 4) < 1e-9);

// 训练限速 + 槽位
t.train(s, 'classifier');
s.flops = 1e9;
t.tick(s, 1);
const tr0 = s.training.find((x) => x.modelId === 'classifier');
check('training rate-limited', tr0 && tr0.progress > 0 && tr0.progress < 150);
check('slots limit era0=1', !t.train(s, 'chatbot').ok);
const stockBefore = s.flops;
for (let i = 0; i < 10; i++) t.tick(s, 1);
check('stock burns during training', s.flops < stockBefore - 20);
// 灵感注入
s.rp = 100;
const progBefore = s.training[0].progress;
t.inspire(s, 'classifier', 50);
check('inspire adds progress', Math.abs((s.training[0].progress - progBefore) - 5000) < 1);
check('inspire spent rp', Math.abs(s.rp - 50) < 1e-9);
for (let i = 0; i < 80 && !s.trained.classifier; i++) t.tick(s, 1);
check('classifier v1', s.trained.classifier === 1);
check('milestone 0.10', Math.abs(s.milestone - 0.10) < 1e-9);

// 升级 v1→v2
const upg = t.train(s, 'classifier');
check('upgrade start', upg.ok && s.training[0] && Math.abs(s.training[0].cost - 375) < 1);
for (let i = 0; i < 200 && (s.trained.classifier || 0) < 2; i++) { s.flops = 1e9; t.tick(s, 1); }
check('classifier v2', s.trained.classifier === 2);
check('upgrade no milestone', Math.abs(s.milestone - 0.10) < 1e-9);
check('v2 net income (1+16-0.1=16.9)', Math.abs(t.production(s).money - 16.9) < 1e-6);

// 高产出练完时代0
s.hardware.dc = 1000;
s.hardware.plant = 1000;
for (const mid of ['chatbot', 'assistant', 'transformer']) {
  const tr = t.train(s, mid);
  check('train ' + mid + ' start', tr.ok);
  for (let i = 0; i < 60 && !s.trained[mid]; i++) t.tick(s, 1);
  check(mid + ' trained', s.trained[mid] === 1);
}
check('milestone=1', Math.abs(s.milestone - 1) < 1e-9);

// 科技 + 转生
s.rp = 1e9; s.influence = 1e9; s.cosmic = 1e9;
check('research backprop', t.research(s, 'backprop').ok && s.tech.backprop === true);
const pg = t.doPrestige(s);
check('prestige ok', pg.ok);
check('era=1', s.era === 1);
check('pp>0', s.pp > 0);
check('era1 starter', s.trained['llm-base'] === 1);
P = t.production(s);
check('era1 net income (5000-175=4825)', Math.abs(P.money - 4825) < 1e-6);
// 发论文
s.rp = 1000;
const infB = s.influence;
check('paper ok', t.publishPaper(s, 500).ok && Math.abs(s.rp - 500) < 1e-9 && Math.abs(s.influence - infB - 10) < 1e-6);
s.milestone = 1; s.stats.totalFlops = 1e30;
t.doPrestige(s); check('era=2', s.era === 2);
s.milestone = 1; t.doPrestige(s); check('era=3', s.era === 3);
s.milestone = 1; t.doPrestige(s); check('era=4 template', s.era === 4);
P = t.production(s);
check('era4 finite', isFinite(P.money) && isFinite(P.flops) && isFinite(P.cosmic));

let crash = null; for (let i = 0; i < 500; i++) { try { t.triggerEvent(s); } catch (e) { crash = e; break; } }
check('500 events no crash', crash === null);

const mBefore = s.money;
s.lastSeen = Date.now() - 3600 * 1000;
t.offlineCatchup(s);
check('offline money grew', s.money > mBefore);

t.save(s);
const loaded = t.load();
check('save/load roundtrip', loaded && loaded.era === s.era && loaded.pp === s.pp && loaded.burnMul === s.burnMul);

s.pp = 100;
check('shop autotrain', t.buyShop(s, 'autotrain').ok && s.shop.autotrain === 1);

console.log(JSON.stringify({ passed: results.filter((r) => r.pass).length, total: results.length, fails: results.filter((r) => !r.pass) }, null, 2));
process.exit(results.some((r) => !r.pass) ? 1 : 0);
