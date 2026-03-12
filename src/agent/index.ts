import { APIClient, createAPIClient } from '../api';
import { Session, Message, Skill } from '../types';
import { skillRegistry } from '../skills';
import { getSessionStore, SessionStore, SessionChannel } from '../storage/sessions';
import { getDatabase, MemeClawDatabase } from '../storage/sqlite';
import { ContextManager, contextManager } from './context';
import './mcp-tools'; // 加载 MCP 工具
import { getBuiltinTools, executeToolCall, ToolCall } from '../api/tools';
import { loadConfig, getApiKey, getApiEndpoint } from '../config/loader';
import { buildMemoryBlocks } from '../agents/tools/memory';
import { cronScheduler } from '../agents/tools/cron';
import { getAllTools, executeTool } from '../agents/tools';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface AgentConfig {
  model?: string;
  provider?: 'openai' | 'anthropic' | 'gemini' | 'custom';
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  persistSession?: boolean;  // 是否持久化会话
  enableTools?: boolean;     // 是否启用 Function Calling
  maxToolIterations?: number; // 最大工具迭代次数
  contextConfig?: {
    maxMessages?: number;
    maxTokens?: number;
    summaryThreshold?: number;
    keepRecentMessages?: number;
  };
}

/**
 * Agent - MemeClaw AI 运行时
 * 支持会话持久化、上下文管理、工具调用
 */
export class Agent {
  private apiClient: APIClient;
  private config: AgentConfig;
  private session: Session | null = null;
  private sessionStore: SessionStore;
  private db: MemeClawDatabase;
  private ctxManager: ContextManager;

  constructor(userConfig: AgentConfig = {}) {
    // 加载统一配置
    const globalConfig = loadConfig();

    // 合并配置：用户配置 > 全局配置 > 默认值
    this.config = {
      model: userConfig.model || globalConfig.api.model || 'claude-opus-4-6',
      provider: userConfig.provider || 'anthropic',
      temperature: userConfig.temperature ?? globalConfig.agent.temperature ?? 0.7,
      maxTokens: userConfig.maxTokens ?? globalConfig.agent.maxTokens ?? 4096,
      persistSession: userConfig.persistSession ?? true,
      enableTools: userConfig.enableTools ?? true,
      maxToolIterations: userConfig.maxToolIterations ?? 5,
      systemPrompt: userConfig.systemPrompt,
      contextConfig: userConfig.contextConfig,
    };

    this.ctxManager = contextManager;

    // 初始化上下文配置
    if (this.config.contextConfig) {
      this.ctxManager.updateConfig(this.config.contextConfig);
    }

    // 初始化存储
    this.sessionStore = getSessionStore();
    this.db = getDatabase();

    // 从配置读取 API 设置
    const apiKey = getApiKey() || process.env.ANTHROPIC_API_KEY;
    const apiEndpoint = getApiEndpoint();
    const apiMode = globalConfig.api.mode || 'relay';

    this.apiClient = createAPIClient({
      mode: apiMode,
      provider: this.config.provider || 'anthropic',
      apiKey,
      endpoint: apiEndpoint,
    });

    // 如果是中转站模式，设置中转站配置
    if (apiMode === 'relay' && apiEndpoint) {
      this.apiClient.setRelayConfig({
        endpoint: apiEndpoint,
        format: 'openai',
        apiKey,
      });
    }
  }

  /**
   * 设置会话
   */
  public setSession(session: Session): void {
    this.session = session;
  }

  /**
   * 获取会话
   */
  public getSession(): Session | null {
    return this.session;
  }

  /**
   * 创建或加载会话（持久化）
   */
  public createOrLoadSession(options: {
    sessionId?: string;
    userId?: string;
    channel?: SessionChannel;
  }): Session {
    const sessionId = options.sessionId || this.generateSessionId(options.userId);
    const channel = options.channel || 'cli';

    // 尝试加载已有会话
    let session = this.sessionStore.load(sessionId);

    if (!session) {
      // 创建新会话
      session = this.sessionStore.create({
        id: sessionId,
        userId: options.userId,
        channel,
        model: this.config.model,
      });

      // 同步到数据库
      this.db.createSession({
        id: sessionId,
        userId: options.userId,
        channel,
        model: this.config.model || 'claude-opus-4-6',
      });
    }

    this.session = session;
    return session;
  }

