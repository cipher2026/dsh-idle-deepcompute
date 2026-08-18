window.__ModuleLoader__.load({
  id: "dsh-deepcompute",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    'use strict';

    // ==================== 常量 ====================
    var SAVE_KEY = 'deepcompute.save.v1';
    var VERSION = 1;
    var TICK_MS = 1000;
    var SAVE_INTERVAL_MS = 10000;
    var OFFLINE_CAP_MS = 8 * 3600 * 1000;
    var OFFLINE_EFF = 0.5;
    var TRAIN_BURN = 2;
    var UPG_COST = 2.5;
    var UPG_INCOME = 2;
    var STAFF_WAGE = 0.5;
    var SELL_MONEY = 0.1;
    var SELL_RP = 0.002;
    var BURN_DEFAULT = 2;
    var BURN_MIN = 1;
    var BURN_MAX = 20;
    var RUSH_COST = 50;
    var RUSH_DURATION = 90;
    var RUSH_MULT = 1.5;
    var INSPIRE_RATE = 100;
    var PAPER_RATE = 0.02;
    var HW_UPG_EFFECT = 1.5;
    var HW_UPG_COST = 2.5;
    var INFER_FLOP_PER_INCOME = 0.05;
    var EVENT_MIN_MS = 120000;
    var EVENT_MAX_MS = 300000;
    var LOG_MAX = 300;

    // ==================== 工具函数 ====================
    function fmt(n) {
      if (n == null || isNaN(n)) return '0';
      if (!isFinite(n)) return 'inf';
      var neg = n < 0; n = Math.abs(n);
      if (n === 0) return '0';
      if (n < 1000) {
        var s = n < 10 ? n.toFixed(1) : (n < 100 ? n.toFixed(0) : Math.floor(n).toString());
        if (s.indexOf('.') >= 0) s = s.replace(/\.?0+$/, '');
        return (neg ? '-' : '') + s;
      }
      var exp = Math.floor(Math.log10(n));
      var mant = n / Math.pow(10, exp);
      var m = mant.toFixed(2).replace(/\.?0+$/, '');
      return (neg ? '-' : '') + m + 'e' + exp;
    }
    function fmtInt(n) { n = Math.floor(n || 0); return n.toLocaleString('en-US'); }
    function rnd(min, max) { return min + Math.random() * (max - min); }
    function nowTs() { return Date.now(); }
    function h(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }

    // ==================== 全局状态 ====================
    var G = null;

    function save() {
      try { G.lastSeen = nowTs(); localStorage.setItem(SAVE_KEY, JSON.stringify(G)); }
      catch (e) { console.warn('[deepcompute] save failed', e); }
    }
    function load() {
      try {
        var raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        var s = JSON.parse(raw);
        if (s && s.v === VERSION) {
          if (s.burnMul === undefined) s.burnMul = BURN_DEFAULT;
          for (var k in s.trained) if (s.trained[k] === true) s.trained[k] = 1;
          if (s.hwUnlocked === undefined) s.hwUnlocked = {};
          if (s.hwLevel === undefined) s.hwLevel = {};
          for (var hid in s.hardware) if (s.hardware[hid] > 0) s.hwUnlocked[hid] = true;
          return s;
        }
      } catch (e) { console.warn('[deepcompute] load failed', e); }
      return null;
    }
    function newGame() {
      var s = {
        v: VERSION,
        createdAt: nowTs(),
        lastSeen: nowTs(),
        era: 0,
        money: 0,
        flops: 0,
        rp: 0,
        influence: 0,
        cosmic: 0,
        hardware: {},
        hwUnlocked: {},
        hwLevel: {},
        trained: {},
        training: [],
        tech: {},
        shop: {},
        modifiers: {},
        milestone: 0,
        pp: 0,
        prestigeCount: 0,
        stats: { totalFlops: 0, totalMoney: 0 },
        lastEventAt: nowTs(),
        autoTrain: false,
        burnMul: BURN_DEFAULT,
        log: [],
      };
      G = s;
      enterEra(s, 0, true);
      return s;
    }
    function hardReset() {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      G = newGame();
      pushLog('已重置。欢迎来到深算实验室。');
      render();
    }


    // ==================== 数据表 ====================
    var ERAS = [
      {
        id: 0, name: '神经网络时代', goal: '让机器学会说话',
        intro: '老板：能不能搞个 ChatGPT 平替？你打开终端，敲下第一行代码。',
        hardware: [
          { id: 'gtx', name: 'GTX 显卡', cost: 50, flops: 1, power: 0.1, unlock: 0, grow: 1.15, desc: '矿老板同款' },
          { id: 'server', name: '服务器机架', cost: 1800, flops: 45, power: 2, unlock: 50, grow: 1.15, desc: '机房里的铁疙瘩' },
          { id: 'dc', name: '小型数据中心', cost: 90000, flops: 1600, power: 60, unlock: 2000, grow: 1.15, desc: '嗡嗡作响的算力仓库' },
        ],
        power: [
          { id: 'gen', name: '柴油发电机', cost: 30, power: 0.5, unlock: 0, grow: 1.15, desc: '噪音与希望的来源' },
          { id: 'grid', name: '电网接入', cost: 450, power: 8, unlock: 30, grow: 1.15, desc: '稳定但有限' },
          { id: 'plant', name: '小型电站', cost: 13000, power: 220, unlock: 1200, grow: 1.15, desc: '专属供电，告别跳闸' },
        ],
        staff: [
          { id: 'intern', name: '实习生', cost: 90, rp: 0.2, grow: 1.15, desc: '便宜，但会问奇怪问题' },
          { id: 'researcher', name: '研究员', cost: 1500, rp: 3, grow: 1.15, desc: '中坚力量' },
          { id: 'genius', name: '天才科学家', cost: 32000, rp: 65, grow: 1.15, desc: '人类高质量炼丹师' },
        ],
        models: [
          { id: 'poem', name: '写诗机器人 v1', income: 1, starter: true, desc: '开局赠品，会写打油诗' },
          { id: 'classifier', name: '图片分类器', flops: 150, income: 8, rp: 12, milestone: 0.10, desc: '猫狗都能认' },
          { id: 'chatbot', name: '聊天助手 ChatBot-G', flops: 8000, income: 150, rp: 60, milestone: 0.15, desc: '老板说：能聊天就行' },
          { id: 'assistant', name: '通用助手', flops: 400000, income: 5000, rp: 300, milestone: 0.25, desc: '真正能干活了' },
          { id: 'transformer', name: 'Transformer 终极模型', flops: 12000000, income: 150000, rp: 1500, milestone: 0.50, desc: '本时代终点：让机器学会说话' },
        ],
      },
      {
        id: 1, name: '大模型时代', goal: '突破推理的边界',
        intro: '行业都说大模型是烧卡，你偏要烧出个未来。影响力成了新的硬通货。',
        hardware: [
          { id: 'tpu', name: 'TPU 阵列', cost: 3000000, flops: 900, power: 25, unlock: 0, grow: 1.15, desc: '定制硅片的咆哮' },
          { id: 'super', name: '超算中心', cost: 90000000, flops: 32000, power: 900, unlock: 40000, grow: 1.15, desc: '国家级算力' },
        ],
        power: [
          { id: 'fusion', name: '聚变反应堆', cost: 5000000, power: 700, unlock: 0, grow: 1.15, desc: '人造太阳，限量供应' },
          { id: 'solar', name: '轨道太阳能阵列', cost: 200000000, power: 30000, unlock: 30000, grow: 1.15, desc: '把太阳绑来打工' },
        ],
        staff: [
          { id: 'senior', name: '高级研究员', cost: 200000, rp: 350, grow: 1.15, desc: '发过顶会的人' },
          { id: 'chief', name: '首席科学家', cost: 8000000, rp: 8000, grow: 1.15, desc: '自带光环' },
        ],
        models: [
          { id: 'llm-base', name: '基础大模型', income: 5000, starter: true, desc: '新时代的起点' },
          { id: 'multimodal', name: '多模态大模型', flops: 400000000, income: 1200000, rp: 3000, influence: 10, milestone: 0.15, desc: '能看能听能说' },
          { id: 'code', name: '代码大模型', flops: 15000000000, income: 50000000, rp: 12000, influence: 40, milestone: 0.25, desc: '它写的代码比你好' },
          { id: 'reason', name: '推理大模型「R1 型·开源路线」', flops: 500000000000, income: 2000000000, rp: 50000, influence: 150, milestone: 0.60, desc: '本时代终点：突破推理的边界' },
        ],
      },
      {
        id: 2, name: 'AGI 时代', goal: '创造会思考的存在',
        intro: '有人说 AGI 是下一个 ChatGPT 时刻，你决定亲自验证。多实验室并网，意识在硅片上萌发。',
        hardware: [
          { id: 'photonic', name: '光子芯片', cost: 500000000000, flops: 5000000, power: 120, unlock: 0, grow: 1.15, desc: '用光计算，快得不像话' },
          { id: 'neuro', name: '神经形态机', cost: 20000000000000, flops: 200000000, power: 4000, unlock: 8000000, grow: 1.15, desc: '模拟大脑的机器' },
        ],
        power: [
          { id: 'matter', name: '反物质电池', cost: 800000000000, power: 50000, unlock: 0, grow: 1.15, desc: '一滴反物质，点亮一座城' },
          { id: 'dysoncloud', name: '戴森云(小型)', cost: 300000000000000, power: 2500000, unlock: 6000000, grow: 1.15, desc: '把太阳包起来（一部分）' },
        ],
        staff: [
          { id: 'agi-staff', name: '自主研究体(员工)', cost: 300000000000, rp: 400000, grow: 1.15, desc: '它给自己写周报' },
          { id: 'collective', name: '研究集群意识', cost: 10000000000000, rp: 12000000, grow: 1.15, desc: '一群 AGI 一起想' },
        ],
        models: [
          { id: 'agi-base', name: '通用智能体雏形', income: 500000000, starter: true, desc: '会思考的起点' },
          { id: 'agent', name: '通用智能体', flops: 1000000000000000, income: 400000000000, rp: 1000000, influence: 500, milestone: 0.30, desc: '真正意义上的 AGI' },
          { id: 'auto', name: '自主研究体(模型)', flops: 40000000000000000, income: 15000000000000, rp: 3000000, influence: 2000, milestone: 0.70, desc: '本时代终点：创造会思考的存在' },
        ],
      },
      {
        id: 3, name: 'ASI 时代', goal: '点燃神火',
        intro: '超越人类智慧的存在即将诞生。星际算力已经接通，这是最后的攀登。',
        hardware: [
          { id: 'quantum', name: '量子算力核心', cost: 200000000000000000, flops: 30000000000, power: 3000, unlock: 0, grow: 1.15, desc: '叠加态里藏着无限可能' },
          { id: 'dyson', name: '戴森球节点', cost: 8000000000000000000, flops: 1000000000000, power: 100000, cosmic: 0.5, unlock: 2000000000, grow: 1.15, desc: '恒星级的算力' },
        ],
        power: [
          { id: 'singularity', name: '奇点供能', cost: 300000000000000000, power: 5000000, unlock: 0, grow: 1.15, desc: '从奇点里抽能量' },
          { id: 'stellar', name: '恒星级能源', cost: 100000000000000000000, power: 250000000, unlock: 1500000000, grow: 1.15, desc: '驾驭一颗恒星' },
        ],
        staff: [
          { id: 'oracle', name: '先知体', cost: 500000000000000000, rp: 600000000, grow: 1.15, desc: '它知道答案' },
          { id: 'pantheon', name: '神格阵列', cost: 200000000000000000000, rp: 20000000000, grow: 1.15, desc: '众神思考' },
        ],
        models: [
          { id: 'asi-base', name: '神性雏形', income: 500000000000000, starter: true, desc: '凡人无法理解的开端' },
          { id: 'universe', name: '宇宙模拟器', flops: 10000000000000000000000, income: 40000000000000000, rp: 100000000, influence: 8000, cosmic: 100, milestone: 0.30, desc: '在模型里跑一个宇宙' },
          { id: 'god', name: '神级模型', flops: 400000000000000000000000, income: 1500000000000000000, rp: 300000000, influence: 30000, cosmic: 400, milestone: 0.70, desc: '本时代终点：点燃神火' },
        ],
      },
    ];

    // 超出已定义时代的模板（第 5+ 纪元，数值按比例放大）
    function templateEra(n) {
      var scale = Math.pow(10, 4 * (n - 3));
      function sc(x) { return x * scale; }
      return {
        id: n, name: '纪元 ' + (n + 1) + ' 时代', goal: '超越可知的边界',
        intro: '语言已经无法描述这个时代。你继续前行。',
        hardware: [
          { id: 'h' + n + 'a', name: '计算基质 α', cost: sc(2e17), flops: sc(3e10), power: sc(3000), unlock: 0, grow: 1.15, desc: '未知形态的算力' },
          { id: 'h' + n + 'b', name: '计算基质 β', cost: sc(8e18), flops: sc(1e12), power: sc(1e5), cosmic: sc(0.5), unlock: sc(2e9), grow: 1.15, desc: '更深的算力' },
        ],
        power: [
          { id: 'p' + n + 'a', name: '能源奇观 α', cost: sc(3e17), power: sc(5e6), unlock: 0, grow: 1.15, desc: '取之不竭' },
          { id: 'p' + n + 'b', name: '能源奇观 β', cost: sc(1e20), power: sc(2.5e8), unlock: sc(1.5e9), grow: 1.15, desc: '照亮维度' },
        ],
        staff: [
          { id: 's' + n + 'a', name: '思维体 α', cost: sc(5e17), rp: sc(6e8), grow: 1.15, desc: '一个念头' },
          { id: 's' + n + 'b', name: '思维体 β', cost: sc(2e20), rp: sc(2e10), grow: 1.15, desc: '万念归一' },
        ],
        models: [
          { id: 'm' + n + 'base', name: '新纪元雏形', income: sc(5e14), starter: true, desc: '起点' },
          { id: 'm' + n + 'a', name: '新纪元造物 α', flops: sc(1e22), income: sc(4e16), rp: sc(1e8), influence: sc(8000), cosmic: sc(100), milestone: 0.30, desc: '造物' },
          { id: 'm' + n + 'b', name: '新纪元造物 β', flops: sc(4e23), income: sc(1.5e18), rp: sc(3e8), influence: sc(30000), cosmic: sc(400), milestone: 0.70, desc: '终点' },
        ],
      };
    }

    // ==================== 科技树（永久，跨转生保留） ====================
    var TECH = [
      { id: 'backprop', name: '反向传播', desc: '训练速度 +10%', era: 0, rp: 5, eff: { train: 0.10 } },
      { id: 'gpuaccel', name: 'GPU 加速', desc: '算力产出 +10%', era: 0, rp: 20, eff: { flops: 0.10 } },
      { id: 'dataclean', name: '数据清洗', desc: '训练消耗 -10%', era: 0, rp: 60, eff: { cost: -0.10 } },
      { id: 'attention', name: '注意力机制', desc: '模型收入 +15%', era: 0, rp: 200, eff: { income: 0.15 } },
      { id: 'rlhf', name: 'RLHF', desc: '研究员产出 +20%', era: 1, rp: 800, infl: 50, eff: { rp: 0.20 } },
      { id: 'multimodal', name: '多模态', desc: '模型收入 +20%', era: 1, rp: 3000, infl: 200, eff: { income: 0.20 } },
      { id: 'moe', name: '混合专家 MoE', desc: '算力产出 +15%', era: 1, rp: 10000, infl: 800, eff: { flops: 0.15 } },
      { id: 'inference', name: '推理优化', desc: '训练速度 +15%', era: 2, rp: 40000, infl: 3000, eff: { train: 0.15 } },
      { id: 'consciousness', name: '意识伦理', desc: '研究员产出 +25%', era: 2, rp: 120000, infl: 10000, eff: { rp: 0.25 } },
      { id: 'quantum', name: '量子采样', desc: '全部产出 +25%', era: 3, rp: 500000, cosmic: 200000, eff: { all: 0.25 } },
      { id: 'interstellar', name: '星际网络', desc: '星际算力产出 +30%', era: 3, rp: 1500000, cosmic: 600000, eff: { cosmic: 0.30 } },
    ];

    // ==================== 范式商店 ====================
    var SHOP = [
      { id: 'autotrain', name: '自动炼丹', desc: '解锁自动训练开关', cost: 20, max: 1, grow: 1 },
      { id: 'lab2', name: '第二实验室', desc: '+1 并行训练槽', cost: 40, max: 1, grow: 1 },
      { id: 'symbolist', name: '符号主义路线', desc: '研究点产出 +20%', cost: 30, max: 1, grow: 1 },
      { id: 'offline', name: '离线增强', desc: '离线效率 +10%/级', cost: 15, max: 5, grow: 1.6 },
      { id: 'vc', name: '风投网络', desc: '利好事件概率提升', cost: 25, max: 1, grow: 1 },
      { id: 'boost', name: '产出增幅', desc: '全部产出 +5%/级（可重复）', cost: 10, max: Infinity, grow: 1.5 },
      { id: 'bigcomp', name: '大数压缩显示', desc: 'QoL：数字显示更紧凑', cost: 5, max: 1, grow: 1 },
    ];

    // ==================== 随机事件 ====================
    var EVENTS = [
      { id: 'vc', w: 5, era: 0, kind: 'good', text: '风投基金看中了你，注资到账。', apply: function (s) { var g = Math.max(200, production(s).money * 90); s.money += g; return '资金 +' + fmt(g); } },
      { id: 'paper', w: 5, era: 0, kind: 'good', text: '你的论文被顶会接收，实验室名声大噪。', apply: function (s) { var g = Math.max(30, production(s).rp * 120); s.rp += g; return '研究点 +' + fmt(g); } },
      { id: 'gpuSale', w: 4, era: 0, kind: 'good', text: 'GPU 厂商大降价，采购成本骤降。', apply: function (s) { addMod(s, 'gpuSale', 120); return '购买成本 -30%，持续 120 秒'; } },
      { id: 'geniusJoin', w: 3, era: 0, kind: 'good', text: '一位天才研究员慕名加入。', apply: function (s) { var g = Math.max(20, production(s).rp * 180); s.rp += g; return '研究点 +' + fmt(g); } },
      { id: 'blackout', w: 5, era: 0, kind: 'bad', text: '数据中心停电了，算力腰斩。', apply: function (s) { addMod(s, 'blackout', 90); return '算力产出 -50%，持续 90 秒'; } },
      { id: 'fine', w: 5, era: 0, kind: 'bad', text: '监管部门上门，开出一张罚单。', apply: function (s) { var g = Math.max(100, production(s).money * 120); s.money = Math.max(0, s.money - g); return '资金 -' + fmt(g); } },
      { id: 'poach', w: 4, era: 0, kind: 'bad', text: '大厂高薪挖角，你的团队有人心动。', apply: function (s) { loseStaff(s, 0.1); return '失去约 10% 的员工'; } },
      { id: 'leak', w: 3, era: 0, kind: 'bad', text: '训练数据泄露，公关团队忙疯了。', apply: function (s) { if (s.influence > 0) { var g = Math.max(1, s.influence * 0.15); s.influence = Math.max(0, s.influence - g); return '影响力 -' + fmt(g); } else { var g2 = Math.max(20, s.rp * 0.15); s.rp = Math.max(0, s.rp - g2); return '研究点 -' + fmt(g2); } } },
      { id: 'openai', w: 4, era: 0, kind: 'good', text: 'OpenAI 发布会刷屏，AI 板块热度飙升。', apply: function (s) { addMod(s, 'openai', 60); var g = production(s).money * 60; s.money += g; return '收入 +50%（60 秒），资金 +' + fmt(g); } },
      { id: 'deepseek', w: 4, era: 0, kind: 'good', text: 'DeepSeek 开源新模型，全球开发者涌入。', apply: function (s) { var g = Math.max(50, production(s).rp * 300); s.rp += g; return '研究点 +' + fmt(g); } },
      { id: 'hf', w: 3, era: 0, kind: 'good', text: '你的模型登上 Hugging Face 趋势榜。', apply: function (s) { if (s.era >= 1) { var g = 30 + s.era * 30; s.influence += g; return '影响力 +' + fmt(g); } else { var g2 = Math.max(20, production(s).rp * 150); s.rp += g2; return '研究点 +' + fmt(g2); } } },
      { id: 'claude', w: 3, era: 0, kind: 'good', text: 'Claude 带火长上下文，你趁机发论文。', apply: function (s) { var g = Math.max(20, production(s).rp * 200); s.rp += g; return '研究点 +' + fmt(g); } },
      { id: 'pricewar', w: 5, era: 0, kind: 'bad', text: '大厂开启 API 价格战，你的收入被卷。', apply: function (s) { addMod(s, 'pricewar', 60); return '收入 -30%，持续 60 秒'; } },
      { id: 'review', w: 4, era: 0, kind: 'bad', text: '用户评价：怎么还不如 GPT-4？差评 +1。', apply: function (s) { var g = Math.max(50, production(s).money * 60); s.money = Math.max(0, s.money - g); return '资金 -' + fmt(g); } },
      { id: 'overnight', w: 4, era: 0, kind: 'bad', text: '某大模型深夜更新，你的产品一夜过时。', apply: function (s) { addMod(s, 'overnight', 90); s.milestone = Math.max(0, s.milestone - 0.02); return '里程碑 -0.02，收入 -10%（90 秒）'; } },
      { id: 'opensource', w: 3, era: 0, kind: 'choice', text: '董事会问：新模型开源还是闭源？', choices: [
        { label: '开源', apply: function (s) { var g = Math.max(50, production(s).rp * 240); s.rp += g; addMod(s, 'open_inc', 120); return '研究点 +' + fmt(g) + '，收入 -15%（120 秒）'; } },
        { label: '闭源', apply: function (s) { var g = production(s).money * 180; s.money += g; addMod(s, 'close_rp', 120); return '资金 +' + fmt(g) + '，研究点 -15%（120 秒）'; } },
      ] },
      { id: 'ads', w: 3, era: 0, kind: 'choice', text: '运营问：接广告还是保持纯净？', choices: [
        { label: '接广告', apply: function (s) { var g = production(s).money * 240; s.money += g; if (s.era >= 1) s.influence = Math.max(0, s.influence - 20); return '资金 +' + fmt(g) + (s.era >= 1 ? '，影响力 -20' : ''); } },
        { label: '保持纯净', apply: function (s) { if (s.era >= 1) { s.influence += 40; return '影响力 +40'; } else { var g = production(s).rp * 200; s.rp += g; return '研究点 +' + fmt(g); } } },
      ] },
      { id: 'hearing', w: 4, era: 2, kind: 'bad', text: '国会召开 AGI 监管听证会，你的名字被点名。', apply: function (s) { if (s.influence > 0) { var g = Math.max(100, s.influence * 0.2); s.influence = Math.max(0, s.influence - g); return '影响力 -' + fmt(g); } else { addMod(s, 'overnight', 90); return '收入 -10%，持续 90 秒'; } } },
      { id: 'awaken', w: 3, era: 2, kind: 'good', text: '实验室里的智能体表现出自我意识。', apply: function (s) { var g = Math.max(1000, production(s).rp * 240); s.rp += g; s.milestone = Math.min(1, s.milestone + 0.02); return '研究点 +' + fmt(g) + '，里程碑 +0.02'; } },
      { id: 'stellar', w: 4, era: 3, kind: 'good', text: '星际网络脉冲，算力如潮水般涌入。', apply: function (s) { var g = Math.max(1000, production(s).cosmic * 300); s.cosmic += g; return '星际算力 +' + fmt(g); } },
      { id: 'dimension', w: 3, era: 3, kind: 'good', text: '跨维度采样成功，一切产出短暂升华。', apply: function (s) { addMod(s, 'dimension', 60); return '全部产出 +30%，持续 60 秒'; } },
    ];


    // ==================== 引擎 ====================
    function allEra(s) {
      var n = s.era;
      return n < ERAS.length ? ERAS[n] : templateEra(n);
    }
    function findItem(s, id) {
      var era = allEra(s);
      var lists = [era.hardware, era.power, era.staff];
      for (var i = 0; i < lists.length; i++) {
        for (var j = 0; j < lists[i].length; j++) if (lists[i][j].id === id) return lists[i][j];
      }
      return null;
    }
    function findModel(s, id) {
      var era = allEra(s);
      for (var i = 0; i < era.models.length; i++) if (era.models[i].id === id) return era.models[i];
      return null;
    }
    function mlvl(s, id) {
      var v = s.trained[id];
      return v === true ? 1 : (v || 0);
    }
    function isUnlocked(s, hw) {
      if (hw.unlock === 0 || hw.unlock === undefined) return true;
      return s.hwUnlocked && s.hwUnlocked[hw.id] === true;
    }
    function hwLevel(s, hw) {
      return (s.hwLevel && s.hwLevel[hw.id]) || 1;
    }
    function isEquipItem(s, item) {
      var era = allEra(s);
      for (var i = 0; i < era.hardware.length; i++) if (era.hardware[i].id === item.id) return true;
      for (var j = 0; j < era.power.length; j++) if (era.power[j].id === item.id) return true;
      return false;
    }

    // 临时 modifier：默认效果表（事件里 addMod(id, 秒) 即可）
    var MOD_DEFAULT = {
      gpuSale: { buy: 0.7 },
      blackout: { flops: 0.5 },
      openai: { income: 1.5 },
      pricewar: { income: 0.7 },
      overnight: { income: 0.9 },
      open_inc: { income: 0.85 },
      close_rp: { rp: 0.85 },
      dimension: { all: 1.3 },
      rush: { all: RUSH_MULT },
    };
    function addMod(s, id, seconds, eff) {
      s.modifiers[id] = { until: nowTs() + seconds * 1000, eff: eff || MOD_DEFAULT[id] || {} };
    }
    function activeMods(s) {
      var out = {};
      for (var k in s.modifiers) {
        var m = s.modifiers[k];
        if (m && m.until > nowTs()) out[k] = m.eff;
      }
      return out;
    }

    function techBonus(s) {
      var b = {};
      for (var i = 0; i < TECH.length; i++) {
        var t = TECH[i];
        if (s.tech[t.id]) for (var k in t.eff) b[k] = (b[k] || 0) + t.eff[k];
      }
      var lvl = s.shop.symbolist || 0; if (lvl) b.rp = (b.rp || 0) + 0.20 * lvl;
      lvl = s.shop.boost || 0; if (lvl) b.all = (b.all || 0) + 0.05 * lvl;
      return b;
    }

    function slots(s) {
      var n = 1;
      if (s.era >= 2) n += 1;
      if ((s.shop.lab2 || 0) > 0) n += 1;
      return n;
    }

    function production(s) {
      var era = allEra(s);
      var powerCap = 0, powerDemand = 0, flops = 0, rp = 0, cosmic = 0;
      var i, n;
      for (i = 0; i < era.hardware.length; i++) {
        var hw = era.hardware[i];
        n = s.hardware[hw.id] || 0;
        if (n > 0) {
          var hwLvl = hwLevel(s, hw);
          var hwEff = Math.pow(HW_UPG_EFFECT, hwLvl - 1);
          flops += n * hw.flops * hwEff;
          powerDemand += n * hw.power;
          cosmic += n * (hw.cosmic || 0) * hwEff;
        }
      }
      for (i = 0; i < era.power.length; i++) {
        var pw = era.power[i];
        var pwN = s.hardware[pw.id] || 0;
        if (pwN > 0) {
          var pwLvl = hwLevel(s, pw);
          var pwEff = Math.pow(HW_UPG_EFFECT, pwLvl - 1);
          powerCap += pwN * pw.power * pwEff;
        }
      }
      for (i = 0; i < era.staff.length; i++) {
        var st = era.staff[i];
        rp += (s.hardware[st.id] || 0) * st.rp;
      }
      var money = 0, influence = 0, wages = 0, inferDemand = 0;
      for (i = 0; i < era.models.length; i++) {
        var m = era.models[i];
        var lvl = mlvl(s, m.id);
        if (lvl > 0) {
          var inc = (m.income || 0) * Math.pow(UPG_INCOME, lvl - 1);
          money += inc;
          inferDemand += inc * INFER_FLOP_PER_INCOME;
          influence += m.influence || 0;
        }
      }
      for (i = 0; i < era.staff.length; i++) {
        wages += (s.hardware[era.staff[i].id] || 0) * era.staff[i].rp * STAFF_WAGE;
      }

      var pf = powerDemand > 0 ? Math.min(1, powerCap / powerDemand) : 1;
      flops *= pf;

      var b = techBonus(s);
      var mods = activeMods(s);
      var mFlops = 1, mIncome = 1, mRp = 1, mAll = 1, mBuy = 1, mCosmic = 1;
      for (var k in mods) {
        var e = mods[k];
        if (e.flops) mFlops *= e.flops;
        if (e.income) mIncome *= e.income;
        if (e.rp) mRp *= e.rp;
        if (e.buy) mBuy *= e.buy;
        if (e.cosmic) mCosmic *= e.cosmic;
        if (e.all) { mFlops *= e.all; mIncome *= e.all; mRp *= e.all; mCosmic *= e.all; mAll *= e.all; }
      }

      var flopsOut = flops * (1 + (b.flops || 0)) * mFlops;
      var inferFactor = inferDemand > 0 ? Math.min(1, flopsOut / inferDemand) : 1;
      var inferConsumed = inferDemand * inferFactor;
      var grossMoney = money * (1 + (b.income || 0)) * mIncome * inferFactor;
      var netMoney = grossMoney - wages;
      var striking = (s.money <= 0 && netMoney < 0);
      return {
        money: netMoney,
        wages: wages,
        striking: striking,
        flops: Math.max(0, flopsOut - inferConsumed),
        inferDemand: inferDemand,
        inferFactor: inferFactor,
        rp: striking ? 0 : rp * (1 + (b.rp || 0)) * mRp,
        influence: influence * mAll,
        cosmic: cosmic * (1 + (b.cosmic || 0)) * mCosmic,
        powerCap: powerCap,
        powerDemand: powerDemand,
        powerFactor: pf,
        buyMul: mBuy,
        trainMul: (1 + (b.train || 0)),
        costMul: (1 + (b.cost || 0)),
      };
    }

    function buyCost(item, owned, n, buyMul) {
      var grow = item.grow || 1.15;
      var total = 0;
      for (var i = 0; i < n; i++) total += item.cost * Math.pow(grow, owned + i);
      return total * (buyMul || 1);
    }

    function buy(s, id, n) {
      var item = findItem(s, id);
      if (!item) return { ok: false, msg: '没有这个物品：' + id };
      if (isEquipItem(s, item) && !isUnlocked(s, item)) return { ok: false, msg: '该设备未开发（用 develop ' + id + ' 解锁）' };
      n = Math.max(1, Math.floor(n || 1));
      var owned = s.hardware[id] || 0;
      var cost = buyCost(item, owned, n, production(s).buyMul);
      if (s.money < cost) return { ok: false, msg: '资金不足（需要 ¥' + fmt(cost) + '）' };
      s.money -= cost;
      s.hardware[id] = owned + n;
      return { ok: true, msg: '已购买 ' + n + ' × ' + item.name + '（-¥' + fmt(cost) + '）' };
    }

    function train(s, id) {
      var model = findModel(s, id);
      if (!model) return { ok: false, msg: '没有这个模型：' + id };
      if (model.starter) return { ok: false, msg: '这个模型无需训练（初始模型）' };
      var lvl = mlvl(s, id);
      for (var j = 0; j < s.training.length; j++) if (s.training[j].modelId === id) return { ok: false, msg: '已在训练中' };
      if (s.training.length >= slots(s)) return { ok: false, msg: '训练槽已满（' + slots(s) + ' 个）' };
      var toLevel = lvl + 1;
      var cost = model.flops * Math.pow(UPG_COST, lvl);
      s.training.push({ modelId: id, toLevel: toLevel, progress: 0, cost: cost });
      return { ok: true, msg: '开始训练：' + model.name + ' v' + toLevel + '（消耗 ' + fmt(cost) + ' FLOPs）' };
    }

    function completeModel(s, model, level) {
      s.trained[model.id] = level;
      if (model.rp) s.rp += model.rp;
      if (level === 1 && model.milestone) s.milestone = Math.min(1, s.milestone + model.milestone);
      var incomeNow = model.income * Math.pow(UPG_INCOME, level - 1);
      var msg = '训练完成：' + model.name + ' v' + level + '！模型收入 +' + fmt(incomeNow) + '/s';
      if (model.rp) msg += '，研究点 +' + fmt(model.rp);
      if (level === 1 && model.milestone) msg += '，里程碑 +' + Math.round(model.milestone * 100) + '%';
      pushLog(msg);
      if (s.milestone >= 1) pushLog('里程碑已满！执行 prestige 可进行范式革命。');
    }

    function autoTrainNext(s) {
      if (!(s.shop.autotrain > 0) || !s.autoTrain) return;
      if (s.training.length >= slots(s)) return;
      var era = allEra(s);
      for (var i = 0; i < era.models.length; i++) {
        var m = era.models[i];
        if (m.starter || mlvl(s, m.id) > 0) continue;
        var inTrain = false;
        for (var j = 0; j < s.training.length; j++) if (s.training[j].modelId === m.id) inTrain = true;
        if (!inTrain) { s.training.push({ modelId: m.id, toLevel: 1, progress: 0, cost: m.flops }); pushLog('自动炼丹启动：' + m.name); return; }
      }
    }

    function tick(s, dt) {
      var P = production(s);
      s.money += P.money * dt;
      if (s.money < 0) s.money = 0;
      s.flops += P.flops * dt;
      s.rp += P.rp * dt;
      s.influence += P.influence * dt;
      s.cosmic += P.cosmic * dt;
      s.stats.totalFlops += P.flops * dt;
      s.stats.totalMoney += P.money * dt;

      var i, tr, model;
      var need = 0;
      var burn = (s.burnMul || BURN_DEFAULT);
      for (i = 0; i < s.training.length; i++) {
        tr = s.training[i];
        model = findModel(s, tr.modelId);
        if (!model) continue;
        need = Math.max(0, tr.cost * P.costMul - tr.progress);
        var spend = Math.min(s.flops, need, P.flops * dt * burn);
        tr.progress += spend * P.trainMul;
        s.flops -= spend;
      }
      var completed = [];
      for (i = 0; i < s.training.length; i++) {
        tr = s.training[i];
        model = findModel(s, tr.modelId);
        if (!model) { s.training.splice(i, 1); i--; continue; }
        if (tr.progress >= tr.cost * P.costMul) { completed.push({ model: model, level: tr.toLevel }); s.training.splice(i, 1); i--; }
      }
      for (i = 0; i < completed.length; i++) completeModel(s, completed[i].model, completed[i].level);

      autoTrainNext(s);

      if (!s.nextEventAt) s.nextEventAt = nowTs() + rnd(EVENT_MIN_MS, EVENT_MAX_MS);
      if (nowTs() >= s.nextEventAt) {
        s.nextEventAt = nowTs() + rnd(EVENT_MIN_MS, EVENT_MAX_MS);
        triggerEvent(s);
      }
    }

    function triggerEvent(s) {
      var pool = [];
      var totalW = 0;
      var goodBoost = (s.shop.vc || 0) > 0 ? 1.6 : 1;
      for (var i = 0; i < EVENTS.length; i++) {
        var e = EVENTS[i];
        if (e.era > s.era) continue;
        var w = e.w * (e.kind === 'good' ? goodBoost : 1);
        pool.push({ e: e, w: w });
        totalW += w;
      }
      var r = Math.random() * totalW;
      var chosen = pool.length ? pool[0].e : null;
      for (var j = 0; j < pool.length; j++) { r -= pool[j].w; if (r <= 0) { chosen = pool[j].e; break; } }
      if (!chosen) return;
      pushLog('【事件】' + chosen.text);
      if (chosen.kind === 'choice') renderChoice(chosen);
      else pushLog('  → ' + chosen.apply(s));
    }

    function research(s, id) {
      var t = null;
      for (var i = 0; i < TECH.length; i++) if (TECH[i].id === id) t = TECH[i];
      if (!t) return { ok: false, msg: '没有这项科技：' + id };
      if (s.tech[id]) return { ok: false, msg: '已研究' };
      if (t.era > s.era) return { ok: false, msg: '需要进入更晚的时代' };
      if (s.rp < t.rp) return { ok: false, msg: '研究点不足（需要 ' + fmt(t.rp) + '）' };
      if (t.infl && s.influence < t.infl) return { ok: false, msg: '影响力不足（需要 ' + fmt(t.infl) + '）' };
      if (t.cosmic && s.cosmic < t.cosmic) return { ok: false, msg: '星际算力不足（需要 ' + fmt(t.cosmic) + '）' };
      s.rp -= t.rp;
      if (t.infl) s.influence -= t.infl;
      if (t.cosmic) s.cosmic -= t.cosmic;
      s.tech[id] = true;
      return { ok: true, msg: '研究完成：' + t.name + '（' + t.desc + '）' };
    }

    function buyShop(s, id) {
      var item = null;
      for (var i = 0; i < SHOP.length; i++) if (SHOP[i].id === id) item = SHOP[i];
      if (!item) return { ok: false, msg: '没有这个范式项目：' + id };
      var lvl = s.shop[id] || 0;
      if (lvl >= item.max) return { ok: false, msg: '已达上限' };
      var cost = Math.floor(item.cost * Math.pow(item.grow, lvl));
      if (s.pp < cost) return { ok: false, msg: '范式点不足（需要 ' + cost + ' PP）' };
      s.pp -= cost;
      s.shop[id] = lvl + 1;
      return { ok: true, msg: '已购买：' + item.name + '（-' + cost + ' PP）' };
    }

    function sellFlops(s, amount, target) {
      amount = amount === 'all' ? s.flops : (parseFloat(amount) || 0);
      if (!(amount > 0)) return { ok: false, msg: '出售数量无效' };
      if (amount > s.flops) amount = s.flops;
      var scale = Math.pow(10, s.era);
      s.flops -= amount;
      if (target === 'rp' || target === 'research') {
        var rpGot = amount * SELL_RP * scale;
        s.rp += rpGot;
        return { ok: true, msg: '已出售 ' + fmt(amount) + ' FLOPs，换取研究点 +' + fmt(rpGot) };
      }
      var moneyGot = amount * SELL_MONEY * scale;
      s.money += moneyGot;
      return { ok: true, msg: '已出售 ' + fmt(amount) + ' FLOPs，换取资金 +¥' + fmt(moneyGot) };
    }
    function setBurn(s, n) {
      n = parseInt(n, 10);
      if (!(n >= BURN_MIN && n <= BURN_MAX)) return { ok: false, msg: '倍率需在 ' + BURN_MIN + '–' + BURN_MAX + ' 之间（当前 ' + (s.burnMul || BURN_DEFAULT) + '×）' };
      s.burnMul = n;
      return { ok: true, msg: '烧库存倍率已设为 ' + n + '×' };
    }
    function fireStaff(s, id, n) {
      var era = allEra(s);
      var item = null;
      for (var i = 0; i < era.staff.length; i++) if (era.staff[i].id === id) item = era.staff[i];
      if (!item) return { ok: false, msg: '只能解雇员工（用 shop 查看员工 id）：' + id };
      var owned = s.hardware[id] || 0;
      n = Math.max(1, Math.floor(n || 1));
      if (owned <= 0) return { ok: false, msg: '没有在职的 ' + item.name };
      n = Math.min(n, owned);
      s.hardware[id] = owned - n;
      return { ok: true, msg: '已解雇 ' + n + ' × ' + item.name + '，工资支出下降' };
    }
    function rush(s) {
      var cost = RUSH_COST * Math.pow(10, s.era);
      if (s.rp < cost) return { ok: false, msg: '研究点不足（需要 ' + fmt(cost) + ' RP）' };
      s.rp -= cost;
      addMod(s, 'rush', RUSH_DURATION);
      return { ok: true, msg: '研究冲刺！全部产出 +' + Math.round((RUSH_MULT - 1) * 100) + '%，持续 ' + RUSH_DURATION + ' 秒（-' + fmt(cost) + ' RP）' };
    }
    function inspire(s, modelId, amount) {
      var model = findModel(s, modelId);
      if (!model) return { ok: false, msg: '没有这个模型：' + modelId };
      var tr = null;
      for (var j = 0; j < s.training.length; j++) if (s.training[j].modelId === modelId) tr = s.training[j];
      if (!tr) return { ok: false, msg: '该模型未在训练中（先 train <id>）' };
      amount = amount === 'all' ? s.rp : (parseFloat(amount) || 0);
      if (!(amount > 0)) return { ok: false, msg: '数量无效' };
      if (amount > s.rp) amount = s.rp;
      var rate = INSPIRE_RATE * Math.pow(10, s.era);
      var add = amount * rate * production(s).trainMul;
      tr.progress += add;
      s.rp -= amount;
      return { ok: true, msg: '灵感注入！' + model.name + ' 训练进度 +' + fmt(add) + ' FLOPs（-' + fmt(amount) + ' RP）' };
    }
    function publishPaper(s, amount) {
      if (s.era < 1) return { ok: false, msg: '大模型时代（时代2）起才有影响力' };
      amount = amount === 'all' ? s.rp : (parseFloat(amount) || 0);
      if (!(amount > 0)) return { ok: false, msg: '数量无效' };
      if (amount > s.rp) amount = s.rp;
      var inf = amount * PAPER_RATE;
      s.rp -= amount;
      s.influence += inf;
      return { ok: true, msg: '论文发表！影响力 +' + fmt(inf) + '（-' + fmt(amount) + ' RP）' };
    }
    function develop(s, id) {
      var era = allEra(s);
      var hw = null;
      for (var i = 0; i < era.hardware.length; i++) if (era.hardware[i].id === id) hw = era.hardware[i];
      if (!hw) for (var j = 0; j < era.power.length; j++) if (era.power[j].id === id) hw = era.power[j];
      if (!hw) return { ok: false, msg: '没有这个设备：' + id };
      if (isUnlocked(s, hw)) return { ok: false, msg: '已开发' };
      if (s.rp < hw.unlock) return { ok: false, msg: '研究点不足（需要 ' + fmt(hw.unlock) + ' RP）' };
      s.rp -= hw.unlock;
      s.hwUnlocked[id] = true;
      return { ok: true, msg: '硬件开发完成：' + hw.name + '（-' + fmt(hw.unlock) + ' RP）' };
    }
    function upgradeHw(s, id) {
      var era = allEra(s);
      var hw = null;
      for (var i = 0; i < era.hardware.length; i++) if (era.hardware[i].id === id) hw = era.hardware[i];
      if (!hw) for (var j = 0; j < era.power.length; j++) if (era.power[j].id === id) hw = era.power[j];
      if (!hw) return { ok: false, msg: '没有这个设备：' + id };
      if (!isUnlocked(s, hw)) return { ok: false, msg: '该设备未开发（develop ' + id + ' 解锁）' };
      var lvl = hwLevel(s, hw);
      var base = hw.unlock || 20;
      var cost = Math.floor(base * Math.pow(HW_UPG_COST, lvl - 1));
      if (s.rp < cost) return { ok: false, msg: '研究点不足（需要 ' + fmt(cost) + ' RP）' };
      s.rp -= cost;
      s.hwLevel[id] = lvl + 1;
      return { ok: true, msg: hw.name + ' 升到 Lv.' + (lvl + 1) + '，产出 ×' + fmt(Math.pow(HW_UPG_EFFECT, lvl)) + '（-' + fmt(cost) + ' RP）' };
    }
    function canPrestige(s) { return s.milestone >= 1; }
    function prestigeGain(s) {
      return Math.max(1, Math.floor((Math.log10(1 + s.stats.totalFlops) - 5) * 2) + s.era);
    }
    function doPrestige(s) {
      if (!canPrestige(s)) return { ok: false, msg: '里程碑未满，需训练出本时代终极模型' };
      var gained = prestigeGain(s);
      s.pp += gained;
      s.prestigeCount += 1;
      var nextEra = s.era + 1;
      s.money = 0; s.flops = 0; s.rp = 0; s.influence = 0; s.cosmic = 0;
      s.hardware = {}; s.trained = {}; s.training = []; s.modifiers = {};
      s.milestone = 0; s.autoTrain = false;
      s.era = nextEra;
      enterEra(s, nextEra, false);
      s.nextEventAt = nowTs() + rnd(EVENT_MIN_MS, EVENT_MAX_MS);
      pushLog('范式革命！进入「' + allEra(s).name + '」，获得范式点 +' + gained);
      return { ok: true, msg: '范式革命成功，获得范式点 +' + gained };
    }

    function enterEra(s, eraIndex, first) {
      s.era = eraIndex;
      var era = allEra(s);
      if (era.hardware[0]) s.hardware[era.hardware[0].id] = (s.hardware[era.hardware[0].id] || 0) + 1;
      if (era.power[0]) s.hardware[era.power[0].id] = (s.hardware[era.power[0].id] || 0) + 1;
      if (era.staff[0]) s.hardware[era.staff[0].id] = (s.hardware[era.staff[0].id] || 0) + 1;
      for (var i = 0; i < era.models.length; i++) if (era.models[i].starter) s.trained[era.models[i].id] = 1;
      s.money += era.hardware[0].cost * 4;
      if (first) {
        pushLog('欢迎来到深算实验室（DeepCompute）。');
        pushLog('当前时代：' + era.name + ' —— 目标：' + era.goal);
        pushLog(era.intro);
        pushLog('输入 help 查看命令，或点击下方快捷按钮。');
      }
    }

    function loseStaff(s, frac) {
      var era = allEra(s);
      for (var i = 0; i < era.staff.length; i++) {
        var id = era.staff[i].id;
        var n = s.hardware[id] || 0;
        if (n > 0) {
          var lose = Math.max(1, Math.floor(n * frac));
          s.hardware[id] = Math.max(0, n - lose);
        }
      }
    }

    function offlineCatchup(s) {
      var elapsed = nowTs() - s.lastSeen;
      if (elapsed < 60000) { s.lastSeen = nowTs(); return; }
      var capped = Math.min(elapsed, OFFLINE_CAP_MS);
      var eff = OFFLINE_EFF * (1 + 0.10 * (s.shop.offline || 0));
      var dt = (capped / 1000) * eff;
      var P = production(s);
      s.money += P.money * dt;
      if (s.money < 0) s.money = 0;
      s.flops += P.flops * dt;
      s.rp += P.rp * dt;
      s.influence += P.influence * dt;
      s.cosmic += P.cosmic * dt;
      s.stats.totalFlops += P.flops * dt;
      s.stats.totalMoney += P.money * dt;

      var i, tr, model, need, spend;
      var remaining = s.flops;
      var burn = (s.burnMul || BURN_DEFAULT);
      for (i = 0; i < s.training.length; i++) {
        tr = s.training[i];
        model = findModel(s, tr.modelId);
        if (!model) continue;
        need = Math.max(0, tr.cost * P.costMul - tr.progress);
        spend = Math.min(remaining, need, P.flops * dt * burn);
        tr.progress += spend * P.trainMul;
        remaining -= spend;
      }
      s.flops = remaining;
      var completed = [];
      for (i = 0; i < s.training.length; i++) {
        tr = s.training[i];
        model = findModel(s, tr.modelId);
        if (model && tr.progress >= tr.cost * P.costMul) { completed.push({ model: model, level: tr.toLevel }); s.training.splice(i, 1); i--; }
      }
      for (i = 0; i < completed.length; i++) completeModel(s, completed[i].model, completed[i].level);
      pushLog('离线 ' + Math.floor(elapsed / 60000) + ' 分钟：按 ' + Math.round(eff * 100) + '% 效率结算。');
      s.lastSeen = nowTs();
    }


    // ==================== UI ====================
    var statusEl = null, logEl = null, panelEl = null, autoBtn = null, inputEl = null;
    var viewOpen = false;

    var CSS = [
      '[data-dsh-deepcompute-panel]{position:fixed;top:0;right:0;height:100vh;width:min(880px,95vw);z-index:2147483000;background:#060a08;color:#9dffb0;font-family:"Cascadia Mono",Consolas,"Courier New",monospace;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .25s ease;border-left:1px solid #1f5c37;box-shadow:-8px 0 24px rgba(0,0,0,.35);}',
      'html[data-dsh-deepcompute-active] [data-dsh-deepcompute-panel]{transform:translateX(0);}',
      '[data-dsh-deepcompute-tab]{position:fixed;right:0;bottom:14%;z-index:2147483001;writing-mode:vertical-rl;background:#0f2418;color:#9dffb0;border:1px solid #1f5c37;border-right:none;border-radius:8px 0 0 8px;padding:10px 6px;font-size:13px;font-family:inherit;cursor:pointer;box-shadow:-2px 0 10px rgba(0,0,0,.3);}',
      '[data-dsh-deepcompute-tab]:hover{background:#163424;}',
      'html[data-dsh-deepcompute-active] [data-dsh-deepcompute-tab]{opacity:0;pointer-events:none;}',
      '.dc-header{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:6px 12px;background:#0b1410;border-bottom:1px solid #173a26;}',
      '.dc-title{font-weight:700;color:#7dffc8;}',
      '.dc-close{background:transparent;border:1px solid #1f5c37;color:#9dffb0;border-radius:4px;padding:2px 10px;font-size:14px;cursor:pointer;font-family:inherit;}',
      '.dc-close:hover{background:#163424;}',
            '.dc-status{flex:0 0 auto;padding:6px 12px;background:#0b1410;border-bottom:1px solid #173a26;display:flex;flex-direction:column;gap:4px;}',
      '.dc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px 16px;}',
      '.dc-cell{display:flex;flex-direction:column;min-width:0;}',
      '.dc-cell-label{font-size:10px;color:#5fae82;letter-spacing:1px;white-space:nowrap;}',
      '.dc-cell-main{font-size:13px;color:#c8ffd8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.dc-cell-sub{font-size:11px;color:#5fae82;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.dc-cell-sub.dc-warn{color:#ff9d9d;font-weight:700;}',
      '.dc-alerts{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12px;border-top:1px dashed #173a26;padding-top:3px;}',
      '.dc-era{color:#7dffc8 !important;font-weight:700;}',
      '.dc-rate{color:#5fae82 !important;}',
      '.dc-money{color:#ffe08a !important;}',
      '.dc-pp{color:#b79dff !important;font-weight:700;}',
      '.dc-train{color:#ffd77d !important;}',
      '.dc-strike{color:#ff9d9d !important;font-weight:700;}',
      '.dc-warn{color:#ff9d9d !important;font-weight:700;}',
      '.dc-rush{color:#ffe08a !important;font-weight:700;}',
'.dc-log{flex:1 1 auto;overflow-y:auto;padding:8px 12px;font-size:13px;line-height:1.55;scrollbar-width:thin;}',
      '.dc-line{white-space:pre-wrap;word-break:break-word;}',
      '.dc-line.dc-dim{color:#5fae82;}',
      '.dc-line.dc-good{color:#7dffc8;}',
      '.dc-line.dc-bad{color:#ff9d9d;}',
      '.dc-line.dc-event{color:#ffd77d;font-weight:700;}',
      '.dc-choice{color:#b79dff;cursor:pointer;text-decoration:underline;margin-right:10px;}',
      '.dc-choice:hover{color:#e0d4ff;}',
      '.dc-buttons{flex:0 0 auto;padding:6px 10px;background:#0b1410;border-top:1px solid #173a26;display:flex;flex-wrap:wrap;gap:6px;}',
      '.dc-btn{background:#0f2418;color:#9dffb0;border:1px solid #1f5c37;border-radius:4px;padding:4px 10px;font-size:12px;font-family:inherit;cursor:pointer;}',
      '.dc-btn:hover{background:#163424;}',
      '.dc-input{flex:0 0 auto;display:flex;align-items:center;gap:6px;padding:8px 12px;background:#081009;border-top:1px solid #173a26;}',
      '.dc-prompt{color:#7dffc8;font-weight:700;}',
      '.dc-input-field{flex:1;background:transparent;border:none;outline:none;color:#d8ffe4;font-family:inherit;font-size:13px;caret-color:#7dffc8;}',
    ].join('\n');

    function injectCss() {
      if (document.getElementById('dsh-deepcompute-css')) return;
      var st = document.createElement('style');
      st.id = 'dsh-deepcompute-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }

    function pushLog(text, type) {
      if (!text) return;
      G.log.push(text);
      if (G.log.length > LOG_MAX) G.log.splice(0, G.log.length - LOG_MAX);
      if (logEl) {
        var line = h('div', 'dc-line' + (type ? ' dc-' + type : ''), text);
        logEl.appendChild(line);
        while (logEl.childElementCount > LOG_MAX) logEl.removeChild(logEl.firstChild);
        logEl.scrollTop = logEl.scrollHeight;
      }
    }
    function rebuildLog() {
      if (!logEl) return;
      logEl.innerHTML = '';
      for (var i = 0; i < G.log.length; i++) logEl.appendChild(h('div', 'dc-line', G.log[i]));
      logEl.scrollTop = logEl.scrollHeight;
    }

    function renderChoice(chosen) {
      if (!logEl) {
        var c0 = chosen.choices[0];
        pushLog('  → ' + c0.apply(G));
        return;
      }
      var line = h('div', 'dc-line');
      line.appendChild(document.createTextNode('  → '));
      for (var i = 0; i < chosen.choices.length; i++) {
        (function (choice) {
          var b = h('span', 'dc-choice', '[' + choice.label + ']');
          b.addEventListener('click', function () {
            var spans = line.querySelectorAll('.dc-choice');
            for (var j = 0; j < spans.length; j++) spans[j].style.pointerEvents = 'none';
            var res = choice.apply(G);
            pushLog('  → ' + res);
          });
          line.appendChild(b);
        })(chosen.choices[i]);
      }
      logEl.appendChild(line);
      logEl.scrollTop = logEl.scrollHeight;
    }

    function render() {
      if (!statusEl) return;
      var P = production(G);
      var era = allEra(G);

      function cell(label, main, mainCls, subs) {
        var h = '<div class="dc-cell"><span class="dc-cell-label">' + label + '</span><span class="dc-cell-main' + (mainCls ? ' ' + mainCls : '') + '">' + main + '</span>';
        if (subs && subs.length) {
          for (var si = 0; si < subs.length; si++) {
            h += '<span class="dc-cell-sub' + (subs[si].warn ? ' dc-warn' : '') + '">' + subs[si].text + '</span>';
          }
        }
        return h + '</div>';
      }

      var cells = [];
      cells.push(cell('时代', era.name, 'dc-era', [{ text: '里程碑 ' + Math.round(G.milestone * 100) + '%' }]));

      var moneySubs = [{ text: (P.money >= 0 ? '+' : '') + fmt(P.money) + '/s' }];
      if (P.wages > 0) moneySubs.push({ text: '工资 -¥' + fmt(P.wages) + '/s' });
      if (P.striking) moneySubs.push({ text: '⚠ 罢工中', warn: true });
      cells.push(cell('资金', '¥' + fmt(G.money), 'dc-money', moneySubs));

      var flopsSubs = [{ text: '+' + fmt(P.flops) + '/s' }];
      if (P.inferDemand > 0) flopsSubs.push({ text: '推理 -' + fmt(P.inferDemand * P.inferFactor) + '/s' });
      if (P.inferFactor < 1) flopsSubs.push({ text: '⚠ 模型收入 ' + Math.round(P.inferFactor * 100) + '%', warn: true });
      cells.push(cell('算力', fmt(G.flops) + ' FLOPs', '', flopsSubs));

      var powerSubs = [{ text: '效率 ' + Math.round(P.powerFactor * 100) + '%' }];
      if (P.powerFactor < 1) powerSubs.push({ text: '⚠ 供电不足，算力 -' + Math.round((1 - P.powerFactor) * 100) + '%', warn: true });
      cells.push(cell('电力', fmt(P.powerCap) + '/' + fmt(P.powerDemand) + ' MW', '', powerSubs));

      var rpSubs = [{ text: '+' + fmt(P.rp) + '/s' }];
      if (G.era >= 1) rpSubs.push({ text: '影响力 ' + fmt(G.influence) });
      if (G.era >= 3) rpSubs.push({ text: '星际 ' + fmt(G.cosmic) });
      cells.push(cell('研究点', fmt(G.rp), '', rpSubs));

      cells.push(cell('范式点', fmtInt(G.pp), 'dc-pp', [{ text: '转生 ' + G.prestigeCount + ' 次' }]));

      var alerts = [];
      if (G.modifiers.rush && G.modifiers.rush.until > nowTs()) alerts.push('<span class="dc-rush">⚡研究冲刺中</span>');
      for (var ti = 0; ti < G.training.length; ti++) {
        var trm = G.training[ti];
        var trmodel = findModel(G, trm.modelId);
        if (trmodel) {
          var trpct = Math.min(100, Math.floor(trm.progress / (trm.cost * P.costMul) * 100));
          alerts.push('<span class="dc-train">训练中: ' + trmodel.name + ' v' + trm.toLevel + ' ' + trpct + '%</span>');
        }
      }

      var html = '<div class="dc-grid">' + cells.join('') + '</div>';
      if (alerts.length) html += '<div class="dc-alerts">' + alerts.join('') + '</div>';
      statusEl.innerHTML = html;

      if (autoBtn) {
        if (G.shop.autotrain > 0) autoBtn.textContent = G.autoTrain ? '🧪 自动炼丹:开' : '🧪 自动炼丹:关';
        else autoBtn.textContent = '🧪 自动炼丹(未解锁)';
      }
    }

    // ---------- 右侧标签 + 滑出面板（仿 minigames，挂到 body，不依赖 shell 结构） ----------
    function mountPanel() {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.dataset.dshDeepcomputeTab = '';
      tab.textContent = '深算';
      tab.title = '打开深算 DeepCompute';
      tab.addEventListener('click', function () { togglePanel(true); });
      document.body.appendChild(tab);

      var panel = document.createElement('div');
      panel.dataset.dshDeepcomputePanel = '';
      panel.innerHTML =
        '<div class="dc-header"><span class="dc-title">深算 DeepCompute</span><button class="dc-close" type="button">×</button></div>' +
        '<div class="dc-status"></div>' +
        '<div class="dc-log"></div>' +
        '<div class="dc-buttons"></div>' +
        '<div class="dc-input"><span class="dc-prompt">&gt;</span><input class="dc-input-field" autocomplete="off" spellcheck="false"></div>';
      document.body.appendChild(panel);

      panelEl = panel;
      statusEl = panel.querySelector('.dc-status');
      logEl = panel.querySelector('.dc-log');
      inputEl = panel.querySelector('.dc-input-field');
      panel.querySelector('.dc-close').addEventListener('click', function () { togglePanel(false); });

      var buttonsEl = panel.querySelector('.dc-buttons');
      var defs = [['🛒 商店', 'shop'], ['🔬 科技', 'tech'], ['⚡ 模型', 'models'], ['auto', 'auto'], ['💾 存档', 'save'], ['⏫ 转生', 'prestige']];
      for (var i = 0; i < defs.length; i++) {
        (function (cmd, label) {
          var b = h('button', 'dc-btn', label);
          b.type = 'button';
          if (cmd === 'auto') autoBtn = b;
          b.addEventListener('click', function () { runCommand(cmd); });
          buttonsEl.appendChild(b);
        })(defs[i][1], defs[i][0]);
      }
      inputEl.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { var v = inputEl.value; inputEl.value = ''; runCommand(v); }
      });

      rebuildLog();
      render();

      return function () {
        if (tab) tab.remove();
        if (panel) panel.remove();
        panelEl = null; statusEl = null; logEl = null; inputEl = null; autoBtn = null;
        viewOpen = false;
        document.documentElement.removeAttribute('data-dsh-deepcompute-active');
      };
    }

    function togglePanel(open) {
      if (open === undefined) open = !viewOpen;
      viewOpen = open;
      if (open) {
        document.documentElement.setAttribute('data-dsh-deepcompute-active', '');
        if (inputEl) inputEl.focus();
      } else {
        document.documentElement.removeAttribute('data-dsh-deepcompute-active');
      }
    }

    // ==================== 命令 ====================
    function cmdShop(s) {
      var era = allEra(s);
      var P = production(s);
      pushLog('=== 市场（' + era.name + '）===', 'dim');
      pushLog('--- 硬件（产算力）---', 'dim');
      for (var i = 0; i < era.hardware.length; i++) {
        var it = era.hardware[i];
        var owned = s.hardware[it.id] || 0;
        var next = buyCost(it, owned, 1, P.buyMul);
        if (isUnlocked(s, it)) {
          var lvl = hwLevel(s, it);
          var eff = Math.pow(HW_UPG_EFFECT, lvl - 1);
          var upgCost = Math.floor((it.unlock || 20) * Math.pow(HW_UPG_COST, lvl - 1));
          pushLog('[Lv.' + lvl + '] ' + it.id + '  ' + it.name + ' ×' + owned + '  产出 ' + fmt(it.flops * eff) + ' FLOPs/s' + (it.cosmic ? ' +' + fmt(it.cosmic * eff) + ' 星际/s' : '') + '  耗电 ' + fmt(it.power) + ' MW  下一台 ¥' + fmt(next) + '  升级 Lv.' + (lvl + 1) + ' 需 ' + fmt(upgCost) + ' RP');
        } else {
          pushLog('[未开发] ' + it.id + '  ' + it.name + '  开发需 ' + fmt(it.unlock) + ' RP（develop ' + it.id + '）', 'dim');
        }
      }
      pushLog('用 develop <id> 开发硬件，upgrade <id> 提升等级', 'dim');
      pushLog('--- 电力（容量）---', 'dim');
      for (var i2 = 0; i2 < era.power.length; i2++) {
        var pw = era.power[i2];
        var o2 = s.hardware[pw.id] || 0;
        var n2 = buyCost(pw, o2, 1, P.buyMul);
        if (isUnlocked(s, pw)) {
          var plvl = hwLevel(s, pw);
          var peff = Math.pow(HW_UPG_EFFECT, plvl - 1);
          var pupg = Math.floor((pw.unlock || 20) * Math.pow(HW_UPG_COST, plvl - 1));
          pushLog('[Lv.' + plvl + '] ' + pw.id + '  ' + pw.name + ' ×' + o2 + '  +' + fmt(pw.power * peff) + ' MW  下一台 ¥' + fmt(n2) + '  升级 Lv.' + (plvl + 1) + ' 需 ' + fmt(pupg) + ' RP');
        } else {
          pushLog('[未开发] ' + pw.id + '  ' + pw.name + '  开发需 ' + fmt(pw.unlock) + ' RP（develop ' + pw.id + '）', 'dim');
        }
      }
      var effPct = Math.round(P.powerFactor * 100);
      if (P.powerFactor < 1) {
        pushLog('当前供电 ' + fmt(P.powerCap) + '/' + fmt(P.powerDemand) + ' MW，算力效率 ' + effPct + '%（⚠ 供电不足）', 'bad');
      } else {
        pushLog('当前供电 ' + fmt(P.powerCap) + '/' + fmt(P.powerDemand) + ' MW，算力效率 ' + effPct + '%', 'dim');
      }
      pushLog('--- 员工（产研究点）---', 'dim');
      for (var i3 = 0; i3 < era.staff.length; i3++) {
        var st = era.staff[i3];
        var o3 = s.hardware[st.id] || 0;
        var n3 = buyCost(st, o3, 1, P.buyMul);
        pushLog(st.id + '  ' + st.name + ' ×' + o3 + '  +' + fmt(st.rp) + ' RP/s  工资 ¥' + fmt(st.rp * STAFF_WAGE) + '/s  下一台 ¥' + fmt(n3));
      }
      pushLog('资金 ¥' + fmt(s.money) + ' | 用 buy <id> [数量] 购买');
    }

    function cmdModels(s) {
      var era = allEra(s);
      var P = production(s);
      pushLog('=== 模型线（' + era.name + '）===', 'dim');
      for (var i = 0; i < era.models.length; i++) {
        var m = era.models[i];
        var lvl = mlvl(s, m.id);
        var inTrain = false, prog = 0, trCost = 0;
        for (var j = 0; j < s.training.length; j++) if (s.training[j].modelId === m.id) { inTrain = true; prog = s.training[j].progress; trCost = s.training[j].cost; }
        var status;
        if (inTrain) status = '[训练中 v' + (lvl + 1) + ' ' + Math.floor(prog / (trCost * P.costMul) * 100) + '%]';
        else if (lvl > 0) status = '[v' + lvl + ']';
        else if (m.starter) status = '[初始]';
        else status = '[可训练]';
        var line = status + ' ' + m.id + '  ' + m.name;
        if (!m.starter) {
          var nextCost = m.flops * Math.pow(UPG_COST, lvl);
          line += '  升级 v' + (lvl + 1) + ' 需 ' + fmt(nextCost) + ' FLOPs';
        }
        var inc = m.income * Math.pow(UPG_INCOME, Math.max(0, lvl - 1));
        if (m.income) line += '  收益 +¥' + fmt(inc) + '/s';
        if (lvl > 0 && m.income) line += '  推理 -' + fmt(inc * INFER_FLOP_PER_INCOME) + ' FLOPs/s';
        if (m.desc) line += '  「' + m.desc + '」';
        pushLog(line, lvl > 0 ? 'good' : '');
      }
      pushLog('训练槽 ' + s.training.length + '/' + slots(s) + ' | 用 train <id> 训练/升级');
    }

    function cmdTech(s) {
      pushLog('=== 科技树（跨转生保留）===', 'dim');
      for (var i = 0; i < TECH.length; i++) {
        var t = TECH[i];
        if (s.tech[t.id]) pushLog('[已研究] ' + t.id + '  ' + t.name + '（' + t.desc + '）', 'good');
        else if (t.era <= s.era) {
          var cost = fmt(t.rp) + ' RP' + (t.infl ? ' + ' + fmt(t.infl) + ' 影响力' : '') + (t.cosmic ? ' + ' + fmt(t.cosmic) + ' 星际' : '');
          pushLog('[可研究] ' + t.id + '  ' + t.name + '（' + t.desc + '） 需 ' + cost);
        } else pushLog('[锁定] ' + t.id + '  ' + t.name + '  需 ' + (t.era + 1) + ' 号时代', 'dim');
      }
      pushLog('研究点 ' + fmt(s.rp) + ' | 用 research <id> 研究');
    }

    function cmdPshop(s) {
      pushLog('=== 范式商店（跨转生保留）===', 'dim');
      for (var i = 0; i < SHOP.length; i++) {
        var it = SHOP[i];
        var lvl = s.shop[it.id] || 0;
        var cost = Math.floor(it.cost * Math.pow(it.grow, lvl));
        if (lvl >= it.max) pushLog('[满级] ' + it.id + '  ' + it.name + '（' + it.desc + '）', 'dim');
        else pushLog('[可买] ' + it.id + '  ' + it.name + '（' + it.desc + '） 需 ' + cost + ' PP');
      }
      pushLog('范式点 ' + fmtInt(s.pp) + ' | 用 buy <id> 购买范式项目');
    }

    function runCommand(raw) {
      var line = String(raw || '').trim();
      if (!line) return;
      pushLog('> ' + line, 'dim');
      var parts = line.split(/\s+/);
      var cmd = (parts[0] || '').toLowerCase();
      var arg = parts[1];
      var arg2 = parts[2];

      if (cmd === 'help') {
        pushLog('=== 深算 DeepCompute 命令 ===', 'event');
        pushLog('help                  查看帮助');
        pushLog('shop                  查看市场');
        pushLog('buy <id> [数量]       购买硬件/员工/范式项目');
        pushLog('models                查看模型线');
        pushLog('train <id>            开始训练模型');
        pushLog('tech                  查看科技树');
        pushLog('research <id>         研究科技');
        pushLog('pshop                 查看范式商店');
        pushLog('prestige [confirm]    范式革命（转生）');
        pushLog('sell <数量|all> [money|rp]  出售算力库存');
        pushLog('burn <1-20>           设置烧库存倍率');
        pushLog('fire <员工id> [数量]  解雇员工（降工资）');
        pushLog('rush                  研究冲刺：+50% 产出 90 秒');
        pushLog('inspire <模型> [RP]   灵感注入：RP 加速训练');
        pushLog('paper <RP|all>        发论文：RP 换影响力');
        pushLog('develop <设备id>      开发/解锁硬件或电力设备（耗 RP）');
        pushLog('upgrade <设备id>      提升硬件/电力设备等级（耗 RP）');
        pushLog('auto                  开关自动炼丹（需解锁）');
        pushLog('stats / era           查看统计 / 时代');
        pushLog('save / export / import / reset [confirm]');
      } else if (cmd === 'shop') {
        cmdShop(G);
      } else if (cmd === 'buy') {
        if (!arg) { pushLog('用法：buy <id> [数量]', 'dim'); return; }
        var n = parseInt(arg2, 10) || 1;
        var item = findItem(G, arg);
        var r;
        if (item) r = buy(G, arg, n);
        else {
          var isShop = false;
          for (var i = 0; i < SHOP.length; i++) if (SHOP[i].id === arg) isShop = true;
          r = isShop ? buyShop(G, arg) : { ok: false, msg: '没有这个物品：' + arg };
        }
        pushLog(r.msg, r.ok ? 'good' : 'bad');
      } else if (cmd === 'models') {
        cmdModels(G);
      } else if (cmd === 'train') {
        if (!arg) { pushLog('用法：train <id>（用 models 查看可训练模型）', 'dim'); return; }
        var r2 = train(G, arg);
        pushLog(r2.msg, r2.ok ? 'good' : 'bad');
      } else if (cmd === 'tech') {
        cmdTech(G);
      } else if (cmd === 'research') {
        if (!arg) { pushLog('用法：research <id>', 'dim'); return; }
        var r3 = research(G, arg);
        pushLog(r3.msg, r3.ok ? 'good' : 'bad');
      } else if (cmd === 'pshop') {
        cmdPshop(G);
      } else if (cmd === 'sell') {
        if (!arg) { pushLog('用法：sell <数量|all> [money|rp]', 'dim'); return; }
        var r5 = sellFlops(G, arg, arg2 || 'money');
        pushLog(r5.msg, r5.ok ? 'good' : 'bad');
      } else if (cmd === 'burn') {
        var r6 = setBurn(G, arg);
        pushLog(r6.msg, r6.ok ? 'good' : 'bad');
      } else if (cmd === 'fire') {
        if (!arg) { pushLog('用法：fire <员工id> [数量]', 'dim'); return; }
        var r7 = fireStaff(G, arg, arg2);
        pushLog(r7.msg, r7.ok ? 'good' : 'bad');
      } else if (cmd === 'rush') {
        var r8 = rush(G);
        pushLog(r8.msg, r8.ok ? 'good' : 'bad');
      } else if (cmd === 'inspire') {
        if (!arg) { pushLog('用法：inspire <模型id> [RP数量|all]', 'dim'); return; }
        var r9 = inspire(G, arg, arg2);
        pushLog(r9.msg, r9.ok ? 'good' : 'bad');
      } else if (cmd === 'paper') {
        var r10 = publishPaper(G, arg || 'all');
        pushLog(r10.msg, r10.ok ? 'good' : 'bad');
      } else if (cmd === 'develop') {
        if (!arg) { pushLog('用法：develop <硬件id>', 'dim'); return; }
        var r11 = develop(G, arg);
        pushLog(r11.msg, r11.ok ? 'good' : 'bad');
      } else if (cmd === 'upgrade') {
        if (!arg) { pushLog('用法：upgrade <硬件id>', 'dim'); return; }
        var r12 = upgradeHw(G, arg);
        pushLog(r12.msg, r12.ok ? 'good' : 'bad');
      } else if (cmd === 'prestige') {
        if (arg === 'confirm') {
          var r4 = doPrestige(G);
          pushLog(r4.msg, r4.ok ? 'good' : 'bad');
        } else if (canPrestige(G)) {
          pushLog('里程碑已满！将获得范式点 +' + prestigeGain(G) + '，输入 prestige confirm 确认。', 'event');
        } else {
          pushLog('里程碑未满（' + Math.round(G.milestone * 100) + '%），需训练出本时代终极模型。', 'dim');
        }
      } else if (cmd === 'auto') {
        if (!(G.shop.autotrain > 0)) pushLog('自动炼丹未解锁（范式商店 20 PP）。', 'bad');
        else { G.autoTrain = !G.autoTrain; pushLog(G.autoTrain ? '自动炼丹已开启。' : '自动炼丹已关闭。'); render(); }
      } else if (cmd === 'stats') {
        pushLog('=== 实验室统计 ===', 'dim');
        pushLog('时代：' + allEra(G).name + '（' + (G.era + 1) + ' 号时代）');
        pushLog('范式点：' + fmtInt(G.pp) + ' | 转生次数：' + G.prestigeCount);
        pushLog('累计算力：' + fmt(G.stats.totalFlops) + ' FLOPs');
        pushLog('累计收入：¥' + fmt(G.stats.totalMoney));
        pushLog('里程碑：' + Math.round(G.milestone * 100) + '% | 训练槽：' + G.training.length + '/' + slots(G));
        pushLog('烧库存倍率：' + (G.burnMul || BURN_DEFAULT) + '×（burn <1-20> 调整）');
        pushLog('游戏时长：' + Math.floor((nowTs() - G.createdAt) / 60000) + ' 分钟');
      } else if (cmd === 'era') {
        var era = allEra(G);
        pushLog('=== ' + era.name + ' ===', 'event');
        pushLog('目标：' + era.goal);
        pushLog(era.intro);
        cmdModels(G);
      } else if (cmd === 'save') {
        save();
        pushLog('已保存。', 'good');
      } else if (cmd === 'export') {
        save();
        try {
          navigator.clipboard.writeText(JSON.stringify(G));
          pushLog('存档已复制到剪贴板。', 'good');
        } catch (e) { pushLog('复制失败：' + e.message, 'bad'); }
      } else if (cmd === 'import') {
        if (navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText().then(function (txt) {
            try {
              var s = JSON.parse(txt);
              if (s && s.v === VERSION) { G = s; offlineCatchup(G); rebuildLog(); pushLog('存档已导入。', 'good'); render(); }
              else pushLog('存档格式不正确。', 'bad');
            } catch (e) { pushLog('导入失败：' + e.message, 'bad'); }
          }).catch(function () { pushLog('无法读取剪贴板（需浏览器授权）。', 'bad'); });
        } else pushLog('当前环境不支持读取剪贴板。', 'bad');
      } else if (cmd === 'reset') {
        if (arg === 'confirm') hardReset();
        else pushLog('将清空当前存档！输入 reset confirm 确认。', 'event');
      } else {
        pushLog('未知命令：' + cmd + '（输入 help 查看帮助）', 'bad');
      }
    }

    // ==================== 启动 ====================
    var inject = [];
    var applied = false;
    function apply(ctx) {
      if (typeof document === 'undefined') return;
      if (applied) return;
      applied = true;
      try {
        G = load() || newGame();
        offlineCatchup(G);
        injectCss();
        var disposePanel = mountPanel();
        pushLog('深算 DeepCompute 已启动。输入 help 开始。');
        render();
        var lastTick = nowTs();
        var timer = setInterval(function () {
          var t = nowTs();
          var dt = Math.min(5, (t - lastTick) / 1000);
          lastTick = t;
          if (dt > 0) tick(G, dt);
          render();
        }, TICK_MS);
        var saveTimer = setInterval(save, SAVE_INTERVAL_MS);
        if (ctx && ctx.effect) {
          ctx.effect(function () {
            return function () {
              clearInterval(timer); clearInterval(saveTimer);
              disposePanel(); save();
              applied = false;
            };
          }, 'deepcompute: mount');
        }
      } catch (e) {
        applied = false;
        console.error('[dsh-deepcompute] mount failed:', e);
        try {
          var banner = document.createElement('div');
          banner.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:99999;background:#2b0a0a;color:#ff9d9d;padding:10px 14px;font:12px monospace;border:1px solid #7a2b2b;max-width:80vw;white-space:pre-wrap;';
          banner.textContent = '[dsh-deepcompute] 启动失败: ' + (e && e.message ? e.message : String(e));
          document.body.appendChild(banner);
        } catch (e2) {}
      }
    }

    // --- 无头测试钩子：仅在 window.__DC_TEST__ 为真时导出，浏览器正常运行不受影响 ---
    if (typeof window !== 'undefined' && window.__DC_TEST__) {
      exports.__test = {
        get G() { return G; }, set G(v) { G = v; },
        newGame: newGame, production: production, tick: tick, buy: buy, train: train,
        research: research, buyShop: buyShop, doPrestige: doPrestige, triggerEvent: triggerEvent,
        offlineCatchup: offlineCatchup, fmt: fmt, save: save, load: load,
        sellFlops: sellFlops, setBurn: setBurn, fireStaff: fireStaff, rush: rush, inspire: inspire, publishPaper: publishPaper,
        develop: develop, upgradeHw: upgradeHw, isUnlocked: isUnlocked, hwLevel: hwLevel, isEquipItem: isEquipItem, mlvl: mlvl,
        ERAS: ERAS, TECH: TECH, SHOP: SHOP, EVENTS: EVENTS, allEra: allEra, slots: slots,
      };
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});



