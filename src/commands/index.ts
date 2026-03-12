#!/usr/bin/env node
/**
 * MemeClaw CLI 入口
 * 参考 OpenClaw: src/entry.ts
 */

import { runWizard, checkConfigStatus } from '../wizard';
import { startTelegramBot, getTelegramBotToken } from '../telegram/bot';
import { createAgent } from '../agent';
import { getConfig } from '../config';
import chalk from 'chalk';
import minimist from 'minimist';

// 加载配置
import '../config/loader';

const args = minimist(process.argv.slice(2));
const command = args._[0];

async function main() {
  console.log(chalk.red.bold('\n🦞 MemeClaw CLI'));
  console.log(chalk.gray('   The AI assistant that learns any MEME skill\n'));

  switch (command) {
    case 'init':
    case 'onboard':
    case 'setup':
      // 配置向导
      await runWizard();
      break;

    case 'start':
    case 'gateway':
      // 启动 Gateway 服务
      await startGateway();
      break;

    case 'telegram':
    case 'tg':
      // 启动 Telegram Bot
      await startTelegram();
      break;

    case 'status':
      // 检查配置状态
      checkConfigStatus();
      break;

    case 'chat':
      // 命令行聊天
      await chat(args._.slice(1).join(' ') || args.m || args.message);
      break;

    case 'skills':
      // 列出技能
      listSkills();
      break;

    case 'sessions':
      // 列出会话
      await listSessions();
      break;

    case 'help':
    case '--help':
    case '-h':
    default:
      showHelp();
      break;
  }
}

function showHelp() {
  console.log(chalk.cyan('使用方法:'));
  console.log(chalk.gray('   npx memeclaw <command> [options]\n'));

  console.log(chalk.cyan('命令:'));
  console.log(chalk.gray('   init, onboard    启动配置向导（创建 ~/.memeclaw/config.json）'));
  console.log(chalk.gray('   start, gateway   启动 Gateway 服务'));
  console.log(chalk.gray('   telegram, tg     启动 Telegram Bot'));
  console.log(chalk.gray('   status           检查配置状态'));
  console.log(chalk.gray('   chat [-m "消息"]  命令行聊天'));
  console.log(chalk.gray('   skills           列出可用技能'));
  console.log(chalk.gray('   sessions         列出所有会话'));
  console.log(chalk.gray('   help             显示帮助\n'));

  console.log(chalk.cyan('配置文件:'));
  console.log(chalk.gray('   ~/.memeclaw/config.json  主配置文件（JSON 格式）'));
  console.log();

  console.log(chalk.cyan('数据存储:'));
  console.log(chalk.gray('   ~/.memeclaw/           配置目录'));
  console.log(chalk.gray('   ~/.memeclaw/data.db    SQLite 数据库'));
  console.log(chalk.gray('   ~/.memeclaw/sessions/  会话文件 (JSONL)'));
  console.log();
}

async function startGateway() {
  const { Gateway } = await import('../gateway');
  const config = getConfig();

  const gatewayConfig = config.get('gateway');
  const telegramToken = getTelegramBotToken();

  const gateway = new Gateway({
    port: gatewayConfig.port,
    host: gatewayConfig.host,
    wsPath: gatewayConfig.wsPath,
    telegram: {
      enabled: !!telegramToken,
      botToken: telegramToken || undefined,
    },
  });

  try {
    await gateway.start();

    console.log(chalk.green.bold('\n✅ MemeClaw Gateway 已启动!'));
    console.log(chalk.gray('\n   端点:'));
    console.log(chalk.gray(`   - HTTP API: http://${gatewayConfig.host}:${gatewayConfig.port}`));
    console.log(chalk.gray(`   - WebSocket: ws://${gatewayConfig.host}:${gatewayConfig.port}${gatewayConfig.wsPath}`));
    console.log(chalk.gray(`   - Health: http://${gatewayConfig.host}:${gatewayConfig.port}/health`));

    if (telegramToken) {
      console.log(chalk.gray(`   - Telegram Bot: 已配置`));
    }
    console.log();

    console.log(chalk.yellow('按 Ctrl+C 停止\n'));

    // 优雅退出
    const shutdown = async () => {
      console.log(chalk.yellow('\n\n👋 正在关闭...'));
      await gateway.stop();
      console.log(chalk.green('✅ 已停止'));
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error: any) {
    console.error(chalk.red('❌ 启动失败:'), error.message);
    process.exit(1);
  }
}

async function startTelegram() {
  const token = getTelegramBotToken();

  if (!token) {
    console.error(chalk.red('❌ 未配置 Telegram Bot Token'));
    console.log(chalk.gray('\n请设置环境变量:'));
    console.log(chalk.gray('   TELEGRAM_BOT_TOKEN=your-bot-token'));
    console.log(chalk.gray('\n或运行:'));
    console.log(chalk.gray('   npx memeclaw init'));
    process.exit(1);
  }

  console.log(chalk.cyan('🤖 启动 Telegram Bot...\n'));

  try {
    await startTelegramBot(token);
  } catch (error: any) {
    console.error(chalk.red('❌ 启动失败:'), error.message);
    process.exit(1);
  }
}

async function chat(message?: string) {
  if (!message) {
    console.error(chalk.red('❌ 请提供消息内容'));
    console.log(chalk.gray('   npx memeclaw chat -m "你好"'));
    process.exit(1);
  }

  const agent = createAgent();
  agent.createOrLoadSession({ channel: 'cli' });

  try {
    const response = await agent.chat(message);
    console.log(chalk.cyan('\n🦞 MemeClaw:'));
    console.log(response.content);
    console.log();
  } catch (error: any) {
    console.error(chalk.red('❌ 错误:'), error.message);
  }
}

function listSkills() {
  const { skillRegistry } = require('../skills');
  const skills = skillRegistry.getAll();

  console.log(chalk.cyan('📚 可用技能:\n'));

  if (skills.length === 0) {
    console.log(chalk.gray('   暂无技能'));
    return;
  }

  for (const skill of skills) {
    console.log(chalk.white(`   /skill:${skill.id}`));
    console.log(chalk.gray(`   ${skill.description}`));
    console.log();
  }
}

async function listSessions() {
  const agent = createAgent();
  const sessions = agent.listSessions();

  console.log(chalk.cyan('📋 会话列表:\n'));

  if (sessions.length === 0) {
    console.log(chalk.gray('   暂无会话'));
    return;
  }

  for (const session of sessions) {
    const date = new Date(session.updatedAt).toLocaleString();
    console.log(chalk.white(`   ${session.id}`));
    console.log(chalk.gray(`   消息数: ${session.messages.length} | 更新: ${date}`));
    console.log();
  }
}

main().catch(console.error);
