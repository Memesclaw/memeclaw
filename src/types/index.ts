// 核心类型定义
export interface MemeClawConfig {
  // Gateway 配置
  gateway: {
    port: number;
    host: string;
    wsPath: string;
    auth?: {
      enabled: boolean;
      token?: string;
    };
  };

  // Agent 配置
  agent: {
    model: string;
    provider: 'openai' | 'anthropic' | 'custom';
    temperature?: number;
    maxTokens?: number;
  };

  // API 接入配置
  api: {
    mode: 'direct' | 'relay' | 'custom';
    endpoint?: string;
    apiKey?: string;
    relayConfig?: {
      endpoint: string;
      format: 'openai' | 'anthropic' | 'custom';
      headers?: Record<string, string>;
    };
  };

  // 技能配置
  skills: {
    enabled: boolean;
    autoLoad: boolean;
    skillPaths: string[];
  };

  // 代币/税收配置
  token: {
    enabled: boolean;
    contractAddress?: string;
    taxRate: number; // 1% = 100
    rewardAddress?: string;
  };

  // 存储配置
  storage: {
    type: 'memory' | 'file' | 'database';
    path?: string;
  };
}

// API 提供者类型
export type APIProvider = 'openai' | 'anthropic' | 'gemini' | 'custom';

// API 接入模式
export type APIMode = 'direct' | 'relay' | 'custom';

// 消息类型
export interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// 会话类型
export type SessionChannel = 'cli' | 'telegram' | 'web';

export interface Session {
  id: string;
  userId?: string;
  channel?: SessionChannel;
  messages: Message[];
  model: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

// 技能定义
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'memecoin' | 'tokenomics' | 'trading' | 'analysis' | 'custom' | 'system';
  enabled: boolean;
  handler: (input: any, context: any) => Promise<any>;
  prompt?: string; // 用于 Markdown 技能
  metadata?: Record<string, any>;
}

// 技能执行结果
export interface SkillResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

// 税收奖励记录
export interface TaxReward {
  id: string;
  skillId: string;
  contributor: string;
  amount: string;
  timestamp: number;
  txHash?: string;
}

// WebSocket 消息类型
export type WSMessageType =
  | 'connected'
  | 'disconnected'
  | 'message'
  | 'response'
  | 'skill_call'
  | 'skill_result'
  | 'error'
  | 'status'
  | 'thinking_start'
  | 'thinking_end'
  | 'cron_job';

export interface WSMessage {
  type: WSMessageType;
  data?: any;
  sessionId?: string;
  timestamp: number;
}

// 链上数据类型
export interface ChainData {
  tokenAddress: string;
  price?: string;
  marketCap?: string;
  liquidity?: string;
  holders?: number;
  txHash?: string;
}

// 代币经济学数据
export interface TokenomicsData {
  name: string;
  symbol: string;
  totalSupply: string;
  circulatingSupply: string;
  taxRate: number;
  liquidity: string;
  marketCap: string;
  bondingCurve?: {
    currentPrice: string;
    targetPrice: string;
    graduationThreshold: string;
  };
}

// Four.meme 平台数据
export interface FourMemeToken {
  address: string;
  name: string;
  symbol: string;
  marketCap: string;
  graduated: boolean;
  taxRate: number;
}