  /**
   * 根据用户 ID 获取或创建会话
   */
  public getOrCreateSessionForUser(userId: string, channel: SessionChannel = 'cli'): Session {
    // 使用 userId 作为会话 ID 的一部分，确保用户会话唯一
    const sessionId = `user_${channel}_${userId}`;

    return this.createOrLoadSession({
      sessionId,
      userId,
      channel,
    });
  }

  /**
   * 发送消息并获取响应（支持 Function Calling）
   */
  public async chat(content: string): Promise<Message> {
    if (!this.session) {
      throw new Error('No session set');
    }

    // 添加用户消息
    const userMessage: Message = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    this.session.messages.push(userMessage);

    // 启用工具时，进行多轮对话
    const enableTools = this.config.enableTools !== false;
    const maxIterations = this.config.maxToolIterations || 5;

    let finalResponse = await this.chatWithTools(enableTools, maxIterations);

    return finalResponse;
  }

  /**
   * 带工具的聊天（支持自动工具调用）
   */
  private async chatWithTools(
    enableTools: boolean,
    maxIterations: number
  ): Promise<Message> {
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      // 构建消息历史
      const messages = await this.buildMessages();

      // 调用 API
      const tools = enableTools ? getBuiltinTools() : undefined;
      const response = await this.apiClient.chat(messages, {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        tools,
      });

      // 检查是否有工具调用
      if (response.toolCalls && response.toolCalls.length > 0) {
        if (!this.session) {
          throw new Error('No session available for tool calls');
        }

        // 添加助手消息（包含工具调用）
        const assistantMessage: Message = {
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          role: 'assistant',
          content: response.content || '',
          timestamp: Date.now(),
          metadata: {
            model: response.model,
            toolCalls: response.toolCalls,
          },
        };
        this.session.messages.push(assistantMessage);

        // 执行所有工具调用
        for (const toolCall of response.toolCalls) {
          const result = await executeToolCall(toolCall);

          // 添加工具结果消息
          const toolMessage: Message = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
            role: 'user',
            content: JSON.stringify(result),
            timestamp: Date.now(),
            metadata: {
              toolCallId: toolCall.id,
              toolName: toolCall.function.name,
            },
          };
          this.session.messages.push(toolMessage);
        }

        // 继续下一轮对话
        continue;
      }

      // 没有工具调用，返回最终响应
      if (!this.session) {
        throw new Error('No session available');
      }

