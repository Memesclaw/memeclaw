import axios, { AxiosInstance } from 'axios';
import { APIMode, APIProvider } from '../types';
import { ToolDefinition, ToolCall } from './tools';

export interface APIConfig {
  mode: APIMode;
  provider: APIProvider;
  apiKey?: string;
  endpoint?: string;
  timeout?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string; // 用于 tool 消息
  tool_calls?: ToolCall[]; // 用于 assistant 消息
}

export interface ChatResponse {
  content: string;
  model: string;
  toolCalls?: ToolCall[]; // 工具调用
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  delta?: string;
  done?: boolean;
}

// 中转站配置
export interface RelayConfig {
  endpoint: string;
  format: 'openai' | 'anthropic' | 'custom';
  apiKey?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * API 客户端 - 支持多种接入模式
 */
export class APIClient {
  private client: AxiosInstance;
  private config: APIConfig;
  private relayConfig?: RelayConfig;

  constructor(config: APIConfig) {
    this.config = config;
    this.client = axios.create({
      timeout: config.timeout || 60000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 设置中转站配置
   */
  public setRelayConfig(config: RelayConfig): void {
    this.relayConfig = config;
    this.config.mode = 'relay';
  }

  /**
   * 获取当前接入模式
   */
  public getMode(): APIMode {
    return this.config.mode;
  }

  /**
   * 发送聊天请求
   */
  public async chat(
    messages: ChatMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      tools?: ToolDefinition[]; // 添加 tools 参数
    }
  ): Promise<ChatResponse> {
    switch (this.config.mode) {
      case 'direct':
        return this.directChat(messages, options);
      case 'relay':
        return this.relayChat(messages, options);
      case 'custom':
        return this.customChat(messages, options);
      default:
        throw new Error(`Unknown API mode: ${this.config.mode}`);
    }
  }

  /**
   * 直接模式 - 直接调用 API 提供商
   */
  private async directChat(
    messages: ChatMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      tools?: ToolDefinition[];
    }
  ): Promise<ChatResponse> {
    const model = options?.model || this.getModel();

    switch (this.config.provider) {
      case 'openai':
        return this.openAIChat(messages, { ...options, model });
      case 'anthropic':
        return this.anthropicChat(messages, { ...options, model });
      case 'gemini':
        return this.geminiChat(messages, { ...options, model });
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  /**
   * OpenAI 聊天
   */
  private async openAIChat(
    messages: ChatMessage[],
    options: any
  ): Promise<ChatResponse> {
    const endpoint = options.endpoint || 'https://api.openai.com/v1/chat/completions';

    const response = await this.client.post(endpoint, {
      model: options.model || 'gpt-4',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    }, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    const choice = response.data.choices[0];
    return {
      content: choice.message.content,
      model: response.data.model,
      usage: {
        promptTokens: response.data.usage?.prompt_tokens || 0,
        completionTokens: response.data.usage?.completion_tokens || 0,
        totalTokens: response.data.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Anthropic 聊天
   */
  private async anthropicChat(
    messages: ChatMessage[],
    options: any
  ): Promise<ChatResponse> {
    const endpoint = options.endpoint || 'https://api.anthropic.com/v1/messages';

    // 分离系统消息
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const response = await this.client.post(endpoint, {
      model: options.model || 'claude-3-5-sonnet-20241022',
      messages: chatMessages,
      system: systemMessage?.content,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
    }, {
      headers: {
        'x-api-key': this.config.apiKey || '',
        'anthropic-version': '2023-06-01',
      },
    });

    return {
      content: response.data.content[0].text,
      model: response.data.model,
      usage: {
        promptTokens: response.data.usage?.input_tokens || 0,
        completionTokens: response.data.usage?.output_tokens || 0,
        totalTokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0),
      },
    };
  }

  /**
   * Gemini 聊天
   */
  private async geminiChat(
    messages: ChatMessage[],
    options: any
  ): Promise<ChatResponse> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${options.model || 'gemini-pro'}:generateContent?key=${this.config.apiKey}`;

    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const response = await this.client.post(endpoint, { contents });

    return {
      content: response.data.candidates[0].content.parts[0].text,
      model: options.model || 'gemini-pro',
    };
  }

  /**
   * 中转站模式 - 通过中转站调用 API
   */
  private async relayChat(
    messages: ChatMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      tools?: ToolDefinition[];
    }
  ): Promise<ChatResponse> {
    if (!this.relayConfig) {
      throw new Error('Relay config not set');
    }

    const model = options?.model || this.getModel();

    let payload: any;
    // 使用 Map 来确保 header 键值都是字符串
    const headersMap = new Map<string, string>();

    // 复制现有 headers
    if (this.relayConfig.headers && typeof this.relayConfig.headers === 'object') {
      for (const [key, value] of Object.entries(this.relayConfig.headers)) {
        if (typeof key === 'string' && typeof value === 'string') {
          headersMap.set(key, value);
        }
      }
    }

    // 构建完整的 API 端点路径
    let endpoint = this.relayConfig.endpoint;
    if (this.relayConfig.format === 'openai') {
      // 如果端点不包含 /v1/chat/completions，自动添加
      if (!endpoint.includes('/chat/completions')) {
        endpoint = endpoint.replace(/\/$/, '') + '/v1/chat/completions';
      }
    }

    switch (this.relayConfig.format) {
      case 'openai':
        payload = {
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
        };
        // 添加工具支持
        if (options?.tools && options.tools.length > 0) {
          payload.tools = options.tools;
        }
        if (this.relayConfig.apiKey) {
          console.log(`🔑 Setting Authorization header with key: ${this.relayConfig.apiKey.substring(0, 15)}...`);
          console.log(`📊 Key length: ${this.relayConfig.apiKey.length}`);
          headersMap.set('Authorization', `Bearer ${this.relayConfig.apiKey}`);
        }
        break;

      case 'anthropic':
        const systemMessage = messages.find(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');
        payload = {
          model,
          messages: chatMessages,
          system: systemMessage?.content,
          max_tokens: options?.maxTokens ?? 4096,
          temperature: options?.temperature ?? 0.7,
        };
        // 添加工具支持 (Anthropic 格式)
        if (options?.tools && options.tools.length > 0) {
          payload.tools = options.tools.map(t => ({
            name: t.function.name,
            description: t.function.description,
            input_schema: t.function.parameters,
          }));
        }
        if (this.relayConfig.apiKey) {
          headersMap.set('x-api-key', this.relayConfig.apiKey);
          headersMap.set('anthropic-version', '2023-06-01');
        }
        break;

      default:
        throw new Error(`Unsupported relay format: ${this.relayConfig.format}`);
    }

    // 将 Map 转换为普通对象
    const headersObj: Record<string, string> = {};
    headersMap.forEach((value, key) => {
      headersObj[key] = value;
    });

    // 详细日志
    const payloadStr = JSON.stringify(payload);
    console.log('📦 Request payload size:', payloadStr.length, 'bytes');
    console.log('📦 Tools count:', options?.tools?.length || 0);
    console.log('📦 Messages count:', messages.length);

    const response = await this.client.post(endpoint, payload, { headers: headersObj });

    console.log('✅ Response status:', response.status);
    if (response.status !== 200) {
      console.error('❌ Response data:', response.data);
    }

    // 根据格式解析响应
    if (this.relayConfig.format === 'openai') {
      const choice = response.data.choices?.[0];
      if (!choice) {
        throw new Error(`Invalid relay response format: ${JSON.stringify(response.data)}`);
      }

      // 检查是否有工具调用
      const toolCalls = choice.message?.tool_calls;

      return {
        content: choice.message?.content || '',
        model: response.data.model,
        toolCalls: toolCalls,
        usage: {
          promptTokens: response.data.usage?.prompt_tokens || 0,
          completionTokens: response.data.usage?.completion_tokens || 0,
          totalTokens: response.data.usage?.total_tokens || 0,
        },
      };
    } else {
      // Anthropic 格式
      const content = response.data.content?.[0];
      return {
        content: content?.text || '',
        model: response.data.model,
        toolCalls: content?.type === 'tool_use' ? [{
          id: response.data.id,
          type: 'function',
          function: {
            name: content.name,
            arguments: JSON.stringify(content.input),
          },
        }] : undefined,
      };
    }
  }

  /**
   * 自定义模式 - 完全自定义的端点
   */
  private async customChat(
    messages: ChatMessage[],
    options?: any
  ): Promise<ChatResponse> {
    if (!this.config.endpoint) {
      throw new Error('Custom endpoint not configured');
    }

    const response = await this.client.post(this.config.endpoint, {
      messages,
      options,
    });

    return response.data as ChatResponse;
  }

  /**
   * 获取默认模型
   */
  private getModel(): string {
    switch (this.config.provider) {
      case 'openai':
        return 'gpt-4';
      case 'anthropic':
        return 'claude-3-5-sonnet-20241022';
      case 'gemini':
        return 'gemini-pro';
      default:
        return 'gpt-4';
    }
  }

  /**
   * 测试连接
   */
  public async test(): Promise<boolean> {
    try {
      await this.chat([{ role: 'user', content: 'Hi' }], { maxTokens: 10 });
      return true;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
}

/**
 * 创建 API 客户端工厂函数
 */
export function createAPIClient(config: APIConfig): APIClient {
  return new APIClient(config);
}

/**
 * 从环境变量创建配置
 */
export function configFromEnv(): APIConfig {
  return {
    mode: (process.env.MEMECLAW_API_MODE as APIMode) || 'direct',
    provider: (process.env.MEMECLAW_API_PROVIDER as APIProvider) || 'anthropic',
    apiKey: process.env.MEMECLAW_API_KEY,
    endpoint: process.env.MEMECLAW_API_ENDPOINT,
    timeout: parseInt(process.env.MEMECLAW_API_TIMEOUT || '60000'),
  };
}
