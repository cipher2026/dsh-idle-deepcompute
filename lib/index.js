/** 深算 DeepCompute — 宿主半：注册一条面向 agent 的系统提示公告；游戏本体在浏览器半。 */
const name = 'ui-deepcompute'
export const inject = ['systemPrompt']

const GUIDANCE = '本机已安装 dsh-deepcompute 插件（深算 DeepCompute，终端风 AI 实验室挂机游戏）：侧边栏「深算」入口，打开全宽终端页；存档在浏览器 localStorage（键 deepcompute.save.v1）。用户提到「深算 / DeepCompute / 挂机游戏 / AI 实验室」时即指本插件。'

export function apply(ctx) {
  try {
    ctx.systemPrompt.section({
      name: 'plugin:deepcompute',
      order: 320,
      text: GUIDANCE,
    })
  } catch (err) {
    ctx?.logger?.warn?.('[dsh-deepcompute] system prompt section failed:', err)
  }
}

export { name }
