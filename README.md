# 深算 DeepCompute

终端风 AI 实验室挂机游戏，DSH Web GUI 插件。

- 右侧边缘「深算」标签 → 滑出式终端面板
- 存档：浏览器 localStorage（键 `deepcompute.save.v1`，10 秒自动保存，支持 `export`/`import`）

## 玩法

买硬件产算力 → 算力训练/升级模型 → 模型部署产资金/研究点/里程碑 → 研究点投入科技树与研发 → 里程碑满 → 范式革命（转生）进入新时代。

## 资源

| 资源 | 来源 | 用途 |
|------|------|------|
| 资金 ¥ | 模型产出、出售算力 | 购买设备、雇人、发工资 |
| 算力 FLOPs | 硬件产出（受电力容量约束） | 训练/升级模型、出售 |
| 电力 MW | 电力设备（容量） | 支撑硬件运行 |
| 研究点 RP | 员工产出、训练奖励 | 科技树、冲刺、灵感、论文、设备研发 |
| 影响力 IN | 时代 2+ 模型产出 | 时代专属科技、发论文兑换 |
| 星际算力 | 时代 4+ 设备/模型产出 | 时代专属科技 |

## 核心系统

### 训练与模型版本
- 训练按算力产出速率持续消耗（需要时间），训练槽限制并行数量
- 训练完成的模型可反复 `train` 升级（v1 → v2 → v3…），成本 ×2.5/级、收入 ×2/级

### 科技树
- 花 RP 解锁永久加成（训练速度 / 算力 / 收入 / 研究员产出等），跨转生保留

### 员工与工资
- 员工持续产出研究点，并**持续消耗资金发工资**（工资 = 研究产出 × 0.5）
- 资金见底且工资高于收入时员工**罢工**（研究点归零），可用 `fire` 解雇止损

### 算力库存
- 空闲时算力库存累积；训练时**烧库存提速**（`burn` 可调 1–20×）
- `sell` 可把算力库存出售换成资金或研究点

### 设备研发（RP）
- 商店里 2、3 档硬件/电力设备需先花 RP `develop` 解锁
- `upgrade` 提升设备等级，每级产出/供电 +50%（能耗不变 → 产出比逐级提高）

### 转生（范式革命）
- 训练出本时代终极模型 → 里程碑满 → `prestige` 获得范式点 PP
- PP 在范式商店手动消费：自动炼丹 / 第二实验室 / 离线增强 / 产出增幅等
- 进入新时代解锁新硬件线 / 模型线 / 新系统 / 剧情目标

### 随机事件
- 利好 / 利空 / 抉择，含现实大模型彩蛋（OpenAI、DeepSeek、Claude 等）

### 离线收益
- 上限 8 小时、效率 50%（可升级），训练同步推进，事件离线不触发

## 命令

```
help / shop / stats / era / save / export / import / reset [confirm]

buy <id> [数量]          购买硬件/员工/范式项目
fire <员工id> [数量]     解雇员工（降工资）
models                   查看模型线
train <id>               训练 / 升级模型
tech / research <id>     科技树
pshop                    范式商店
prestige [confirm]       范式革命（转生）
auto                     开关自动炼丹

sell <数量|all> [money|rp]   出售算力库存
burn <1-20>                  烧库存倍率
rush                         研究冲刺（+50% 产出 90 秒）
inspire <模型> [RP]          灵感注入（加速训练）
paper <RP|all>               发论文（RP 换影响力）
develop <设备id>             开发/解锁硬件或电力设备
upgrade <设备id>             提升硬件/电力设备等级
```

## 安装（开发态，本地链接）

```bash
# 在 profile 目录把本包链接进 node_modules
dsh plugin --profile web add "link:/path/to/dsh-deepcompute"

# 在 ~/.dsh/cordis.patch.yml 末尾追加插件行：
# - insert:
#     - id: ui-deepcompute
#       name: 'dsh-deepcompute'

# 重启 dsh web 后生效
```

## 结构

- `lib/index.js` — 宿主半：注册面向 agent 的系统提示公告
- `lib/client.js` — 浏览器半：游戏引擎 + 终端 UI（自包含，无构建步骤）
- `test/headless.test.mjs` — 无头引擎测试（`node test/headless.test.mjs`）
- `DESIGN.md` — 完整设计文档

完整设计见 [DESIGN.md](./DESIGN.md)。
