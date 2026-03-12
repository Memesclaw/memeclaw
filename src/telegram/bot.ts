import { Bot, Context, session } from 'grammy';
import { Agent, createAgent } from '../agent';
import { skillRegistry } from '../skills';

// 动态导入 socks-proxy-agent（如果可用）
let socksProxyAgent: any = null;
try {
  socksProxyAgent = require('socks-proxy-agent');
} catch {
  // socks-proxy-agent 未安装
}

/**
 * MemeClaw Telegram Bot 配置
 */
export interface TelegramBotConfig {
  token: string;
  proxy?: string; // socks 代理地址，如 socks5://127.0.0.1:7897
  agentConfig?: {
    model?: string;
    provider?: string;
  };
}

/**
 * 上下文类型
 */
export interface MemeClawContext extends Context {
  session: {
    userId?: string;
  };
}

/**
 * 创建 MemeClaw Telegram Bot
 * 参考 OpenClaw: extensions/telegram/src/bot.ts
 */
export function createMemeClawBot(config: TelegramBotConfig) {
  // 配置代理（如果需要）
  let botOptions: any = {};

  if (config.proxy && socksProxyAgent) {
    try {
      const agent = new socksProxyAgent.SocksProxyAgent(config.proxy);
      botOptions.client = {
        baseFetchConfig: {
          agent,
        },
      };
      console.log(`🔌 Telegram Bot 使用代理: ${config.proxy}`);
    } catch (error) {
      console.warn('⚠️ 代理配置失败，将尝试直接连接:', error);
    }
  }

  const bot = new Bot<MemeClawContext>(config.token, botOptions);

  // 创建 Agent 实例
  const agent = createAgent({
    model: config.agentConfig?.model || process.env.MEMECLAW_MODEL || 'claude-opus-4-6',
    provider: (config.agentConfig?.provider as any) || 'anthropic',
  });

  // 中间件：初始化会话
  bot.use(session({ initial: () => ({}) }));

  // 处理 /start 命令
  bot.command('start', async (ctx) => {
    const userId = ctx.from?.id.toString();

    if (!userId) {
      await ctx.reply('无法识别用户 ID');
      return;
    }

    // 创建或加载会话
    agent.createOrLoadSession({
      userId,
      channel: 'telegram',
    });

    ctx.session.userId = userId;

    await ctx.reply(
      `🦞 欢迎使用 MemeClaw！\n\n` +
      `我是你的 MEME 币智能助手，精通：\n` +
      `• 代币经济学分析\n` +
      `• Bonding Curve 计算\n` +
      `• Four.meme / Pump.fun 平台分析\n\n` +
      `直接发送消息与我对话，或使用以下命令：\n` +
      `/help - 查看帮助\n` +
      `/skills - 查看可用技能\n` +
      `/reset - 重置会话`
    );
  });

  // 处理 /help 命令
  bot.command('help', async (ctx) => {
    await ctx.reply(
      `🦞 *MemeClaw 帮助*\n\n` +
      `*命令列表:*\n` +
      `/start - 初始化会话\n` +
      `/help - 显示此帮助\n` +
      `/skills - 查看可用技能\n` +
      `/reset - 重置当前会话\n\n` +
      `*技能调用:*\n` +
      `/skill:tokenomics - 代币经济学分析\n` +
      `/skill:bonding-curve - Bonding Curve 计算\n` +
      `/skill:four-meme - Four.meme 平台分析\n\n` +
      `*使用方式:*\n` +
      `直接发送消息，或使用 /skill:技能名 参数`,
      { parse_mode: 'Markdown' }
    );
  });

  // 处理 /skills 命令
  bot.command('skills', async (ctx) => {
    const skills = agent.getAvailableSkills();

    let message = '📚 *可用技能:*\n\n';
    for (const skill of skills) {
      const escapedId = escapeMarkdown(skill.id);
      const escapedDesc = escapeMarkdown(skill.description);
      message += `• /skill:${escapedId} - ${escapedDesc}\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  });

  // 处理 /reset 命令
  bot.command('reset', async (ctx) => {
    const userId = ctx.from?.id.toString();

    if (userId) {
      agent.getOrCreateSessionForUser(userId, 'telegram');
      agent.resetSession();
    }

    await ctx.reply('🔄 会话已重置');
  });

  // 处理技能调用
  bot.command('skill', async (ctx) => {
    const text = ctx.message?.text || '';
    const userId = ctx.from?.id.toString();

    if (!userId) return;

    // 确保会话存在
    agent.getOrCreateSessionForUser(userId, 'telegram');

    // 检查技能调用格式: /skill:技能名 参数
    const skillMatch = text.match(/^\/skill:(\w+)(?:\s+(.*))?$/);

    if (skillMatch) {
      const skillId = skillMatch[1];
      const inputStr = skillMatch[2] || '';

      try {
        let input: any = {};
        try {
          input = inputStr ? JSON.parse(inputStr) : {};
        } catch {
          input = { query: inputStr };
        }

        const result = await agent.callSkill(skillId, input);
        const response = formatSkillResult(result);
        await ctx.reply(response, { parse_mode: 'Markdown' });
      } catch (error: any) {
        await ctx.reply(`❌ 错误: ${error.message}`);
      }
    } else {
      await ctx.reply('❌ 无效的技能调用格式。使用: /skill:技能名 参数');
    }
  });

  // 处理文本消息
  bot.on('message:text', async (ctx) => {
    const text = ctx.message?.text;
    const userId = ctx.from?.id.toString();

    if (!text || !userId) return;

    // 创建或加载会话
    agent.getOrCreateSessionForUser(userId, 'telegram');

    try {
      // 检查是否是技能调用
      const skillResult = await agent.autoExecuteSkill(text);

      if (skillResult) {
        const response = formatSkillResult(skillResult);
        await ctx.reply(response, { parse_mode: 'Markdown' });
      } else {
        // 普通聊天
        const response = await agent.chat(text);
        await ctx.reply(response.content);
      }
    } catch (error: any) {
      await ctx.reply(`❌ 错误: ${error.message}`);
    }
  });

  return bot;
}

/**
 * 格式化技能执行结果
 */
function formatSkillResult(result: any): string {
  if (typeof result === 'string') {
    return escapeMarkdown(result);
  }

  if (result.error) {
    return `❌ 错误: ${escapeMarkdown(result.error)}`;
  }

  if (result.data) {
    return `✅ \`\`\`\n${JSON.stringify(result.data, null, 2)}\n\`\`\``;
  }

  return `\`\`\`\n${JSON.stringify(result, null, 2)}\n\`\`\``;
}

/**
 * 转义 Markdown 特殊字符 (Telegram MarkdownV2)
 * 只转义必须转义的字符，保留 ** 和 # 格式
 */
function escapeMarkdown(text: string): string {
  // Telegram MarkdownV2 需要转义的字符: _ * [ ] ( ) ~ ` > # + - = | { } . !
  // 但我们保留 ** 加粗 和 # 标题，所以只转义其他字符
  return text
    .replace(/\\/g, '\\\\')  // 先转义反斜杠
    .replace(/([_\[\]()~`>+\-=|{}.!])/g, '\\$1');  // 转义其他特殊字符，但保留 * 和 #
}

/**
 * 启动 Telegram Bot
 */
export async function startTelegramBot(token: string, proxy?: string): Promise<void> {
  // 从环境变量读取代理配置
  const proxyUrl = proxy || process.env.TELEGRAM_PROXY || process.env.SOCKS_PROXY;

  const bot = createMemeClawBot({
    token,
    proxy: proxyUrl,
  });

  console.log('🦞 MemeClaw Telegram Bot 已启动');
  if (proxyUrl) {
    console.log(`🔌 使用代理: ${proxyUrl}`);
  }
  console.log('📱 等待消息...');

  await bot.start();
}

/**
 * 从环境变量获取 Bot Token
 */
export function getTelegramBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}
