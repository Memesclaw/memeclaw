import fs from 'fs';
import path from 'path';
import { MemeClawConfig } from '../types';

// 默认配置
export const DEFAULT_CONFIG: MemeClawConfig = {
  gateway: {
    port: 18789,
    host: '127.0.0.1',
    wsPath: '/ws',
    auth: {
      enabled: false,
    },
  },
  agent: {
    model: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    temperature: 0.7,
    maxTokens: 4096,
  },
  api: {
    mode: 'direct',
  },
  skills: {
    enabled: true,
    autoLoad: false,  // 技能已通过代码注册
    skillPaths: [],
  },
  token: {
    enabled: false,
    taxRate: 100, // 1% in basis points
  },
  storage: {
    type: 'memory',
  },
};

export class ConfigManager {
  private config: MemeClawConfig;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || this.getDefaultConfigPath();
    this.config = this.loadConfig();
    // 允许环境变量覆盖配置（用于 Docker/K8s 部署）
    this.config = this.mergeConfig(this.config, ConfigManager.fromEnv());
  }

  private getDefaultConfigPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
    return path.join(homeDir, '.memeclaw', 'config.json');
  }

  private loadConfig(): MemeClawConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const userConfig = JSON.parse(raw);
        return this.mergeConfig(DEFAULT_CONFIG, userConfig);
      }
    } catch (error) {
      console.warn(`Failed to load config from ${this.configPath}, using defaults`);
    }
    return { ...DEFAULT_CONFIG };
  }

  private mergeConfig(
    base: MemeClawConfig,
    user: Partial<MemeClawConfig>
  ): MemeClawConfig {
    return {
      gateway: { ...base.gateway, ...user.gateway },
      agent: { ...base.agent, ...user.agent },
      api: { ...base.api, ...user.api },
      skills: { ...base.skills, ...user.skills },
      token: { ...base.token, ...user.token },
      storage: { ...base.storage, ...user.storage },
    };
  }

  public get<K extends keyof MemeClawConfig>(key: K): MemeClawConfig[K] {
    return this.config[key];
  }

  public getAll(): MemeClawConfig {
    return { ...this.config };
  }

  public set<K extends keyof MemeClawConfig>(
    key: K,
    value: MemeClawConfig[K]
  ): void {
    this.config[key] = value;
  }

  public save(): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  public reload(): void {
    this.config = this.loadConfig();
  }

  // 从环境变量加载配置
  public static fromEnv(): Partial<MemeClawConfig> {
    const config: Partial<MemeClawConfig> = {};

    if (process.env.MEMECLAW_PORT) {
      config.gateway = {
        ...config.gateway,
        port: parseInt(process.env.MEMECLAW_PORT, 10),
      } as any;
    }

    if (process.env.MEMECLAW_API_KEY) {
      config.api = {
        ...config.api,
        apiKey: process.env.MEMECLAW_API_KEY,
      } as any;
    }

    if (process.env.MEMECLAW_API_ENDPOINT) {
      config.api = {
        ...config.api,
        endpoint: process.env.MEMECLAW_API_ENDPOINT,
      } as any;
    }

    if (process.env.MEMECLAW_MODEL) {
      config.agent = {
        ...config.agent,
        model: process.env.MEMECLAW_MODEL,
      } as any;
    }

    if (process.env.MEMECLAW_TOKEN_ADDRESS) {
      config.token = {
        ...config.token,
        contractAddress: process.env.MEMECLAW_TOKEN_ADDRESS,
      } as any;
    }

    return config;
  }
}

// 单例实例
let configManager: ConfigManager | null = null;

export function getConfig(configPath?: string): ConfigManager {
  if (!configManager) {
    configManager = new ConfigManager(configPath);
  }
  return configManager;
}

export function resetConfig(): void {
  configManager = null;
}
