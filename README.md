# 深算 DeepCompute

终端风 AI 实验室挂机游戏，DSH Web GUI 插件。

- 侧边栏「深算」入口 → 全宽终端页
- 存档：浏览器 localStorage（键 `deepcompute.save.v1`，10 秒自动保存）

## 玩法

买硬件产算力 → 算力训练模型 → 模型部署产资金/研究点/里程碑 → 研究点解锁科技树 → 里程碑满 → 范式革命（转生）进入新时代。

- 资源：资金 ¥ / 算力 FLOPs / 电力 MW / 研究点 RP / 影响力 IN（时代1+）/ 星际算力（时代3+）
- 时代：神经网络 → 大模型 → AGI → ASI → 纪元 5+（模板扩展）
- 转生：范式点 PP 在范式商店手动消费（自动炼丹 / 第二实验室 / 离线增强 / 产出增幅等）
- 随机事件：利好 / 利空 / 抉择，含现实大模型彩蛋（OpenAI、DeepSeek、Claude 等）
- 离线收益：上限 8 小时、效率 50%

## 命令

```
help / shop / buy <id> [数量] / models / train <id>
tech / research <id> / pshop / prestige [confirm] / auto
stats / era / save / export / import / reset [confirm]
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
