/**
 * MemeClaw - MEME AI Assistant
 *
 * 主入口文件
 * 运行: npm start 或 node dist/index.js
 */

import { createMemeClaw } from './index';
import { getConfig } from './config';
import { skillRegistry } from './skills';
import chalk from 'chalk';

async function main() {
  console.log(chalk.red.bold('\n🦞 MemeClaw v1.0.0'));
  console.log(chalk.gray('   The AI assistant that learns any MEME skill\n'));

  const config = getConfig();

  // 显示配置信息
  const gatewayConfig = config.get('gateway');
  const agentConfig = config.get('agent');

  console.log(chalk.cyan('Configuration:'));
  console.log(chalk.gray(`   Model: ${agentConfig.model}`));
  console.log(chalk.gray(`   Provider: ${agentConfig.provider}`));
  console.log(chalk.gray(`   Gateway: ${gatewayConfig.host}:${gatewayConfig.port}`));
  console.log();

  // 启动 MemeClaw
  const memeclaw = createMemeClaw();

  try {
    await memeclaw.start();

    // 显示可用技能
    const skills = skillRegistry.getAll();
    if (skills.length > 0) {
      console.log(chalk.cyan(`\n📚 Loaded ${skills.length} skills:`));
      skills.forEach(skill => {
        console.log(chalk.gray(`   - ${skill.name}: ${skill.description}`));
      });
    }

    console.log(chalk.green.bold('\n✅ MemeClaw is ready!'));
    console.log(chalk.gray('\n   Endpoints:'));
    console.log(chalk.gray(`   - HTTP API: http://${gatewayConfig.host}:${gatewayConfig.port}`));
    console.log(chalk.gray(`   - WebSocket: ws://${gatewayConfig.host}:${gatewayConfig.port}${gatewayConfig.wsPath}`));
    console.log(chalk.gray(`   - Health: http://${gatewayConfig.host}:${gatewayConfig.port}/health`));
    console.log();

    console.log(chalk.yellow('Press Ctrl+C to stop\n'));

    // 优雅退出
    const shutdown = async () => {
      console.log(chalk.yellow('\n\n👋 Shutting down MemeClaw...'));
      await memeclaw.stop();
      console.log(chalk.green('✅ Goodbye!'));
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error: any) {
    console.error(chalk.red('❌ Failed to start MemeClaw:'), error.message);
    console.log();
    console.log(chalk.yellow('Troubleshooting:'));
    console.log(chalk.gray('   1. Check your API key in .env file'));
    console.log(chalk.gray('   2. Make sure port 18789 is available'));
    console.log(chalk.gray('   3. Run "memeclaw init" to configure'));
    process.exit(1);
  }
}

main().catch(console.error);
