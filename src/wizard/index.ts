/**
 * MemeClaw 配置向导
 * 统一使用 config.json 配置文件
 */

import * as p from '@clack/prompts';
import pc from 'picocolors';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * 配置结构
 */
interface Config {
  api: {
    mode: 'direct' | 'relay';
    endpoint?: string;
    key?: string;
    model: string;
    timeout?: number;
  };
  gateway: {
    port: number;
    host: string;
    wsPath: string;
  };
  telegram: {
    enabled: boolean;
    botToken?: string;
  };
}

/**
 * 获取配置目录
 */
function getConfigDir(): string {
  return path.join(os.homedir(), '.memeclaw');
}

/**
 * 获取配置文件路径
 */
function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Config = {
  api: {
    mode: 'relay',
    model: 'claude-opus-4-6',
    timeout: 120000,  // 2 分钟
  },
  gateway: {
    port: 18789,
    host: '127.0.0.1',
    wsPath: '/ws',
  },
  telegram: {
    enabled: false,
  },
};

/**
 * 确保配置目录存在
 */
function ensureConfigDir(): void {
  const configDir = getConfigDir();
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

/**
 * 保存配置到 config.json
 */
function saveConfig(config: Config): void {
  ensureConfigDir();
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * 加载现有配置
 */
function loadConfig(): Config | null {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 运行配置向导
 */
export async function runWizard(): Promise<void> {
  console.clear();
  console.log(pc.cyan('🦞 MemeClaw 配置向导'));
  console.log(pc.gray('─'.repeat(40)));
  console.log();

  const configDir = getConfigDir();
  console.log(pc.dim(`配置目录: ${configDir}`));
  console.log();

  // 加载现有配置
  const existingConfig = loadConfig();

  // 步骤 1: API 模式选择
  const apiModeRaw = await p.select({
    message: '选择 API 接入模式:',
    options: [
      { value: 'relay', label: '中转站 (OpenAI 兼容格式)' },
      { value: 'direct', label: '直接接入 (官方 API)' },
    ],
    initialValue: existingConfig?.api.mode || 'relay',
  });

  if (p.isCancel(apiModeRaw)) {
    console.log(pc.yellow('已取消'));
    process.exit(0);
  }
  const apiMode = apiModeRaw as 'direct' | 'relay';

  // 步骤 2: 配置 API 端点和密钥
  let apiEndpoint = '';
  let apiKey = '';

  if (apiMode === 'relay') {
    const endpointRaw = await p.text({
      message: 'API 端点地址:',
      placeholder: 'https://api.example.com',
      initialValue: existingConfig?.api.endpoint || '',
      validate: (value) => {
        if (!value) return '请输入 API 端点地址';
        if (!value.startsWith('http')) return '请输入有效的 URL';
        return undefined;
      },
    });

    if (p.isCancel(endpointRaw)) {
      console.log(pc.yellow('已取消'));
      process.exit(0);
    }
    apiEndpoint = endpointRaw as string;

    const apiKeyRaw = await p.text({
      message: 'API 密钥:',
      placeholder: 'sk-xxxxxxxx',
      initialValue: existingConfig?.api.key || '',
      validate: (value) => {
        if (!value) return '请输入 API 密钥';
        return undefined;
      },
    });

    if (p.isCancel(apiKeyRaw)) {
      console.log(pc.yellow('已取消'));
      process.exit(0);
    }
    apiKey = apiKeyRaw as string;
  } else {
    const providerRaw = await p.select({
      message: '选择 API 提供商:',
      options: [
        { value: 'anthropic', label: 'Anthropic (Claude)' },
        { value: 'openai', label: 'OpenAI (GPT)' },
      ],
    });

    if (p.isCancel(providerRaw)) {
      console.log(pc.yellow('已取消'));
      process.exit(0);
    }
    const provider = providerRaw as string;

    if (provider === 'anthropic') {
      apiEndpoint = 'https://api.anthropic.com';
    } else if (provider === 'openai') {
      apiEndpoint = 'https://api.openai.com';
    }

    const apiKeyRaw = await p.text({
      message: `${provider.toUpperCase()} API Key:`,
      placeholder: 'sk-xxxxxxxx',
      validate: (value) => {
        if (!value) return '请输入 API Key';
        return undefined;
      },
    });

    if (p.isCancel(apiKeyRaw)) {
      console.log(pc.yellow('已取消'));
      process.exit(0);
    }
    apiKey = apiKeyRaw as string;
  }

  // 步骤 3: 模型选择
  const modelRaw = await p.text({
    message: '默认模型:',
    placeholder: 'claude-opus-4-6',
    initialValue: existingConfig?.api.model || 'claude-opus-4-6',
  });

  if (p.isCancel(modelRaw)) {
    console.log(pc.yellow('已取消'));
    process.exit(0);
  }
  const model = (modelRaw as string) || 'claude-opus-4-6';

  // 步骤 4: Telegram Bot (可选)
  const enableTelegramRaw = await p.confirm({
    message: '是否配置 Telegram Bot?',
    initialValue: existingConfig?.telegram.enabled || false,
  });

  if (p.isCancel(enableTelegramRaw)) {
    console.log(pc.yellow('已取消'));
    process.exit(0);
  }
  const enableTelegram = enableTelegramRaw as boolean;

  let telegramToken = '';
  if (enableTelegram) {
    const tokenRaw = await p.text({
      message: 'Telegram Bot Token:',
      placeholder: '从 @BotFather 获取',
      initialValue: existingConfig?.telegram.botToken || '',
      validate: (value) => {
        if (!value) return '请输入 Bot Token';
        return undefined;
      },
    });

    if (p.isCancel(tokenRaw)) {
      console.log(pc.yellow('已取消'));
      process.exit(0);
    }
    telegramToken = tokenRaw as string;
  }

  // 步骤 5: 确认配置
  console.log();
  console.log(pc.cyan('📋 配置摘要:'));
  console.log();
  console.log(`  API 模式: ${apiMode === 'relay' ? '中转站' : '直接接入'}`);
  console.log(`  端点: ${apiEndpoint}`);
  console.log(`  模型: ${model}`);
  console.log(`  Telegram: ${enableTelegram ? '✅ 已配置' : '❌ 未配置'}`);

  const confirmRaw = await p.confirm({
    message: '确认保存配置?',
    initialValue: true,
  });

  if (p.isCancel(confirmRaw)) {
    console.log(pc.yellow('已取消'));
    process.exit(0);
  }
  const confirm = confirmRaw as boolean;

  if (!confirm) {
    console.log(pc.yellow('已取消'));
    process.exit(0);
  }

  // 保存配置
  const config: Config = {
    api: {
      mode: apiMode,
      endpoint: apiEndpoint,
      key: apiKey,
      model: model,
      timeout: 120000,  // 2 分钟
    },
    gateway: existingConfig?.gateway || DEFAULT_CONFIG.gateway,
    telegram: {
      enabled: enableTelegram,
      botToken: enableTelegram ? telegramToken : undefined,
    },
  };

  saveConfig(config);

  console.log();
  console.log(pc.green('✅ 配置已保存!'));
  console.log();
  console.log(pc.cyan('下一步:'));
  console.log(`  1. 运行 ${pc.yellow('npm run gateway')} 启动服务`);
  console.log(`  2. 访问 http://127.0.0.1:18789`);
  console.log();

  p.note(getConfigPath(), '配置文件位置');
}

/**
 * 检查配置状态
 */
export function checkConfigStatus(): boolean {
  const configDir = getConfigDir();
  const configPath = getConfigPath();

  console.log('📋 配置状态:\n');
  console.log(`  配置目录: ${configDir}`);

  if (!fs.existsSync(configPath)) {
    console.log(`  ${pc.yellow('⚠️  未配置')}`);
    console.log(`\n运行 ${pc.cyan('npm run onboard')} 开始配置`);
    return false;
  }

  console.log(`  ${pc.green('✅ 已配置')}`);

  try {
    const config: Config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    console.log(`  API 模式: ${config.api.mode}`);
    console.log(`  模型: ${config.api.model}`);
    console.log(`  API Key: ${config.api.key ? '******' : '未设置'}`);
    console.log(`  Telegram: ${config.telegram.enabled ? '已启用' : '未启用'}`);
  } catch (e) {
    console.log(`  ${pc.red('❌ 配置文件格式错误')}`);
    return false;
  }

  return true;
}
