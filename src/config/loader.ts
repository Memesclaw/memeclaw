import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * MemeClaw 配置结构
 */
export interface MemeClawConfig {
  api: {
    mode: 'direct' | 'relay';
    endpoint?: string;
    key?: string;
    model?: string;
    timeout?: number;
  };
  gateway: {
    port: number;
    host: string;
    wsPath: string;
  };
  telegram?: {
    enabled: boolean;
    botToken?: string;
    proxy?: string;
  };
  agent: {
    maxTokens?: number;
    temperature?: number;
    tools?: string[];
  };
  storage: {
    dbPath?: string;
    sessionsPath?: string;
  };
}

const DEFAULT_CONFIG: MemeClawConfig = {
  api: {
    mode: 'relay',
    endpoint: 'https://api.anthropic.com',
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
  agent: {
    maxTokens: 4096,
    temperature: 0.7,
    tools: ['get_weather', 'get_crypto_price', 'web_search', 'read_file', 'write_file'],
  },
  storage: {
    dbPath: path.join(os.homedir(), '.memeclaw', 'data.db'),
    sessionsPath: path.join(os.homedir(), '.memeclaw', 'sessions'),
  },
};

/**
 * 配置目录路径
 */
export function getConfigDir(): string {
  return path.join(os.homedir(), '.memeclaw');
}

/**
 * 配置文件路径
 */
export function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

/**
 * 深度合并对象
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target } as T;

  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        source[key] !== null &&
        typeof result[key] === 'object' &&
        !Array.isArray(result[key]) &&
        result[key] !== null
      ) {
        (result as any)[key] = deepMerge(result[key], source[key]);
      } else {
        (result as any)[key] = source[key];
      }
    }
  }

  return result;
}

/**
 * 加载完整配置
 */
export function loadConfig(): MemeClawConfig {
  const configPath = getConfigPath();
  let config: MemeClawConfig = { ...DEFAULT_CONFIG };

  // 从 config.json 加载
  if (fs.existsSync(configPath)) {
    try {
      const jsonContent = fs.readFileSync(configPath, 'utf-8');
      const jsonConfig = JSON.parse(jsonContent);
      config = deepMerge(config, jsonConfig);
    } catch (error) {
      console.warn(`⚠️ 读取配置文件失败: ${error}`);
    }
  }

  return config;
}

/**
 * 保存配置
 */
export function saveConfig(config: MemeClawConfig): void {
  const configDir = getConfigDir();
  const configPath = getConfigPath();

  // 确保配置目录存在
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`✅ 配置已保存到: ${configPath}`);
  } catch (error) {
    throw new Error(`保存配置失败: ${error}`);
  }
}

/**
 * 确保配置目录和必要文件存在
 */
export function ensureConfig(): void {
  const configDir = getConfigDir();
  const configPath = getConfigPath();

  // 创建配置目录
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log(`📁 创建配置目录: ${configDir}`);
  }

  // 如果配置文件不存在，创建默认配置
  if (!fs.existsSync(configPath)) {
    saveConfig(DEFAULT_CONFIG);
  }
}

/**
 * 获取 API 端点
 */
export function getApiEndpoint(): string {
  const config = loadConfig();
  if (config.api.mode === 'relay' && config.api.endpoint) {
    return config.api.endpoint;
  }
  return config.api.endpoint || 'https://api.anthropic.com';
}

/**
 * 获取 API Key
 */
export function getApiKey(): string | undefined {
  return loadConfig().api.key;
}

/**
 * 获取模型名称
 */
export function getModel(): string {
  return loadConfig().api.model || 'claude-opus-4-6';
}

/**
 * 获取 API 模式
 */
export function getApiMode(): 'direct' | 'relay' {
  return loadConfig().api.mode || 'relay';
}

/**
 * 获取 Telegram 配置
 */
export function getTelegramConfig(): { enabled: boolean; botToken?: string; proxy?: string } {
  const config = loadConfig();
  return {
    enabled: config.telegram?.enabled || false,
    botToken: config.telegram?.botToken,
    proxy: config.telegram?.proxy,
  };
}

/**
 * 获取 Gateway 配置
 */
export function getGatewayConfig(): { port: number; host: string; wsPath: string } {
  const config = loadConfig();
  return config.gateway;
}

/**
 * 获取完整 API 配置
 */
export function getApiConfig(): { mode: 'direct' | 'relay'; endpoint?: string; key?: string; model?: string; timeout?: number } {
  const config = loadConfig();
  return config.api;
}