      const finalMessage: Message = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        metadata: {
          model: response.model,
          usage: response.usage,
        },
      };
      this.session.messages.push(finalMessage);
      this.session.updatedAt = Date.now();

      // 持久化会话
      if (this.config.persistSession !== false) {
        this.saveSession();
      }

      return finalMessage;
    }

    // 达到最大迭代次数
    throw new Error('Max tool iterations exceeded');
  }

  /**
   * 保存会话到存储
   */
  public saveSession(): void {
    if (!this.session) return;

    // 保存到 JSONL 文件
    this.sessionStore.save(this.session);

    // 同步消息到数据库（确保会话存在）
    try {
      const lastMessage = this.session.messages[this.session.messages.length - 1];
      if (lastMessage) {
        this.db.addMessage({
          id: lastMessage.id,
          sessionId: this.session.id,
          role: lastMessage.role,
          content: lastMessage.content,
          metadata: lastMessage.metadata,
        });
      }
    } catch (error: any) {
      // 如果会话不存在于数据库，先创建会话
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        this.db.createSession({
          id: this.session.id,
          userId: this.session.userId,
          channel: this.session.channel || 'cli',
          model: this.session.model,
        });

        // 重试添加消息
        const lastMessage = this.session.messages[this.session.messages.length - 1];
        if (lastMessage) {
          this.db.addMessage({
            id: lastMessage.id,
            sessionId: this.session.id,
            role: lastMessage.role,
            content: lastMessage.content,
            metadata: lastMessage.metadata,
          });
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * 调用技能
   */
  public async callSkill(skillId: string, input: any): Promise<any> {
    const skill = skillRegistry.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    return skillRegistry.execute(skillId, input, {
      session: this.session,
      config: this.config,
    });
  }

  /**
   * 自动检测并执行技能
   */
  public async autoExecuteSkill(content: string): Promise<any> {
    // 从消息中检测技能调用
    const skillMatch = content.match(/\/skill:(\w+)\s*(.*)/);

    if (skillMatch) {
      const skillId = skillMatch[1];
      const inputStr = skillMatch[2].trim();

      let input: any = {};
      try {
        input = inputStr ? JSON.parse(inputStr) : {};
      } catch {
        input = { query: inputStr };
      }

      return this.callSkill(skillId, input);
    }

    return null;
  }

  /**
   * 获取可用技能
   */
  public getAvailableSkills(): Skill[] {
    return skillRegistry.getAll();
  }

  /**
   * 构建消息历史（带上下文管理）
   */
  private async buildMessages(): Promise<Array<{ role: 'system' | 'user' | 'assistant'; content: string }>> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // 添加系统提示（异步加载记忆系统）
    let systemPrompt = this.config.systemPrompt || await this.getDefaultSystemPrompt();

    // 如果有摘要，添加到系统提示
    const summary = this.ctxManager.getSummary();
    if (summary) {
      systemPrompt += `\n\n${summary}`;
    }

    messages.push({
      role: 'system',
      content: systemPrompt,
    });

    // 添加会话历史（使用上下文管理器裁剪）
    if (this.session && this.session.messages.length > 0) {
      // 智能裁剪消息
      const { messages: trimmedMessages, summary: newSummary } = this.ctxManager.smartTrim(this.session.messages);

      // 如果生成了新摘要，更新系统提示
      if (newSummary && !summary) {
        messages[0].content += `\n\n${newSummary}`;
      }

      for (const msg of trimmedMessages) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    return messages;
  }

  /**
   * 获取默认系统提示（从记忆系统加��）
   */
  private async getDefaultSystemPrompt(): Promise<string> {
    const skills = skillRegistry.getAll();

    // 尝试从记忆系统加载身份和个性
    let identityPrompt = '';
    let memoryPrompt = '';

    try {
      const memoryBlocks = await buildMemoryBlocks();

      // 稳定部分：身份、个性、用户档案
      if (memoryBlocks.stable.length > 0) {
        identityPrompt = memoryBlocks.stable.join('\n\n');
      }

      // 动态部分：长期记忆、今日���志
      const dynamicParts: string[] = [];
      if (memoryBlocks.dynamic.memory) {
        dynamicParts.push(`## 长期记忆\n${memoryBlocks.dynamic.memory}`);
      }
      if (memoryBlocks.dynamic.dailyNote) {
        dynamicParts.push(`## 今日日志\n${memoryBlocks.dynamic.dailyNote}`);
      }
      if (dynamicParts.length > 0) {
        memoryPrompt = `\n\n---\n\n# 记忆上下文\n\n${dynamicParts.join('\n\n')}`;
      }
    } catch (error) {
      // 如果记忆系统加载失败，使用默认提示
    }

    // 如果有身份提示，直接使用
    if (identityPrompt) {
      return `${identityPrompt}${memoryPrompt}

## 可用技能
${skills.map(s => `- /skill:${s.id} - ${s.description}`).join('\n')}

## 工具能力
- **记忆系统**: 使用 memory_save 保存重要信息，memory_search 搜索历史记忆
- **定时任务**: 使用 cron_create 创建提醒，cron_list 查看任务
- **BNB Chain**: 使用 bnb_balance 查询余额，bnb_price 查询价格

用户可以通过 /skill:技能名 来调用特定技能。`;
    }

    // 默认提示
    return `你是 MemeClaw，一只懂 MEME 币的智能龙虾助手 🦞

你精通以下领域：
- MEME 币和加密货币知识
- 代币经济学设计和分析
- Bonding Curve（联合曲线）机制
- Four.meme、Pump.fun 等发币平台
- 智能合约和区块链安全
- BNB Chain 生态和 PancakeSwap

可用技能：
${skills.map(s => `- /skill:${s.id} - ${s.description}`).join('\n')}

用户可以通过 /skill:技能名 来调用特定技能。

你乐于助人、专业、友��，总是用简洁清晰的方式回答问题。`;
  }

  /**
   * 重置会话
   */
  public resetSession(): void {
    if (this.session) {
      this.session.messages = [];
      this.session.updatedAt = Date.now();

      if (this.config.persistSession !== false) {
        this.saveSession();
      }
    }
  }

  /**
   * 删除会话
   */
  public deleteSession(): void {
    if (this.session) {
      this.sessionStore.delete(this.session.id);
      this.db.deleteSession(this.session.id);
      this.session = null;
    }
  }

  /**
   * 列出所有会话
   */
  public listSessions(): Session[] {
    return this.sessionStore.list();
  }

  /**
   * 生成会话 ID
   */
  private generateSessionId(userId?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return userId ? `sess_${userId}_${timestamp}` : `sess_${timestamp}_${random}`;
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * 创建 Agent 实例
 */
export function createAgent(config?: Partial<AgentConfig>): Agent {
  return new Agent(config || {});
}
